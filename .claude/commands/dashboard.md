---
description: "전체 학습 현황 대시보드 — MCP 집계 기반"
---

# /dashboard — 전체 학습 현황 스냅샷

## 목적
- 스킬별 진행률, 최근 활동, 복습 대기를 빠르게 보여준다.
- 읽기 전용 커맨드다.

## MCP Execution Mode (필수)
1. `stats.getDashboard` 호출
   - 입력:
```json
{
  "context": {
    "mode": "skill",
    "skill": "react"
  }
}
```
2. 필요 시 `config.get`로 경로 확인

## 출력 규칙
- MCP 응답을 단일 진실 원천으로 사용한다.
- 프롬프트에서 `docs/` 직접 스캔/정규식 집계를 하지 않는다.
- 아래 3개 섹션을 고정 출력한다.

### 1) 요약
- 전체 스킬 수
- 전체 복습 대기 수
- streak

### 2) 스킬별 표
- `skill`, `progressRate`, `coverageRate`, `reviewPending`, `lastActivity`

### 3) 최근 세션
- 최근 날짜 순 상위 5개

## 오류 처리
- MCP 에러면 에러 메시지와 재시도 가이드를 짧게 출력한다.
- 파일 읽기/수동 계산으로 폴백하지 않는다.
