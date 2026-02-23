---
description: "LEGACY shim - 스킬 소스 기반 튜터링 — MCP 재개점/기록 연동"
argument-hint: "<skill-name> <topic>"
---

# /legacy-learn — 소스 기반 튜터링

## 목적
- 소스 근거로 설명/Q&A를 진행한다.
- 세션 재개점과 기록 저장은 MCP로 처리한다.

## 입력
- `$ARGUMENTS`: `<skill> <topic>`
- skill/topic이 비어 있으면 먼저 질문해 확정한다.

## MCP Execution Mode (필수)
1. `context.resolve`
```json
{
  "mode": "skill",
  "skill": "{skill}",
  "topic": "{topic}"
}
```
2. `session.getResumePoint`
3. `session.getSourcePaths`
4. `progress.getPlan`

## 세션 운영 규칙
- 설명은 실제 소스 경로를 인용해 진행한다.
- 재개점이 있으면 미완료 step부터 시작한다.
- 사용자가 "정리" 또는 "끝"을 말하면 저장 단계를 수행한다.

## 저장 단계 (필수)
1. 학습 요약/진행 step을 마크다운으로 구성
2. `session.appendLog` 호출
```json
{
  "context": { "mode": "skill", "skill": "{skill}" },
  "topic": "{topic}",
  "content": "{markdown_summary}"
}
```
3. 완료한 step이 명확하면 `progress.updateCheckbox` 호출

## 금지
- 세션 재개점을 문서 직접 파싱으로 계산 금지
- 체크박스 갱신을 파일 직접 수정으로 처리 금지
