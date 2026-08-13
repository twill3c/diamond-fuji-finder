"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiamondCandidate, DiamondSearchResult } from "@/core/diamond";
import { findDiamondDates, nextCandidate } from "@/core/diamond";
import type { Spot } from "@/data/spots";
import { SPOTS } from "@/data/spots";

const SEARCH_DAYS = 400; // F-05: 今後 400 日分を表示

interface SpotResult {
  spot: Spot;
  result: DiamondSearchResult;
  next: DiamondCandidate | null;
}

function jstToday(nowMs: number): string {
  return new Date(nowMs + 9 * 3600000).toISOString().slice(0, 10);
}

function formatDateJa(dateJst: string): string {
  const [y, m, d] = dateJst.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function daysUntil(dateJst: string, todayJst: string): number {
  return Math.round(
    (Date.parse(`${dateJst}T00:00:00Z`) - Date.parse(`${todayJst}T00:00:00Z`)) /
      86400000,
  );
}

function QualityBadge({ quality }: { quality: "perfect" | "good" }) {
  return (
    <span className={`badge ${quality}`}>
      {quality === "perfect" ? "💎 perfect" : "✦ good"}
    </span>
  );
}

function SpotCard({
  entry,
  todayJst,
}: {
  entry: SpotResult;
  todayJst: string;
}) {
  const { spot, result, next } = entry;
  const g = result.geometry;
  const upcoming = result.candidates.filter((c) => c.dateJst >= todayJst);
  const kindLabel = g.kind === "sunrise" ? "🌅 日の出" : "🌇 日没";

  return (
    <article className="card">
      <header>
        <h2>{spot.name}</h2>
        <p className="pref">
          {spot.pref} — {kindLabel}ダイヤ
        </p>
      </header>
      {next ? (
        <p className="next">
          次は <strong>{formatDateJa(next.dateJst)}</strong> {next.timeJst}{" "}
          <QualityBadge quality={next.quality} />
          <span className="days-until">
            {daysUntil(next.dateJst, todayJst) === 0
              ? "今日!"
              : `あと ${daysUntil(next.dateJst, todayJst)} 日`}
          </span>
        </p>
      ) : (
        <p className="next none">今後 {SEARCH_DAYS} 日以内の候補なし</p>
      )}
      <p className="note">{spot.note}</p>
      <p className="geo">
        山頂方位 {g.azimuthDeg.toFixed(1)}° ・ 距離{" "}
        {(g.distanceM / 1000).toFixed(1)} km ・ 山頂仰角{" "}
        {g.summitAltDeg.toFixed(2)}° ・{" "}
        <a
          href={`https://www.google.com/maps?q=${spot.latDeg},${spot.lonDeg}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          地図
        </a>
      </p>
      {upcoming.length > 0 && (
        <details>
          <summary>候補日一覧({upcoming.length} 日)</summary>
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>時刻 (JST)</th>
                <th>精度</th>
                <th>Δalt</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((c) => (
                <tr key={c.utcMs}>
                  <td>{formatDateJa(c.dateJst)}</td>
                  <td>{c.timeJst}</td>
                  <td>
                    <QualityBadge quality={c.quality} />
                  </td>
                  <td className="delta">
                    {c.deltaAltDeg >= 0 ? "+" : ""}
                    {c.deltaAltDeg.toFixed(2)}°
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </article>
  );
}

export default function Home() {
  // F-05: 基準時刻はクライアントで一度だけ取得して core へ注入する
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const results = useMemo<SpotResult[] | null>(() => {
    if (nowMs === null) return null;
    const todayJst = jstToday(nowMs);
    const startMs = Date.parse(`${todayJst}T00:00:00+09:00`);
    const entries = SPOTS.map((spot) => {
      const result = findDiamondDates(
        spot.latDeg,
        spot.lonDeg,
        spot.elevM,
        startMs,
        SEARCH_DAYS,
      );
      return { spot, result, next: nextCandidate(result.candidates, todayJst) };
    });
    // 直近で見られる順に並べる(候補なしは末尾)
    entries.sort((a, b) => {
      if (!a.next) return 1;
      if (!b.next) return -1;
      return a.next.dateJst < b.next.dateJst ? -1 : 1;
    });
    return entries;
  }, [nowMs]);

  return (
    <div className="container">
      <header className="site-header">
        <h1>💎 ダイヤモンド富士ファインダー</h1>
        <p className="tagline">
          太陽が富士山頂に重なる「ダイヤモンド富士」を、いつ・どこで見られるか。
          定番 {SPOTS.length} 地点について天文計算(NOAA 太陽位置 + Vincenty
          測地)で候補日時を導出します。
        </p>
        <p className="tagline" style={{ marginTop: 4, fontSize: "0.8rem" }}>
          📱 スマホ対応
        </p>
      </header>

      {results === null ? (
        <p className="loading">計算中…</p>
      ) : (
        <main className="grid">
          {results.map((entry) => (
            <SpotCard
              key={entry.spot.id}
              entry={entry}
              todayJst={jstToday(nowMs as number)}
            />
          ))}
        </main>
      )}

      <footer className="site-footer">
        <p>
          判定: 太陽方位が山頂方位と一致する瞬間の高度差 |Δalt| ≤ 0.35°(good)/
          ≤ 0.15°(perfect)。大気差・地球曲率補正込み・時刻は JST。
        </p>
        <p>
          ⚠️ 天候・中間地形による遮蔽は考慮していません。観測地点の座標は代表値です。
          撮影・観測時は現地の状況を必ずご確認ください。
        </p>
        <p>
          <a
            href="https://github.com/twill3c/diamond-fuji-finder/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT License
          </a>{" "}
          © 2026 坂田哲朗 ・{" "}
          <a
            href="https://github.com/twill3c/diamond-fuji-finder"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          — 完全静的・外部 API 依存ゼロ ・{" "}
          <a
            href="https://claude.ai/code/artifact/d72a8132-d985-41f9-bb93-8e6127606148"
            target="_blank"
            rel="noopener noreferrer"
          >
            ダイヤモンド富士の探し方
          </a>{" "}
          ・{" "}
          <a
            href="https://claude.ai/code/artifact/95a92e74-e498-4f25-8bfa-d2f9a0067599"
            target="_blank"
            rel="noopener noreferrer"
          >
            ダイヤモンド富士ファインダー設計図
          </a>{" "}
          ・{" "}
          <a
            href="https://app-menu-amber.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            App Menu
          </a>
        </p>
      </footer>
    </div>
  );
}
