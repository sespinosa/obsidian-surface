# obsidian-surface

MCP server for Obsidian — rich display surface and knowledge workspace for AI tools, backed by Obsidian CLI (v1.12+).

## Requirements

- **Obsidian v1.12+** with CLI enabled (Settings → General → Command line interface)
- **Node.js 20+**

## Install

```bash
npm install -g obsidian-surface
```

Or run directly:

```bash
npx obsidian-surface
```

## Configuration

Add to your MCP client config (e.g. Claude Code `~/.claude.json`):

```json
{
  "mcpServers": {
    "obsidian-surface": {
      "command": "npx",
      "args": ["obsidian-surface"],
      "env": {
        "OBSIDIAN_CLI_PATH": "/path/to/obsidian",
        "OBSIDIAN_DEFAULT_PROJECT": "myproject"
      }
    }
  }
}
```

Both env vars are optional. CLI path is auto-detected on Windows, macOS, Linux, and WSL. Default project falls back to `"default"`.

## Tools

**Thoughts** — Ephemeral project-organized notes with frontmatter:
`thought_create`, `thought_list`, `thought_clear`, `project_set`, `project_list`, `project_rename`

**Notes** — Persistent vault CRUD:
`note_create`, `note_read`, `note_write`, `note_append`, `note_prepend`, `note_delete`, `note_move`, `note_search`, `note_list`

**Navigation** — UI control:
`open`, `tab_open`, `tabs_list`, `recents`

**Workspace** — Layout management:
`workspace`, `split`, `close_tab`, `sidebar`, `focus`

**Search & Analysis** —
`search`, `search_context`, `backlinks`, `links`, `outline`, `orphans`, `deadends`

**Properties** — Frontmatter management:
`property_get`, `property_set`, `property_remove`, `properties_list`

**Tags** — `tag_info`, `tags_list`

**Tasks** — `task_list`, `task_update`

**Daily Notes** — `daily`

**Templates** — `templates_list`, `template_insert`, `template_read`

**Vault & System** — `vault_info`, `vault_folders`, `command`, `commands_list`

**Dev** — `eval`, `screenshot`

## Development

```bash
git clone <repo-url>
cd obsidian-surface
npm install
npm run build
npm start
```

## License

MIT
