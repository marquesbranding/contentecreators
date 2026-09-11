import { sql } from "drizzle-orm";

import type { ApplicationDatabase } from "@/db/client";

/**
 * A confirmed Supabase Auth user for integration fixtures. Accounts reference
 * `auth.users`, so every fixture account needs one of these first.
 */
export async function insertAuthIdentity(
  database: ApplicationDatabase,
  identityId: string,
  email: string,
) {
  await database.execute(sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-4000-8000-000000000000', ${identityId}, 'authenticated',
      'authenticated', ${email},
      extensions.crypt('LocalTest123!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"fixture":true}'::jsonb, now(), now(), '', '', '', ''
    )
  `);
}
