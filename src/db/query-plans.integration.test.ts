import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const database = postgres(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 1,
  },
);

const requiredQueryIndexes = [
  "accounts_moderation_role_queue_idx",
  "audit_revisions_entity_period_idx",
  "audit_revisions_source_timeline_idx",
  "creator_profiles_search_active_trgm_idx",
  "email_outbox_due_claim_idx",
  "sponsorship_placements_delivery_idx",
] as const;

type ExplainPlanNode = {
  "Index Name"?: string;
  Plans?: ExplainPlanNode[];
};

function extractIndexNames(rows: readonly Record<string, unknown>[]) {
  const serializedPlan = Object.values(rows[0] ?? {})[0];
  if (!Array.isArray(serializedPlan)) {
    throw new Error("PostgreSQL did not return a JSON query plan.");
  }

  const root = serializedPlan[0] as { Plan?: ExplainPlanNode } | undefined;
  const indexNames = new Set<string>();

  function visit(node: ExplainPlanNode | undefined) {
    if (!node) {
      return;
    }

    if (node["Index Name"]) {
      indexNames.add(node["Index Name"]);
    }

    node.Plans?.forEach(visit);
  }

  visit(root?.Plan);
  return indexNames;
}

describeLocalStack("representative database query plans", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("defines the indexes required by catalog and operational reads", async () => {
    const indexes = await database<{ index_name: string }[]>`
      select indexname as index_name
      from pg_indexes
      where schemaname = 'public'
        and indexname in ${database(requiredQueryIndexes)}
      order by indexname
    `;

    expect(indexes.map(({ index_name }) => index_name)).toEqual([
      ...requiredQueryIndexes,
    ]);
  });

  it("uses the intended indexes with representative synthetic volume", async () => {
    const rollback = new Error("rollback representative query-plan fixtures");

    try {
      await database.begin(async (transaction) => {
        await transaction`set local session_replication_role = replica`;

        await transaction`
          insert into public.accounts (
            id,
            auth_user_id,
            role,
            status,
            operational_email,
            submitted_at,
            approved_at,
            completion_percentage
          )
          select
            gen_random_uuid(),
            gen_random_uuid(),
            case
              when ordinal % 3 = 0 then 'COMPANY'::public.account_role
              else 'INFLUENCER'::public.account_role
            end,
            case
              when ordinal % 5 = 0 then 'PENDING_REVIEW'::public.account_status
              when ordinal % 7 = 0 then 'CHANGES_REQUESTED'::public.account_status
              else 'APPROVED'::public.account_status
            end,
            format('query-plan-%s@contentecreators.test', ordinal),
            now() - (ordinal || ' seconds')::interval,
            case
              when ordinal % 5 <> 0 and ordinal % 7 <> 0
                then now() - (ordinal || ' seconds')::interval
              else null
            end,
            100
          from generate_series(1, 20000) as fixture(ordinal)
        `;

        await transaction`
          insert into public.creator_profiles (
            id,
            account_id,
            legal_name,
            display_name,
            bio,
            creator_type,
            city,
            state,
            archived_at
          )
          select
            gen_random_uuid(),
            account.id,
            format('Criador Plano %s', split_part(split_part(account.operational_email, '@', 1), '-', 3)),
            format('Criador Plano %s', split_part(split_part(account.operational_email, '@', 1), '-', 3)),
            'Perfil sintético criado somente para validar planos de consulta.',
            case
              when split_part(split_part(account.operational_email, '@', 1), '-', 3)::integer % 2 = 0
                then 'UGC'::public.creator_type
              else 'INFLUENCER'::public.creator_type
            end,
            format(
              'Cidade %s',
              split_part(split_part(account.operational_email, '@', 1), '-', 3)::integer % 40
            ),
            case
              when split_part(split_part(account.operational_email, '@', 1), '-', 3)::integer % 4 = 0
                then 'RJ'
              else 'SP'
            end,
            case
              when split_part(split_part(account.operational_email, '@', 1), '-', 3)::integer % 4 = 0
                then now()
              else null
            end
          from public.accounts account
          where account.operational_email like 'query-plan-%@contentecreators.test'
            and account.role = 'INFLUENCER'
        `;

        await transaction`
          insert into public.sponsorship_placements (
            placement_type,
            audience,
            slot_key,
            advertiser_label,
            title,
            body,
            starts_at,
            ends_at,
            is_active,
            sort_order
          )
          select
            'TOP_BANNER',
            case
              when ordinal % 3 = 0 then 'COMPANY'::public.placement_audience
              when ordinal % 3 = 1 then 'INFLUENCER'::public.placement_audience
              else 'ALL'::public.placement_audience
            end,
            format('catalog-%s', ordinal % 20),
            'Anunciante sintético de plano',
            format('Placement de plano %s', ordinal),
            'Criativo sintético criado somente para validar planos de consulta.',
            now() - interval '1 day',
            now() + interval '30 days',
            ordinal % 5 <> 0,
            ordinal % 100
          from generate_series(1, 6000) as fixture(ordinal)
        `;

        await transaction`
          insert into public.email_outbox (
            template,
            recipient_email,
            payload,
            status,
            idempotency_key,
            due_at,
            locked_at,
            attempt_count,
            max_attempts
          )
          select
            'ONBOARDING_RECEIVED',
            format('query-plan-outbox-%s@contentecreators.test', ordinal),
            '{"fixture":true}'::jsonb,
            case
              when ordinal % 4 = 0 then 'FAILED'::public.email_outbox_status
              when ordinal % 4 = 1 then 'SENT'::public.email_outbox_status
              else 'PENDING'::public.email_outbox_status
            end,
            format('query-plan:outbox:%s', ordinal),
            now() + ((ordinal % 120) - 90) * interval '1 minute',
            null,
            ordinal % 3,
            5
          from generate_series(1, 6000) as fixture(ordinal)
        `;

        await transaction`
          insert into public.audit_revisions (
            entity_table,
            entity_id,
            operation,
            actor_type,
            source,
            request_id,
            changed_fields,
            occurred_at
          )
          select
            format('entity_%s', ordinal % 20),
            gen_random_uuid()::text,
            'UPDATE',
            'SYSTEM',
            case
              when ordinal % 3 = 0 then 'BACKOFFICE'::public.audit_source
              when ordinal % 3 = 1 then 'APPLICATION'::public.audit_source
              else 'SCRIPT'::public.audit_source
            end,
            format('query-plan-audit-%s', ordinal),
            array['status'],
            now() - (ordinal || ' seconds')::interval
          from generate_series(1, 10000) as fixture(ordinal)
        `;

        await transaction.unsafe(`
          analyze public.accounts;
          analyze public.creator_profiles;
          analyze public.sponsorship_placements;
          analyze public.email_outbox;
          analyze public.audit_revisions;
        `);

        const catalogLocationPlan = await transaction.unsafe<
          Record<string, unknown>[]
        >(`
          explain (format json, costs off)
          select creator.id
          from public.creator_profiles creator
          join public.accounts account on account.id = creator.account_id
          where account.status = 'APPROVED'
            and account.archived_at is null
            and creator.archived_at is null
            and creator.creator_type = 'UGC'
            and creator.state = 'SP'
            and creator.city = 'Cidade 7'
          order by creator.id
          limit 25
        `);
        const catalogSearchPlan = await transaction.unsafe<
          Record<string, unknown>[]
        >(`
          explain (format json, costs off)
          select id
          from public.creator_profiles
          where archived_at is null
            and search_document like '%14222%'
          limit 25
        `);
        const moderationQueuePlan = await transaction.unsafe<
          Record<string, unknown>[]
        >(`
          explain (format json, costs off)
          select id, submitted_at
          from public.accounts
          where archived_at is null
            and role = 'COMPANY'
            and status = 'PENDING_REVIEW'
          order by submitted_at, id
          limit 25
        `);
        const placementPlan = await transaction.unsafe<
          Record<string, unknown>[]
        >(`
          explain (format json, costs off)
          select id, sort_order
          from public.sponsorship_placements
          where archived_at is null
            and is_active
            and slot_key = 'catalog-7'
            and audience = 'COMPANY'
            and starts_at <= now()
            and (ends_at is null or ends_at >= now())
          order by sort_order, id
          limit 25
        `);
        const outboxPlan = await transaction.unsafe<Record<string, unknown>[]>(`
          explain (format json, costs off)
          select id, due_at
          from public.email_outbox
          where status in ('PENDING', 'FAILED')
            and due_at <= now()
            and attempt_count < max_attempts
            and locked_at is null
          order by due_at, id
          limit 25
        `);
        const auditPlan = await transaction.unsafe<Record<string, unknown>[]>(`
          explain (format json, costs off)
          select revision, occurred_at
          from public.audit_revisions
          where entity_table = 'entity_7'
            and occurred_at >= now() - interval '2 hours'
          order by occurred_at desc, revision desc
          limit 50
        `);

        const usedIndexes = {
          audit: [...extractIndexNames(auditPlan)],
          catalogLocation: [...extractIndexNames(catalogLocationPlan)],
          catalogSearch: [...extractIndexNames(catalogSearchPlan)],
          moderationQueue: [...extractIndexNames(moderationQueuePlan)],
          outbox: [...extractIndexNames(outboxPlan)],
          placement: [...extractIndexNames(placementPlan)],
        };

        expect(usedIndexes).toEqual({
          audit: expect.arrayContaining(["audit_revisions_entity_period_idx"]),
          catalogLocation: expect.arrayContaining([
            "creator_profiles_catalog_idx",
          ]),
          catalogSearch: expect.arrayContaining([
            expect.stringMatching(
              /^creator_profiles_search(?:_active)?_trgm_idx$/u,
            ),
          ]),
          moderationQueue: expect.arrayContaining([
            "accounts_moderation_role_queue_idx",
          ]),
          outbox: expect.arrayContaining(["email_outbox_due_claim_idx"]),
          placement: expect.arrayContaining([
            "sponsorship_placements_delivery_idx",
          ]),
        });

        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }
  }, 20_000);
});
