---
description: "크로스-스킬 마스터 로드맵 생성/갱신 — MCP 기반"
---

# /plan — 마스터 학습 로드맵

## 목적
- 스킬별 plan 데이터를 합쳐 `docs/master-plan.md`를 생성/갱신한다.

## MCP Execution Mode (필수)
1. `config.get`로 `docsDir` 확인
2. `docs/*/plan.md` 파일 목록만 탐색한다(파일명 discovery 용도)
3. 각 스킬에 대해 `progress.getPlan` 호출
```json
{
  "context": {
    "mode": "skill",
    "skill": "{skill}"
  },
  "skill": "{skill}"
}
```

## 출력/저장 규칙
- 마스터 플랜의 사실 데이터(토픽 수, phase, 진행률)는 `progress.getPlan` 결과만 사용한다.
- `docs/master-plan.md`만 생성/수정한다.
- 개별 `docs/{skill}/plan.md`는 수정하지 않는다.

## 최소 포함 섹션
- 목표/범위
- 스킬별 현황 요약
- 2주 액션 플랜
- 리스크/의존성

## 금지
- 개별 plan.md 직접 파싱으로 수치 계산 금지
- 이전 템플릿 강제 복붙 금지(현재 MCP 데이터 우선)
