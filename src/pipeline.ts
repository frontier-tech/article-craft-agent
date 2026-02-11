import { query } from "@anthropic-ai/claude-agent-sdk";
import { DEFAULT_OPTIONS } from "./config.js";
import { saveArticle } from "./output/index.js";
import type { ArticleConfig, ArticleResult, PipelineOptions } from "./types.js";

export async function runPipeline(options: PipelineOptions): Promise<string> {
  const { config, verbose, maxBudgetUsd, outputDir } = options;

  const orchestratorPrompt = buildOrchestratorPrompt(config);

  if (verbose) {
    console.log("\n--- Pipeline Start ---");
    console.log(`Topic: ${config.topic}`);
    console.log(`Style: ${config.style} | Length: ${config.length} words`);
    console.log(`Budget: $${maxBudgetUsd}\n`);
  }

  let finalText = "";
  let totalCost = 0;

  // Get API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  for await (const message of query({
    prompt: orchestratorPrompt,
    apiKey,
    options: {
      ...DEFAULT_OPTIONS,
      maxBudgetUsd,
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if ("text" in block) {
          finalText = block.text;
          if (verbose) {
            const label = message.parent_tool_use_id
              ? "  [subagent]"
              : "[orchestrator]";
            console.log(`${label} ${block.text.slice(0, 200)}...`);
          }
        }
      }
    }

    if (message.type === "result") {
      totalCost = message.total_cost_usd ?? 0;
      if (verbose) {
        console.log(`\n--- Pipeline Complete ---`);
        console.log(`Status: ${message.subtype}`);
        console.log(`Cost: $${totalCost.toFixed(4)}`);
        console.log(`Turns: ${message.num_turns}`);
      }
    }
  }

  // Parse the final output to extract article and metadata
  const result = parseEditorOutput(finalText, config);

  // Save to file
  const filePath = await saveArticle(result, outputDir);

  console.log(`\nArticle saved: ${filePath}`);
  console.log(`Title: ${result.title}`);
  console.log(`Words: ${result.wordCount}`);
  console.log(`Tags: ${result.tags.join(", ")}`);
  console.log(`Cost: $${totalCost.toFixed(4)}`);

  return filePath;
}

function buildOrchestratorPrompt(config: ArticleConfig): string {
  return `You are an article generation orchestrator. Your job is to coordinate 4 specialized agents to produce a high-quality blog article.

## Article Requirements
- **Topic**: ${config.topic}
- **Style**: ${config.style}
- **Audience**: ${config.audience}
- **Tone**: ${config.tone}
- **Length**: ~${config.length} words
- **Language**: ${config.language}
- **Keywords**: ${config.keywords.length > 0 ? config.keywords.join(", ") : "none"}

## Workflow
Execute these agents IN ORDER. Each agent builds on the previous agent's output.

1. **researcher** — Research the topic using web search. Gather facts, data, and sources.
2. **outliner** — Create a detailed article outline based on the research.
3. **writer** — Write the full article in Markdown following the outline.
4. **editor** — Polish and finalize the article. Output must include a JSON metadata block.

## Instructions
- Pass the output of each agent as context to the next, including the article requirements above.
- Use the Task tool to delegate to each agent in sequence.
- After the editor finishes, output the COMPLETE final article exactly as the editor produced it (including the JSON metadata block).
- Do NOT modify the editor's output.`;
}

function parseEditorOutput(text: string, config: ArticleConfig): ArticleResult {
  // Try to extract JSON metadata block from the editor's output
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);

  let metadata: Partial<ArticleResult> = {};
  if (jsonMatch) {
    try {
      metadata = JSON.parse(jsonMatch[1]);
    } catch {
      // Fall back to defaults
    }
  }

  // Extract article content (everything before the JSON block)
  let content = text;
  if (jsonMatch) {
    content = text.slice(0, jsonMatch.index).trim();
  }

  // Strip orchestrator preamble — article starts at the first # heading
  const headingIndex = content.search(/^#\s+/m);
  if (headingIndex > 0) {
    content = content.slice(headingIndex).trim();
  }

  // Extract title from first # heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = metadata.title || titleMatch?.[1] || config.topic;

  // Generate slug from title
  const slug =
    metadata.slug ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u3000-\u9fff\u4e00-\u9faf]+/g, "-")
      .replace(/^-|-$/g, "");

  // Count words (handle both English and Japanese)
  const wordCount = metadata.wordCount || countWords(content);

  return {
    title,
    slug,
    content,
    wordCount,
    tags: metadata.tags || [],
    sources: metadata.sources || [],
  };
}

function countWords(text: string): number {
  // Remove markdown formatting for counting
  const clean = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*`\[\]()_~>|-]/g, " ")
    .trim();

  // Count English words + CJK characters
  const englishWords = clean.match(/[a-zA-Z]+/g)?.length ?? 0;
  const cjkChars = clean.match(/[\u3000-\u9fff\u4e00-\u9faf]/g)?.length ?? 0;

  return englishWords + cjkChars;
}
