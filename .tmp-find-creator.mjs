import postgres from "postgres";
const sql = postgres("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
const rows = await sql`
  select a.operational_email, cp.display_name, cp.id as creator_profile_id, a.id as account_id
  from accounts a
  join creator_profiles cp on cp.account_id = a.id
  where a.role = 'INFLUENCER' and a.status = 'APPROVED' and cp.archived_at is null
  limit 5
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
