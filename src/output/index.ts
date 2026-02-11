import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArticleResult } from "../types.js";
import { generateFrontmatter, generateFilename } from "./formatter.js";

export async function saveArticle(
  result: ArticleResult,
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const filename = generateFilename(result.slug);
  const filePath = join(outputDir, filename);

  const frontmatter = generateFrontmatter(result);
  const fileContent = `${frontmatter}\n\n${result.content}\n`;

  await writeFile(filePath, fileContent, "utf-8");
  return filePath;
}
