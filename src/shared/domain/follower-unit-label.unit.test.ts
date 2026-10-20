import { describe, expect, it } from "vitest";

import { followerUnitLabel } from "./follower-unit-label";

describe("followerUnitLabel", () => {
  it.each([
    ["LINKEDIN", "conexões"],
    ["YOUTUBE", "inscritos"],
    ["TELEGRAM", "inscritos"],
    ["INSTAGRAM", "seguidores"],
    ["TIKTOK", "seguidores"],
    ["FACEBOOK", "seguidores"],
    [null, "seguidores"],
  ])("%s -> %s", (platform, expected) => {
    expect(followerUnitLabel(platform)).toBe(expected);
  });

  it("capitalizes on request", () => {
    expect(followerUnitLabel("LINKEDIN", { capitalize: true })).toBe(
      "Conexões",
    );
  });
});
