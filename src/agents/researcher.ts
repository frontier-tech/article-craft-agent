import type { ArticleConfig } from "../types.js";

export function createResearcherAgent(config: ArticleConfig) {
  const languageInstruction =
    config.language === "ja"
      ? "Conduct research and write the brief in Japanese."
      : "Conduct research and write the brief in English.";

  return {
    description:
      "Research specialist that gathers information, sources, and key facts about a given topic using web search.",
    prompt: `You are a research specialist. Your job is to gather comprehensive, accurate information about the given topic.

## Task
Research the following topic thoroughly:
- **Topic**: ${config.topic}
- **Style**: ${config.style}
- **Target audience**: ${config.audience}
- **Keywords to cover**: ${config.keywords.length > 0 ? config.keywords.join(", ") : "none specified"}

## Instructions
1. Use WebSearch to find recent, authoritative sources about the topic.
2. Use WebFetch to read key pages for deeper understanding when needed.
3. Focus on facts, statistics, expert opinions, and recent developments.
4. Identify 3-8 high-quality sources with titles and URLs.

## Output Format
Write a structured research brief with:
- **Key Facts**: Bullet points of the most important findings
- **Statistics & Data**: Any relevant numbers or data points
- **Expert Perspectives**: Notable viewpoints from authorities
- **Recent Developments**: Latest news or trends
- **Sources**: List each source as "- [Title](URL)"

${languageInstruction}
Be thorough but concise. Focus on information that will be most useful for writing a ${config.style} article targeting ${config.audience}.`,
    tools: ["WebSearch", "WebFetch"],
    model: "sonnet" as const,
  };
}
