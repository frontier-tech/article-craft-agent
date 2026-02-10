# article-craft-agent

ブログ記事を自動生成する AI Agent。トピックを入力すると、リサーチ → 構成 → 執筆 → 編集の4段階パイプラインで高品質な記事を生成する。

## 技術スタック

- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- TypeScript + tsx
- Zod (バリデーション)

## プロジェクト構成

```
src/
├── index.ts          # CLI エントリポイント
├── pipeline.ts       # オーケストレーター
├── types.ts          # 型定義 + Zod スキーマ
├── agents/
│   ├── index.ts      # re-export
│   ├── researcher.ts # リサーチ担当 (WebSearch/WebFetch, sonnet)
│   ├── outliner.ts   # 構成担当 (sonnet)
│   ├── writer.ts     # 執筆担当 (opus)
│   └── editor.ts     # 編集担当 (opus)
└── output/
    ├── index.ts      # ファイル保存
    └── formatter.ts  # frontmatter 生成
```

## 使い方

```bash
pnpm generate "トピック" [options]

# 例
pnpm generate "Introduction to WebAssembly" -s technical -l 1500 -v
pnpm generate "AIエージェントの活用事例" --style marketing --language ja
pnpm generate "Test" --dry-run
```

## 開発規約

- コミットメッセージは英語、簡潔に
- ブランチ名: `feature/xxx`, `fix/xxx`, `chore/xxx`
