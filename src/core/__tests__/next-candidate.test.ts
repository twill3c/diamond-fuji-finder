import { describe, expect, it } from "vitest";
import type { DiamondCandidate } from "../diamond";
import { nextCandidate } from "../diamond";

function c(dateJst: string): DiamondCandidate {
  return {
    dateJst,
    timeJst: "16:00",
    utcMs: Date.parse(`${dateJst}T16:00:00+09:00`),
    deltaAltDeg: 0.1,
    quality: "perfect",
    kind: "sunset",
  };
}

describe("T-040: nextCandidate(基準日以降の最初の候補)", () => {
  const list = [c("2026-04-05"), c("2026-09-03"), c("2027-04-04")];

  it("基準日より後の最初の候補を返す", () => {
    expect(nextCandidate(list, "2026-05-01")?.dateJst).toBe("2026-09-03");
  });

  it("基準日当日の候補を含む", () => {
    expect(nextCandidate(list, "2026-09-03")?.dateJst).toBe("2026-09-03");
  });

  it("過去日は返さない・全候補が過去なら null", () => {
    expect(nextCandidate(list, "2027-04-05")).toBeNull();
  });

  it("空リストは null", () => {
    expect(nextCandidate([], "2026-01-01")).toBeNull();
  });
});
