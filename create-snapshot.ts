import { Sandbox } from "@vercel/sandbox";

async function createSnapshot() {
  console.log("Creating sandbox...");
  const sandbox = await Sandbox.create({
    runtime: "node24",
    source: {
      type: "git",
      url: "https://github.com/frontier-tech/article-craft-agent.git",
      revision: "main",
    },
  });

  console.log("Installing dependencies...");
  await sandbox.runCommand("pnpm", ["install"]);

  console.log("Installing Claude Code CLI...");
  await sandbox.runCommand("npm", ["install", "-g", "@anthropic-ai/claude-code"]);

  console.log("Creating snapshot...");
  const snapshot = await sandbox.snapshot();

  console.log(`✅ Snapshot created: ${snapshot.snapshotId}`);
  console.log(`Add this to your API: { source: { type: "snapshot", snapshotId: "${snapshot.snapshotId}" } }`);
}

createSnapshot().catch(console.error);
