import { expect, it } from "vitest";
import { metadata } from "./layout";

it("inherits the Meta domain verification from the root metadata", () => {
  expect(metadata.other?.["facebook-domain-verification"]).toBe(
    "r89ugiw0uurxqmq9ttdfy2xjwhzyod",
  );
});
