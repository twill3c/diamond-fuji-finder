// F-02: WGS84 楕円体上の測地計算(Vincenty 逆解)と山頂見かけ仰角
// すべて度単位・純関数。探索は予算付き(N-04)。

import { DEG, normDeg } from "./angles";

// WGS84 定数
const A = 6378137.0; // 長半径 [m]
const F = 1 / 298.257223563; // 扁平率
const B = A * (1 - F); // 短半径 [m]

export interface GeodesicResult {
  /** 測地線距離 [m] */
  distanceM: number;
  /** 始点における方位角(真北 0°・時計回り) */
  initialBearingDeg: number;
}

/**
 * Vincenty 逆解。収束しない場合(近対蹠点)は null を返す。
 * 反復は最大 100 回で必ず停止する(N-04)。
 */
export function vincentyInverse(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number,
): GeodesicResult | null {
  if (lat1Deg === lat2Deg && lon1Deg === lon2Deg) {
    return { distanceM: 0, initialBearingDeg: 0 };
  }

  const L = (lon2Deg - lon1Deg) * DEG;
  const U1 = Math.atan((1 - F) * Math.tan(lat1Deg * DEG));
  const U2 = Math.atan((1 - F) * Math.tan(lat2Deg * DEG));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;
  let converged = false;

  for (let i = 0; i < 100; i++) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2,
    );
    if (sinSigma === 0) {
      return { distanceM: 0, initialBearingDeg: 0 };
    }
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha ** 2;
    // 赤道上の測地線は cosSqAlpha = 0
    cos2SigmaM =
      cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0;
    const C = (F / 16) * cosSqAlpha * (4 + F * (4 - 3 * cosSqAlpha));
    const lambdaPrev = lambda;
    lambda =
      L +
      (1 - C) *
        F *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
    if (Math.abs(lambda - lambdaPrev) < 1e-12) {
      converged = true;
      break;
    }
  }
  if (!converged) return null;

  const uSq = (cosSqAlpha * (A ** 2 - B ** 2)) / B ** 2;
  const bigA =
    1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const bigB = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    bigB *
    sinSigma *
    (cos2SigmaM +
      (bigB / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
          (bigB / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma ** 2) *
            (-3 + 4 * cos2SigmaM ** 2)));

  const distanceM = B * bigA * (sigma - deltaSigma);
  const bearingRad = Math.atan2(
    cosU2 * Math.sin(lambda),
    cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(lambda),
  );
  return { distanceM, initialBearingDeg: normDeg(bearingRad / DEG) };
}

/** 地球平均半径 [m](曲率補正用) */
const R_MEAN = 6371008.8;

/**
 * 観測点から目標(山頂)への見かけ仰角。
 * 幾何仰角から、地球曲率と大気屈折(屈折係数 k)による沈み込みを差し引く。
 */
export function apparentElevationDeg(
  distanceM: number,
  observerElevM: number,
  targetElevM: number,
  refractionCoeff = 0.13,
): number {
  const geomRad = Math.atan2(targetElevM - observerElevM, distanceM);
  const dipRad = ((1 - refractionCoeff) * distanceM) / (2 * R_MEAN);
  return (geomRad - dipRad) / DEG;
}
