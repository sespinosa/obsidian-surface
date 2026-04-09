import { posix } from "node:path";

export const SURFACES_DIR = "_surfaces";

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

/** Handler function type for tool dispatch — uses generic to accept any param shape */
// biome-ignore lint/suspicious/noExplicitAny: handler params vary per action, validated by Zod at the tool boundary
export type HandlerFn = (p: any) => Promise<ToolResult>;

/** Validate and normalize a vault-relative path — rejects traversal and absolute paths */
export function validatePath(path: string): string {
  if (path.includes("\0")) throw new Error("Invalid path");
  if (path.startsWith("/") || /^[A-Z]:\\/i.test(path)) {
    throw new Error("Absolute paths not allowed — use vault-relative paths");
  }
  const normalized = posix.normalize(path.replace(/\\/g, "/"));
  if (normalized.startsWith("..") || normalized.includes("/..")) {
    throw new Error("Path traversal not allowed");
  }
  return normalized;
}
