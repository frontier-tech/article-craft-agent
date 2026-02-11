# article-craft-agent

AI-powered blog article generator using Claude Agent SDK. Generate high-quality articles through a 4-phase pipeline: Research → Outline → Write → Edit.

## Features

- **Multi-agent pipeline**: 4 specialized agents working in sequence
  - **Researcher**: Web search and fact gathering (Sonnet)
  - **Outliner**: Article structure planning (Sonnet)
  - **Writer**: Full article composition (Opus)
  - **Editor**: Final polish and formatting (Opus)
- **Customizable**: Control style, tone, audience, length, and language
- **Cost tracking**: Built-in budget limits and cost monitoring
- **Vercel deployment**: API endpoint for serverless article generation

## Tech Stack

- [Claude Agent SDK](https://github.com/anthropics/claude-code/tree/main/agent-sdk) - Multi-agent orchestration
- TypeScript + tsx
- Zod - Schema validation
- Vercel Sandbox - Secure code execution environment

## Installation

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Local Usage

```bash
# Basic usage
pnpm generate "Introduction to WebAssembly"

# With options
pnpm generate "React Server Components" \
  --style technical \
  --audience "frontend developers" \
  --length 2000 \
  --verbose

# Japanese article
pnpm generate "AIエージェントの活用事例" \
  --style marketing \
  --language ja

# Dry run (show config without generating)
pnpm generate "Test Topic" --dry-run
```

### Available Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--style` | `-s` | Article style: technical, marketing, tutorial, opinion, news | technical |
| `--audience` | `-a` | Target audience | general readers |
| `--tone` | `-t` | Writing tone | professional |
| `--length` | `-l` | Target word count | 1500 |
| `--language` | | Language code (en, ja, etc.) | en |
| `--keywords` | `-k` | Comma-separated keywords | |
| `--verbose` | `-v` | Show detailed pipeline progress | false |
| `--dry-run` | | Show config without generating | false |
| `--max-budget` | | Max budget in USD | 1.00 |
| `--output-dir` | `-o` | Output directory | ./output |

## Vercel Deployment

### Prerequisites

1. **GitHub Repository**: Push this project to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com)

### Step 1: Configure Environment Variables

In Vercel dashboard, add these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-xxxxx` |
| `API_SECRET` | Secret key for API authentication | `your-random-secret-key` |
| `GIT_REPO_URL` | GitHub repository URL | `https://github.com/frontier-tech/article-craft-agent.git` |
| `GIT_REPO_BRANCH` | Branch to use (optional) | `main` |

To add environment variables:
1. Go to your Vercel project → Settings → Environment Variables
2. Add each variable above
3. Select all environments (Production, Preview, Development)

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Link project and deploy
vercel

# Or deploy via GitHub integration:
# 1. Import project in Vercel dashboard
# 2. Connect your GitHub repository
# 3. Deploy automatically on push
```

### Step 3: Use the API

Once deployed, your API will be available at `https://your-app.vercel.app/api/generate`.

#### Request Example

```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{
    "topic": "Introduction to WebAssembly",
    "style": "technical",
    "audience": "web developers",
    "tone": "professional",
    "length": 1500,
    "language": "en",
    "keywords": ["wasm", "performance", "web"],
    "maxBudgetUsd": 1.0,
    "verbose": false
  }'
```

#### Response Example

```json
{
  "success": true,
  "article": {
    "filename": "introduction-to-webassembly-2026-02-11.md",
    "frontmatter": {
      "title": "Introduction to WebAssembly",
      "slug": "introduction-to-webassembly",
      "date": "2026-02-11",
      "tags": ["wasm", "performance", "web"],
      "sources": ["https://webassembly.org/", "..."]
    },
    "content": "# Introduction to WebAssembly\n\n..."
  },
  "logs": {
    "stdout": "...",
    "stderr": ""
  }
}
```

#### Error Responses

```json
{
  "error": "Article generation failed",
  "details": "Failed to install dependencies: ..."
}
```

### How It Works

1. **API receives request** → Validates config and API key
2. **Vercel Sandbox created** → ⚡ Loads from pre-built snapshot (~30sec)
3. **Article generated** → Executes the 4-agent pipeline
4. **Article returned** → Downloads and parses the result
5. **Sandbox stopped** → Cleans up resources

> **🚀 Performance Optimization**: Uses Vercel Sandbox Snapshots to skip dependency installation, reducing startup time from ~3 minutes to ~30 seconds.

### Architecture

```
┌─────────────┐      POST      ┌──────────────────┐
│   Client    │  ────────────> │ Vercel Function  │
│             │                 │  /api/generate   │
└─────────────┘                 └────────┬─────────┘
                                         │
                                         ▼
                                ┌────────────────────┐
                                │  Vercel Sandbox    │
                                │  (Linux microVM)   │
                                │                    │
                                │  1. Clone from Git │
                                │  2. pnpm install   │
                                │  3. Run pipeline   │
                                │  4. Return article │
                                └────────────────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        ▼                ▼                ▼
                   researcher       outliner          writer
                   (Sonnet)         (Sonnet)          (Opus)
                                                          │
                                                          ▼
                                                       editor
                                                       (Opus)
```

### Deployment Considerations

- **Max Duration**: 15 minutes (configurable in `vercel.json`)
- **Memory**: 3008MB (configurable in `vercel.json`)
- **Timeout**: Adjust based on your Vercel plan
  - Hobby: up to 45 minutes
  - Pro/Enterprise: up to 5 hours
- **Cost**: Dominated by Claude API usage (~$0.01-0.10 per article)
- **Sandbox Cost**: ~$0.05/hour + API tokens

### Snapshot Maintenance

The API uses Vercel Sandbox Snapshots for fast startup. Snapshots expire after **7 days** and must be refreshed:

```bash
# Refresh snapshot (every 7 days)
vercel link              # If not already linked
vercel env pull          # Pull environment variables
node create-snapshot.mjs # Create new snapshot

# The script will output a new snapshot ID
# Update api/generate.ts with the new ID, or set VERCEL_SNAPSHOT_ID env var
```

**When to refresh snapshot**:
- After updating dependencies (`package.json`)
- After changing agent definitions (`agents/*.md`)
- Every 7 days (automatic expiration)

### Local Development

To test the API locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Start development server
vercel dev

# Test API
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{"topic": "Test", "style": "technical", ...}'
```

## Project Structure

```
├── agents/               # Agent definitions (SDK local plugins)
│   ├── researcher.md     # Research agent (WebSearch/WebFetch)
│   ├── outliner.md       # Outline agent
│   ├── writer.md         # Writing agent
│   └── editor.md         # Editing agent
├── api/                  # Vercel Functions
│   └── generate.ts       # Article generation endpoint
├── src/
│   ├── index.ts          # CLI entry point
│   ├── pipeline.ts       # Orchestrator
│   ├── config.ts         # Plugin configuration
│   ├── types.ts          # Type definitions + Zod schemas
│   └── output/
│       ├── index.ts      # File saving
│       └── formatter.ts  # Frontmatter generation
├── output/               # Generated articles (gitignored)
├── vercel.json           # Vercel configuration
└── package.json
```

## Development

```bash
# Type check
pnpm typecheck

# Generate article (local)
pnpm generate "Your Topic" --verbose
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or PR.
