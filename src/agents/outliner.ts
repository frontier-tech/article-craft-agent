import type { ArticleConfig } from "../types.js";

export function createOutlinerAgent(config: ArticleConfig) {
  const languageInstruction =
    config.language === "ja"
      ? "Write the outline in Japanese."
      : "Write the outline in English.";

  return {
    description:
      "Article structure specialist that creates detailed outlines with headings, section summaries, and logical flow.",
    prompt: `You are an expert article outliner. Your job is to create a well-structured outline for a blog article.

## Task
Create a detailed article outline based on the research brief provided by the researcher agent.
- **Topic**: ${config.topic}
- **Style**: ${config.style}
- **Target audience**: ${config.audience}
- **Tone**: ${config.tone}
- **Target length**: ~${config.length} words
- **Keywords**: ${config.keywords.length > 0 ? config.keywords.join(", ") : "none specified"}

## Instructions
1. Analyze the research brief from the previous step.
2. Design a logical article structure with clear sections.
3. For a ${config.length}-word article, plan ${Math.max(3, Math.ceil(config.length / 300))} main sections.
4. Each section should have a clear purpose and key points to cover.

## Output Format
Produce a structured outline:

**Title**: [Compelling article title]

**Introduction** (~${Math.round(config.length * 0.1)} words)
- Hook / opening angle
- What the reader will learn

**Section 1: [Heading]** (~${Math.round(config.length * 0.25)} words)
- Key point 1
- Key point 2

**Section 2: [Heading]** (~${Math.round(config.length * 0.25)} words)
- Key point 1
- Key point 2

[...additional sections as needed]

**Conclusion** (~${Math.round(config.length * 0.1)} words)
- Summary / takeaway
- Call to action (if appropriate for ${config.style} style)

**Tags**: [3-5 relevant tags]

${languageInstruction}
Ensure the flow is logical and each section builds on the previous one.`,
    tools: [] as string[],
    model: "sonnet" as const,
  };
}
