import { describe, expect, it } from "vitest";

import { shuffle } from "./catalog-sponsorship-slots";

function scriptedRng(values: number[]) {
  const calls: number[] = [];
  const rng = (max: number) => {
    calls.push(max);
    return values.shift() ?? 0;
  };

  return { calls, rng };
}

describe("shuffle", () => {
  it("keeps the order when the RNG always picks the last index", () => {
    const { calls, rng } = scriptedRng([3, 2, 1]);

    expect(shuffle(["a", "b", "c", "d"], rng)).toEqual(["a", "b", "c", "d"]);
    expect(calls).toEqual([4, 3, 2]);
  });

  it("applies Fisher–Yates swaps for a scripted RNG", () => {
    const { rng } = scriptedRng([0, 0, 0]);

    expect(shuffle(["a", "b", "c", "d"], rng)).toEqual(["b", "c", "d", "a"]);
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b", "c"];

    shuffle(input, scriptedRng([0, 0]).rng);

    expect(input).toEqual(["a", "b", "c"]);
  });

  it("returns an empty or single-item array unchanged without calling the RNG", () => {
    const { calls, rng } = scriptedRng([]);

    expect(shuffle([], rng)).toEqual([]);
    expect(shuffle(["only"], rng)).toEqual(["only"]);
    expect(calls).toEqual([]);
  });

  it("is a permutation of the input with the default crypto RNG", () => {
    const input = Array.from({ length: 8 }, (_, index) => index);

    const result = shuffle(input);

    expect([...result].sort((left, right) => left - right)).toEqual(input);
  });
});
