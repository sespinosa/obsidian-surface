import { execObsidian } from "./cli.js";
import { THOUGHTS_DIR } from "./types.js";

const INDEX_PATH = `${THOUGHTS_DIR}/_index.json`;

export interface IndexEntry {
  path: string;
  project: string;
  created: string;
  type?: string;
  tags?: string[];
  cwd?: string;
  summary?: string;
}

/** Parse simple YAML frontmatter from markdown content (no yaml library needed). */
export function parseFrontmatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result: Record<string, string | string[]> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Handle array syntax: [a, b, c]
    const arrayMatch = value.match(/^\[(.*)\]$/);
    if (arrayMatch) {
      result[key] = arrayMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

/** Build an IndexEntry from parsed frontmatter and file path. */
function entryFromFrontmatter(
  filePath: string,
  fm: Record<string, string | string[]>
): IndexEntry {
  return {
    path: filePath,
    project: typeof fm.project === "string" ? fm.project : "",
    created: typeof fm.created === "string" ? fm.created : "",
    type: typeof fm.type === "string" ? fm.type : undefined,
    tags: Array.isArray(fm.tags) ? fm.tags : undefined,
    cwd: typeof fm.cwd === "string" ? fm.cwd : undefined,
    summary: typeof fm.summary === "string" ? fm.summary : undefined,
  };
}

/** Sort entries by created descending (newest first). */
function sortEntries(entries: IndexEntry[]): IndexEntry[] {
  return entries.sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}

/** Read the index from the vault. Returns [] if it doesn't exist. */
export async function readIndex(): Promise<IndexEntry[]> {
  try {
    const raw = await execObsidian(["read", `path=${INDEX_PATH}`]);
    return JSON.parse(raw) as IndexEntry[];
  } catch {
    return [];
  }
}

/** Write the full index to the vault (sorted by created descending). */
export async function writeIndex(entries: IndexEntry[]): Promise<void> {
  const sorted = sortEntries(entries);
  const json = JSON.stringify(sorted, null, 2);
  await execObsidian(["create", `path=${INDEX_PATH}`, `content=${json}`, "overwrite"]);
}

/** Append a new entry to the index (prepends to array since newest-first). */
export async function appendEntry(entry: IndexEntry): Promise<void> {
  const entries = await readIndex();
  entries.unshift(entry);
  await writeIndex(entries);
}

/** Update an existing entry by path. Merges provided fields. */
export async function updateEntry(
  filePath: string,
  updates: Partial<Omit<IndexEntry, "path">>
): Promise<void> {
  const entries = await readIndex();
  const idx = entries.findIndex((e) => e.path === filePath);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], ...updates };
  await writeIndex(entries);
}

/** Remove entries matching a filter. Returns count removed. */
export async function removeEntries(
  filter: (e: IndexEntry) => boolean
): Promise<number> {
  const entries = await readIndex();
  const remaining = entries.filter((e) => !filter(e));
  const removed = entries.length - remaining.length;
  if (removed > 0) await writeIndex(remaining);
  return removed;
}

/** Rebuild the index by scanning all thought files and parsing frontmatter. */
export async function reindex(): Promise<IndexEntry[]> {
  const entries: IndexEntry[] = [];

  // List all project folders under _thoughts
  let folders: string[];
  try {
    const foldersOutput = await execObsidian(["folders", `folder=${THOUGHTS_DIR}`]);
    folders = foldersOutput.split("\n").map((f) => f.trim()).filter(Boolean);
  } catch {
    folders = [];
  }

  for (const folder of folders) {
    // Skip the index file's "folder"
    if (folder.endsWith("_index.json")) continue;

    let files: string[];
    try {
      const filesOutput = await execObsidian(["files", `folder=${folder}`]);
      files = filesOutput.split("\n").map((f) => f.trim()).filter(Boolean);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      try {
        const content = await execObsidian(["read", `path=${file}`]);
        const fm = parseFrontmatter(content);
        entries.push(entryFromFrontmatter(file, fm));
      } catch {
        // Skip files that can't be read
      }
    }
  }

  await writeIndex(entries);
  return entries;
}
