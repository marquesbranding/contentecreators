import { execFileSync } from "node:child_process";

export function setup() {
  if (process.env.RUN_LOCAL_STACK_TESTS !== "true") {
    return;
  }

  execFileSync("npm", ["run", "db:reset"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe",
  });
}
