import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const THOUGHTS_DIR = "_thoughts";

export type RegisterFn = (server: McpServer) => void;

/** Typed result from a tool handler */
export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
};

/** Format a successful tool result for MCP */
export function success(text: string): {
  content: Array<{ type: "text"; text: string }>;
} {
  return { content: [{ type: "text", text }] };
}

/** Format an error tool result for MCP */
export function error(text: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return { content: [{ type: "text", text }], isError: true };
}

/** Validate and normalize a vault-relative path — rejects traversal and absolute paths */
export function validatePath(path: string): string {
  if (path.includes("..")) throw new Error("Path traversal not allowed");
  if (path.startsWith("/") || /^[A-Z]:\\/i.test(path)) {
    throw new Error("Absolute paths not allowed — use vault-relative paths");
  }
  return path.replace(/\\/g, "/");
}
