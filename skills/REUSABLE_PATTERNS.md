# 再利用可能パターン・スキル

このドキュメントは、article-craft-agentプロジェクトで開発した再利用可能なパターンやスキルをまとめたものです。

---

## 1. Vercel Sandbox Snapshot Pattern

### 概要

依存関係がインストール済みのSnapshotを使用して、Vercel Function起動時間を劇的に短縮するパターン。

### 適用シーン

- Claude Agent SDK等、重い依存関係を使用するプロジェクト
- Vercel Functionの5分制限に悩まされる場合
- コールドスタート時間を最小化したい場合

### 実装

**1. Snapshot作成スクリプト**

```javascript
// create-snapshot.mjs
import { Sandbox } from "@vercel/sandbox";

async function createSnapshot() {
  const sandbox = await Sandbox.create({
    runtime: "node24",
    source: {
      type: "git",
      url: process.env.GIT_REPO_URL,
      revision: "main",
    },
  });

  // 依存関係インストール
  await sandbox.runCommand("pnpm", ["install"]);
  await sandbox.runCommand("npm", ["install", "-g", "heavy-package"]);

  // Snapshot作成
  const snapshot = await sandbox.snapshot();
  console.log(`Snapshot ID: ${snapshot.snapshotId}`);

  return snapshot;
}
```

**2. API実装**

```typescript
// api/your-endpoint.ts
import { Sandbox } from "@vercel/sandbox";

export default async function handler(req, res) {
  const sandbox = await Sandbox.create({
    source: {
      type: "snapshot",
      snapshotId: process.env.SNAPSHOT_ID,
    },
  });

  // 依存関係は既にインストール済み！
  const result = await sandbox.runCommand("your-command");

  await sandbox.stop();
  return res.json({ result });
}
```

**3. メンテナンス**

```bash
# 6日ごとに実行（7日で期限切れ）
node create-snapshot.mjs
# 新しいIDを環境変数に設定
```

### メリット

- ⚡ 起動時間: 200秒 → 30秒
- 🔒 再現性: 依存関係が固定される
- 💰 コスト削減: 起動時間分の課金削減

### デメリット

- 📅 7日で期限切れ（定期更新必要）
- 💾 ストレージコスト（微小）

### 他プロジェクトへの適用例

```bash
# Python ML プロジェクト
pip install -r requirements.txt  # Snapshot化

# Next.js プロジェクト
pnpm install && pnpm build  # Snapshot化

# Docker イメージビルド
docker build -t app .  # Snapshot化
```

---

## 2. GitHub API Deployment Monitoring

### 概要

GitHub Deployments APIを使用して、Vercel デプロイをリアルタイム監視するパターン。

### 実装

```bash
#!/bin/bash
# watch-deploy.sh

REPO="owner/repo"

while true; do
  STATUS=$(gh api "repos/${REPO}/deployments" --jq '.[0].id' | \
           xargs -I {} gh api "repos/${REPO}/deployments/{}/statuses" --jq '.[0].state')

  if [[ "$STATUS" == "success" ]]; then
    echo "✅ Deployment completed!"
    afplay /System/Library/Sounds/Glass.aiff  # macOS
    exit 0
  elif [[ "$STATUS" == "failure" ]]; then
    echo "❌ Deployment failed!"
    exit 1
  fi

  sleep 3
done
```

### 機能

- リアルタイム監視
- 音声通知（macOS）
- 自動テスト実行（`--test`フラグ）

### 適用シーン

- CI/CDパイプライン
- 長時間デプロイの監視
- 自動化されたワークフロー

---

## 3. Multi-Agent Orchestration Pattern

### 概要

複数の専門エージェントを順次実行して、複雑なタスクを分解処理するパターン。

### アーキテクチャ

```
Orchestrator
    ├─> Agent 1 (Research)   [Sonnet]
    ├─> Agent 2 (Plan)       [Sonnet]
    ├─> Agent 3 (Execute)    [Opus]
    └─> Agent 4 (Review)     [Opus]
```

### 実装

```typescript
const orchestratorPrompt = `
Execute these agents IN ORDER:
1. agent1 — Do X
2. agent2 — Do Y based on agent1's output
3. agent3 — Do Z based on agent2's output
Pass each agent's output to the next.
`;

for await (const message of query({ prompt: orchestratorPrompt })) {
  if (message.type === "result") {
    return message;
  }
}
```

### ベストプラクティス

1. **モデル選択**: 簡単なタスクはSonnet、重要なタスクはOpus
2. **予算配分**: 各エージェントの重要度に応じて配分
3. **エラーハンドリング**: 途中で失敗した場合のロールバック

### 適用例

- 記事生成（Research → Plan → Write → Edit）
- コード生成（Plan → Implement → Test → Document）
- データ分析（Collect → Clean → Analyze → Visualize）

---

## 4. Environment Variable Shell Injection Pattern

### 概要

Vercel Sandboxで環境変数を確実に渡すパターン。

### 問題

```typescript
// ❌ 動かない場合がある
await sandbox.runCommand("pnpm", ["generate"], {
  env: { API_KEY: "xxx" }
});
```

### 解決策

```typescript
// ✅ シェル経由で確実に渡す
const cmd = `API_KEY="${apiKey}" pnpm generate ${args.join(" ")}`;
await sandbox.runCommand("sh", ["-c", cmd]);
```

### 適用シーン

- Vercel Sandbox
- Docker コンテナ
- リモート実行環境

---

## 5. Progressive Budget Control Pattern

### 概要

予算制御でコストと品質をバランスするパターン。

### 実装

```typescript
const budgets = {
  draft: 0.3,      // ドラフト生成
  revision: 0.5,   // 修正
  final: 1.0,      // 最終版
};

// ドラフト生成（低予算）
const draft = await query({
  prompt: "Write draft",
  options: { maxBudgetUsd: budgets.draft }
});

// 満足いかなければ追加予算で修正
if (needsRevision) {
  const revised = await query({
    prompt: "Revise based on: " + draft,
    options: { maxBudgetUsd: budgets.revision }
  });
}
```

### メリット

- 💰 コスト最適化
- ⚡ 段階的な品質向上
- 🔄 柔軟な予算調整

---

## 6. Local Plugin Architecture Pattern

### 概要

エージェント定義をMarkdownファイルで管理するパターン。

### ディレクトリ構造

```
agents/
  ├── researcher.md
  ├── outliner.md
  ├── writer.md
  └── editor.md
```

### エージェント定義例

```markdown
---
name: researcher
model: claude-sonnet-4.5
tools: [WebSearch, WebFetch]
---

You are a research specialist.
Your task is to gather information about the given topic.

## Instructions
1. Search for reliable sources
2. Extract key facts and data
3. Cite all sources
```

### メリット

- 📝 非エンジニアでも編集可能
- 🔄 バージョン管理が容易
- 🔧 ロジックとプロンプトの分離

---

## Skills vs CLAUDE.md ガイドライン

### Skills として保存すべきもの

- ✅ 汎用的なパターン（複数プロジェクトで利用可能）
- ✅ 技術スタック非依存
- ✅ ベストプラクティス集

**例**:
- Snapshot Pattern（どのプロジェクトでも使える）
- Deployment Monitoring（汎用的）

### CLAUDE.md に保存すべきもの

- ✅ プロジェクト固有の設定
- ✅ 環境変数リスト
- ✅ トラブルシューティング

**例**:
- このプロジェクトのSnapshot ID
- Vercel設定値
- プロジェクト固有の注意点

---

## 推奨: Skills として切り出すべきパターン

1. **Vercel Sandbox Snapshot Pattern** ⭐⭐⭐
   - 汎用性: 高
   - 再利用頻度: 高
   - 推奨: Skill化

2. **GitHub Deployment Monitoring** ⭐⭐
   - 汎用性: 中
   - 再利用頻度: 中
   - 推奨: Scriptとして保存

3. **Multi-Agent Orchestration** ⭐⭐⭐
   - 汎用性: 高
   - 再利用頻度: 高
   - 推奨: Skill化

4. **Environment Variable Injection** ⭐⭐
   - 汎用性: 中
   - 再利用頻度: 低
   - 推奨: LEARNING.mdに記載

---

## 次のステップ

1. **Snapshotパターンの汎用化**:
   - CLI ツール化
   - 自動更新スクリプト

2. **監視スクリプトの改善**:
   - 複数プラットフォーム対応
   - Slack/Discord通知

3. **Multi-Agent Template**:
   - エージェント定義テンプレート
   - スターターキット

---

*Last updated: 2026-02-11*
