import path from "node:path";
import { exists, listFiles, readText } from "./fs.js";

const NOTE_FILE = "note.md";
const REVIEW_META_RELATIVE_PATH = path.join("review", "meta.md");
const REVIEW_QA_DIR_RELATIVE_PATH = path.join("review", "qa");
const RESERVED_FILES = new Set(["session-state.md", "plan.md"]);
const RESERVED_TOP_LEVEL_DIRS = new Set([".routine", "_system"]);

export interface StudyTopicFrontmatter {
  id?: string | undefined;
  title?: string | undefined;
  aliases: string[];
}

export interface StudyTopicEntry {
  topic: string;
  topicDir: string;
  notePath: string;
  noteRelativePath: string;
  layout: "legacy" | "topic_dir";
  frontmatter: StudyTopicFrontmatter;
  reviewMetaPath?: string | undefined;
  legacyQaPath?: string | undefined;
  reviewQaDir?: string | undefined;
}

function normalizeTopicToken(input: string): string {
  return input.trim().toLowerCase().replace(/[\s._/\\-]+/g, "");
}

function toTopicDirName(topic: string): string {
  const normalized = topic
    .trim()
    .replace(/[/:]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "untitled-topic";
}

function parseInlineArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

export function parseTopicFrontmatter(markdown: string): StudyTopicFrontmatter {
  if (!markdown.startsWith("---\n")) {
    return { aliases: [] };
  }

  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { aliases: [] };
  }

  const aliases: string[] = [];
  let title: string | undefined;
  let id: string | undefined;
  let activeArrayKey: string | undefined;

  for (const line of match[1]!.split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      const rawKey = keyMatch[1];
      const rawValue = keyMatch[2];
      if (!rawKey || rawValue === undefined) {
        continue;
      }
      const key = rawKey.trim();
      const value = rawValue.trim();
      activeArrayKey = undefined;

      if (key === "title" && value) {
        title = value.replace(/^['"]|['"]$/g, "");
        continue;
      }

      if (key === "id" && value) {
        id = value.replace(/^['"]|['"]$/g, "");
        continue;
      }

      if (key === "aliases") {
        if (value) {
          aliases.push(...parseInlineArray(value));
        } else {
          activeArrayKey = key;
        }
      }
      continue;
    }

    if (activeArrayKey === "aliases") {
      const aliasMatch = line.match(/^\s*-\s+(.+)$/);
      if (aliasMatch) {
        aliases.push(aliasMatch[1]!.trim().replace(/^['"]|['"]$/g, ""));
      }
    }
  }

  return {
    id,
    title,
    aliases,
  };
}

function isReservedPath(baseDir: string, filePath: string): boolean {
  const rel = path.relative(baseDir, filePath);
  const segments = rel.split(path.sep);
  const first = segments[0];
  if (first && RESERVED_TOP_LEVEL_DIRS.has(first)) {
    return true;
  }
  if (segments.includes("review")) {
    return true;
  }
  return false;
}

function isLegacyTopicFile(baseDir: string, filePath: string): boolean {
  if (isReservedPath(baseDir, filePath)) {
    return false;
  }

  const base = path.basename(filePath);
  if (RESERVED_FILES.has(base)) {
    return false;
  }
  if (base === NOTE_FILE) {
    return false;
  }
  return !base.endsWith("-meta.md") && !base.endsWith("-qa.md") && !base.endsWith("-quiz.md");
}

async function buildTopicEntry(baseDir: string, notePath: string, layout: StudyTopicEntry["layout"]): Promise<StudyTopicEntry> {
  const noteRelativePath = path.relative(baseDir, notePath);
  const noteDir = path.dirname(notePath);
  const noteText = await readText(notePath);
  const frontmatter = parseTopicFrontmatter(noteText);

  const topic =
    frontmatter.title ??
    (layout === "topic_dir" ? path.basename(noteDir) : path.basename(notePath, ".md"));

  const reviewMetaPath =
    layout === "topic_dir"
      ? path.join(noteDir, REVIEW_META_RELATIVE_PATH)
      : path.join(noteDir, `${path.basename(notePath, ".md")}-meta.md`);

  const legacyQaPath =
    layout === "legacy"
      ? path.join(noteDir, `${path.basename(notePath, ".md")}-qa.md`)
      : undefined;

  return {
    topic,
    topicDir: noteDir,
    notePath,
    noteRelativePath,
    layout,
    frontmatter,
    reviewMetaPath: (await exists(reviewMetaPath)) ? reviewMetaPath : undefined,
    legacyQaPath: legacyQaPath && (await exists(legacyQaPath)) ? legacyQaPath : undefined,
    reviewQaDir: layout === "topic_dir" ? path.join(noteDir, REVIEW_QA_DIR_RELATIVE_PATH) : undefined,
  };
}

function scoreTopicCandidate(entry: StudyTopicEntry, normalizedTopic: string): number {
  const keys = [
    entry.topic,
    entry.frontmatter.title,
    entry.frontmatter.id,
    ...entry.frontmatter.aliases,
    path.basename(entry.topicDir),
    path.basename(entry.notePath, ".md"),
    entry.noteRelativePath,
  ]
    .filter(Boolean)
    .map((item) => item!);

  let score = entry.layout === "topic_dir" ? 50 : 0;

  for (const key of keys) {
    const normalizedKey = normalizeTopicToken(key);
    if (!normalizedKey) continue;
    if (normalizedKey === normalizedTopic) {
      score += 1000;
      break;
    }
    if (normalizedKey.includes(normalizedTopic) || normalizedTopic.includes(normalizedKey)) {
      score += 100;
    }
  }

  return score;
}

export async function discoverStudyTopics(baseDir: string): Promise<StudyTopicEntry[]> {
  const files = await listFiles(baseDir, { extension: ".md", maxDepth: 4 });
  const entries: StudyTopicEntry[] = [];

  for (const file of files) {
    if (isReservedPath(baseDir, file)) {
      continue;
    }

    if (path.basename(file) === NOTE_FILE) {
      entries.push(await buildTopicEntry(baseDir, file, "topic_dir"));
      continue;
    }

    if (isLegacyTopicFile(baseDir, file)) {
      entries.push(await buildTopicEntry(baseDir, file, "legacy"));
    }
  }

  const deduped = new Map<string, StudyTopicEntry>();
  for (const entry of entries.sort((a, b) => (a.layout === "topic_dir" ? -1 : 1))) {
    const key = normalizeTopicToken(
      entry.frontmatter.id ?? entry.frontmatter.title ?? entry.topic ?? entry.noteRelativePath,
    );
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  }

  return [...deduped.values()].sort((a, b) => a.topic.localeCompare(b.topic));
}

export async function findStudyTopic(baseDir: string, topic: string): Promise<StudyTopicEntry | undefined> {
  const normalizedTopic = normalizeTopicToken(topic);
  const entries = await discoverStudyTopics(baseDir);
  const ranked = entries
    .map((entry) => ({
      entry,
      score: scoreTopicCandidate(entry, normalizedTopic),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.entry.layout === "topic_dir" ? -1 : 1) ||
        a.entry.noteRelativePath.localeCompare(b.entry.noteRelativePath),
    );

  return ranked[0]?.entry;
}

export function getDefaultTopicNotePath(baseDir: string, topic: string): string {
  return path.join(baseDir, "topics", toTopicDirName(topic), NOTE_FILE);
}

export function getDefaultTopicReviewMetaPath(baseDir: string, topic: string): string {
  return path.join(path.dirname(getDefaultTopicNotePath(baseDir, topic)), REVIEW_META_RELATIVE_PATH);
}

export function getDefaultTopicReviewQaPath(baseDir: string, topic: string, today: string): string {
  return path.join(path.dirname(getDefaultTopicNotePath(baseDir, topic)), REVIEW_QA_DIR_RELATIVE_PATH, `${today}.md`);
}
