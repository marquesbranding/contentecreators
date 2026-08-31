import postgres from "postgres";
const sql = postgres("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const rows = await sql`
  select sp.platform, sp.is_primary, sp.normalized_url, cms.follower_count
  from social_profiles sp
  left join creator_metric_snapshots cms on cms.social_profile_id = sp.id
  where sp.owner_account_id = 'b0000000-0000-4000-8000-000000000004' and sp.archived_at is null
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
