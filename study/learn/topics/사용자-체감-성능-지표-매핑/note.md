---
title: "사용자-체감-성능-지표-매핑"
---
# 사용자-체감-성능-지표-매핑

> 최초 질문: study/plan/interview-2-plan.md > 사용자 체감 성능 지표 매핑 (참고: "dev/personal/@skills/some/interview/2/*.md")
> 일시: 2026-03-09


## Q1. study/plan/interview-2-plan.md > 사용자 체감 성능 지표 매핑 (참고: "dev/personal/@skills/some/interview/2/*.md")

### 비유
응급실 분류표로 보면 이해가 쉽습니다.

| 비유 요소 | 실제 개념 | 대응 이유 |
|---|---|---|
| 접수 증상 | `LCP / INP / CLS` | 사용자가 실제로 느낀 문제를 먼저 분류 |
| CT/X-ray | `waterfall / long task / React profiler` | 직접 지표 뒤의 원인을 찍어보는 검사 |
| 혈액검사 | `bundle diff` | 배포 전후 어떤 변화가 있었는지 원인 후보를 좁힘 |
| 처방 | preload, code split, worker, memoization 등 | 원인에 따라 대처가 달라짐 |

핵심은 `waterfall`이나 `bundle diff`가 "증상"이 아니라 "원인 검사"라는 점입니다.

### 코드/텍스트 설명
- 이번 플랜은 `LCP/INP/CLS`, long task, waterfall, React commit time, bundle diff를 한 묶음으로 다루라고 요청합니다. 근거: `study/plan/interview-2-plan.md:15-19`
- 피드백도 문제의 핵심을 "대응 절차"가 아니라 "어떤 지표를 왜 먼저 볼 것인가"에 두고 있습니다. 근거: `/Users/younghoonkim/dev/personal/@skills/some/interview/2/feedback.md:21-22`
- 그래서 사용자 체감 성능은 먼저 아래처럼 분리해 두는 편이 맞습니다.
  - `LCP`: 첫 화면, 주요 콘텐츠가 언제 보였는가. 좋은 기준은 p75 `2.5초 이하`. 출처: <https://web.dev/articles/lcp>
  - `INP`: 클릭/탭/키입력 후 다음 변화가 언제 보였는가. 좋은 기준은 p75 `200ms 이하`. 출처: <https://web.dev/articles/inp>
  - `CLS`: 로딩 중/후에 화면이 얼마나 밀렸는가. 좋은 기준은 `0.1 이하`. 출처: <https://web.dev/articles/optimize-cls>
- 나머지는 직접 지표가 아니라 원인 검사 도구로 둡니다.
  - `waterfall`: 중요 요청이 왜 늦게 시작됐는가
  - `long task`: 메인 스레드가 왜 입력을 빨리 처리 못 하는가
  - `React Profiler`: React 내부 render/commit 비용이 원인 후보인가
  - `bundle diff`: 배포 전후 어떤 자산 변화가 원인 후보인가
- 추론: 실무에서 중요한 건 "지표 이름을 많이 아는가"가 아니라 "체감 증상 -> 대표 지표 -> 원인 검사" 순서를 고정하는 것입니다.

### 시각화
```text
사용자 증상
  |
  +-- "첫 화면/주요 콘텐츠가 늦다"
  |      -> 1차: LCP
  |      -> 2차: waterfall, render-blocking 요청, bundle diff
  |
  +-- "클릭/타이핑 후 버벅인다"
  |      -> 1차: INP
  |      -> 2차: long task, main-thread JS, React render duration
  |
  +-- "화면이 밀리고 흔들린다"
         -> 1차: CLS
         -> 2차: 이미지 크기 미지정, 폰트, 동적 삽입
```

### 연결
- `study/learn/topics/브라우저-JS-실행-원리/note.md`와 연결됩니다. 메인 스레드, 이벤트 루프, 렌더링 파이프라인을 알아야 LCP/INP의 원인을 해석할 수 있습니다.
- `study/learn/topics/React-리렌더링-비용과-메모이제이션/note.md`와 연결됩니다. React 비용은 체감 지표 자체가 아니라 원인 후보라는 점이 이어집니다.


## Q2. 그러면 "증상을 수치화" 하는게 1번 -> "증상에 따라 검사 항목"을 확인하는게 2번 -> "결과값에 따라 대처"가 3번이 맞나요?

### 비유
병원으로 치면 "체온을 잰다"보다 먼저 "어디가 아픈지 분류"하는 단계가 있습니다.

### 코드/텍스트 설명
대체로 맞지만, 더 정확한 순서는 아래입니다.

1. `증상 분류 + 대표 지표 선택`
2. `원인 검사`
3. `대처`
4. `재측정`

즉 "증상 수치화"는 1단계 안에 들어가지만, 1단계 전체를 대체하지는 못합니다.

- 로딩이 느리다 -> `LCP`
- 입력 반응이 느리다 -> `INP`
- 화면이 밀린다 -> `CLS`

그다음에야 원인 검사 항목을 봅니다.

- `waterfall`
- `long task`
- `React profiler`
- `bundle diff`

마지막 `재측정`이 빠지면 "원인을 고쳤다"가 아니라 "뭔가 바꿨다"에서 끝납니다. 근거: `/Users/younghoonkim/dev/personal/@skills/some/interview/2/feedback.md:21-22`

### 시각화
```text
증상
  -> 대표 지표 선택
    -> 원인 검사
      -> 수정
        -> 재측정
```


## Q3. 그러면 이 매핑을 다 외우는게 좋을까요?

### 비유
의사가 질병-검사-처방 조합 전체를 외우는 게 아니라, 진료 루틴을 먼저 몸에 익히는 것과 같습니다.

### 코드/텍스트 설명
전부 암기하는 것보다 아래 골격을 자동화하는 편이 낫습니다.

```text
증상 -> 대표 지표 -> 대표 원인 검사 2~3개 -> 대표 대처 2~3개 -> 재측정
```

최소 암기 단위는 이 정도면 충분합니다.

- `LCP`: waterfall, render-blocking, bundle diff
- `INP`: long task, main-thread JS, React render duration
- `CLS`: 이미지 크기, 폰트, 동적 삽입

이번 피드백의 핵심도 "지식 부재"보다 "지표 우선순위 프레임이 고정되지 않음"에 가깝습니다. 근거: `/Users/younghoonkim/dev/personal/@skills/some/interview/2/feedback.md:27-29`


## Q4. 그러면 보통, 면접용: 사용자의 증상을 듣고 증상에 맞는 대표 지표를 확인합니다. 그 후 대표 원인 2~3개를 검사한 후 결과에 따라 대표 대처를 2~3개 수행합니다. 마지막으로 다시 대표 지표를 측정하여 개선되었는지 확인합니다.

실무용: CS로 "첫 페이지 접근시 느림"이 접수됨 -> LCP 값 확인 -> waterfall, render-blocking, budle diff 확인 -> 각 원인에 맞는 대처 수행 -> 다시 LCP 값 확인

맞나요?

### 비유
면접용은 "진료 원칙 설명", 실무용은 "실제 진료 진행"입니다.

### 코드/텍스트 설명
둘 다 대체로 맞습니다.

- `면접용`: 지금 적은 골격이면 충분합니다.
- `실무용`: 앞에 `재현 조건 고정` 한 줄을 추가하면 더 정확합니다.

실무 흐름은 보통 이렇게 정리합니다.

1. CS 접수
2. 재현 조건 고정
3. 대표 지표 선택
4. 원인 검사
5. 대처
6. 재측정

예시:

```text
CS: 첫 페이지 접근 시 느림
-> 재현 조건 확인 (기기/네트워크/로그인 여부/배포 직후 여부)
-> 대표 지표: LCP
-> 원인 검사: waterfall, render-blocking, bundle diff
-> 원인별 대응
-> 다시 LCP 확인
```

근거: `/Users/younghoonkim/dev/personal/@skills/some/interview/2/transcript.md:13-35`, `/Users/younghoonkim/dev/personal/@skills/some/interview/2/feedback.md:40-42`


## Q5. 그러면 우선 머리속에

"첫 페이지 느림, 로딩 느림" => LCP 확인
"입력 후 반응 느림, 사용자 인터렉션에 대한 반응이 버벅거림" => INP 확인
"특정 버튼 누르려는데 로딩 끝나니까 버튼의 위치가 내려가서 불편함" => CLS 확인

이정도만 기억하면될까요?

### 비유
자동차 계기판처럼 보면 됩니다.

- `LCP`: 앞유리가 언제 제대로 보이냐
- `INP`: 핸들을 돌렸을 때 차가 바로 반응하냐
- `CLS`: 운전석이 갑자기 밀려나느냐

### 코드/텍스트 설명
면접 1차 응답용으로는 충분합니다. 다만 이건 "정답 확정표"보다 "첫 의심 방향"으로 기억하는 게 맞습니다.

```text
첫 페이지 느림, 주요 콘텐츠가 늦게 보임 -> LCP부터 본다
입력/클릭 후 반응이 굼뜸 -> INP부터 본다
로딩 중/후에 요소 위치가 밀림 -> CLS부터 본다
```

보정 포인트는 하나입니다.

- `첫 페이지 느림 = 무조건 LCP`가 아니라, 기본 시작점이 LCP라는 뜻입니다.
- 실제 원인은 TTFB, waterfall, render-blocking, 큰 이미지, JS 실행량일 수 있습니다.

출처: <https://web.dev/articles/lcp>, <https://web.dev/articles/inp>, <https://web.dev/articles/optimize-cls>


## Q6. 그러면 대응은 어떻게 하는지 자세히 알려주세요, 우선 LCP 값이 낮다고 가정하고 시작해봅시다

### 비유
LCP를 "오픈 전에 가장 큰 간판을 거는 시간"으로 보면 됩니다.

| 비유 요소 | 실제 개념 | 대응 포인트 |
|---|---|---|
| 가게 문이 늦게 열림 | `TTFB` | 서버/캐시/CDN |
| 간판 주문이 늦게 전달됨 | `resource load delay` | 발견 시점/우선순위 |
| 간판 배송이 느림 | `resource load duration` | 이미지 바이트/포맷/크기 |
| 간판은 도착했는데 설치가 늦음 | `element render delay` | render-blocking CSS/JS, 메인 스레드 |

### 코드/텍스트 설명
LCP는 낮을수록 좋으므로, 여기서는 `LCP가 높아서 느린 상황`으로 해석했습니다.

실전 대응 순서는 아래처럼 가져가면 됩니다.

1. `재현 조건 고정`
2. `LCP element 확인`
3. `LCP를 4개 구간으로 분해`
   - `TTFB`
   - `resource load delay`
   - `resource load duration`
   - `element render delay`
4. `가장 큰 구간에 맞는 대응`
5. `같은 조건에서 재측정`

원인별 대표 대응:

| 병목 구간 | 흔한 원인 | 대표 대응 |
|---|---|---|
| `TTFB` | 서버 처리, 캐시 미스, 리다이렉트 | CDN/edge cache, HTML 캐시, 백엔드/API 최적화 |
| `resource load delay` | JS 실행 후에야 hero 발견, lazy loading, preload scanner 미발견 | SSR/초기 HTML에 hero 포함, `fetchpriority="high"`, 필요 시 `preload` |
| `resource load duration` | 이미지 바이트가 큼 | AVIF/WebP, 압축, `srcset/sizes`, CDN 이미지 최적화 |
| `element render delay` | render-blocking CSS/JS, long task | critical CSS 축소, JS 분할, 렌더링 차단 감소 |

출처:
- <https://web.dev/articles/lcp>
- <https://web.dev/blog/common-misconceptions-lcp>
- <https://web.dev/learn/performance/optimize-resource-loading>
- <https://web.dev/articles/preload-scanner>
- <https://web.dev/articles/fetch-priority>

### 시각화
```text
CS: "첫 화면이 느리다"
        |
        v
대표 지표: LCP
        |
        v
LCP element 확인
        |
        v
LCP 4분해
- TTFB
- load delay
- load duration
- render delay
        |
        v
가장 큰 구간 선택
        |
        +-- TTFB -> 서버/캐시/CDN
        +-- load delay -> 발견 시점/SSR/우선순위
        +-- load duration -> 이미지 최적화
        +-- render delay -> CSS/JS/long task
        |
        v
같은 조건에서 재측정
```


## Q7. waterfall은 단순히 fetch를 병렬 처리 안해서 라고만 생각했는데, 제 마인드를 바꿔주세요

### 비유
식당 주방으로 보면, waterfall은 "요리사를 더 넣으면 되나?"만 보는 표가 아닙니다.

- 주문서가 언제 들어왔는지
- 앞 단계 승인이 끝나야 다음 주문이 열리는지
- 재료는 왔는데 조리 시작이 늦는지
- 조리는 끝났는데 서빙이 막혔는지

를 같이 보는 타임라인입니다.

### 코드/텍스트 설명
바꿔야 하는 핵심 문장은 아래입니다.

```text
waterfall = fetch를 병렬로 못 돌린 문제
```

가 아니라

```text
waterfall = 브라우저가 어떤 리소스를 언제 발견했고, 왜 그 시점에 요청했고,
어디서 시간을 썼는지 보여주는 타임라인
```

즉 핵심 질문은 `"왜 이 요청이 지금 시작됐나?"` 입니다.

- DevTools waterfall/timing은 `Queueing`, `Stalled`, `DNS`, `Initial connection`, `Waiting (TTFB)`, `Content download` 같은 시간을 나눠 보여줍니다. 출처: <https://developer.chrome.com/docs/devtools/network/reference>
- 많은 waterfall은 fetch 직렬화보다 `늦은 발견` 문제입니다. hero 이미지가 JS 실행 뒤에야 DOM에 생기면, 네트워크 병렬화와 무관하게 LCP는 늦습니다. 출처: <https://web.dev/articles/preload-scanner>
- 또 `HTML -> CSS -> background-image`, `HTML -> app.js -> fetch(config) -> fetch(data)` 같은 의존성 체인도 waterfall을 만듭니다. 출처: <https://developer.chrome.com/docs/performance/insights/network-dependency-tree>

따라서 waterfall을 보면 "Promise.all로 바꿀까?"보다 먼저 아래를 봐야 합니다.

- 늦게 발견됐나?
- 다른 요청에 의존하나?
- render-blocking인가?
- queueing/stalled/TTFB가 긴가?
- 다운로드 바이트가 큰가?
- 우선순위가 꼬였나?

### 시각화
```text
waterfall 나쁨
-> 이 요청은 왜 늦게 시작됐지?
   -> 늦게 발견됐나?
   -> 다른 요청에 의존하나?
   -> render-blocking인가?
   -> queueing/stalled/TTFB가 긴가?
   -> 다운로드가 긴가?
```


## Q8. 다음은 INP로 넘어갑시다

### 비유
INP를 식당 호출벨로 보면 쉽습니다.

| 비유 요소 | 실제 개념 | 의미 |
|---|---|---|
| 벨을 눌렀는데 직원이 바로 못 옴 | `input delay` | 메인 스레드가 바빠서 이벤트 처리를 늦게 시작 |
| 직원이 주문을 오래 적고 확인함 | `processing duration` | 이벤트 핸들러, JS, React render가 오래 걸림 |
| 주문은 끝났는데 음식이 늦게 놓임 | `presentation delay` | style/layout/paint/DOM 반영이 늦음 |

### 코드/텍스트 설명
INP는 클릭/탭/키입력 후 다음 화면 변화가 언제 보이느냐를 보는 지표입니다.

- 좋은 상태: p75 `200ms 이하`
- 나쁨: `500ms 초과`

출처: <https://web.dev/articles/inp>

LCP처럼, INP도 큰 숫자 하나로 보지 말고 쪼개서 봅니다.

1. `느린 상호작용 고정`
2. `INP가 실제로 나쁜지 확인`
3. `3구간 분해`
   - `input delay`
   - `processing duration`
   - `presentation delay`
4. `가장 큰 구간에 맞는 대응`

구간별 대표 대응:

| 구간 | 흔한 원인 | 대표 대응 |
|---|---|---|
| `input delay` | long task, 메인 스레드 점유 | 긴 작업 분해, 비핵심 작업 지연, Worker 검토 |
| `processing duration` | 무거운 이벤트 핸들러, 큰 React render | 핸들러 경량화, transition 분리, 리렌더 범위 축소 |
| `presentation delay` | 큰 DOM 변경, layout/paint 비용, thrashing | DOM 수 축소, virtualization, layout thrashing 감소 |

`React Profiler`는 INP 자체가 아니라 React 내부 원인 후보를 확인하는 도구입니다. `actualDuration`과 `baseDuration`을 비교해 React render 비용을 볼 수 있습니다. 출처: <https://react.dev/reference/react/Profiler>

### 시각화
```text
사용자 클릭/입력
      |
      v
[Input Delay]
메인 스레드가 바빠서 시작이 늦음
      |
      v
[Processing Duration]
핸들러 + JS + React render
      |
      v
[Presentation Delay]
DOM 반영 + style/layout/paint
      |
      v
사용자가 "반응했다"고 느끼는 첫 변화
```


## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/브라우저-JS-실행-원리/note.md` | 상위 메커니즘 | LCP/INP 해석의 핵심인 메인 스레드, 이벤트 루프, 렌더링 파이프라인이 여기서 정리돼 있습니다. |
| `study/learn/topics/React-리렌더링-비용과-메모이제이션/note.md` | 원인-진단 관계 | React render/commit 비용은 체감 지표 자체가 아니라 원인 후보라는 점이 이어집니다. |
| `study/learn/topics/FORGE-React-렌더링-파이프라인/note.md` | 판단 프레임 연결 | "리렌더링 = 느림"이 아니라 어느 단계가 실제 병목인지 구분해야 한다는 기존 판단 프레임과 연결됩니다. |


---

## 2026-03-09 (via $learn)

사용자 체감 성능 지표 매핑을 학습 문서로 정리했다. LCP/INP/CLS를 대표 지표로 두고 waterfall, long task, React profiler, bundle diff를 원인 검사 도구로 배치하는 프레임을 고정했다. 후속 Q&A에서는 증상-지표-검사-대처-재측정 루틴, LCP 4분해, waterfall을 의존성/발견 시점 타임라인으로 읽는 관점, INP의 input delay/processing/presentation 분해까지 다뤘다.
