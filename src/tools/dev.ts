import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "eval",
    "Execute JavaScript code in the Obsidian app context",
    {
      code: z.string().describe("JavaScript code to execute"),
    },
    async ({ code }) => {
      try {
        const result = await execObsidian(["eval", `code=${code}`]);
        return success(result || "(no output)");
      } catch (e) {
        return error(`Eval failed: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "screenshot",
    "Take a screenshot of the Obsidian window",
    {
      path: z.string().optional().describe("Path to save the screenshot"),
    },
    async ({ path }) => {
      try {
        const args = ["dev:screenshot"];
        if (path) args.push(`path=${path}`);
        const result = await execObsidian(args);
        return success(result || "Screenshot taken.");
      } catch (e) {
        return error(`Screenshot failed: ${(e as Error).message}`);
      }
    }
  );
}
