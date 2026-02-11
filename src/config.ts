import { resolve } from "node:path";

export const PLUGIN_PATH = resolve(import.meta.dirname, "..");

export const DEFAULT_OPTIONS = {
  plugins: [{ type: "local" as const, path: PLUGIN_PATH }],
  allowedTools: [
    "Read",
    "Write",
    "Glob",
    "Grep",
    "Task",
    "WebSearch",
    "WebFetch",
  ],
  permissionMode: "bypassPermissions" as const,
};
