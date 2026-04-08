# Plan: `obsidian-mcp` Server

## Context

Use Obsidian as a **rich display surface and knowledge workspace** for any LLM/AI tool (not Claude-specific). Existing MCP servers either use the REST API (limited — no tab/workspace control) or are thin CLI wrappers (no abstractions). We build a proper MCP server backed by the **Obsidian CLI** (v1.12+) with structured tools, typed I/O, project-based organization, and a "thoughts" system for ephemeral content.

## Key Concepts

### Thoughts System
- **`_thoughts/{project}/`** — organized workspace inside the vault
- **Project** is auto-derived from context (e.g. cwd name) or explicitly set
- Each thought is a note with frontmatter (project, created, type, tags)
- Thoughts can be rich: markdown, mermaid diagrams, tables, code blocks, embedded images
- Projects can be listed, renamed, cleaned up

### Frontmatter on thoughts
```yaml
---
project: mcps
created: 2026-04-08T11:45:00
type: research
tags: [obsidian, mcp-design]
---
```

## Architecture

- **Language:** TypeScript (ESM)
- **SDK:** `@modelcontextprotocol/sdk` v1.29+ (`registerTool` with Zod v4 schemas)
- **Transport:** stdio
- **Backend:** Obsidian CLI via `child_process.execFile`
- **Package:** npm-publishable, generic, cross-platform

### CLI Path Resolution (cross-platform)
1. Env var `OBSIDIAN_CLI_PATH` (explicit override)
2. `obsidian` on PATH
3. Auto-detect per platform:
   - **Windows/WSL:** `/mnt/c/Users/*/AppData/Local/Programs/Obsidian/Obsidian.com` or `C:\Users\*\AppData\Local\Programs\Obsidian\Obsidian.com`
   - **macOS:** `/Applications/Obsidian.app/Contents/MacOS/Obsidian`
   - **Linux:** snap/flatpak/AppImage common paths
4. WSL detection: `cd /mnt/c` before exec (UNC path workaround)

### Core Module: `cli.ts`
```typescript
async function execObsidian(args: string[]): Promise<string>
```

## Tools (grouped by category)

### Thoughts (ephemeral project-organized content)

| Tool | Description | CLI |
|------|-------------|-----|
| `thought_create` | Create a thought in active project, open it | `create path=_thoughts/{project}/{name}.md content=... open newtab` |
| `thought_list` | List thoughts in a project | `files folder=_thoughts/{project}` |
| `thought_clear` | Delete all thoughts in a project | iterate + `delete` |
| `project_set` | Set/create the active project | internal state + `create` folder if needed |
| `project_list` | List all projects | `folders folder=_thoughts` |
| `project_rename` | Rename a project | `move` files to new folder |

### Notes (persistent vault CRUD)

| Tool | Description | CLI |
|------|-------------|-----|
| `note_create` | Create a note | `create` |
| `note_read` | Read a note | `read` |
| `note_write` | Write/overwrite a note | `create overwrite` |
| `note_append` | Append to a note | `append` |
| `note_prepend` | Prepend to a note | `prepend` |
| `note_delete` | Delete a note | `delete` |
| `note_move` | Move/rename a note | `move` |
| `note_search` | Search vault | `search format=json` |
| `note_list` | List files in folder | `files` |

### Properties (frontmatter)

| Tool | Description | CLI |
|------|-------------|-----|
| `property_get` | Read a property | `property:read` |
| `property_set` | Set a property | `property:set` |
| `property_remove` | Remove a property | `property:remove` |
| `properties_list` | List all properties | `properties` |

### Tags

| Tool | Description | CLI |
|------|-------------|-----|
| `tag_info` | Get tag usage info | `tag` |
| `tags_list` | List all tags | `tags` |

### Navigation

| Tool | Description | CLI |
|------|-------------|-----|
| `open` | Open a file in UI | `open` |
| `tab_open` | Open new tab with file/view | `tab:open` |
| `tabs_list` | List open tabs with IDs | `tabs ids` |
| `recents` | List recently opened files | `recents` |

### Workspace & Layout

| Tool | Description | CLI |
|------|-------------|-----|
| `workspace` | Show workspace tree with IDs | `workspace ids` |
| `split` | Split pane (vertical/horizontal) | `command id=workspace:split-*` |
| `close_tab` | Close tab (current/others/group) | `command id=workspace:close*` |
| `sidebar` | Toggle sidebar (left/right) | `command id=app:toggle-*-sidebar` |
| `focus` | Focus tab group by direction | `command id=editor:focus-*` |

### Search & Analysis

| Tool | Description | CLI |
|------|-------------|-----|
| `search` | Search vault text | `search` |
| `search_context` | Search with line context | `search:context` |
| `backlinks` | List backlinks to a file | `backlinks` |
| `links` | List outgoing links | `links` |
| `outline` | Show headings tree | `outline` |
| `orphans` | List files with no incoming links | `orphans` |
| `deadends` | List files with no outgoing links | `deadends` |

### Tasks

| Tool | Description | CLI |
|------|-------------|-----|
| `task_list` | List tasks in vault/file | `tasks` |
| `task_update` | Toggle/update task status | `task` |

### Daily Notes

| Tool | Description | CLI |
|------|-------------|-----|
| `daily` | Open/read/append to daily note | `daily`, `daily:read`, `daily:append` |

### Templates

| Tool | Description | CLI |
|------|-------------|-----|
| `templates_list` | List available templates | `templates` |
| `template_insert` | Insert template into active file | `template:insert` |
| `template_read` | Read template content | `template:read` |

### Vault & System

| Tool | Description | CLI |
|------|-------------|-----|
| `vault_info` | Show vault info | `vault` |
| `vault_folders` | List folders | `folders` |
| `command` | Execute any Obsidian command by ID | `command` |
| `commands_list` | List available commands (with filter) | `commands` |

### Dev (advanced)

| Tool | Description | CLI |
|------|-------------|-----|
| `eval` | Execute JavaScript in Obsidian | `eval` |
| `screenshot` | Take a screenshot of Obsidian | `dev:screenshot` |

## Project Structure

```
/home/dev/mcp/obsidian-mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Entry: create server, register all tools, connect stdio
│   ├── cli.ts             # CLI wrapper: path resolution, WSL detection, exec
│   ├── state.ts           # Active project tracking
│   ├── tools/
│   │   ├── thoughts.ts    # thought_create, thought_list, thought_clear, project_*
│   │   ├── notes.ts       # note CRUD + search + list
│   │   ├── properties.ts  # property get/set/remove/list
│   │   ├── tags.ts        # tag info/list
│   │   ├── navigation.ts  # open, tab_open, tabs_list, recents
│   │   ├── workspace.ts   # workspace, split, close_tab, sidebar, focus
│   │   ├── search.ts      # search, search_context, backlinks, links, outline, orphans, deadends
│   │   ├── tasks.ts       # task_list, task_update
│   │   ├── daily.ts       # daily note operations
│   │   ├── templates.ts   # template operations
│   │   ├── vault.ts       # vault_info, vault_folders, command, commands_list
│   │   └── dev.ts         # eval, screenshot
│   └── types.ts           # Shared types/constants
```

## Config

```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "command": "npx",
      "args": ["obsidian-mcp"],
      "env": {
        "OBSIDIAN_CLI_PATH": "/path/to/obsidian",
        "OBSIDIAN_DEFAULT_PROJECT": "myproject"
      }
    }
  }
}
```

Both env vars optional. CLI path auto-detected. Default project falls back to "default".

## Verification

1. `npm run build`
2. Add to Claude Code MCP config, restart, verify all tools load
3. Test: `thought_create` → verify note opens in Obsidian with frontmatter
4. Test: `tabs_list` → verify tab IDs returned
5. Test: `workspace` → verify layout tree
6. Test: `project_set` / `project_list` flow
7. Test: `note_search` → verify JSON results
