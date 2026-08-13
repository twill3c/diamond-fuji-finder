// F-01: NOAA Solar Position アルゴリズム(Meeus 簡約版・NOAA ES 準拠)
// 精度目標は SPEC N-05(高度 ±0.2°・方位 ±0.5°・日出没時刻 ±3 分)。
// 入力は UTC ミリ秒と度単位の緯度経度、出力も度単位(AGENTS.md §4)。

export interface SolarPosition {
  /** 方位角(真北 0°・時計回り 0–360) */
  azimuthDeg: number;
  /** 幾何高度(大気差補正なし) */
  elevationDeg: number;
  /** 見かけ高度(大気差補正込み) */
  altitudeDeg: number;
  /** 太陽赤緯 */
  declinationDeg: number;
}

import { DEG, clamp, normDeg } from "./angles";

// NOAA の大気差補正(度)。幾何高度から見かけ高度への上乗せ量
function refractionDeg(elevDeg: number): number {
  if (elevDeg > 85) return 0;
  const te = Math.tan(elevDeg * DEG);
  let arcsec: number;
  if (elevDeg > 5) {
    arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  } else if (elevDeg > -0.575) {
    arcsec =
      1735 +
      elevDeg * (-518.2 + elevDeg * (103.4 + elevDeg * (-12.79 + elevDeg * 0.711)));
  } else {
    arcsec = -20.774 / te;
  }
  return arcsec / 3600;
}

export function solarPosition(
  utcMs: number,
  latDeg: number,
  lonDeg: number,
): SolarPosition {
  const jd = utcMs / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;

  // 太陽の幾何平均黄経・平均近点角・離心率
  const L0 = normDeg(280.46646 + T * (36000.76983 + 0.0003032 * T));
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  // 中心差 → 真黄経 → 視黄経(章動・光行差の簡約補正)
  const C =
    Math.sin(M * DEG) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * DEG) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M * DEG) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  // 黄道傾斜(平均 + 補正)と赤緯
  const eps0 =
    23.439291111 - (T * (46.815 + T * (0.00059 - T * 0.001813))) / 3600;
  const eps = eps0 + 0.00256 * Math.cos(omega * DEG);
  const declinationDeg =
    Math.asin(clamp(Math.sin(eps * DEG) * Math.sin(lambda * DEG), -1, 1)) / DEG;

  // 均時差(分)
  const y = Math.tan((eps / 2) * DEG) ** 2;
  const eqTimeMin =
    (4 / DEG) *
    (y * Math.sin(2 * L0 * DEG) -
      2 * e * Math.sin(M * DEG) +
      4 * e * y * Math.sin(M * DEG) * Math.cos(2 * L0 * DEG) -
      0.5 * y * y * Math.sin(4 * L0 * DEG) -
      1.25 * e * e * Math.sin(2 * M * DEG));

  // 真太陽時(分)→ 時角(度、正が午後)
  const msInDay = ((utcMs % 86400000) + 86400000) % 86400000;
  const trueSolarMin =
    (((msInDay / 60000 + eqTimeMin + 4 * lonDeg) % 1440) + 1440) % 1440;
  const haDeg = trueSolarMin / 4 - 180;

  // 天頂角 → 幾何高度
  const sinLat = Math.sin(latDeg * DEG);
  const cosLat = Math.cos(latDeg * DEG);
  const sinDecl = Math.sin(declinationDeg * DEG);
  const cosZen = clamp(
    sinLat * sinDecl + cosLat * Math.cos(declinationDeg * DEG) * Math.cos(haDeg * DEG),
    -1,
    1,
  );
  const zenDeg = Math.acos(cosZen) / DEG;
  const elevationDeg = 90 - zenDeg;

  // 方位角(NOAA ES: 時角の符号で東側/西側を判定)
  const sinZen = Math.sin(zenDeg * DEG);
  let azimuthDeg: number;
  if (Math.abs(cosLat * sinZen) < 1e-12) {
    // 天頂/天底直下 or 極: 方位は定義できないため南(180°)に固定
    azimuthDeg = 180;
  } else {
    const azArg = clamp((sinLat * cosZen - sinDecl) / (cosLat * sinZen), -1, 1);
    const acosDeg = Math.acos(azArg) / DEG;
    azimuthDeg =
      haDeg > 0 ? normDeg(acosDeg + 180) : normDeg(540 - acosDeg);
  }

  const altitudeDeg = elevationDeg + refractionDeg(elevationDeg);

  return { azimuthDeg, elevationDeg, altitudeDeg, declinationDeg };
}
