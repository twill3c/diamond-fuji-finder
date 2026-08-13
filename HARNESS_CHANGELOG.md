# HARNESS_CHANGELOG — diamond-fuji-finder

ハーネス(AGENTS.md / taxonomy / ゲート)への変更提案・実施の記録。
scaffold 管理領域の変更はここで起票し、レジストリ経由で反映する。

## HC-001: taxonomy に GEN-LOGIC(生成コードの論理誤り)を追加

- **日付**: 2026-08-13(loop_001)
- **契機**: JS の `-360 % 360 === -0` を見落とした `normDeg` の実装バグを記録しようとしたが、
  既存コードに該当なし(GEN-HALLUC は「存在しない API」、GEN-REGRESS は「既存テストの破壊」であり、
  「API も仕様理解も正しいが実装ロジックが誤り」を指すコードが存在しない)。
- **対応**: FAILURE_TAXONOMY の規範(該当なしのとき `カテゴリ-OTHER` を使わず taxonomy にコードを
  追加してから記録する)に従い、プロジェクトの `schema/taxonomy.json` に `GEN-LOGIC` を追加した。
- **要フォローアップ**: `schema/taxonomy.json` は scaffold-kit 管理ファイルのため、この追加は
  ローカル修正(scaffoldctl status で MODIFIED)である。レジストリへの還流を人間が判断すること。
