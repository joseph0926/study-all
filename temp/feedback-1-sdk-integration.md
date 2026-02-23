# Scope 1: MCP SDK 통합 피드백

> 검토일: 2026-02-23
> 대상: `mcp/src/index.ts` (MCP 서버 진입점)
> SDK 버전: `@modelcontextprotocol/sdk` v1.26.0 (zod v4.3.6)

## 요약

`index.ts`의 서버 설정에는 3가지 핵심 문제가 있다. 첫째, deprecated된 `server.tool()` API에 `z.object()` 스키마를 직접 전달하면 SDK 내부에서 스키마가 `annotations`로 잘못 분류되어 **입력 검증이 완전히 누락**되는 치명적 버그가 있다. 둘째, 동적 import + 이중 `as` 캐스팅 패턴은 타입 안전성을 완전히 포기하고 있다. 셋째, `server.tool()`은 v1.26.0에서 공식 deprecated 되었으며 `registerTool()`로 전환해야 한다.

---

## 발견 사항

### [S1-001] `tool()` API의 스키마 오분류 — 심각도: CRITICAL

- **현재 코드**: `mcp/src/index.ts:175`
  ```typescript
  server.tool(tool.name, tool.description, tool.schema, async (args) => {
    const parsed = tool.schema.parse(args);
    // ...
  });
  ```
  여기서 `tool.schema`는 `z.ZodTypeAny` 타입 (실제로는 `z.object({...})` 인스턴스).

- **문제**: SDK의 `tool()` 메서드 내부 구현(`mcp.js:657-694`)은 positional argument 파싱 시 `isZodRawShapeCompat()` 함수로 스키마를 식별한다. 그런데 `z.object({...})`는 `_def` 또는 `_zod` 속성을 가진 Zod 스키마 인스턴스이므로 `isZodSchemaInstance()` 검사에서 true를 반환하고, 결과적으로 `isZodRawShapeCompat()`은 **false**를 반환한다.

  이에 따른 실행 흐름:
  1. `rest = [description, z.object({...}), callback]`
  2. `description` 추출 후 `rest = [z.object({...}), callback]`
  3. `rest.length > 1` → true
  4. `isZodRawShapeCompat(z.object({...}))` → **false** (Zod 인스턴스이므로, `mcp.js:841-855`)
  5. `typeof firstArg === 'object'` → true → **annotations로 잘못 분류** (`mcp.js:685-689`)
  6. `_createRegisteredTool(name, undefined, description, undefined, undefined, z.object_as_annotations, ...)` 호출

  결과: **모든 도구가 `inputSchema: undefined`로 등록된다.** SDK가 입력 검증을 수행하지 않으므로, `args`에 어떤 값이 와도 핸들러에 그대로 전달된다. 현재 핸들러 내부에서 `tool.schema.parse(args)`를 수동 호출하고 있어 런타임 크래시로 이어지지는 않을 수 있지만, SDK의 `ListTools` 응답에서 각 도구의 `inputSchema`가 빈 객체(`{}`)로 노출되어 **클라이언트가 올바른 파라미터 정보를 받지 못한다.**

- **근거**:
  - SDK 구현 — `tool()` 메서드: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:657-694`
  - SDK 구현 — `isZodRawShapeCompat()`: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:841-855` — Zod 인스턴스를 명시적으로 제외
  - SDK 구현 — annotations 잘못 분류: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:685-689` — Zod 인스턴스가 `annotations`로 잘못 분류되는 fallback
  - `tool()` 타입 시그니처: `mcp.d.ts:126` — `paramsSchemaOrAnnotations: Args | ToolAnnotations`에서 `Args extends ZodRawShapeCompat`이므로 `z.object()`는 타입 레벨에서도 `Args`가 아닌 `ToolAnnotations`로 추론됨
  - SDK PR [#816](https://github.com/modelcontextprotocol/typescript-sdk/pull/816) — `registerTool`이 `ZodType<object>`도 수용하도록 개선된 배경

- **수정 방향**: `registerTool()`로 전환하면 `inputSchema` 필드를 config 객체에 명시적으로 전달하므로 이 문제가 근본적으로 해결된다.
  ```typescript
  server.registerTool(tool.name, {
    description: tool.description,
    inputSchema: tool.schema,
  }, async (args, _extra) => {
    const payload = await tool.run(args);
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  });
  ```
  `registerTool()`(`mcp.js:698-703`)은 config 객체에서 `inputSchema`를 직접 추출하므로 positional parsing 로직을 거치지 않는다.

---

### [S1-002] deprecated `server.tool()` 사용 — 심각도: HIGH

- **현재 코드**: `mcp/src/index.ts:175`
  ```typescript
  server.tool(tool.name, tool.description, tool.schema, async (args) => { ... });
  ```

- **문제**: SDK v1.26.0의 모든 `tool()` 오버로드에 `@deprecated Use registerTool instead.` 주석이 명시되어 있다. `tool()` 메서드의 구현부에도 "Support for this style is frozen as of protocol version 2025-03-26. Future additions to tool definition should *NOT* be added."라는 경고가 있다. 향후 `title`, `outputSchema`, `_meta`, `execution` 등 새로운 도구 속성은 `registerTool()`에서만 지원된다.

- **근거**:
  - SDK 타입 정의: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:111-146` — 6개 `tool()` 오버로드 모두 `@deprecated`
  - SDK 구현: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:665-666` — "frozen as of protocol version 2025-03-26"
  - `registerTool()` 시그니처: `mcp.d.ts:150-157` — `title`, `outputSchema`, `annotations`, `_meta` 등 확장 가능
  - GitHub: [Issue #1284](https://github.com/modelcontextprotocol/typescript-sdk/issues/1284) — deprecated 안내 및 예제 업데이트(PR #1285, 2025-12-11 머지)
  - GitHub: [SDK server.md 문서](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) — `registerTool()`을 표준 패턴으로 안내

- **수정 방향**: 모든 `server.tool()` 호출을 `server.registerTool()`로 전환한다.

---

### [S1-003] 동적 import + 이중 `as` 캐스팅 — 심각도: HIGH

- **현재 코드**: `mcp/src/index.ts:154-172`
  ```typescript
  const mcpModule = (await import("@modelcontextprotocol/sdk/server/mcp.js")) as {
    McpServer: new (meta: { name: string; version: string }) => unknown;
  };
  const transportModule = (await import("@modelcontextprotocol/sdk/server/stdio.js")) as {
    StdioServerTransport: new () => unknown;
  };

  const server = new mcpModule.McpServer({
    name: "study-all-mcp",
    version: "0.1.0",
  }) as {
    tool: (
      name: string,
      description: string,
      schema: z.ZodTypeAny,
      handler: (args: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>,
    ) => void;
    connect: (transport: unknown) => Promise<void>;
  };
  ```

- **문제**:
  1. **이중 캐스팅**: 모듈을 `as { McpServer: new (...) => unknown }`로 캐스팅한 뒤, 인스턴스를 다시 `as { tool: ...; connect: ... }`로 캐스팅한다. SDK의 실제 타입(`McpServer` 클래스, `StdioServerTransport` 클래스, `Transport` 인터페이스)을 완전히 무시한다.
  2. **타입 안전성 부재**: `connect()` 메서드의 인자 타입이 `unknown`으로 캐스팅되어 있어, 호환되지 않는 transport를 전달해도 컴파일 에러가 발생하지 않는다.
  3. **`tool` 시그니처 불일치**: 캐스팅된 `tool` 시그니처의 `schema` 파라미터가 `z.ZodTypeAny`이지만, 실제 `tool()` 메서드는 `ZodRawShapeCompat`을 기대한다(S1-001 참조). 타입 캐스팅이 이 불일치를 숨기고 있다.
  4. **동적 import 불필요**: 이 프로젝트는 `"type": "module"`(`package.json:4`)이고 `"module": "NodeNext"`(`tsconfig.json:4`)이므로 정적 ESM import가 가능하다. SDK가 named export를 제공하므로(`export class McpServer`, `export class StdioServerTransport`) 동적 import가 필요한 기술적 이유가 없다.

- **근거**:
  - SDK export 확인: `mcp.js:15` → `export class McpServer`, `stdio.js:8` → `export class StdioServerTransport`
  - SDK 타입 정의: `mcp.d.ts:14` — `export declare class McpServer`, `stdio.d.ts:9` — `export declare class StdioServerTransport implements Transport`
  - `McpServer` 생성자: `mcp.d.ts:24` — `constructor(serverInfo: Implementation, options?: ServerOptions)` — `Implementation` 타입은 `{ name, version }` 이상의 필드를 포함할 수 있다
  - `connect` 메서드: `mcp.d.ts:40` — `connect(transport: Transport): Promise<void>` — `Transport` 인터페이스 강제

- **수정 방향**: 정적 import로 전환하고 캐스팅을 모두 제거한다.
  ```typescript
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

  export async function startServer(): Promise<void> {
    const server = new McpServer({
      name: "study-all-mcp",
      version: "0.1.0",
    });
    // ...
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
  ```

---

### [S1-004] `RegisteredTool` 인터페이스 이름 충돌 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/index.ts:17-22`
  ```typescript
  interface RegisteredTool {
    name: string;
    description: string;
    schema: z.ZodTypeAny;
    run: (input: unknown) => Promise<unknown>;
  }
  ```

- **문제**: SDK가 이미 `RegisteredTool` 타입을 export하고 있다(`mcp.d.ts:266-290`). 현재 코드의 `RegisteredTool`은 SDK의 `RegisteredTool`과 완전히 다른 형태(SDK 것은 `handler`, `enabled`, `enable()`, `disable()`, `update()`, `remove()` 등을 포함)이다. 동일 이름 사용은 코드 리뷰 시 혼동을 유발하며, S1-003의 정적 import 전환 시 이름 충돌이 발생한다.

- **근거**:
  - SDK 타입: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:266-290` — `export type RegisteredTool = { ... handler, enabled, enable(), disable(), update(), remove() }`
  - 현재 코드: `mcp/src/index.ts:17-22` — 완전히 다른 구조

- **수정 방향**: `ToolDefinition`, `ToolEntry`, 또는 `ToolRegistration` 등으로 이름 변경한다.

---

### [S1-005] `schema` 필드의 타입 및 fallback 패턴 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/index.ts:20, 34`
  ```typescript
  interface RegisteredTool {
    schema: z.ZodTypeAny;  // line 20
    // ...
  }

  // line 34
  schema: configSchemas.get ?? z.object({}),
  ```

- **문제**:
  1. **SDK 기대 타입**: `registerTool()`의 `inputSchema`는 `ZodRawShapeCompat | AnySchema` 타입을 받는다(`mcp.d.ts:153`). `z.ZodTypeAny`(Zod v3)는 `AnySchema`(`z3.ZodTypeAny | z4.$ZodType`)의 서브타입이므로 호환 가능하지만, 프로젝트가 Zod v4(`"zod": "^4.3.6"`, `package.json:19`)를 사용하므로 Zod v4의 타입 시스템을 사용하는 것이 정확하다.
  2. **nullish coalescing fallback**: `configSchemas.get ?? z.object({})`에서 `configSchemas.get`이 falsy일 때의 폴백이 빈 객체 스키마인데, 이는 SDK의 "no input parameters" 처리 방식(`inputSchema` 생략)과 불일치한다. `registerTool()`에서는 `inputSchema`를 아예 생략하면 인자 없는 도구로 처리된다.

- **근거**:
  - SDK 타입: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:150-157` — `inputSchema?: InputArgs` (optional)
  - Zod v4 호환: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-compat.d.ts:3` — `export type AnySchema = z3.ZodTypeAny | z4.$ZodType`
  - package.json: `"zod": "^4.3.6"` — Zod v4 사용

- **수정 방향**: `RegisteredTool` 인터페이스의 `schema` 필드를 optional로 변경하고, `inputSchema`가 없는 도구는 `undefined`로 처리한다. `registerTool()`에서 `inputSchema` 생략으로 "인자 없음"을 표현한다.

---

### [S1-006] 핸들러 내 수동 `parse` + SDK 자동 검증 이중 수행 — 심각도: LOW

- **현재 코드**: `mcp/src/index.ts:176-177`
  ```typescript
  server.tool(tool.name, tool.description, tool.schema, async (args) => {
    const parsed = tool.schema.parse(args);
    const payload = await tool.run(parsed);
    // ...
  });
  ```

- **문제**: `registerTool()`로 전환하면 SDK가 내부적으로 `validateToolInput()`(`mcp.js:166-181`)을 통해 `safeParseAsync(schemaToParse, args)`를 호출하여 자동 검증한다. 핸들러의 `args`는 이미 검증/파싱된 값이므로 `tool.schema.parse(args)`를 수동 호출할 필요가 없다. 이중 파싱은 성능 오버헤드와 에러 처리 불일치(SDK는 `McpError`를 던지지만 수동 `parse`는 `ZodError`를 던짐)를 유발한다.

  단, **현재 S1-001 버그로 인해** SDK 자동 검증이 동작하지 않으므로, 수동 `parse`가 사실상 유일한 검증 수단이다. `registerTool()`로 전환 시 수동 `parse`를 제거해야 한다.

- **근거**:
  - SDK 검증 코드: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js:125` — `const args = await this.validateToolInput(tool, request.params.arguments, request.params.name);`
  - SDK 콜백 시그니처: `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:250-261` — `ToolCallback`의 `args` 파라미터는 이미 파싱된 타입

- **수정 방향**: `registerTool()` 전환 후 핸들러에서 `tool.schema.parse(args)` 제거. `args`를 직접 `tool.run()`에 전달.

---

### [S1-007] 직접 실행 감지 로직의 취약성 — 심각도: LOW

- **현재 코드**: `mcp/src/index.ts:193`
  ```typescript
  const isDirectRun = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
  ```

- **문제**:
  1. `process.argv[1]`이 상대 경로일 때 `file://${process.argv[1]}`로 URL을 구성하면 `import.meta.url`(절대 경로 기반)과 불일치할 수 있다.
  2. symlink 환경에서 `process.argv[1]`의 경로와 `import.meta.url`의 실제 경로가 다를 수 있다.
  3. `package.json`에 `"engines": { "node": ">=24" }` 명시. Node 22.13+에서 `import.meta.main`이 unflag되었으므로 더 안정적인 대안이 있다.

- **수정 방향**:
  ```typescript
  // Option A: Node 24+ (engines: node>=24)
  if (import.meta.main) {
    startServer().catch((error) => {
      console.error("Failed to start MCP server", error);
      process.exit(1);
    });
  }

  // Option B: 현재 패턴 유지하되 realpath 비교
  import { fileURLToPath } from "node:url";
  import path from "node:path";
  const isDirectRun = process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  ```

---

## 수정 우선순위

| 순서 | 항목 | 심각도 | 설명 |
|------|------|--------|------|
| 1 | S1-001 | CRITICAL | `tool()`에 `z.object()` 전달 시 스키마가 annotations로 오분류. 모든 도구의 입력 스키마가 클라이언트에 빈 객체로 노출됨 |
| 2 | S1-003 | HIGH | 동적 import + 이중 `as` 캐스팅 제거. 정적 import 전환. S1-001 해결의 전제 조건 |
| 3 | S1-002 | HIGH | `server.tool()` → `server.registerTool()` 전환. S1-001과 동시 해결 |
| 4 | S1-004 | MEDIUM | `RegisteredTool` 이름 변경. 정적 import 전환 시 필수 |
| 5 | S1-005 | MEDIUM | `schema` 필드 타입 정리, fallback 패턴 개선 |
| 6 | S1-006 | LOW | 수동 `parse` 제거. S1-001/002/003 전환과 동시 수정 |
| 7 | S1-007 | LOW | 직접 실행 감지 로직 개선 |

실질적으로 S1-001 ~ S1-006은 하나의 PR로 묶어서 처리하는 것이 합리적이다.

---

## 통합 수정안 스케치

위 발견 사항을 한번에 해결하는 `index.ts` 리팩터링 방향:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// ... tool imports ...

interface ToolEntry {
  name: string;
  description: string;
  inputSchema?: z.ZodObject<z.ZodRawShape>;
  run: (input: unknown) => Promise<unknown>;
}

const tools: ToolEntry[] = [
  {
    name: "context.resolve",
    description: "Resolve skill/project context and normalized paths.",
    inputSchema: contextResolveInputSchema,
    run: contextResolve,
  },
  {
    name: "config.get",
    description: "Get current config.",
    // inputSchema 생략 = 인자 없는 도구
    run: async () => configGet(),
  },
  // ... 나머지 도구 ...
];

export async function startServer(): Promise<void> {
  const server = new McpServer({
    name: "study-all-mcp",
    version: "0.1.0",
  });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
      },
      async (args) => {
        // args는 SDK가 이미 검증/파싱한 값 — 수동 parse 불필요
        const payload = await tool.run(args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
        };
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.main) {
  startServer().catch((error) => {
    console.error("Failed to start MCP server", error);
    process.exit(1);
  });
}
```

---

## 참조

| 자료 | 경로/URL |
|------|---------|
| 현재 index.ts | `mcp/src/index.ts` |
| SDK McpServer 타입 | `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` |
| SDK McpServer 구현 | `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js` |
| SDK ZodRawShapeCompat 타입 | `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/zod-compat.d.ts` |
| SDK StdioServerTransport 타입 | `mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.d.ts` |
| 설계 문서 | `plan/mcp.md` |
| package.json | `mcp/package.json` |
| tsconfig.json | `mcp/tsconfig.json` |
| SDK GitHub Issue #1284 | [https://github.com/modelcontextprotocol/typescript-sdk/issues/1284](https://github.com/modelcontextprotocol/typescript-sdk/issues/1284) |
| SDK GitHub PR #816 | [https://github.com/modelcontextprotocol/typescript-sdk/pull/816](https://github.com/modelcontextprotocol/typescript-sdk/pull/816) |
| SDK server.md 문서 | [https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md) |
