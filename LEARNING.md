# Learning Note: Multi-Agent Article Generation with Claude Agent SDK on Vercel

このドキュメントは、article-craft-agentプロジェクトを通じて学んだ技術やサービスを体系的にまとめた学習ノートです。

---

## Table of Contents

1. [Claude Agent SDK](#claude-agent-sdk)
2. [Vercel Sandbox](#vercel-sandbox)
3. [Multi-Agent Orchestration](#multi-agent-orchestration)
4. [Performance Optimization](#performance-optimization)
5. [Deployment Best Practices](#deployment-best-practices)

---

## Claude Agent SDK

### 概要

Claude Agent SDKは、Anthropic社が提供するエージェントフレームワークで、Claude AIを使用して複雑なタスクを自動化できます。

### 基本構成

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Your task description",
  apiKey: process.env.ANTHROPIC_API_KEY,
  options: {
    plugins: [{ type: "local", path: "./agents" }],
    allowedTools: ["Read", "Write", "WebSearch"],
    permissionMode: "bypassPermissions",
    maxBudgetUsd: 1.0,
  },
});
```

### 重要な概念

#### 1. Local Plugins

エージェント定義をMarkdownファイルで管理：

```markdown
<!-- agents/researcher.md -->
---
name: researcher
model: claude-sonnet-4.5
tools: [WebSearch, WebFetch]
---

You are a research specialist...
```

**メリット**:
- エージェントロジックをコードから分離
- バージョン管理が容易
- 非エンジニアでも編集可能

#### 2. Tool Permissions

```typescript
allowedTools: [
  "Read",      // ファイル読み取り
  "Write",     // ファイル書き込み
  "Glob",      // ファイル検索
  "Grep",      // コンテンツ検索
  "Task",      // サブエージェント起動
  "WebSearch", // Web検索
  "WebFetch",  // Webページ取得
]
```

**セキュリティ**: `permissionMode: "bypassPermissions"` は開発用。本番では慎重に設定。

#### 3. Budget Control

```typescript
maxBudgetUsd: 1.0  // 最大予算（USD）
```

**動作**:
- APIコスト累積を監視
- 予算超過で自動停止
- エラーコード: `error_max_budget_usd`

### システム要件

1. **Node.js 18+** または **Python 3.10+**
2. **Claude Code CLI**: `npm install -g @anthropic-ai/claude-code`
3. **ANTHROPIC_API_KEY**: 環境変数で設定

### 重要な注意点

#### ❗ API Keyの渡し方

**間違い**:
```typescript
// 環境変数に依存（動作しない場合あり）
await query({ prompt: "..." });
```

**正解**:
```typescript
// 明示的に渡す
await query({
  prompt: "...",
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

#### ❗ Claude Code CLIの認証

SDK内部でClaude Code CLIを使用するため、以下が必要：

1. グローバルインストール: `npm install -g @anthropic-ai/claude-code`
2. API Keyが環境変数に設定されている
3. または、`query()`に`apiKey`を渡す

---

## Vercel Sandbox

### 概要

Vercel Sandboxは、安全なコード実行環境を提供するエフェメラルLinux VM。

### アーキテクチャ

```
┌─────────────────────────────────────┐
│     Vercel Function (Node.js)       │
│  (Your API endpoint code)           │
└───────────────┬─────────────────────┘
                │ Creates
                ▼
┌─────────────────────────────────────┐
│    Vercel Sandbox (Firecracker)     │
│  ┌───────────────────────────────┐  │
│  │  Amazon Linux 2023            │  │
│  │  - Node.js 24 runtime         │  │
│  │  - Isolated filesystem        │  │
│  │  - Network firewall           │  │
│  │  - Sudo access                │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 基本使用法

```typescript
import { Sandbox } from "@vercel/sandbox";

// 1. Sandboxを作成
const sandbox = await Sandbox.create({
  runtime: "node24",
  timeout: 300000, // 5分
  source: {
    type: "git",
    url: "https://github.com/user/repo.git",
    revision: "main",
  },
});

// 2. コマンド実行
const result = await sandbox.runCommand("npm", ["install"]);

// 3. ファイル操作
await sandbox.writeFiles([
  { path: ".env", content: Buffer.from("KEY=value") }
]);

// 4. クリーンアップ
await sandbox.stop();
```

### Source Types

#### 1. Git Repository

```typescript
source: {
  type: "git",
  url: "https://github.com/user/repo.git",
  revision: "main",
  depth: 1,  // shallow clone
}
```

**メリット**: 常に最新コード
**デメリット**: Clone時間（~10秒）

#### 2. Tarball

```typescript
source: {
  type: "tarball",
  url: "https://example.com/project.tar.gz",
}
```

**メリット**: 高速
**デメリット**: 事前準備が必要

#### 3. Snapshot ⭐ 推奨

```typescript
source: {
  type: "snapshot",
  snapshotId: "snap_abc123",
}
```

**メリット**:
- 依存関係が事前インストール済み
- 起動が超高速（~30秒）
- 再現性が高い

**デメリット**:
- 7日で期限切れ
- 定期的な更新が必要

### Snapshot ワークフロー

#### 作成

```typescript
const sandbox = await Sandbox.create({
  runtime: "node24",
  source: { type: "git", url: "..." },
});

await sandbox.runCommand("pnpm", ["install"]);
await sandbox.runCommand("npm", ["install", "-g", "@anthropic-ai/claude-code"]);

const snapshot = await sandbox.snapshot();
console.log(snapshot.snapshotId); // snap_xxx
```

#### 使用

```typescript
const sandbox = await Sandbox.create({
  source: {
    type: "snapshot",
    snapshotId: "snap_xxx",
  },
});
// 依存関係は既にインストール済み！
```

#### 更新

```bash
# 7日ごとに実行
node create-snapshot.mjs
# 新しいIDをapi/generate.tsに反映
```

### 認証

#### OIDC Token（推奨）

```bash
vercel link
vercel env pull
```

これで`.env.local`に`VERCEL_OIDC_TOKEN`が設定される。

#### Access Token

```bash
export VERCEL_ACCESS_TOKEN=xxx
```

---

## Multi-Agent Orchestration

### パターン: Sequential Pipeline

```typescript
const orchestratorPrompt = `
Execute these agents IN ORDER:
1. researcher — Research the topic
2. outliner — Create article outline
3. writer — Write full article
4. editor — Polish and finalize

Pass output of each agent to the next.
`;

for await (const message of query({ prompt: orchestratorPrompt })) {
  if (message.type === "assistant") {
    // オーケストレーターの出力
  }
  if (message.type === "result") {
    // 完了
  }
}
```

### エージェント間のデータフロー

```
Input: "Introduction to WebAssembly"
   ↓
┌─────────────┐
│ Researcher  │ → WebSearch, WebFetch
└──────┬──────┘
       │ Research findings, sources
       ↓
┌─────────────┐
│  Outliner   │ → Plan article structure
└──────┬──────┘
       │ Detailed outline
       ↓
┌─────────────┐
│   Writer    │ → Write full article (Opus)
└──────┬──────┘
       │ Draft article
       ↓
┌─────────────┐
│   Editor    │ → Polish, add metadata (Opus)
└──────┬──────┘
       │
       ↓
Final Article + JSON metadata
```

### モデル選択

| エージェント | モデル | 理由 |
|-------------|--------|------|
| Researcher  | Sonnet | コスト効率、WebSearch十分 |
| Outliner    | Sonnet | 構造化タスク、高速 |
| Writer      | Opus   | 高品質な文章生成 |
| Editor      | Opus   | 最終仕上げ、品質重視 |

### コスト最適化

```typescript
// 予算配分の例
{
  researcher: 0.1,  // 簡単なリサーチ
  outliner: 0.1,    // 構造化
  writer: 0.5,      // メイン（高品質）
  editor: 0.3,      // 最終チェック
}
```

---

## Performance Optimization

### 問題: Cold Start

```
┌─────────────────────────────────────────┐
│ Without Snapshot                        │
├─────────────────────────────────────────┤
│ Sandbox create:        10s              │
│ Git clone:             10s              │
│ pnpm install:          60s              │
│ Claude Code install:   120s  ⚠️         │
├─────────────────────────────────────────┤
│ Total Setup:           200s             │
│ + Agent execution:     180-300s         │
├─────────────────────────────────────────┤
│ TOTAL:                 380-500s  ❌     │
│                        (Timeout at 300s)│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ With Snapshot                           │
├─────────────────────────────────────────┤
│ Snapshot load:         30s  ⚡          │
├─────────────────────────────────────────┤
│ Total Setup:           30s              │
│ + Agent execution:     180-300s         │
├─────────────────────────────────────────┤
│ TOTAL:                 210-330s  ✅     │
│                        (Within 300s!)   │
└─────────────────────────────────────────┘
```

### 最適化テクニック

#### 1. Snapshot使用

**効果**: 起動時間 200s → 30s（-170秒）

#### 2. 予算制御

```typescript
maxBudgetUsd: 0.3  // 小さい記事は低予算
```

**効果**: 不要なターン削減

#### 3. モデル選択

```typescript
// リサーチはSonnetで十分
model: "claude-sonnet-4.5"  // 安価
// 執筆はOpusで高品質
model: "claude-opus-4.6"    // 高品質
```

**効果**: コスト削減、速度向上

#### 4. Tool制限

```typescript
allowedTools: [
  "WebSearch",  // 必要なものだけ
  "WebFetch",
  "Read",
  "Write",
]
```

**効果**: 不要なツール使用を防ぐ

---

## Deployment Best Practices

### 1. Environment Variables

```bash
# Vercelダッシュボードで設定
ANTHROPIC_API_KEY=sk-ant-xxx
API_SECRET=your-secret
VERCEL_SNAPSHOT_ID=snap_xxx  # Optional
```

**重要**: `.env`ファイルはgitignore！

### 2. Error Handling

```typescript
try {
  const result = await sandbox.runCommand(...);
  if (result.exitCode !== 0) {
    const stderr = await result.stderr();
    return res.status(500).json({
      error: "Command failed",
      details: { exitCode, stderr, stdout }
    });
  }
} catch (error) {
  console.error(error);
  return res.status(500).json({
    error: error.message
  });
} finally {
  await sandbox?.stop();  // 必ずクリーンアップ
}
```

### 3. Timeout設定

```json
{
  "functions": {
    "api/generate.ts": {
      "maxDuration": 300,  // Hobbyプラン上限
      "memory": 2048       // Hobbyプラン上限
    }
  }
}
```

### 4. Monitoring

```bash
# デプロイ監視
./watch-deploy-gh.sh --test

# ログ確認
vercel logs https://your-app.vercel.app
```

### 5. Snapshot Maintenance

```bash
# 6日ごとに更新（7日で期限切れ）
0 0 */6 * * cd /path/to/project && node create-snapshot.mjs
```

---

## Common Pitfalls and Solutions

### ❌ Pitfall 1: Environment Variables Not Passed

**問題**:
```typescript
await sandbox.runCommand("pnpm", ["generate"], { env: { KEY: "value" } });
// ❌ 環境変数が子プロセスに伝わらない
```

**解決**:
```typescript
await sandbox.runCommand("sh", ["-c", `KEY=value pnpm generate`]);
// ✅ シェル経由で環境変数を設定
```

### ❌ Pitfall 2: Timeout on Hobby Plan

**問題**: 15分のタイムアウトを設定
**エラー**: `maxDuration must be between 1 and 300 seconds`

**解決**: Hobbyプランは最大300秒
```json
{ "maxDuration": 300 }
```

### ❌ Pitfall 3: Snapshot Expiration

**問題**: 7日後にSnapshot期限切れ
**症状**: `Snapshot not found` エラー

**解決**: 定期的に更新
```bash
node create-snapshot.mjs
```

### ❌ Pitfall 4: Claude Code CLI Not Found

**問題**: `Claude Code process exited with code 1`
**原因**: Claude Code CLIが未インストール

**解決**:
```typescript
await sandbox.runCommand("npm", ["install", "-g", "@anthropic-ai/claude-code"]);
```

---

## Advanced Topics

### Async Processing

長時間実行タスク用：

```typescript
// Job Queueパターン
app.post("/api/generate", async (req, res) => {
  const jobId = uuid();
  queue.add({ jobId, ...req.body });
  res.json({ jobId, status: "queued" });
});

app.get("/api/status/:jobId", async (req, res) => {
  const job = await queue.getJob(req.params.jobId);
  res.json({ status: job.status, result: job.result });
});
```

### Streaming Response

リアルタイム進捗：

```typescript
res.setHeader("Content-Type", "text/event-stream");

for await (const message of query(...)) {
  if (message.type === "assistant") {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }
}
```

### Snapshot Automation

GitHub Actions:

```yaml
name: Refresh Snapshot
on:
  schedule:
    - cron: "0 0 */6 * *"  # Every 6 days

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: node create-snapshot.mjs
```

---

## Resources

### Documentation

- [Claude Agent SDK](https://github.com/anthropics/claude-code/tree/main/agent-sdk)
- [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox)
- [Vercel Functions](https://vercel.com/docs/functions)

### Tools

- [Vercel CLI](https://vercel.com/docs/cli)
- [GitHub CLI](https://cli.github.com/)

### Community

- [Anthropic Discord](https://discord.gg/anthropic)
- [Vercel Discord](https://discord.gg/vercel)

---

*Last updated: 2026-02-11*
