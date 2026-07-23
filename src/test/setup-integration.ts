import { afterEach } from "vitest";

afterEach(() => {
  delete process.env.TEST_REQUEST_ID;
});
