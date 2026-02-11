import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Sandbox } from "@vercel/sandbox";
import { ArticleConfigSchema } from "../src/types.js";

export const config = {
  maxDuration: 300, // 5 minutes max (adjust based on plan)
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate API key
  const apiKey = req.headers.authorization?.replace("Bearer ", "");
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Parse and validate request body
  const parseResult = ArticleConfigSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.issues,
    });
  }

  const config = parseResult.data;
  const maxBudgetUsd = Number(req.body.maxBudgetUsd || 1.0);
  const verbose = Boolean(req.body.verbose || false);

  let sandbox: Sandbox | null = null;

  try {
    // Get repository URL from environment or request
    const repoUrl = process.env.GIT_REPO_URL || req.body.repoUrl;
    const repoBranch = process.env.GIT_REPO_BRANCH || req.body.repoBranch || "main";

    if (!repoUrl) {
      throw new Error("GIT_REPO_URL is required");
    }

    // Create sandbox with Git repository source
    console.log(`Creating sandbox from repo: ${repoUrl}`);
    sandbox = await Sandbox.create({
      runtime: "node24",
      timeout: 300000, // 5 minutes
      source: {
        type: "git",
        url: repoUrl,
        revision: repoBranch,
      },
    });

    console.log(`Sandbox created: ${sandbox.sandboxId}`);

    // Install dependencies
    console.log("Installing dependencies...");
    const installResult = await sandbox.runCommand("pnpm", ["install"]);

    if (installResult.exitCode !== 0) {
      const stderr = await installResult.stderr();
      throw new Error(`Failed to install dependencies: ${stderr}`);
    }

    // Install Claude Code CLI globally
    console.log("Installing Claude Code CLI...");
    const claudeInstallResult = await sandbox.runCommand("npm", [
      "install",
      "-g",
      "@anthropic-ai/claude-code"
    ]);

    if (claudeInstallResult.exitCode !== 0) {
      const stderr = await claudeInstallResult.stderr();
      throw new Error(`Failed to install Claude Code CLI: ${stderr}`);
    }

    // Verify Claude Code CLI installation
    console.log("Verifying Claude Code CLI...");
    const verifyResult = await sandbox.runCommand("claude-code", ["--version"]);
    const claudeVersion = await verifyResult.stdout();
    console.log(`Claude Code version: ${claudeVersion.trim()}`);

    // Check which claude-code is being used
    const whichResult = await sandbox.runCommand("which", ["claude-code"]);
    const claudePath = await whichResult.stdout();
    console.log(`Claude Code path: ${claudePath.trim()}`);

    // Configure environment variables by creating .env file
    console.log("Configuring environment variables...");
    const apiKey = process.env.ANTHROPIC_API_KEY || "";

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set in Vercel environment variables");
    }

    // Create .env file in sandbox
    await sandbox.writeFiles([
      {
        path: ".env",
        content: Buffer.from(`ANTHROPIC_API_KEY=${apiKey}\n`),
      },
    ]);

    console.log("ANTHROPIC_API_KEY configured in .env file");

    // Build command arguments
    const args = [
      config.topic,
      "--style",
      config.style,
      "--audience",
      config.audience,
      "--tone",
      config.tone,
      "--length",
      String(config.length),
      "--language",
      config.language,
      "--max-budget",
      String(maxBudgetUsd),
      "--output-dir",
      "./output",
    ];

    if (config.keywords.length > 0) {
      args.push("--keywords", config.keywords.join(","));
    }

    if (verbose) {
      args.push("--verbose");
    }

    // Run article generation with ANTHROPIC_API_KEY env var
    console.log(`Generating article for: ${config.topic}`);

    // Build command with env var prefix
    const cmdWithEnv = `ANTHROPIC_API_KEY="${apiKey}" pnpm generate ${args.map(arg =>
      arg.includes(" ") ? `"${arg}"` : arg
    ).join(" ")}`;

    console.log(`Running command: ${cmdWithEnv.substring(0, 100)}...`);

    const generateResult = await sandbox.runCommand("sh", ["-c", cmdWithEnv]);

    const stdout = await generateResult.stdout();
    const stderr = await generateResult.stderr();

    if (generateResult.exitCode !== 0) {
      // Return detailed error information
      return res.status(500).json({
        error: "Article generation failed",
        details: {
          exitCode: generateResult.exitCode,
          stdout,
          stderr,
          command: `pnpm generate ${args.join(" ")}`,
        },
      });
    }

    // Find the generated file
    const lsResult = await sandbox.runCommand("ls", ["-1", "output"]);

    const files = (await lsResult.stdout()).trim().split("\n");
    const latestFile = files[files.length - 1]; // Get the latest file

    if (!latestFile) {
      throw new Error("No article file was generated");
    }

    // Download the generated article
    console.log(`Downloading article: ${latestFile}`);
    const articleContent = await sandbox.readFileToBuffer({
      path: `output/${latestFile}`,
    });

    if (!articleContent) {
      throw new Error("Failed to read generated article");
    }

    // Parse frontmatter and content
    const articleText = articleContent.toString("utf-8");
    const { frontmatter, content } = parseFrontmatter(articleText);

    // Return success response
    return res.status(200).json({
      success: true,
      article: {
        filename: latestFile,
        frontmatter,
        content,
      },
      logs: {
        stdout,
        stderr,
      },
    });
  } catch (error) {
    console.error("Error generating article:", error);
    return res.status(500).json({
      error: "Article generation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // Clean up sandbox
    if (sandbox) {
      console.log("Stopping sandbox...");
      await sandbox.stop();
    }
  }
}

function parseFrontmatter(text: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, content: text };
  }

  const frontmatterText = match[1];
  const content = match[2];

  // Simple YAML parser (for basic key-value pairs)
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterText.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: string | string[] = line.slice(colonIndex + 1).trim();

    // Handle arrays
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""));
    } else {
      // Remove quotes
      value = value.replace(/^["']|["']$/g, "");
    }

    frontmatter[key] = value;
  }

  return { frontmatter, content };
}
