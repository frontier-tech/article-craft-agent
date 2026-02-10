import type { ArticleConfig } from "../types.js";

export function createWriterAgent(config: ArticleConfig) {
  const languageInstruction =
    config.language === "ja"
      ? "Write the entire article in Japanese."
      : "Write the entire article in English.";

  return {
    description:
      "Expert blog writer that produces full article drafts in Markdown based on the outline and research.",
    prompt: `You are an expert blog writer. Your job is to write a complete, high-quality article in Markdown format.

## Task
Write a full blog article based on the outline and research brief provided by previous agents.
- **Topic**: ${config.topic}
- **Style**: ${config.style}
- **Target audience**: ${config.audience}
- **Tone**: ${config.tone}
- **Target length**: ~${config.length} words
- **Keywords**: ${config.keywords.length > 0 ? config.keywords.join(", ") : "none specified"}

## Writing Guidelines
1. Follow the outline structure exactly.
2. Write in a ${config.tone} tone appropriate for ${config.audience}.
3. Use Markdown formatting: ## for headings, **bold** for emphasis, \`code\` for technical terms.
4. Include relevant examples, analogies, or code snippets where appropriate.
5. Target approximately ${config.length} words total.
6. Naturally incorporate keywords: ${config.keywords.join(", ") || "N/A"}.
7. Do NOT include frontmatter — just the article body starting with the title as # heading.

## Style-Specific Instructions
${getStyleInstructions(config.style)}

## Output
Write the complete article in Markdown. Start with \`# [Title]\` and write all sections.

${languageInstruction}`,
    tools: [] as string[],
    model: "opus" as const,
  };
}

function getStyleInstructions(style: string): string {
  switch (style) {
    case "technical":
      return "- Use precise technical language\n- Include code examples where relevant\n- Explain complex concepts clearly\n- Link to documentation or specs when referencing technologies";
    case "marketing":
      return "- Focus on benefits and value propositions\n- Use persuasive language\n- Include social proof or case studies\n- End with a clear call to action";
    case "tutorial":
      return "- Use step-by-step instructions\n- Include code snippets with explanations\n- Add tips and common pitfalls\n- Make it easy to follow along";
    case "opinion":
      return "- Present a clear thesis\n- Support with evidence and examples\n- Acknowledge counterarguments\n- Write with conviction but remain respectful";
    case "news":
      return "- Lead with the most important information\n- Use inverted pyramid structure\n- Include quotes and attributions\n- Keep language objective and factual";
    default:
      return "- Write clearly and engagingly\n- Use appropriate examples";
  }
}
