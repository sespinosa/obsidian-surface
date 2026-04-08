import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "vault_info",
    "Show vault information (name, path, file count, size)",
    {},
    async () => {
      try {
        const result = await execObsidian(["vault"]);
        return success(result);
      } catch (e) {
        return error(`Failed to get vault info: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "vault_folders",
    "List folders in the vault",
    {
      folder: z.string().optional().describe("Parent folder to list (defaults to vault root)"),
    },
    async ({ folder }) => {
      try {
        const args = ["folders"];
        if (folder) args.push(`folder=${folder}`);
        const result = await execObsidian(args);
        return success(result || "No folders found.");
      } catch (e) {
        return error(`Failed to list folders: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "command",
    "Execute any Obsidian command by its command ID",
    {
      id: z.string().describe("Obsidian command ID (e.g. 'editor:toggle-bold')"),
      args: z.string().optional().describe("Additional arguments for the command"),
    },
    async ({ id, args: cmdArgs }) => {
      try {
        const args = ["command", `id=${id}`];
        if (cmdArgs) args.push(cmdArgs);
        const result = await execObsidian(args);
        return success(result || `Executed command: ${id}`);
      } catch (e) {
        return error(`Failed to execute command: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "commands_list",
    "List available Obsidian commands",
    {
      filter: z.string().optional().describe("Filter commands by name"),
    },
    async ({ filter }) => {
      try {
        const args = ["commands"];
        if (filter) args.push(filter);
        const result = await execObsidian(args);
        return success(result || "No commands found.");
      } catch (e) {
        return error(`Failed to list commands: ${(e as Error).message}`);
      }
    }
  );
}
