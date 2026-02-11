import { Sandbox } from "@vercel/sandbox";

async function createSnapshot() {
  console.log("🚀 Creating sandbox from repository...");
  const sandbox = await Sandbox.create({
    runtime: "node24",
    source: {
      type: "git",
      url: "https://github.com/frontier-tech/article-craft-agent.git",
      revision: "main",
    },
  });

  console.log(`✅ Sandbox created: ${sandbox.sandboxId}`);

  console.log("📦 Installing dependencies with pnpm...");
  const installResult = await sandbox.runCommand("pnpm", ["install"]);
  if (installResult.exitCode !== 0) {
    console.error("❌ Failed to install dependencies");
    console.error(await installResult.stderr());
    process.exit(1);
  }

  console.log("🔧 Installing Claude Code CLI globally...");
  const claudeInstall = await sandbox.runCommand("npm", [
    "install",
    "-g",
    "@anthropic-ai/claude-code",
  ]);
  if (claudeInstall.exitCode !== 0) {
    console.error("❌ Failed to install Claude Code CLI");
    console.error(await claudeInstall.stderr());
    process.exit(1);
  }

  console.log("📸 Creating snapshot...");
  const snapshot = await sandbox.snapshot();

  console.log("\n✅ Snapshot created successfully!");
  console.log(`📋 Snapshot ID: ${snapshot.snapshotId}`);
  console.log(`📅 Created at: ${snapshot.createdAt}`);
  console.log(`💾 Size: ${(snapshot.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⏰ Expires at: ${snapshot.expiresAt}`);
  
  console.log("\n📝 Add this to your api/generate.ts:");
  console.log(`source: { type: "snapshot", snapshotId: "${snapshot.snapshotId}" }`);
}

createSnapshot().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
