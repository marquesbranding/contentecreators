import { execFileSync } from "node:child_process";

function readStatusValue(status: string, key: string) {
  const match = status.match(new RegExp(`^${key}=\"?([^\"\\n]+)\"?$`, "mu"));

  return match?.[1];
}

export function setup() {
  if (process.env.RUN_LOCAL_STACK_TESTS !== "true") {
    return;
  }

  if (process.env.SKIP_LOCAL_STACK_RESET !== "true") {
    execFileSync("npm", ["run", "db:reset"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe",
    });
  }
  const status = execFileSync(
    "npx",
    ["supabase", "status", "--workdir", ".", "--output", "env"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const apiUrl = readStatusValue(status, "API_URL");
  const publishableKey =
    readStatusValue(status, "PUBLISHABLE_KEY") ??
    readStatusValue(status, "ANON_KEY");

  if (apiUrl && publishableKey) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey;
  }
}
