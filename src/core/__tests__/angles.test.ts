import { describe, expect, it } from "vitest";
import { clamp, normDeg } from "../angles";

describe("angles ユーティリティ", () => {
  it("normDeg は負の角度を [0, 360) に折り返す", () => {
    expect(normDeg(-90)).toBe(270);
    expect(normDeg(-360)).toBe(0);
    expect(normDeg(370)).toBe(10);
    expect(normDeg(0)).toBe(0);
  });

  it("clamp は両端で切り詰める", () => {
    expect(clamp(2, -1, 1)).toBe(1);
    expect(clamp(-2, -1, 1)).toBe(-1);
    expect(clamp(0.5, -1, 1)).toBe(0.5);
  });
});
