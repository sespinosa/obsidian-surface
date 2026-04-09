# obsidian-surface

MCP server that turns [Obsidian](https://obsidian.md) into a display surface and knowledge workspace for AI tools.

[![npm version](https://img.shields.io/npm/v/obsidian-surface)](https://www.npmjs.com/package/obsidian-surface)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![CI](https://github.com/sespinosa/obsidian-surface/actions/workflows/ci.yml/badge.svg)](https://github.com/sespinosa/obsidian-surface/actions/workflows/ci.yml)

## What is this?

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets AI assistants like Claude, Cursor, or any MCP-compatible tool use your Obsidian vault as a rich display surface. Instead of dumping text in a terminal, your AI can create formatted documents, diagrams, tables, and research notes — and show them to you in Obsidian.

It also provides a **surfaces system** — a running log of research, decisions, and analysis that persists across sessions, so your AI remembers what you've worked on.

Backed by the [Obsidian CLI](https://obsidian.md) (v1.12+).

## Quick Start

**1. Prerequisites:**
- [Obsidian](https://obsidian.md) v1.12+ installed and running
- CLI enabled: Obsidian → Settings → General → Command line interface → turn it on
- [Node.js](https://nodejs.org) 20+

**2. Add to your AI tool's MCP config:**

<details>
<summary><strong>Claude Code</strong> (recommended)</summary>

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "obsidian-surface": {
      "command": "npx",
      "args": ["-y", "obsidian-surface"]
    }
  }
}
```

Or add per-project in `.mcp.json` at your project root.
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian-surface": {
      "command": "npx",
      "args": ["-y", "obsidian-surface"]
    }
  }
}
```
</details>

<details>
<summary><strong>Cursor / Windsurf / other MCP clients</strong></summary>

Follow your client's MCP server configuration docs. The server command is:

```
npx -y obsidian-surface
```

No arguments needed. The server auto-detects your Obsidian CLI.
</details>

**3. Verify it works:**

Restart your AI tool, then ask:

> "What's in my Obsidian vault?"

If it answers with your vault name and file count, you're set.

## How It Works

You talk to your AI normally. When it needs to show you something or save research, it uses obsidian-surface to create and display content in Obsidian.

**Example prompts:**

- *"Research the pros and cons of REST vs GraphQL and save your findings"* → creates a surface in your vault with a formatted comparison
- *"Show me a side-by-side of the old and new API design"* → creates two notes and splits the Obsidian pane
- *"What did we discuss about the database migration last week?"* → queries the surfaces index to find prior research

The AI handles all the MCP calls — you never write JSON or call tools manually.

## Environment Variables

All optional. Most users don't need any of these:

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_CLI_PATH` | Auto-detected | Override the Obsidian CLI binary path |
| `OBSIDIAN_DEFAULT_PROJECT` | Current directory name | Set the default surfaces project |

Add env vars to your MCP config if needed:

```json
{
  "obsidian-surface": {
    "command": "npx",
    "args": ["-y", "obsidian-surface"],
    "env": {
      "OBSIDIAN_DEFAULT_PROJECT": "my-project"
    }
  }
}
```

## Which Vault Does It Connect To?

The Obsidian CLI connects to whichever vault is currently open in Obsidian. If you have multiple vaults, make sure the one you want is open and active.

## Tools

obsidian-surface exposes 12 tools, each with multiple actions. Your AI uses these automatically — you don't need to call them directly.

### `surface` — Display Surfaces

Rich rendered artifacts (documents, diagrams, tables, comparisons) that persist across sessions.

| Action | Description | Params |
|--------|-------------|--------|
| `create` | Create a surface with frontmatter, opens in Obsidian | `name`, `content`, `summary` required; `type`, `tags`, `cwd_override` optional |
| `list` | List surfaces in a project with metadata | `project` optional (defaults to active) |
| `index` | Query the frontmatter index | `project`, `type`, `tags`, `since`, `query` — all optional filters |
| `recent` | Get N most recent surfaces across all projects | `limit` optional (default 10) |
| `enrich` | Update a surface's frontmatter without changing content | `path` required; `type`, `tags`, `summary` optional |
| `reindex` | Rebuild the index by scanning all surface files | — |
| `clear` | Delete all surfaces in a project | `project` optional |
| `project_set` | Set the active project | `name` required |
| `project_list` | List all projects | — |
| `project_rename` | Rename a project | `from`, `to` required |

### `note` — Vault Notes

Persistent note CRUD and search.

| Action | Description | Params |
|--------|-------------|--------|
| `create` | Create a note | `path` required; `content`, `open`, `newtab` optional |
| `read` | Read note content | `path` required |
| `write` | Overwrite note content | `path`, `content` required |
| `append` | Append to a note | `path`, `content` required |
| `prepend` | Prepend to a note | `path`, `content` required |
| `delete` | Delete a note | `path` required |
| `move` | Move/rename a note | `path`, `destination` required |
| `search` | Search notes | `query` required; `format` optional (`json` or `text`) |
| `list` | List files in a folder | `folder` optional (defaults to vault root) |

### `layout` — Window Layout & Navigation

Control tabs, panes, and navigation.

| Action | Description | Params |
|--------|-------------|--------|
| `workspace` | Show workspace layout tree with tab IDs | — |
| `split` | Split the current pane | `direction` required (`vertical` or `horizontal`) |
| `close` | Close tab(s) | `target` optional (`current`, `others`, or `all`) |
| `sidebar` | Toggle a sidebar | `side` required (`left` or `right`) |
| `focus` | Focus tab group by direction | `direction` required (`left`, `right`, `top`, `bottom`) |
| `open` | Open a file | `path` required |
| `tabs` | Open a new tab or list all tabs | `path` optional (omit to list) |
| `recents` | List recently opened files | — |

### `vault` — Vault Info & Commands

Vault metadata and Obsidian command execution.

| Action | Description | Params |
|--------|-------------|--------|
| `info` | Show vault info — name, path, file count, size | — |
| `folders` | List folders | `folder` optional (defaults to vault root) |
| `command` | Execute an Obsidian command by ID | `id` required; `args` optional |
| `commands` | List available commands | `filter` optional |

### `search` — Search & Analysis

Full-text search and note relationship exploration.

| Action | Description | Params |
|--------|-------------|--------|
| `text` | Search for text in the vault | `query` required; `format` optional (`json` or `text`) |
| `context` | Search with surrounding line context | `query` required |
| `backlinks` | List notes that link to a file | `path` required |
| `links` | List outgoing links from a note | `path` required |
| `outline` | Show heading tree of a note | `path` required |
| `orphans` | List files with no incoming links | — |
| `deadends` | List files with no outgoing links | — |

### `property` — Frontmatter Properties

Read and write YAML frontmatter on notes.

| Action | Description | Params |
|--------|-------------|--------|
| `get` | Read a property | `path`, `key` required |
| `set` | Set a property | `path`, `key`, `value` required |
| `remove` | Remove a property | `path`, `key` required |
| `list` | List all properties on a note | `path` required |

### `daily` — Daily Notes

| Action | Description | Params |
|--------|-------------|--------|
| `open` | Open the daily note | — |
| `read` | Read the daily note content | — |
| `append` | Append content to the daily note | `content` required |

### `tag` — Tags

| Action | Description | Params |
|--------|-------------|--------|
| `info` | Get usage info for a tag | `tag` required (with or without `#`) |
| `list` | List all tags in the vault | — |

### `task` — Tasks

| Action | Description | Params |
|--------|-------------|--------|
| `list` | List tasks in the vault or a file | `path`, `status` optional |
| `update` | Update a task's status | `path`, `line`, `status` required |

### `template` — Templates

| Action | Description | Params |
|--------|-------------|--------|
| `list` | List available templates | — |
| `insert` | Insert a template into the active file | `name` required |
| `read` | Read template content | `name` required |

### `dev` — Developer Tools

| Action | Description | Params |
|--------|-------------|--------|
| `eval` | Execute JavaScript in the Obsidian app context | `code` required |
| `screenshot` | Take a screenshot of the Obsidian window | `path` optional |

### `compose` — Multi-Step Operations

Execute multiple operations sequentially as a single atomic action. The AI uses this to set up layouts, create multiple notes, or perform multi-step workflows — all in one call, without focus-stealing between steps.

**Example:** You say *"Create a comparison of REST vs GraphQL and show it next to my existing API notes"*. The AI internally calls:

```json
{
  "steps": [
    { "tool": "note", "action": "create", "params": { "path": "research/rest-vs-graphql.md", "content": "# REST vs GraphQL\n\n..." } },
    { "tool": "layout", "action": "split", "params": { "direction": "vertical" } },
    { "tool": "layout", "action": "open", "params": { "path": "research/rest-vs-graphql.md" } }
  ]
}
```

You see the final result in Obsidian — two panes, side by side.

## Surfaces System

The surfaces system is a running log organized by project. Your AI uses it to save research, decisions, and analysis that persist across sessions.

```
_surfaces/
├── my-project/
│   ├── api-research.md
│   ├── design-decisions.md
│   └── performance-notes.md
└── another-project/
    └── ...
```

Each surface includes YAML frontmatter:

```yaml
---
project: my-project
created: 2026-04-08T14:30:00
summary: Analysis of REST vs GraphQL tradeoffs
cwd: /home/user/my-project
type: research
tags: [api, architecture]
---
```

- **Project** is auto-derived from your working directory name (e.g. if you're in `/home/user/my-project`, the project is `my-project`). Can also be set explicitly.
- A **frontmatter index** (`_surfaces/_index.json`) tracks all surfaces' metadata for fast querying without reading every file.
- The AI uses `index` at session start to see what prior knowledge exists, and `recent` to catch up on latest work.

## CLI Path Resolution

The Obsidian CLI binary is auto-detected. You only need `OBSIDIAN_CLI_PATH` if auto-detection fails.

Resolution order:

1. `OBSIDIAN_CLI_PATH` environment variable
2. `obsidian` on PATH
3. Platform auto-detection:

| Platform | Auto-detected Path |
|----------|-------------------|
| Windows | `C:\Users\*\AppData\Local\Programs\Obsidian\Obsidian.com` |
| macOS | `/Applications/Obsidian.app/Contents/MacOS/Obsidian` |
| Linux | `/snap/obsidian/current/obsidian`, flatpak paths |
| WSL | `/mnt/c/Users/*/AppData/Local/Programs/Obsidian/Obsidian.com` |

WSL is automatically detected and handles UNC path workarounds.

## Privacy

- **All data stays local** in your Obsidian vault
- The `cwd` field in surface frontmatter records which directory you were working in — stored only in your vault
- **No data is transmitted** to external services
- Communication uses stdio transport only (stdin/stdout between MCP client and this server)
- The server does not access the internet

## Development

```bash
git clone https://github.com/sespinosa/obsidian-surface.git
cd obsidian-surface
npm install
npm run build
npm test
npm run lint
```

## License

[MIT](LICENSE)
