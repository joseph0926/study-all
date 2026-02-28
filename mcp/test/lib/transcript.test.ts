import { describe, expect, it } from "vitest";
import {
  encodeClaudeCodeProjectPath,
  parseClaudeCodeEntry,
  parseCodexEntry,
  rangesOverlap,
  toTranscriptMarkdown,
  type TranscriptMessage,
} from "../../src/lib/transcript.js";

describe("encodeClaudeCodeProjectPath", () => {
  it("encodes slashes, @, dots, spaces, tildes to dashes", () => {
    expect(encodeClaudeCodeProjectPath("/Users/kim/Downloads/@work/study-all")).toBe(
      "-Users-kim-Downloads--work-study-all",
    );
  });

  it("handles simple path", () => {
    expect(encodeClaudeCodeProjectPath("/home/user/project")).toBe("-home-user-project");
  });

  it("handles path with dots and spaces", () => {
    expect(encodeClaudeCodeProjectPath("/home/user/my project.dev")).toBe(
      "-home-user-my-project-dev",
    );
  });
});

describe("parseClaudeCodeEntry", () => {
  it("parses user message with string content", () => {
    const entry = {
      type: "user",
      timestamp: "2026-02-28T10:00:00.000Z",
      message: {
        role: "user",
        content: "What is React Fiber?",
      },
    };
    const result = parseClaudeCodeEntry(entry);
    expect(result).toEqual({
      timestamp: "2026-02-28T10:00:00.000Z",
      role: "user",
      text: "What is React Fiber?",
    });
  });

  it("skips user message with tool_result content", () => {
    const entry = {
      type: "user",
      timestamp: "2026-02-28T10:00:00.000Z",
      message: {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "abc", content: "file content" },
        ],
      },
    };
    expect(parseClaudeCodeEntry(entry)).toBeNull();
  });

  it("parses assistant text message", () => {
    const entry = {
      type: "assistant",
      timestamp: "2026-02-28T10:01:00.000Z",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "React Fiber is a reconciliation engine." },
        ],
      },
    };
    const result = parseClaudeCodeEntry(entry);
    expect(result).toEqual({
      timestamp: "2026-02-28T10:01:00.000Z",
      role: "assistant",
      text: "React Fiber is a reconciliation engine.",
    });
  });

  it("extracts tool names from assistant message", () => {
    const entry = {
      type: "assistant",
      timestamp: "2026-02-28T10:01:00.000Z",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Let me read the file." },
          { type: "tool_use", name: "Read", id: "t1", input: {} },
        ],
      },
    };
    const result = parseClaudeCodeEntry(entry);
    expect(result?.toolNames).toEqual(["Read"]);
  });

  it("skips thinking-only assistant messages", () => {
    const entry = {
      type: "assistant",
      timestamp: "2026-02-28T10:01:00.000Z",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "internal reasoning" },
        ],
      },
    };
    expect(parseClaudeCodeEntry(entry)).toBeNull();
  });

  it("skips progress entries", () => {
    const entry = {
      type: "progress",
      timestamp: "2026-02-28T10:00:00.000Z",
      data: {},
    };
    expect(parseClaudeCodeEntry(entry)).toBeNull();
  });

  it("skips entries without timestamp", () => {
    const entry = {
      type: "user",
      message: { role: "user", content: "hello" },
    };
    expect(parseClaudeCodeEntry(entry)).toBeNull();
  });
});

describe("parseCodexEntry", () => {
  it("parses user input_text", () => {
    const entry = {
      type: "response_item",
      timestamp: "2026-02-28T10:00:00.000Z",
      payload: {
        role: "user",
        content: [
          { type: "input_text", text: "How does React work?" },
        ],
      },
    };
    const result = parseCodexEntry(entry);
    expect(result).toEqual({
      timestamp: "2026-02-28T10:00:00.000Z",
      role: "user",
      text: "How does React work?",
    });
  });

  it("parses assistant output_text", () => {
    const entry = {
      type: "response_item",
      timestamp: "2026-02-28T10:01:00.000Z",
      payload: {
        role: "assistant",
        content: [
          { type: "output_text", text: "React uses a virtual DOM." },
        ],
      },
    };
    const result = parseCodexEntry(entry);
    expect(result).toEqual({
      timestamp: "2026-02-28T10:01:00.000Z",
      role: "assistant",
      text: "React uses a virtual DOM.",
    });
  });

  it("skips session_meta entries", () => {
    const entry = {
      type: "session_meta",
      timestamp: "2026-02-28T10:00:00.000Z",
      payload: { cwd: "/home/user" },
    };
    expect(parseCodexEntry(entry)).toBeNull();
  });

  it("skips event_msg entries", () => {
    const entry = {
      type: "event_msg",
      timestamp: "2026-02-28T10:00:00.000Z",
      payload: {},
    };
    expect(parseCodexEntry(entry)).toBeNull();
  });

  it("skips response_item without role", () => {
    const entry = {
      type: "response_item",
      timestamp: "2026-02-28T10:00:00.000Z",
      payload: { content: [] },
    };
    expect(parseCodexEntry(entry)).toBeNull();
  });
});

describe("toTranscriptMarkdown", () => {
  it("generates valid markdown with header, messages, and separators", () => {
    const messages: TranscriptMessage[] = [
      {
        timestamp: "2026-02-28T10:00:00.000Z",
        role: "user",
        text: "What is Suspense?",
      },
      {
        timestamp: "2026-02-28T10:01:00.000Z",
        role: "assistant",
        text: "Suspense is a React feature for async rendering.",
        toolNames: ["Read", "Grep"],
      },
    ];

    const md = toTranscriptMarkdown("Suspense", "2026-02-28", "claude-code", messages);

    expect(md).toContain("# Transcript: Suspense");
    expect(md).toContain("클라이언트: claude-code");
    expect(md).toContain("메시지: 2개");
    expect(md).toContain("## [19:00:00] 사용자");
    expect(md).toContain("What is Suspense?");
    expect(md).toContain("## [19:01:00] AI");
    expect(md).toContain("Suspense is a React feature for async rendering.");
    expect(md).toContain("> 도구 호출: Read, Grep");
  });

  it("handles empty messages array", () => {
    const md = toTranscriptMarkdown("Test", "2026-02-28", "codex", []);
    expect(md).toContain("# Transcript: Test");
    expect(md).toContain("메시지: 0개");
  });
});

describe("rangesOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap(10, 20, 15, 25)).toBe(true);
  });

  it("detects contained range", () => {
    expect(rangesOverlap(10, 30, 15, 25)).toBe(true);
  });

  it("detects touching ranges", () => {
    expect(rangesOverlap(10, 20, 20, 30)).toBe(true);
  });

  it("detects non-overlapping ranges", () => {
    expect(rangesOverlap(10, 20, 21, 30)).toBe(false);
  });

  it("detects non-overlapping reversed", () => {
    expect(rangesOverlap(21, 30, 10, 20)).toBe(false);
  });
});
