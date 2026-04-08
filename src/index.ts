#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerThought } from "./tools/thought.js";
import { register as registerNote } from "./tools/note.js";
import { register as registerLayout } from "./tools/layout.js";
import { register as registerVault } from "./tools/vault.js";
import { register as registerSearch } from "./tools/search.js";
import { register as registerProperty } from "./tools/property.js";
import { register as registerDaily } from "./tools/daily.js";
import { register as registerTag } from "./tools/tag.js";
import { register as registerTask } from "./tools/task.js";
import { register as registerTemplate } from "./tools/template.js";
import { register as registerDev } from "./tools/dev.js";
import { register as registerCompose } from "./tools/compose.js";

const server = new McpServer({
  name: "obsidian-surface",
  version: "0.1.0",
});

// Register all tool groups
registerThought(server);
registerNote(server);
registerLayout(server);
registerVault(server);
registerSearch(server);
registerProperty(server);
registerDaily(server);
registerTag(server);
registerTask(server);
registerTemplate(server);
registerDev(server);
registerCompose(server);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
