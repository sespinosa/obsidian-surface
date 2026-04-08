import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error, type ToolResult } from "../types.js";

// --- Handler functions ---

export async function vaultInfo(): Promise<ToolResult> {
  const result = await execObsidian(["vault"]);
  return success(result);
}

export async function vaultFolders(p: { folder?: string }): Promise<ToolResult> {
  const args = ["folders"];
  if (p.folder) args.push(`folder=${p.folder}`);
  const result = await execObsidian(args);
  return success(result || "No folders found.");
}

export async function vaultCommand(p: { id: string; args?: string }): Promise<ToolResult> {
  const args = ["command", `id=${p.id}`];
  if (p.args) args.push(p.args);
  const result = await execObsidian(args);
  return success(result || `Executed command: ${p.id}`);
}

export async function vaultCommands(p: { filter?: string }): Promise<ToolResult> {
  const result = await execObsidian(["commands"]);
  if (!result) return success("No commands found.");
  if (!p.filter) return success(result);
  const filtered = result
    .split("\n")
    .filter((line) => line.toLowerCase().includes(p.filter!.toLowerCase()))
    .join("\n");
  return success(filtered || `No commands matching "${p.filter}".`);
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  info: vaultInfo,
  folders: vaultFolders,
  command: vaultCommand,
  commands: vaultCommands,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "vault",
    `Vault information and Obsidian commands.

Actions:
- info: Show vault info — name, path, file count, size (no params)
- folders: List folders (folder optional, defaults to vault root)
- command: Execute an Obsidian command (id required; args optional)
- commands: List available commands (filter optional)`,
    {
      action: z.enum(["info", "folders", "command", "commands"]).describe("Action to perform"),
      folder: z.string().optional().describe("Parent folder (for folders)"),
      id: z.string().optional().describe("Obsidian command ID (for command)"),
      args: z.string().optional().describe("Additional command arguments (for command)"),
      filter: z.string().optional().describe("Filter commands by name (for commands)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`vault.${params.action} failed: ${(e as Error).message}`);
      }
    }
  );
}
