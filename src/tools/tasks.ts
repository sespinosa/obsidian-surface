import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "task_list",
    "List tasks in the vault or a specific file",
    {
      path: z.string().optional().describe("Path to a specific file (lists all vault tasks if omitted)"),
      status: z.string().optional().describe("Filter by status (e.g. 'todo', 'done')"),
    },
    async ({ path, status }) => {
      try {
        const args = ["tasks"];
        if (path) args.push(`path=${path}`);
        if (status) args.push(`status=${status}`);
        const result = await execObsidian(args);
        return success(result || "No tasks found.");
      } catch (e) {
        return error(`Failed to list tasks: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "task_update",
    "Update a task's status",
    {
      path: z.string().describe("Path to the file containing the task"),
      line: z.number().describe("Line number of the task"),
      status: z.string().describe("New status (e.g. 'x' for done, ' ' for todo)"),
    },
    async ({ path, line, status }) => {
      try {
        const result = await execObsidian([
          "task",
          `path=${path}`,
          `line=${line}`,
          `status=${status}`,
        ]);
        return success(result || `Updated task at ${path}:${line} to status "${status}".`);
      } catch (e) {
        return error(`Failed to update task: ${(e as Error).message}`);
      }
    }
  );
}
