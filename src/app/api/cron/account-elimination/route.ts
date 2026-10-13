import {
  createScheduledEliminationHandler,
  createServerAccountEliminationService,
} from "@/features/account-deletion/server";
import { getServerEnv } from "@/shared/server/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const serverEnv = getServerEnv();
  const handle = createScheduledEliminationHandler({
    appEnvironment: serverEnv.APP_ENV,
    cronSecret: serverEnv.CRON_SECRET,
    run: (input) => createServerAccountEliminationService().run(input),
  });

  return handle(request);
}
