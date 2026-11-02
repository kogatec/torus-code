import assert from "node:assert/strict";
import { test } from "node:test";
import { languageOf, relativeToRoot } from "../src/core/paths.ts";

test("languageOf：拡張子から言語を返し、検査できない拡張子は null", () => {
  assert.equal(languageOf("src/a.ts"), "typescript");
  assert.equal(languageOf("src/View.TSX"), "typescript");
  assert.equal(languageOf("web/app.js"), "javascript");
  assert.equal(languageOf("web/App.jsx"), "javascript");
  assert.equal(languageOf("lib/a.mjs"), "javascript");
  assert.equal(languageOf("lib/a.cjs"), "javascript");
  assert.equal(languageOf("app/main.py"), "python");
  assert.equal(languageOf("src/lib.rs"), "rust");
  assert.equal(languageOf("cmd/server/main.go"), "go");
  assert.equal(languageOf("src/main/java/App.java"), "java");
  assert.equal(languageOf("README.md"), null);
  assert.equal(languageOf("Cargo.toml"), null);
});

test("relativeToRoot：プロジェクトの中は / 区切りの相対パス、外は null", () => {
  assert.equal(relativeToRoot("/p", "/p/src/a.ts"), "src/a.ts");
  assert.equal(relativeToRoot("/p", "src/a.ts"), "src/a.ts");
  assert.equal(relativeToRoot("/p", "/p"), "");
  assert.equal(relativeToRoot("/p", "/other/a.ts"), null);
  assert.equal(relativeToRoot("/p", "/p/../a.ts"), null);
  assert.equal(relativeToRoot("/p/sub", "/p"), null);
});

test("relativeToRoot：.. で始まる名前のファイルやディレクトリは、プロジェクトの中として扱う", () => {
  assert.equal(relativeToRoot("/p", "/p/..foo/a.ts"), "..foo/a.ts");
  assert.equal(relativeToRoot("/p", "/p/..a.ts"), "..a.ts");
});
