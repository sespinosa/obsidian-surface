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

export async function propertyGet(p: {
  path: string;
  key: string;
}): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian([
    "property:read",
    `path=${p.path}`,
    `key=${p.key}`,
  ]);
  return success(result || `Property "${p.key}" not found.`);
}

export async function propertySet(p: {
  path: string;
  key: string;
  value: string;
}): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian([
    "property:set",
    `path=${p.path}`,
    `key=${p.key}`,
    `value=${p.value}`,
  ]);
  return success(
    result || `Set property "${p.key}" = "${p.value}" on ${p.path}`,
  );
}

export async function propertyRemove(p: {
  path: string;
  key: string;
}): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian([
    "property:remove",
    `path=${p.path}`,
    `key=${p.key}`,
  ]);
  return success(result || `Removed property "${p.key}" from ${p.path}`);
}

export async function propertyList(p: { path: string }): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian(["properties", `path=${p.path}`]);
  return success(result || "No properties found.");
}

// --- Handler map ---

export const handlers: Record<string, HandlerFn> = {
  get: propertyGet,
  set: propertySet,
  remove: propertyRemove,
  list: propertyList,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "property",
    `Manage frontmatter properties on notes.

Actions:
- get: Read a property (path, key required)
- set: Set a property (path, key, value required)
- remove: Remove a property (path, key required)
- list: List all properties (path required)`,
    {
      action: z
        .enum(["get", "set", "remove", "list"])
        .describe("Action to perform"),
      path: z.string().optional().describe("Path to the note"),
      key: z.string().optional().describe("Property key"),
      value: z.string().optional().describe("Property value (for set)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(
          `property.${params.action} failed: ${(e as Error).message}`,
        );
      }
    },
  );
}
