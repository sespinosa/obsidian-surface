# Project Context

## Vision

Use Obsidian as a **rich display surface and knowledge workspace** for any LLM/AI tool. Not Claude-specific — works with any MCP client.

Two primary use cases:
1. **Display surface** — LLMs can "show" users rich content (formatted docs, tables, diagrams, comparisons) in Obsidian instead of dumping text in a terminal. Ephemeral by nature.
2. **Knowledge workspace** — Persistent notes, organized by project, with full CRUD and search.

## Why a new MCP?

Existing Obsidian MCP servers:
- **cyanheads/obsidian-mcp-server** — Uses the REST API (Local REST API plugin). Limited: no tab/workspace control, no "open file by path" tool, no command execution.
- **MarkusPfundstein/mcp-obsidian** — Reads vault directly from filesystem. No UI control at all.
- **devinat1/obsidian-cli-mcp** — Thin wrapper around CLI. Single `obsidian_cli` tool that passes raw command strings. No structured tools, no parsed output, no abstractions. Same as calling the CLI via Bash.

None of them offer structured tools with typed I/O, workspace/tab awareness, or the "thoughts" display concept.

## Backend: Obsidian CLI (v1.12+)

Obsidian released an official CLI in v1.12 (Feb 2026). 103 commands covering:
- File CRUD (create, read, append, prepend, delete, move, rename)
- Navigation (open, tab:open, tabs, workspace, recents)
- Workspace control (split, close, focus, sidebars) via command execution
- Search (text, context, JSON output)
- Properties/frontmatter management
- Tags, tasks, templates, daily notes
- Dev tools (eval JS, screenshot, DOM queries)
- Full command passthrough (any Obsidian command by ID)

The CLI requires Obsidian app to be running. It communicates with the running instance.

### CLI output formats
- Default: plain text / tree view
- `tabs` — `[type] name` per line, with optional IDs (hex)
- `workspace` — tree with `main`, `left`, `right` sections
- `search format=json` — JSON array of file paths
- `vault` — TSV-like key/value pairs

### WSL considerations
- CLI binary is at `/mnt/c/Users/root/AppData/Local/Programs/Obsidian/Obsidian.com`
- Must `cd /mnt/c` before exec (UNC path workaround)
- `localhost` works for REST API after enabling mirrored networking in `.wslconfig`

## Obsidian vault setup

- Vault name: `mcp`
- Vault path (Windows): `C:\Users\root\Desktop\obsidian\mcp`
- REST API plugin installed and enabled (port 27124, HTTPS, self-signed cert)
- CLI enabled in Settings → General → Command line interface
- Obsidian version: 1.12.7

## Thoughts System

The `_thoughts/` folder in the vault organizes ephemeral content by project:

```
_thoughts/
├── mcps/                  ← project derived from working context
│   ├── api-research.md    ← a "thought" (note with frontmatter)
│   ├── design-notes.md
│   └── ...
├── smartberry/            ← another project
│   └── ...
└── ...
```

Each thought has YAML frontmatter:
```yaml
---
project: mcps
created: 2026-04-08T11:45:00
type: research
tags: [obsidian, mcp-design]
---
```

Obsidian supports rich content in notes: markdown, mermaid diagrams, tables, code blocks, math (LaTeX), callouts, embedded images, and embeds of other notes.

## Verified CLI commands (tested from WSL)

```bash
# Path alias (needs cd /mnt/c first)
OBSIDIAN="/mnt/c/Users/root/AppData/Local/Programs/Obsidian/Obsidian.com"

# Create + open in one shot
$OBSIDIAN create path="_thoughts/mcps/test.md" content="# Test" open newtab

# List tabs with IDs
$OBSIDIAN tabs ids
# Output: [markdown] test-from-claude    fd6e6708380852cc

# Workspace tree with IDs
$OBSIDIAN workspace ids
# Output: tree with main/left/right sections, tab groups, leaf IDs

# Vault info
$OBSIDIAN vault
# Output: name, path, files count, folders count, size

# Search with JSON output
$OBSIDIAN search query="hello" format=json
# Output: ["test-from-claude.md"]

# Execute any Obsidian command
$OBSIDIAN command id=workspace:split-vertical

# Full help
$OBSIDIAN help
```

## Dev environment

- WSL2 Ubuntu 24.04 (user: dev)
- Windows user: root
- Node v20.19.5 (nvm) — but v25.8.1 also available
- TypeScript, ESM
- MCP SDK: @modelcontextprotocol/sdk v1.29+

## npm name

Package name `obsidian-surface` is available on npm. Confirmed taken: obsidian-mcp, obsidian-cli-mcp.

## Scope (core first)

Build core tools first (~20 tools):
- **Thoughts**: thought_create, thought_list, thought_clear, project_set, project_list, project_rename
- **Notes**: note_create, note_read, note_write, note_append, note_delete, note_search, note_list
- **Navigation**: open, tabs_list, recents
- **Workspace**: workspace, split, close_tab, sidebar, focus
- **Utility**: command, commands_list, vault_info

Then add incrementally: properties, tags, tasks, daily notes, templates, search analysis, dev tools.
