# 設計判断の記録

原則どうしが衝突したときや、設計を変える判断をしたときに、1行ずつ追記します。

- 2026-11-02：Rust・Go・Java に対応。JavaScript は専用のルールを持たず、ast-grep の languageGlobs で Tsx として読み、TypeScript のルールを当てる（ルールの重複を避けるため）。SEC-DESER-009 は、標準的なデコーダがコードを実行しない Rust・Go にはルールを置かない（SIM-DUP-011, SEC-DESER-009）
- 2026-11-02：JavaScript の検査はパックの languages に javascript があるときだけ、target・vendor の除外は隣にビルドの目印（Cargo.toml・pom.xml・build.gradle／go.mod）があるときだけにする（プラグインの更新だけで既存のプロジェクトの検査が変わらないように、また同じ名前のディレクトリにある自前のコードを外さないように）。1ファイルの検査は、その言語のルールだけを読み込む設定で行う（MNT-API-005, SEC-PATH-004）
