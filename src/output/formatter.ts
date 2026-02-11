import type { ArticleResult } from "../types.js";

export function generateFrontmatter(result: ArticleResult): string {
  const date = new Date().toISOString().split("T")[0];

  const lines = [
    "---",
    `title: "${escapeYaml(result.title)}"`,
    `date: "${date}"`,
    `slug: "${result.slug}"`,
    `tags:`,
    ...result.tags.map((tag) => `  - "${escapeYaml(tag)}"`),
    `description: "${escapeYaml(generateDescription(result.content))}"`,
    `wordCount: ${result.wordCount}`,
  ];

  if (result.sources.length > 0) {
    lines.push(`sources:`);
    for (const source of result.sources) {
      lines.push(`  - title: "${escapeYaml(source.title)}"`);
      lines.push(`    url: "${source.url}"`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"');
}

function generateDescription(content: string): string {
  // Take first paragraph after the title as description
  const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const firstParagraph = lines[0] || "";
  // Truncate to ~160 chars for SEO
  if (firstParagraph.length <= 160) return firstParagraph;
  return firstParagraph.slice(0, 157) + "...";
}

export function generateFilename(slug: string): string {
  const date = new Date().toISOString().split("T")[0];
  // Sanitize slug for filesystem
  const safeSlug = slug
    .replace(/[^a-z0-9\u3000-\u9fff\u4e00-\u9faf-]/g, "")
    .slice(0, 80);
  return `${date}-${safeSlug}.md`;
}
