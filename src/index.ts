#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerThoughts } from "./tools/thoughts.js";
import { register as registerNotes } from "./tools/notes.js";
import { register as registerNavigation } from "./tools/navigation.js";
import { register as registerWorkspace } from "./tools/workspace.js";
import { register as registerVault } from "./tools/vault.js";
import { register as registerSearch } from "./tools/search.js";
import { register as registerProperties } from "./tools/properties.js";
import { register as registerTags } from "./tools/tags.js";
import { register as registerTasks } from "./tools/tasks.js";
import { register as registerDaily } from "./tools/daily.js";
import { register as registerTemplates } from "./tools/templates.js";
import { register as registerDev } from "./tools/dev.js";

const server = new McpServer({
  name: "obsidian-surface",
  version: "0.1.0",
});

// Register all tool groups
registerThoughts(server);
registerNotes(server);
registerNavigation(server);
registerWorkspace(server);
registerVault(server);
registerSearch(server);
registerProperties(server);
registerTags(server);
registerTasks(server);
registerDaily(server);
registerTemplates(server);
registerDev(server);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
