import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const TERMINAL_BAN_DURATION = "876000h";

export function createSupabaseModerationIdentityGateway(
  adminClient: SupabaseClient,
) {
  return {
    async syncAuthIdentity(input: {
      action: "BAN" | "UNBAN";
      authUserId: string;
    }) {
      const { data, error } = await adminClient.auth.admin.updateUserById(
        input.authUserId,
        {
          ban_duration: input.action === "BAN" ? TERMINAL_BAN_DURATION : "none",
        },
      );

      return !error && Boolean(data.user);
    },
  };
}
