# CLAUDE.md

@AGENTS.md

上記ハーネスがこのリポジトリの正本ルール。要点のみ再掲する:

- 仕様の正本は SPEC.md。変更は スペック → テスト → 実装 の順。
- すべてのタスクは 7 段階ループプロトコル(AGENTS.md 末尾の共通規律)で進め、
  `python harness/looplog.py append` で `logs/loops/{loop_id}.jsonl` に記録する。
  失敗は気づいた瞬間に FAILURE_TAXONOMY のコード付きで記録する。
- 完了条件は `npm run verify` green + `looplog.py validate` 合格。
- `src/core` は純関数のみ(基準時刻は引数で注入、内部表現は UTC ミリ秒・表示は JST 固定)・
  カバレッジ 90% 以上を維持。決定性(同一入力 → 同一出力)を壊さない。
- 探索は必ず予算付き(N-04)。無限探索を書かない。
- 精度は既知値アンカー(NOAA 公表値・実観測シーズン)で独立検証する(N-05)。
- scaffold ブロック(AGENTS.md 末尾)と `.wt/gate.json` の上限は直接編集しない。
