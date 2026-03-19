# cron認証ガード（gabigabi）

定期実行ジョブの最初で `scripts/ensure-gabigabi-auth.sh` を実行し、
GitHubアカウント・権限・remote設定を検証します。

## 目的

- `gh auth status` の表示と実際のAPI権限のズレを検出する
- `origin` が `git@github-ek:e-komiya/gabigabi.git` であることを保証する
- HTTPS remote や fork (`eisei-komiya/*`) への誤pushを防ぐ

## 使い方

```bash
bash scripts/ensure-gabigabi-auth.sh
```

失敗時は以降の処理を中断し、エラーをそのまま報告してください。
