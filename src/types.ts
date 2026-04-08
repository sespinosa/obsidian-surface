import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const THOUGHTS_DIR = "_thoughts";

export type RegisterFn = (server: McpServer) => void;

/** Format a successful tool result for MCP */
export function success(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text }] };
}

/** Format an error tool result for MCP */
export function error(text: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return { content: [{ type: "text", text }], isError: true };
}
