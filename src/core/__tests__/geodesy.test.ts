import { describe, expect, it } from "vitest";
import { DEG } from "../angles";
import { apparentElevationDeg, vincentyInverse } from "../geodesy";

// ── 独立再計算(T-012 用): 球面近似のハバーサイン距離と大円方位 ──
// Vincenty(WGS84 楕円体)とは独立の定式化。中緯度・100km 未満では
// 距離 0.5%・方位 0.3° 以内で一致するはず(TEST_SPEC 実行規約)
const R_MEAN = 6371008.8; // IUGG 平均半径 [m]

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MEAN * Math.asin(Math.sqrt(a));
}

function sphericalBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = (lon2 - lon1) * DEG;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG);
  const x =
    Math.cos(lat1 * DEG) * Math.sin(lat2 * DEG) -
    Math.sin(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.cos(dLon);
  const b = Math.atan2(y, x) / DEG;
  return (b + 360) % 360;
}

describe("T-010/T-011: Vincenty 逆解の既知値アンカー", () => {
  it("T-010: 同一点は距離 0", () => {
    const r = vincentyInverse(35.0, 139.0, 35.0, 139.0);
    expect(r).not.toBeNull();
    expect(r?.distanceM).toBe(0);
  });

  it("T-010: 赤道上の経度差 1° は 111.32 km ± 0.1%・方位 90°", () => {
    // WGS84 赤道半径 6378137 m → 赤道 1° = 111319.49 m(定義から直接導出)
    const r = vincentyInverse(0, 0, 0, 1);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.distanceM).toBeGreaterThan(111319.49 * 0.999);
    expect(r.distanceM).toBeLessThan(111319.49 * 1.001);
    expect(Math.abs(r.initialBearingDeg - 90)).toBeLessThan(0.05);
  });

  it("T-011: 子午線上の緯度差 1°(0→1)は 110.57 km ± 0.2%・方位 0°", () => {
    // 赤道付近の子午線弧 1° ≈ 110574 m(WGS84 子午線曲率半径から)
    const r = vincentyInverse(0, 0, 1, 0);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.distanceM).toBeGreaterThan(110574 * 0.998);
    expect(r.distanceM).toBeLessThan(110574 * 1.002);
    expect(Math.abs(r.initialBearingDeg - 0)).toBeLessThan(0.05);
  });

  it("収束予算: 近対蹠点は null を返して停止する(N-04)", () => {
    // ほぼ対蹠点は Vincenty 逆解の既知の非収束ケース
    const r = vincentyInverse(0, 0, 0.5, 179.7);
    expect(r).toBeNull();
  });
});

describe("T-012: 東京駅 → 剣ヶ峰の独立再計算(球面近似との整合)", () => {
  it("方位差 < 0.3°・距離差 < 0.5%", () => {
    const [lat1, lon1] = [35.6812, 139.7671]; // 東京駅
    const [lat2, lon2] = [35.36066, 138.72743]; // 剣ヶ峰
    const v = vincentyInverse(lat1, lon1, lat2, lon2);
    expect(v).not.toBeNull();
    if (!v) return;
    const hs = haversineM(lat1, lon1, lat2, lon2);
    const sb = sphericalBearingDeg(lat1, lon1, lat2, lon2);
    expect(Math.abs(v.distanceM - hs) / hs).toBeLessThan(0.005);
    expect(Math.abs(v.initialBearingDeg - sb)).toBeLessThan(0.3);
    // 物理的な妥当性: 東京から富士山は西南西(240°〜260°)・約 100 km
    expect(v.initialBearingDeg).toBeGreaterThan(240);
    expect(v.initialBearingDeg).toBeLessThan(260);
    expect(v.distanceM).toBeGreaterThan(95000);
    expect(v.distanceM).toBeLessThan(105000);
  });
});

describe("T-013: 山頂見かけ仰角", () => {
  it("距離 2 倍で仰角は単調減少し、曲率補正で幾何仰角より小さい", () => {
    const h1 = 660;
    const h2 = 3776;
    const near = apparentElevationDeg(16000, h1, h2);
    const far = apparentElevationDeg(32000, h1, h2);
    expect(near).toBeGreaterThan(far);

    const geomNear = Math.atan2(h2 - h1, 16000) / DEG;
    expect(near).toBeLessThan(geomNear);
    // 16 km での曲率・屈折補正は 0.05°〜0.1° 程度(d(1−k)/2R)
    expect(geomNear - near).toBeGreaterThan(0.03);
    expect(geomNear - near).toBeLessThan(0.15);
  });

  it("水平距離 0 でも有限値(真上 = 90°)", () => {
    expect(apparentElevationDeg(0, 0, 3776)).toBeCloseTo(90, 5);
  });
});
