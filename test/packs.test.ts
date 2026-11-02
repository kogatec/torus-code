import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import YAML from "yaml";
import { astGrepBin } from "../src/core/checker.ts";
import { listPacks } from "../src/core/packs.ts";
import { BUNDLED_PACKS_DIR, LANGUAGE_BY_EXT } from "../src/core/paths.ts";

const packs = listPacks(BUNDLED_PACKS_DIR);

test("同梱パックがすべて読める", () => {
  assert.deepEqual(
    packs.map((p) => p.id),
    ["maintainable", "security-resilience", "simple-readable"],
  );
  for (const p of packs) {
    assert.ok(p.principles.length > 0, p.id);
    assert.ok(p.rules.length > 0, p.id);
    assert.ok(p.name && p.description, p.id);
  }
});

test("パックの YAML の一覧はすべて文字列（「: 」を含む文を引用符で囲み忘れると、マップになり [object Object] と表示される）", () => {
  const LIST_KEYS = ["values", "suited_for", "tradeoffs", "exclude_paths", "principles", "not_when"];
  for (const p of packs) {
    const files = ["pack.yaml", ...p.principles.map((x) => `principles/${x.id}.yaml`)];
    for (const rel of files) {
      const raw = YAML.parse(fs.readFileSync(path.join(p.dir, rel), "utf8"));
      const lists = [...LIST_KEYS.map((k) => [k, raw[k]] as const), ["checks.static", raw.checks?.static] as const];
      for (const [key, list] of lists) {
        for (const item of Array.isArray(list) ? list : []) {
          assert.equal(typeof item, "string", `${p.id}/${rel} の ${key}：${JSON.stringify(item)}`);
        }
      }
    }
  }
});

test("原則 ID とルール ID が重複しない", () => {
  const principleIds = packs.flatMap((p) => p.principles.map((x) => x.id));
  assert.equal(new Set(principleIds).size, principleIds.length, "原則 ID が重複");
  const ruleIds = packs.flatMap((p) => p.rules.map((r) => r.id));
  assert.equal(new Set(ruleIds).size, ruleIds.length, "ルール ID が重複");
});

test("ルールは同じパックの原則に結びつき、原則の static はルールを参照できる", () => {
  for (const p of packs) {
    const own = new Set(p.principles.map((x) => x.id));
    const ruleIds = new Set(p.rules.map((r) => r.id));
    for (const r of p.rules) assert.ok(own.has(r.principle), `${p.id}: ${r.id} の原則 ${r.principle} がパックにない`);
    for (const x of p.principles) {
      for (const id of x.checks.static ?? []) assert.ok(ruleIds.has(id), `${x.id} の ${id}`);
    }
  }
});

/** 原則に書く言語名 → ルールの language（JavaScript は TypeScript のルールで検査する） */
const RULE_LANGUAGE: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "TypeScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
};

test("pack.yaml の languages は検査できる言語と一致し、どの言語にもルールがある", () => {
  const supported = [...new Set(Object.values(LANGUAGE_BY_EXT))].sort();
  assert.deepEqual(Object.keys(RULE_LANGUAGE).sort(), supported);
  for (const p of packs) {
    const declared = YAML.parse(fs.readFileSync(path.join(p.dir, "pack.yaml"), "utf8")).languages;
    assert.deepEqual([...declared].sort(), supported, `${p.id} の languages`);
    const ruleLanguages = new Set(p.rules.map((r) => r.language));
    for (const lang of supported) assert.ok(ruleLanguages.has(RULE_LANGUAGE[lang]), `${p.id}：${lang} のルールがない`);
    for (const lang of ruleLanguages) assert.ok(Object.values(RULE_LANGUAGE).includes(lang), `${p.id}：${lang}`);
  }
});

test("原則の applies_when.languages には、検査できる言語だけを書く", () => {
  const supported = new Set<string>(Object.values(LANGUAGE_BY_EXT));
  for (const p of packs) {
    for (const x of p.principles) {
      for (const lang of x.applies_when?.languages ?? []) assert.ok(supported.has(lang), `${x.id}：${lang}`);
    }
  }
});

test("静的検査を持つ必須の原則は、どの言語にもルールがある（危険がない言語は理由を書いて除く）", () => {
  // Rust・Go でよく使うデシリアライズ（serde・encoding/json など）は、読み込んだデータでコードを実行しない
  const NOT_APPLICABLE: Record<string, string[]> = { "SEC-DESER-009": ["Rust", "Go"] };
  const languages = [...new Set(Object.values(RULE_LANGUAGE))];
  for (const p of packs) {
    for (const x of p.principles.filter((x) => x.level === "mandatory" && (x.checks.static ?? []).length > 0)) {
      const covered = new Set(p.rules.filter((r) => r.principle === x.id).map((r) => r.language));
      assert.deepEqual(
        languages.filter((l) => !covered.has(l)),
        NOT_APPLICABLE[x.id] ?? [],
        x.id,
      );
    }
  }
});

for (const pack of packs) {
  test(`${pack.id}：ast-grep test --skip-snapshot-tests が通る`, () => {
    const r = spawnSync(astGrepBin(), ["test", "--skip-snapshot-tests"], {
      cwd: path.join(BUNDLED_PACKS_DIR, pack.id),
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
}
