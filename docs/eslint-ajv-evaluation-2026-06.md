# ESLint 系更新で `ajv` moderate を解消できるかの確認 (2026-06)

最終更新: 2026-06-19 (Asia/Tokyo)
対象 issue: #300

## 背景

`npm audit --json` に残る `ajv@6.12.6` は dev 依存で、依存元は `eslint@8.57.1` と `@eslint/eslintrc@2.1.4` です。
このメモでは、override で `ajv` だけを差し替えるのではなく、ESLint 系更新で安全に解消できるかを確認しました。

## 確認したこと

### 現在の依存状況

- アプリの devDependencies は `eslint@^8.19.0`
- lockfile 上の実体は `eslint@8.57.1`
- `eslint-config-universe@15.2.0` は現時点でも最新
- `npm view eslint-config-universe@15.2.0 peerDependencies --json` の結果では `eslint >=8.10` を要求

### ESLint 9 系の試行結果

`npm install --ignore-scripts` の後に `eslint@^9`, `@eslint/eslintrc@^3` へ更新して lint を実行したところ、次のエラーで停止しました。

```text
ESLint: 9.39.4
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
From ESLint v9.0.0, the default configuration file is now eslint.config.js.
```

## 判断

- `ajv` を消す最短経路は ESLint 9 系以降への移行だが、現状の `.eslintrc` ベース設定のままでは lint が壊れる
- `eslint-config-universe` 自体には更新余地がなく、依存更新だけで自然に解消する経路は現時点では見当たらない
- `ajv` は dev 限定の moderate なので、無理に override せず、ESLint flat config への移行作業とセットで扱うのが安全

## 次にやるなら

1. `.eslintrc` から `eslint.config.js` への移行差分を別 PR で作る
2. その上で ESLint 9 系へ上げ、`npm run lint` と `npm test -- --runInBand` を再確認する
3. 問題なければ `ajv` の残件が消えるかを再度 `npm audit --json` で確認する

## 結論

2026-06-19 時点では、`ajv` moderate は「ESLint 設定移行を伴う更新タスク」として扱うのが妥当です。
依存更新だけで安全に閉じる状態ではないため、この issue は調査結果の記録までを今回の完了範囲とします。
