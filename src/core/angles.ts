// 角度ユーティリティ(度単位で統一 — AGENTS.md §4)

export const DEG = Math.PI / 180;

/** 度を [0, 360) に正規化する(JS の剰余は -0 や負値を返すため二段で折り返す) */
export function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
