// F-03/F-06: ダイヤモンド窓探索
// 地点 × 日付ごとに「太陽方位角が山頂方位角と一致する時刻」を予算付き二分探索で
// 求め、その時刻の太陽見かけ高度と山頂見かけ仰角の差で候補判定する。
// すべて純関数・決定的(N-03)。探索は 1 日あたり MAX_SAMPLES_PER_DAY で必ず停止(N-04)。

import { normDeg } from "./angles";
import { apparentElevationDeg, vincentyInverse } from "./geodesy";
import { solarPosition } from "./solar";

/** 富士山剣ヶ峰(F-02) */
export const KENGAMINE = { latDeg: 35.36066, lonDeg: 138.72743, elevM: 3776 };

/** 1 日あたりの solarPosition サンプル数上限(N-04) */
export const MAX_SAMPLES_PER_DAY = 64;

/** perfect / good の判定閾値(F-03) */
export const PERFECT_DEG = 0.15;
export const GOOD_DEG = 0.35;

const JST_OFFSET_MS = 9 * 3600000;
const DAY_MS = 86400000;

export type DiamondKind = "sunrise" | "sunset";

export interface ViewGeometry {
  /** 観測地点から剣ヶ峰への方位角(真北 0°・時計回り) */
  azimuthDeg: number;
  /** 剣ヶ峰までの測地線距離 [m] */
  distanceM: number;
  /** 山頂の見かけ仰角(曲率・大気屈折補正込み) */
  summitAltDeg: number;
  /** F-06: 山頂方位 < 180° なら日の出、それ以外は日没 */
  kind: DiamondKind;
}

export interface DiamondCandidate {
  /** JST の日付 YYYY-MM-DD */
  dateJst: string;
  /** JST の時刻 HH:MM */
  timeJst: string;
  /** 方位一致時刻(UTC ミリ秒) */
  utcMs: number;
  /** 太陽見かけ高度 − 山頂見かけ仰角 */
  deltaAltDeg: number;
  quality: "perfect" | "good";
  kind: DiamondKind;
}

export interface DiamondSearchResult {
  geometry: ViewGeometry;
  candidates: DiamondCandidate[];
  /** 観測された 1 日あたり最大サンプル数(T-020) */
  maxSamplesPerDay: number;
}

/**
 * 観測地点から見た富士山頂のジオメトリ(F-02/F-06)。
 * 山頂近傍(< 1 km)や測地計算が収束しない場合は null。
 */
export function fujiGeometry(
  latDeg: number,
  lonDeg: number,
  elevM: number,
): ViewGeometry | null {
  const g = vincentyInverse(latDeg, lonDeg, KENGAMINE.latDeg, KENGAMINE.lonDeg);
  if (!g || g.distanceM < 1000) return null;
  const summitAltDeg = apparentElevationDeg(
    g.distanceM,
    elevM,
    KENGAMINE.elevM,
  );
  return {
    azimuthDeg: g.initialBearingDeg,
    distanceM: g.distanceM,
    summitAltDeg,
    kind: g.initialBearingDeg < 180 ? "sunrise" : "sunset",
  };
}

// 方位差を (−180, 180] に折り畳む(太陽方位 − 目標方位)
function azDiff(sunAzDeg: number, targetAzDeg: number): number {
  return normDeg(sunAzDeg - targetAzDeg + 180) - 180;
}

// UTC ミリ秒 → JST の "YYYY-MM-DD" / "HH:MM"(タイムゾーン API 非依存)
function jstDateString(utcMs: number): string {
  return new Date(utcMs + JST_OFFSET_MS).toISOString().slice(0, 10);
}
function jstTimeString(utcMs: number): string {
  return new Date(utcMs + JST_OFFSET_MS).toISOString().slice(11, 16);
}

/**
 * 1 日分の探索: [windowStartMs, windowEndMs] 内で太陽方位が targetAz を
 * 横切る時刻を二分探索する。方位はこの窓内で時間について単調増加。
 * 戻り値は { utcMs, samples } または null(その日は横切らない)。
 */
function findAzimuthCrossing(
  latDeg: number,
  lonDeg: number,
  targetAzDeg: number,
  windowStartMs: number,
  windowEndMs: number,
): { utcMs: number; samples: number } | null {
  let samples = 0;
  const at = (t: number) => {
    samples++;
    return azDiff(solarPosition(t, latDeg, lonDeg).azimuthDeg, targetAzDeg);
  };
  let lo = windowStartMs;
  let hi = windowEndMs;
  const fLo = at(lo);
  const fHi = at(hi);
  if (fLo > 0 || fHi < 0) return null; // 窓内で目標方位に到達しない
  // 6 時間窓を 1 秒未満まで絞るのに約 45 反復 < MAX_SAMPLES_PER_DAY − 2
  while (hi - lo > 500 && samples < MAX_SAMPLES_PER_DAY) {
    const mid = (lo + hi) / 2;
    if (at(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { utcMs: (lo + hi) / 2, samples };
}

/**
 * F-05: 基準日(JST の YYYY-MM-DD)以降で最初の候補を返す。当日を含む。
 * 候補リストは findDiamondDates の出力順(日付昇順)を前提とする。
 */
export function nextCandidate(
  candidates: DiamondCandidate[],
  fromDateJst: string,
): DiamondCandidate | null {
  for (const c of candidates) {
    if (c.dateJst >= fromDateJst) return c;
  }
  return null;
}

/**
 * F-03: 基準日(JST)から days 日分のダイヤモンド候補を探索する。
 * startUtcMs は探索開始日の JST 0:00 に対応する UTC ミリ秒(端数は日単位に切り捨て)。
 */
export function findDiamondDates(
  latDeg: number,
  lonDeg: number,
  elevM: number,
  startUtcMs: number,
  days: number,
): DiamondSearchResult {
  const geometry = fujiGeometry(latDeg, lonDeg, elevM);
  if (!geometry) {
    return {
      geometry: {
        azimuthDeg: 0,
        distanceM: 0,
        summitAltDeg: 0,
        kind: "sunset",
      },
      candidates: [],
      maxSamplesPerDay: 0,
    };
  }

  // JST 0:00 に正規化
  const startJstDay = Math.floor((startUtcMs + JST_OFFSET_MS) / DAY_MS);
  // 探索窓(JST): 日の出 4:00–10:00 / 日没 14:00–20:00(日本の日出没を全季節カバー)
  const [winStartH, winEndH] = geometry.kind === "sunrise" ? [4, 10] : [14, 20];

  const candidates: DiamondCandidate[] = [];
  let maxSamplesPerDay = 0;

  for (let d = 0; d < days; d++) {
    const jstMidnightUtc = (startJstDay + d) * DAY_MS - JST_OFFSET_MS;
    const crossing = findAzimuthCrossing(
      latDeg,
      lonDeg,
      geometry.azimuthDeg,
      jstMidnightUtc + winStartH * 3600000,
      jstMidnightUtc + winEndH * 3600000,
    );
    if (!crossing) continue;
    if (crossing.samples > maxSamplesPerDay) {
      maxSamplesPerDay = crossing.samples;
    }
    const sun = solarPosition(crossing.utcMs, latDeg, lonDeg);
    const deltaAltDeg = sun.altitudeDeg - geometry.summitAltDeg;
    const abs = Math.abs(deltaAltDeg);
    if (abs > GOOD_DEG) continue;
    candidates.push({
      dateJst: jstDateString(crossing.utcMs),
      timeJst: jstTimeString(crossing.utcMs),
      utcMs: crossing.utcMs,
      deltaAltDeg,
      quality: abs <= PERFECT_DEG ? "perfect" : "good",
      kind: geometry.kind,
    });
  }

  return { geometry, candidates, maxSamplesPerDay };
}
