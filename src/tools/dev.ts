import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execObsidian } from "../cli.js";
import {
  error,
  type HandlerFn,
  success,
  type ToolResult,
  validatePath,
} from "../types.js";

// --- Handler functions ---

export async function devEval(p: { code: string }): Promise<ToolResult> {
  const result = await execObsidian(["eval", `code=${p.code}`]);
  return success(result || "(no output)");
}

export async function devScreenshot(p: { path?: string }): Promise<ToolResult> {
  const args = ["dev:screenshot"];
  if (p.path) args.push(`path=${validatePath(p.path)}`);
  const result = await execObsidian(args);
  return success(result || "Screenshot taken.");
}

// --- Handler map ---

export const handlers: Record<string, HandlerFn> = {
  eval: devEval,
  screenshot: devScreenshot,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "dev",
    `Developer tools for Obsidian.

Actions:
- eval: Execute JavaScript in the Obsidian app context (code required)
- screenshot: Take a screenshot of the Obsidian window (path optional)`,
    {
      action: z.enum(["eval", "screenshot"]).describe("Action to perform"),
      code: z
        .string()
        .optional()
        .describe("JavaScript code to execute (for eval)"),
      path: z
        .string()
        .optional()
        .describe("Path to save screenshot (for screenshot)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`dev.${params.action} failed: ${(e as Error).message}`);
      }
    },
  );
}
