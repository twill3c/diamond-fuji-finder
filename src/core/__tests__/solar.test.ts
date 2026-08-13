import { describe, expect, it } from "vitest";
import { solarPosition } from "../solar";

// JST(UTC+9)の壁時計時刻を UTC ミリ秒へ(テスト専用ヘルパ)
function jstMs(iso: string): number {
  return Date.parse(`${iso}+09:00`);
}

const TOKYO = { lat: 35.681, lon: 139.767 };

// 指定日の JST 12:00〜20:00 を 1 分刻みで走査し、幾何高度が threshold を
// 下向きに横切る時刻(JST 分)を返す。見つからなければ -1
function findSetting(dateJst: string, threshold: number): number {
  for (let m = 12 * 60; m < 20 * 60; m++) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const t = jstMs(
      `${dateJst}T${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`,
    );
    const a = solarPosition(t, TOKYO.lat, TOKYO.lon);
    const b = solarPosition(t + 60000, TOKYO.lat, TOKYO.lon);
    if (a.elevationDeg >= threshold && b.elevationDeg < threshold) {
      return m + 1;
    }
  }
  return -1;
}

describe("T-001/T-002: 太陽赤緯の既知値アンカー", () => {
  it("T-001: 2026-03-20(春分)正午 UTC の赤緯は |δ| < 0.5°", () => {
    // 2026 年の春分点通過は 3/20 14:46 UTC(国立天文台 暦要項)。正午 UTC では
    // 赤緯はほぼ 0(通過前なのでわずかに負)
    const { declinationDeg } = solarPosition(
      Date.parse("2026-03-20T12:00:00Z"),
      TOKYO.lat,
      TOKYO.lon,
    );
    expect(Math.abs(declinationDeg)).toBeLessThan(0.5);
  });

  it("T-002: 夏至の赤緯は +23.44° ± 0.15°、冬至は −23.44° ± 0.15°", () => {
    const summer = solarPosition(
      Date.parse("2026-06-21T12:00:00Z"),
      TOKYO.lat,
      TOKYO.lon,
    );
    expect(summer.declinationDeg).toBeGreaterThan(23.44 - 0.15);
    expect(summer.declinationDeg).toBeLessThan(23.44 + 0.15);

    const winter = solarPosition(
      Date.parse("2026-12-22T12:00:00Z"),
      TOKYO.lat,
      TOKYO.lon,
    );
    expect(winter.declinationDeg).toBeGreaterThan(-23.44 - 0.15);
    expect(winter.declinationDeg).toBeLessThan(-23.44 + 0.15);
  });
});

describe("T-003/T-004: 東京の冬至の日没(NOAA アンカー)", () => {
  // 日没 = 太陽中心の幾何高度が −0.833°(大気差 0.567° + 視半径 0.267°)を
  // 下向きに横切る時刻。東京の冬至の日没は 16:32 JST(国立天文台こよみ / NOAA)
  it("T-003: 日没時刻は 16:32 JST ± 3 分", () => {
    const m = findSetting("2026-12-22", -0.833);
    const expected = 16 * 60 + 32;
    expect(m).toBeGreaterThanOrEqual(expected - 3);
    expect(m).toBeLessThanOrEqual(expected + 3);
  });

  it("T-004: 日没方位角は 240.5° ± 1.0°", () => {
    const m = findSetting("2026-12-22", -0.833);
    const t = jstMs(
      `2026-12-22T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`,
    );
    const { azimuthDeg } = solarPosition(t, TOKYO.lat, TOKYO.lon);
    expect(azimuthDeg).toBeGreaterThan(240.5 - 1.0);
    expect(azimuthDeg).toBeLessThan(240.5 + 1.0);
  });
});

describe("T-005: 東京の夏至の南中高度", () => {
  it("南中高度は 77.8° ± 0.3°(90 − 緯度 + 赤緯)", () => {
    // 南中前後 ±60 分を 1 分刻みで走査して最大高度をとる
    let maxElev = -90;
    for (let m = 11 * 60; m <= 13 * 60; m++) {
      const t = jstMs(
        `2026-06-21T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`,
      );
      const { elevationDeg } = solarPosition(t, TOKYO.lat, TOKYO.lon);
      if (elevationDeg > maxElev) maxElev = elevationDeg;
    }
    expect(maxElev).toBeGreaterThan(77.8 - 0.3);
    expect(maxElev).toBeLessThan(77.8 + 0.3);
  });
});

describe("境界条件(分岐カバレッジ: 大気差・方位縮退)", () => {
  it("高高度(> 85°)では大気差補正が 0", () => {
    // 春分の赤道直上・真太陽正午(均時差 ≈ −7.5 分 → 12:07 UTC 頃)は天頂近傍
    const t = Date.parse("2026-03-20T12:07:00Z");
    const p = solarPosition(t, 0, 0);
    expect(p.elevationDeg).toBeGreaterThan(85);
    expect(p.altitudeDeg).toBe(p.elevationDeg);
  });

  it("地平線下深く(< −0.575°)でも有限値を返す", () => {
    // 東京の真夜中: 太陽は地平線下 ≈ −70°
    const t = jstMs("2026-12-22T00:00:00");
    const p = solarPosition(t, TOKYO.lat, TOKYO.lon);
    expect(p.elevationDeg).toBeLessThan(-30);
    expect(Number.isFinite(p.altitudeDeg)).toBe(true);
    expect(Number.isFinite(p.azimuthDeg)).toBe(true);
  });

  it("極点では方位が縮退し 180° に固定される", () => {
    const t = Date.parse("2026-06-21T12:00:00Z");
    const p = solarPosition(t, 90, 0);
    expect(p.azimuthDeg).toBe(180);
  });
});

describe("T-006: 決定性(N-03)", () => {
  it("同一入力で 2 回呼ぶと完全一致する", () => {
    const t = Date.parse("2026-08-13T03:00:00Z");
    const a = solarPosition(t, 35.36066, 138.72743);
    const b = solarPosition(t, 35.36066, 138.72743);
    expect(a).toEqual(b);
  });

  it("大気差補正: 低高度では見かけ高度 > 幾何高度", () => {
    // 冬至の日没 10 分前(高度 ≈ 1°)では大気差 ≈ 0.4° 弱が上乗せされる
    const t = jstMs("2026-12-22T16:20:00");
    const p = solarPosition(t, TOKYO.lat, TOKYO.lon);
    expect(p.altitudeDeg).toBeGreaterThan(p.elevationDeg);
    expect(p.altitudeDeg - p.elevationDeg).toBeLessThan(0.6);
  });
});
