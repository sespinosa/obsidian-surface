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

export async function taskList(p: {
  path?: string;
  status?: string;
}): Promise<ToolResult> {
  const args = ["tasks"];
  if (p.path) args.push(`path=${validatePath(p.path)}`);
  if (p.status) args.push(`status=${p.status}`);
  const result = await execObsidian(args);
  return success(result || "No tasks found.");
}

export async function taskUpdate(p: {
  path: string;
  line: number;
  status: string;
}): Promise<ToolResult> {
  const path = validatePath(p.path);
  const result = await execObsidian([
    "task",
    `path=${path}`,
    `line=${p.line}`,
    `status=${p.status}`,
  ]);
  return success(
    result || `Updated task at ${path}:${p.line} to status "${p.status}".`,
  );
}

// --- Handler map ---

export const handlers: Record<string, HandlerFn> = {
  list: taskList,
  update: taskUpdate,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "task",
    `Manage tasks in the vault.

Actions:
- list: List tasks (path optional for specific file; status optional to filter)
- update: Update a task's status (path, line, status required)`,
    {
      action: z.enum(["list", "update"]).describe("Action to perform"),
      path: z.string().optional().describe("Path to a specific file"),
      status: z
        .string()
        .optional()
        .describe(
          "Task status filter or new status (e.g. 'x' for done, ' ' for todo)",
        ),
      line: z
        .number()
        .optional()
        .describe("Line number of the task (for update)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`task.${params.action} failed: ${(e as Error).message}`);
      }
    },
  );
}
