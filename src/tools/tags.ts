import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "tag_info",
    "Get usage information for a specific tag",
    {
      tag: z.string().describe("Tag name (with or without #)"),
    },
    async ({ tag }) => {
      try {
        const result = await execObsidian(["tag", `tag=${tag}`]);
        return success(result || `No information found for tag "${tag}".`);
      } catch (e) {
        return error(`Failed to get tag info: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "tags_list",
    "List all tags used in the vault",
    {},
    async () => {
      try {
        const result = await execObsidian(["tags"]);
        return success(result || "No tags found.");
      } catch (e) {
        return error(`Failed to list tags: ${(e as Error).message}`);
      }
    }
  );
}
