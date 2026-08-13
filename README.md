# diamond-fuji-finder — ダイヤモンド富士ファインダー

ダイヤモンド富士(太陽が富士山頂に重なって見える現象)が「いつ・どこで見られるか」を、
観測地点ごとに天文計算で求めて一覧表示する完全静的サイト。
NOAA 太陽位置アルゴリズム + Vincenty 測地計算による決定的計算のみで、外部 API 依存ゼロ・運用コストゼロ。

- 仕様: [SPEC.md](SPEC.md) / テスト仕様: [TEST_SPEC.md](TEST_SPEC.md)
- エージェント向けハーネス: [AGENTS.md](AGENTS.md)

## 開発

```bash
npm install
npm run dev           # 開発サーバ
npm run verify:fast   # typecheck + lint + test
npm run verify        # 上記 + next build(完了条件)
```

## 仕組み

1. **太陽位置(F-01)** — NOAA Solar Position アルゴリズムで任意時刻の太陽方位・見かけ高度(大気差補正込み)を計算
2. **富士山ジオメトリ(F-02)** — 観測地点から剣ヶ峰への測地方位角(Vincenty 逆解)と、地球曲率・大気屈折補正込みの山頂見かけ仰角を計算
3. **ダイヤモンド窓探索(F-03)** — 日ごとに太陽方位が山頂方位と一致する時刻を予算付き二分探索で求め、高度差 ≤ 0.35° なら候補と判定
