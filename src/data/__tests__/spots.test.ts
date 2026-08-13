import { describe, expect, it } from "vitest";
import { KENGAMINE, findDiamondDates, fujiGeometry } from "@/core/diamond";
import { SPOTS } from "../spots";

describe("T-030: 観測地点データのスキーマ検証", () => {
  it("12 地点以上ある", () => {
    expect(SPOTS.length).toBeGreaterThanOrEqual(12);
  });

  it("id は一意・座標と標高が妥当域", () => {
    const ids = new Set(SPOTS.map((s) => s.id));
    expect(ids.size).toBe(SPOTS.length);
    for (const s of SPOTS) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.pref.length).toBeGreaterThan(0);
      expect(s.latDeg).toBeGreaterThan(34.5);
      expect(s.latDeg).toBeLessThan(36.5);
      expect(s.lonDeg).toBeGreaterThan(137.5);
      expect(s.lonDeg).toBeLessThan(141);
      expect(s.elevM).toBeGreaterThanOrEqual(0);
      expect(s.elevM).toBeLessThan(3000);
    }
  });
});

describe("T-031: 朝夕種別と経度関係の整合(F-06)", () => {
  it("富士山より西の地点は sunrise、東の地点は sunset", () => {
    for (const s of SPOTS) {
      const g = fujiGeometry(s.latDeg, s.lonDeg, s.elevM);
      expect(g).not.toBeNull();
      if (!g) continue;
      if (s.lonDeg < KENGAMINE.lonDeg) {
        expect(g.kind, s.id).toBe("sunrise");
      } else {
        expect(g.kind, s.id).toBe("sunset");
      }
    }
  });
});

describe("データ品質: 全地点が実際に候補日を持つ(DATA-QUAL 予防)", () => {
  it("各地点は 500 日以内にダイヤモンド候補 ≥ 1 日を持つ", () => {
    const start = Date.parse("2026-08-13T00:00:00+09:00");
    for (const s of SPOTS) {
      const r = findDiamondDates(s.latDeg, s.lonDeg, s.elevM, start, 500);
      expect(
        r.candidates.length,
        `${s.id}(${s.name})に候補日がない`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
