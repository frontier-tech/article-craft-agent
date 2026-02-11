# article-craft-agent

ブログ記事を自動生成する AI Agent。トピックを入力すると、リサーチ → 構成 → 執筆 → 編集の4段階パイプラインで高品質な記事を生成する。

## 技術スタック

- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- TypeScript + tsx
- Zod (バリデーション)

## プロジェクト構成

```
├── agents/               # エージェント定義 (SDK local plugin)
│   ├── researcher.md     # リサーチ担当 (WebSearch/WebFetch, sonnet)
│   ├── outliner.md       # 構成担当 (sonnet)
│   ├── writer.md         # 執筆担当 (opus)
│   └── editor.md         # 編集担当 (opus)
├── src/
│   ├── index.ts          # CLI エントリポイント
│   ├── config.ts         # プラグイン設定
│   ├── pipeline.ts       # オーケストレーター
│   ├── types.ts          # 型定義 + Zod スキーマ
│   └── output/
│       ├── index.ts      # ファイル保存
│       └── formatter.ts  # frontmatter 生成
└── output/               # 生成記事 (gitignore)
```

## 使い方

```bash
pnpm generate "トピック" [options]

# 例
pnpm generate "Introduction to WebAssembly" -s technical -l 1500 -v
pnpm generate "AIエージェントの活用事例" --style marketing --language ja
pnpm generate "Test" --dry-run
```

## Vercel デプロイ

### 本番環境

- **URL**: https://article-craft-agent.vercel.app
- **API**: https://article-craft-agent.vercel.app/api/generate
- **GitHub**: https://github.com/frontier-tech/article-craft-agent

### 重要な制約（Hobby Plan）

```json
{
  "maxDuration": 300,  // 5分（上限）
  "memory": 2048       // 2GB（上限）
}
```

⚠️ これらの制限を超える設定はデプロイエラーになる

### Snapshot メンテナンス

**重要**: Snapshotは7日で期限切れ。定期的な更新が必要。

```bash
# 6日ごとに実行（推奨）
vercel link              # 初回のみ
vercel env pull          # 初回のみ
node create-snapshot.mjs # Snapshot作成

# 出力されたSnapshot IDを確認
# → api/generate.ts の snapshotId を更新
# または環境変数 VERCEL_SNAPSHOT_ID を設定
```

### 環境変数（Vercel Dashboard）

必須：
- `ANTHROPIC_API_KEY` - Claude API Key
- `API_SECRET` - API認証用シークレット
- `GIT_REPO_URL` - GitHubリポジトリURL（Snapshot使用時は不要）
- `GIT_REPO_BRANCH` - ブランチ名（デフォルト: main）

オプション：
- `VERCEL_SNAPSHOT_ID` - Snapshot ID（ハードコードの代わり）

### トラブルシューティング

#### ❌ FUNCTION_INVOCATION_TIMEOUT

**原因**: 5分以内に完了しない
**解決策**:
1. Snapshotが正しく使用されているか確認
2. 予算を下げて短い記事を生成
3. エージェント数を減らす（将来的な改善）

#### ❌ Snapshot not found

**原因**: Snapshot期限切れ（7日経過）
**解決策**:
```bash
node create-snapshot.mjs
# 新しいIDでデプロイ
```

#### ❌ Environment variable not set

**原因**: ANTHROPIC_API_KEYが設定されていない
**解決策**:
1. Vercel Dashboard → Settings → Environment Variables
2. `ANTHROPIC_API_KEY` を追加
3. Redeploy

### デプロイ監視

```bash
# リアルタイム監視 + 自動テスト
./watch-deploy-gh.sh --test

# 監視のみ
./watch-deploy-gh.sh
```

### パフォーマンス最適化

| 項目 | 設定 | 理由 |
|------|------|------|
| Snapshot使用 | ✅ 必須 | 起動時間200s→30s |
| 予算制御 | 0.3-1.0 | タイムアウト防止 |
| モデル選択 | Sonnet/Opus | コストと品質のバランス |

### コスト見積もり

| 記事長 | 予算 | 実行時間 | 備考 |
|--------|------|---------|------|
| 300語 | $0.30 | ~3分 | 最小構成 |
| 800語 | $0.50 | ~4分 | 推奨 |
| 1500語 | $1.00 | ~5分 | 上限ギリギリ |

⚠️ 1500語以上はタイムアウトのリスクあり

## 開発規約

- コミットメッセージは英語、簡潔に
- ブランチ名: `feature/xxx`, `fix/xxx`, `chore/xxx`
- Snapshot更新後は必ずテスト実行
- 環境変数は `.env` に記載（gitignore済み）

## よくある質問

### Q: ローカルでテストする方法は？

```bash
vercel dev
# http://localhost:3000/api/generate でテスト可能
```

### Q: Snapshotを使わずにデプロイできる？

可能だが非推奨。起動時間が3-5分になりタイムアウトする。

### Q: Proプランにアップグレードすべき？

**長い記事（2000語以上）を生成したい場合**: Yes
- maxDuration: 300分（5時間）
- memory: 無制限
- コスト: $20/月〜

**短い記事（1500語以下）のみ**: No
- Hobbyプランで十分

### Q: 非同期処理に変更できる？

可能。Job Queue（Redis等）を導入すれば5分制限を回避できる。
詳細は `LEARNING.md` の「Advanced Topics」を参照。
