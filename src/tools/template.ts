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

export async function templateList(): Promise<ToolResult> {
  const result = await execObsidian(["templates"]);
  return success(result || "No templates found.");
}

export async function templateInsert(p: { name: string }): Promise<ToolResult> {
  const name = validatePath(p.name);
  const result = await execObsidian(["template:insert", `name=${name}`]);
  return success(result || `Inserted template: ${name}`);
}

export async function templateRead(p: { name: string }): Promise<ToolResult> {
  const name = validatePath(p.name);
  const result = await execObsidian(["template:read", `name=${name}`]);
  return success(result);
}

// --- Handler map ---

export const handlers: Record<string, HandlerFn> = {
  list: templateList,
  insert: templateInsert,
  read: templateRead,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "template",
    `Manage templates in the vault.

Actions:
- list: List available templates (no params)
- insert: Insert a template into the active file (name required)
- read: Read template content (name required)`,
    {
      action: z.enum(["list", "insert", "read"]).describe("Action to perform"),
      name: z.string().optional().describe("Template name (for insert, read)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(
          `template.${params.action} failed: ${(e as Error).message}`,
        );
      }
    },
  );
}
