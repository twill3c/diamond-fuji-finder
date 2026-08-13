import { describe, expect, it } from "vitest";
import {
  MAX_SAMPLES_PER_DAY,
  findDiamondDates,
  fujiGeometry,
} from "../diamond";

// 既知シーズンアンカー(実観測で広く知られる観測地点と季節 — SPEC §4)
const TAKAO = { latDeg: 35.6254, lonDeg: 139.2437, elevM: 599 }; // 高尾山山頂
const TANUKI = { latDeg: 35.3387, lonDeg: 138.5546, elevM: 660 }; // 田貫湖
const INAMURA = { latDeg: 35.3025, lonDeg: 139.5261, elevM: 10 }; // 稲村ヶ崎

function jstMs(iso: string): number {
  return Date.parse(`${iso}+09:00`);
}

describe("F-06: 朝夕の自動判定(fujiGeometry)", () => {
  it("富士山の東側(高尾山・稲村ヶ崎)は sunset、西側(田貫湖)は sunrise", () => {
    const takao = fujiGeometry(TAKAO.latDeg, TAKAO.lonDeg, TAKAO.elevM);
    const tanuki = fujiGeometry(TANUKI.latDeg, TANUKI.lonDeg, TANUKI.elevM);
    const inamura = fujiGeometry(INAMURA.latDeg, INAMURA.lonDeg, INAMURA.elevM);
    expect(takao?.kind).toBe("sunset");
    expect(tanuki?.kind).toBe("sunrise");
    expect(inamura?.kind).toBe("sunset");
  });

  it("山頂近傍(距離 < 1km)は対象外として null", () => {
    expect(fujiGeometry(35.36066, 138.72743, 3776)).toBeNull();
  });
});

describe("T-020: 探索予算(N-04)", () => {
  it("1 日あたりの solarPosition サンプル数は MAX_SAMPLES_PER_DAY 以下", () => {
    const start = jstMs("2026-12-10T00:00:00");
    const r = findDiamondDates(
      TAKAO.latDeg,
      TAKAO.lonDeg,
      TAKAO.elevM,
      start,
      30,
    );
    expect(MAX_SAMPLES_PER_DAY).toBeLessThanOrEqual(64);
    expect(r.maxSamplesPerDay).toBeLessThanOrEqual(MAX_SAMPLES_PER_DAY);
  });
});

describe("T-021: 高尾山の冬至前後の日没ダイヤ(既知シーズン)", () => {
  it("12/10〜1/5 に日没候補が 1 日以上、時刻は 15:30〜17:00 JST", () => {
    const start = jstMs("2026-12-10T00:00:00");
    const r = findDiamondDates(
      TAKAO.latDeg,
      TAKAO.lonDeg,
      TAKAO.elevM,
      start,
      27,
    );
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of r.candidates) {
      expect(c.kind).toBe("sunset");
      const [h, m] = c.timeJst.split(":").map(Number);
      const minutes = h * 60 + m;
      expect(minutes).toBeGreaterThanOrEqual(15 * 60 + 30);
      expect(minutes).toBeLessThanOrEqual(17 * 60);
    }
  });
});

describe("T-023: 田貫湖の日の出ダイヤ(既知シーズン: 4 月・8 月)", () => {
  it("通年探索で 4/10〜5/1 と 8/10〜8/31 に日の出候補がある", () => {
    const start = jstMs("2026-01-01T00:00:00");
    const r = findDiamondDates(
      TANUKI.latDeg,
      TANUKI.lonDeg,
      TANUKI.elevM,
      start,
      365,
    );
    const dates = r.candidates.map((c) => c.dateJst);
    const spring = dates.filter((d) => d >= "2026-04-10" && d <= "2026-05-01");
    const summer = dates.filter((d) => d >= "2026-08-10" && d <= "2026-08-31");
    expect(spring.length).toBeGreaterThanOrEqual(1);
    expect(summer.length).toBeGreaterThanOrEqual(1);
    for (const c of r.candidates) expect(c.kind).toBe("sunrise");
  });
});

describe("T-024: 稲村ヶ崎の日没ダイヤ(既知シーズン: 4 月上旬・9 月上旬)", () => {
  it("通年探索で 3/25〜4/20 と 8/25〜9/20 に日没候補がある", () => {
    const start = jstMs("2026-01-01T00:00:00");
    const r = findDiamondDates(
      INAMURA.latDeg,
      INAMURA.lonDeg,
      INAMURA.elevM,
      start,
      365,
    );
    const dates = r.candidates.map((c) => c.dateJst);
    const spring = dates.filter((d) => d >= "2026-03-25" && d <= "2026-04-20");
    const autumn = dates.filter((d) => d >= "2026-08-25" && d <= "2026-09-20");
    expect(spring.length).toBeGreaterThanOrEqual(1);
    expect(autumn.length).toBeGreaterThanOrEqual(1);
  });
});

describe("T-025/T-026: 決定性と閾値", () => {
  it("T-025: 同一入力で 2 回呼ぶと深い等値", () => {
    const start = jstMs("2026-12-01T00:00:00");
    const a = findDiamondDates(TAKAO.latDeg, TAKAO.lonDeg, TAKAO.elevM, start, 40);
    const b = findDiamondDates(TAKAO.latDeg, TAKAO.lonDeg, TAKAO.elevM, start, 40);
    expect(a).toEqual(b);
  });

  it("T-026: 候補の |Δalt| はすべて ≤ 0.35°、perfect は ≤ 0.15°", () => {
    const start = jstMs("2026-01-01T00:00:00");
    const r = findDiamondDates(
      TANUKI.latDeg,
      TANUKI.lonDeg,
      TANUKI.elevM,
      start,
      365,
    );
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of r.candidates) {
      expect(Math.abs(c.deltaAltDeg)).toBeLessThanOrEqual(0.35);
      if (c.quality === "perfect") {
        expect(Math.abs(c.deltaAltDeg)).toBeLessThanOrEqual(0.15);
      } else {
        expect(Math.abs(c.deltaAltDeg)).toBeGreaterThan(0.15);
      }
    }
  });
});
