import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { ArticleConfigSchema } from "./types.js";
import { runPipeline } from "./pipeline.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    style: { type: "string", short: "s", default: "technical" },
    audience: { type: "string", short: "a", default: "general readers" },
    tone: { type: "string", short: "t", default: "professional" },
    length: { type: "string", short: "l", default: "1500" },
    language: { type: "string", default: "en" },
    keywords: { type: "string", short: "k", default: "" },
    verbose: { type: "boolean", short: "v", default: false },
    "dry-run": { type: "boolean", default: false },
    "max-budget": { type: "string", default: "1.00" },
    "output-dir": { type: "string", short: "o", default: "./output" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
article-craft-agent - AI-powered blog article generator

Usage:
  pnpm generate "<topic>" [options]

Options:
  -s, --style <style>       Article style: technical, marketing, tutorial, opinion, news (default: technical)
  -a, --audience <audience>  Target audience (default: "general readers")
  -t, --tone <tone>          Writing tone (default: "professional")
  -l, --length <words>       Target word count (default: 1500)
      --language <lang>      Language code: en, ja, etc. (default: en)
  -k, --keywords <words>     Comma-separated keywords
  -v, --verbose              Show detailed pipeline progress
      --dry-run              Show config without generating
      --max-budget <usd>     Max budget in USD (default: 1.00)
  -o, --output-dir <dir>     Output directory (default: ./output)
  -h, --help                 Show this help

Examples:
  pnpm generate "Introduction to WebAssembly"
  pnpm generate "React Server Components" -s technical -a "frontend devs" -l 2000 -v
  pnpm generate "AIエージェントの活用事例" --style marketing --language ja
  pnpm generate "Test" --dry-run
`);
  process.exit(0);
}

const topic = positionals.join(" ");
const keywords = values.keywords
  ? values.keywords.split(",").map((k) => k.trim())
  : [];

const parseResult = ArticleConfigSchema.safeParse({
  topic,
  style: values.style,
  audience: values.audience,
  tone: values.tone,
  length: Number(values.length),
  language: values.language,
  keywords,
});

if (!parseResult.success) {
  console.error("Invalid configuration:");
  for (const issue of parseResult.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const config = parseResult.data;
const maxBudgetUsd = Number(values["max-budget"]);
const outputDir = resolve(values["output-dir"]!);

if (values["dry-run"]) {
  console.log("--- Dry Run ---");
  console.log("Config:", JSON.stringify(config, null, 2));
  console.log(`Max budget: $${maxBudgetUsd}`);
  console.log(`Output dir: ${outputDir}`);
  process.exit(0);
}

runPipeline({
  config,
  verbose: values.verbose!,
  maxBudgetUsd,
  outputDir,
}).catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
