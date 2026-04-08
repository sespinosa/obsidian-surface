# obsidian-surface

MCP server that turns [Obsidian](https://obsidian.md) into a display surface and knowledge workspace for AI tools.

[![npm version](https://img.shields.io/npm/v/obsidian-surface)](https://www.npmjs.com/package/obsidian-surface)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![CI](https://github.com/sespinosa/obsidian-surface/actions/workflows/ci.yml/badge.svg)](https://github.com/sespinosa/obsidian-surface/actions/workflows/ci.yml)

## What is this?

An MCP server that lets AI tools use Obsidian as a rich display surface — showing formatted documents, diagrams, tables, and research notes — instead of dumping text in a terminal. It also provides a full knowledge workspace with note CRUD, search, tagging, and project organization.

Not Claude-specific. Works with any [MCP](https://modelcontextprotocol.io) client. Backed by the [Obsidian CLI](https://obsidian.md) (v1.12+).

## Prerequisites

- **Obsidian v1.12+** with CLI enabled (Settings → General → Command line interface)
- **Node.js 20+**
- **Obsidian must be running** — the CLI communicates with the running app

## Installation & Configuration

Add to your MCP client config (e.g. Claude Code `~/.claude.json`):

```json
{
  "mcpServers": {
    "obsidian-surface": {
      "command": "npx",
      "args": ["-y", "obsidian-surface"],
      "env": {
        "OBSIDIAN_CLI_PATH": "/path/to/obsidian",
        "OBSIDIAN_DEFAULT_PROJECT": "myproject"
      }
    }
  }
}
```

Both env vars are optional. The CLI path is auto-detected on all supported platforms. The default project falls back to `"default"`.

## Tools

obsidian-surface exposes 12 tools, each with multiple actions invoked via an `action` parameter. One tool call = one operation.

### `thought` — Thoughts System

A running log of research, decisions, and analysis that persists across sessions.

| Action | Description | Params |
|--------|-------------|--------|
| `create` | Create a thought with frontmatter, opens in Obsidian | `name`, `content`, `summary` required; `type`, `tags`, `cwd_override` optional |
| `list` | List thoughts in a project with metadata | `project` optional (defaults to active) |
| `index` | Query the frontmatter index | `project`, `type`, `tags`, `since`, `query` — all optional filters |
| `recent` | Get N most recent thoughts across all projects | `limit` optional (default 10) |
| `enrich` | Update a thought's frontmatter without changing content | `path` required; `type`, `tags`, `summary` optional |
| `reindex` | Rebuild the index by scanning all thought files | — |
| `clear` | Delete all thoughts in a project | `project` optional |
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

Execute multiple operations sequentially as a single atomic action. Eliminates intermediate focus shifts and reduces round-trips. Execution stops on first error.

**Params:** `steps` — an array of `{ tool, action, params }` objects.

```json
{
  "steps": [
    { "tool": "note", "action": "create", "params": { "path": "research/api-design.md", "content": "# API Design\n\nNotes on the new API..." } },
    { "tool": "layout", "action": "open", "params": { "path": "research/api-design.md" } },
    { "tool": "layout", "action": "split", "params": { "direction": "vertical" } }
  ]
}
```

This creates a note, opens it in Obsidian, and splits the pane — in a single tool call.

## Thoughts System

The thoughts system provides a running log of research, decisions, and analysis that persists across sessions. Thoughts are organized by project under `_thoughts/{project}/` in your vault.

```
_thoughts/
├── my-project/
│   ├── api-research.md
│   ├── design-decisions.md
│   └── performance-notes.md
└── another-project/
    └── ...
```

Each thought includes YAML frontmatter for fast discovery:

```yaml
---
project: my-project
created: 2025-06-15T14:30:00
summary: Analysis of REST vs GraphQL tradeoffs
cwd: /home/user/my-project
type: research
tags: [api, architecture]
---
```

- **Project** is auto-derived from your working directory name, or set explicitly with `project_set`
- The **index** tracks all thoughts' metadata for fast querying without reading file contents
- Use `index` at session start to discover prior knowledge; use `recent` to see the latest across all projects

## CLI Path Resolution

The Obsidian CLI binary is resolved in this order:

1. **`OBSIDIAN_CLI_PATH`** environment variable (explicit override)
2. **`obsidian` on PATH** (e.g. if symlinked or installed globally)
3. **Platform auto-detection:**

| Platform | Auto-detected Path |
|----------|-------------------|
| Windows | `C:\Users\*\AppData\Local\Programs\Obsidian\Obsidian.com` |
| macOS | `/Applications/Obsidian.app/Contents/MacOS/Obsidian` |
| Linux | `/snap/obsidian/current/obsidian`, flatpak paths |
| WSL | `/mnt/c/Users/*/AppData/Local/Programs/Obsidian/Obsidian.com` |

WSL is automatically detected. The server sets `cwd` to `/mnt/c` before CLI execution to work around UNC path issues.

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Windows | Supported | Auto-detects CLI in AppData |
| macOS | Supported | Auto-detects CLI in /Applications |
| Linux | Supported | Snap and Flatpak auto-detected |
| WSL | Supported | Auto-detects Windows CLI, handles UNC paths |

## Privacy

- All data stays local in your Obsidian vault
- The `cwd` field in thought frontmatter records which directory you were working in — this is stored only in your vault
- No data is transmitted to external services
- Communication uses stdio transport only (stdin/stdout between MCP client and server)

## Development

```bash
git clone https://github.com/sespinosa/obsidian-surface.git
cd obsidian-surface
npm install
npm run build
npm test
```

## License

[MIT](LICENSE)
