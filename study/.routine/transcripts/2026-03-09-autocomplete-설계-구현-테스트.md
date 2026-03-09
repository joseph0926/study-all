# Transcript: autocomplete 설계/구현/테스트
> 날짜: 2026-03-09 | 클라이언트: claude-code | 메시지: 54개

---

## [10:25:02] AI

> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 0 | 경과: 0분

---

## Phase 1: 탐색

autocomplete는 인터뷰에서 통째로 막힌 주제입니다. 큰 그림부터 잡아봅시다.

autocomplete 컴포넌트를 설계할 때 다뤄야 할 축은 크게 **5개**입니다:

```
┌─────────────────────────────────────────────┐
│            Autocomplete 설계 축              │
├──────────────┬──────────────────────────────┤
│ 1. 입력 제어  │ debounce, controlled input   │
│ 2. 비동기 흐름 │ fetch, abort, latest-wins    │
│ 3. 상태 모델  │ idle/loading/success/error/  │
│              │ empty                        │
│ 4. 키보드/UX │ ↑↓ Enter Escape, highlight   │
│ 5. 접근성    │ combobox, listbox,           │
│              │ aria-activedescendant        │
└──────────────┴──────────────────────────────┘
```

### 비유: 식당 주문 시스템

| autocomplete | 식당 비유 |
|---|---|
| input + debounce | 손님이 메뉴판을 넘기는 중 — 다 정하기 전에 주방에 보내지 않음 |
| fetch + abort | 주문서를 주방에 넘김 — 손님이 마음 바꾸면 이전 주문 취소 |
| latest-wins | 주방에서 두 요리가 나와도 마지막 주문만 서빙 |
| loading/error/empty | "조리 중" / "재료 소진" / "검색 결과 없음" 안내판 |
| keyboard nav | 메뉴판을 손가락으로 위아래로 훑으며 선택 |
| aria roles | 시각장애인 손님에게 "지금 3번 메뉴에 손가락이 있습니다" 안내 |

**비유 한계:** 식당에선 동시 주문이 드물지만, autocomplete는 타이핑마다 요청이 발생해서 race condition이 핵심 문제가 됩니다.

---

어디서부터 파고 싶으신가요? 예를 들어:
1. **debounce + abort + latest-wins** — 비동기 흐름부터
2. **상태 모델** — idle/loading/success/error/empty 전이부터
3. **키보드 + 접근성** — combobox/listbox 패턴부터
4. 전체 흐름을 순서대로

---

## [10:30:58] 사용자

전체 흐름 순서대로

---

## [10:31:15] AI

> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 0 | 경과: 1분

좋습니다. 축 1부터 순서대로 갑니다.

---

## 축 1: 입력 제어 — debounce

### 문제

사용자가 "react"를 타이핑하면 키 입력마다 fetch가 발생합니다:

```
r  → fetch("r")
re → fetch("re")
rea → fetch("rea")
reac → fetch("reac")
react → fetch("react")
```

5번의 요청 중 의미 있는 건 마지막 1개뿐입니다. 나머지 4개는 **네트워크 낭비 + 서버 부하 + UI 깜빡임**을 만듭니다.

### 해법: debounce

```
타이핑:  r───re──rea──reac──react──[300ms 대기]
타이머:  ✕   ✕    ✕    ✕     ✕      ✓ fetch("react")
```

**비유:** 엘리베이터 문이 닫히려다 사람이 오면 다시 열리고, 아무도 안 오면 그제야 닫힘. debounce도 마찬가지로 "입력이 멈출 때까지 기다렸다가" 한 번만 실행합니다.

### 구현 핵심

```ts
// 단순 debounce
function debounce(fn: Function, delay: number) {
  let timerId: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timerId);        // 이전 타이머 취소
    timerId = setTimeout(() => {
      fn(...args);                // delay 후 실행
    }, delay);
  };
}
```

### 설계 판단 포인트

| 결정 | 선택지 | 트레이드오프 |
|------|--------|------------|
| delay 값 | 150~500ms | 짧으면 반응 빠르지만 요청 多, 길면 답답함 |
| 최소 글자 수 | 1~3자 | 짧으면 결과 너무 많음, 길면 UX 답답 |
| 빈 입력 처리 | 즉시 결과 숨김 vs 인기 검색어 | 제품 요구사항 |

---

여기까지가 축 1입니다. 질문 있으면 하시고, 없으면 축 2(fetch + abort + latest-wins)로 넘어갑니다.

---

## [10:33:28] 사용자

지금 예시처럼 일반 변수로 리액트 컴포넌트 밖에 디바운스 함수를 정의하는게 베스트일까요? 아니면 내부에 useRef를 활용하여 정의하는게 베스트일까요?

---

## [10:33:50] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 1 | 경과: 2분

좋은 질문입니다. 핵심은 **인스턴스 격리**입니다.

## 모듈 스코프 vs useRef

```
┌─ 모듈 스코프 ─────────────────────────┐
│ let timerId = ...                     │
│                                       │
│  <Autocomplete />  ← 공유            │
│  <Autocomplete />  ← 공유 (충돌!)    │
└───────────────────────────────────────┘

┌─ useRef ──────────────────────────────┐
│  <Autocomplete />  → 자체 timerId    │
│  <Autocomplete />  → 자체 timerId    │
└───────────────────────────────────────┘
```

### 모듈 스코프 (컴포넌트 밖)

```ts
// ❌ 같은 페이지에 2개 마운트되면 timerId를 덮어씀
const debouncedFetch = debounce(fetchSuggestions, 300);

function Autocomplete() {
  const handleChange = (e) => debouncedFetch(e.target.value);
}
```

- 컴포넌트가 **페이지에 하나뿐**이라면 동작함
- 2개 이상 마운트 시 타이머가 공유되어 **한쪽이 다른 쪽 요청을 취소**

### useRef (컴포넌트 안)

```ts
function Autocomplete() {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (value: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };
  // cleanup: 언마운트 시 타이머 정리
  useEffect(() => () => clearTimeout(timerRef.current), []);
}
```

- 인스턴스마다 **독립된 timerId**
- 언마운트 시 cleanup 가능
- 리렌더링에도 ref는 유지됨

### 세 번째 선택지: useMemo로 debounce 인스턴스 생성

```ts
function Autocomplete() {
  const debouncedFetch = useMemo(
    () => debounce(fetchSuggestions, 300),
    [] // fetchSuggestions가 안정적일 때
  );
  useEffect(() => () => debouncedFetch.cancel(), [debouncedFetch]);
}
```

- lodash 등 `cancel()` 지원 debounce와 조합할 때 깔끔
- 단, `fetchSuggestions`가 props/state에 의존하면 **클로저 stale 문제** 발생 → 이때는 useRef가 더 안전

### 결론

| 방식 | 인스턴스 격리 | cleanup | 추천 상황 |
|------|:---:|:---:|------|
| 모듈 스코프 | ✕ | ✕ | 싱글톤 보장 시만 (드묾) |
| **useRef** | ✓ | ✓ | **기본 선택** |
| useMemo + cancel | ✓ | ✓ | 라이브러리 debounce 활용 시 |

**useRef가 베스트입니다.** 리렌더링에 안전하고, 인스턴스 격리되고, cleanup이 자연스럽습니다.

---

다음 질문 있으시면 하시고, 없으면 축 2(fetch + abort + latest-wins)로 넘어갑니다.

---

## [10:33:55] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [10:37:13] 사용자

계속

---

## [10:37:42] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 1 | 경과: 3분

## 축 2: 비동기 흐름 — fetch + abort + latest-wins

### 문제: debounce만으로는 부족하다

debounce가 요청 횟수를 줄여주지만, **네트워크 응답 순서는 보장 안 됩니다.**

```
시간 →
debounce 후 fetch("rea")  ──────────────────→ 응답 B (느림, 500ms)
debounce 후 fetch("react") ────→ 응답 A (빠름, 100ms)

화면에 보이는 결과:
  t=100ms  → "react" 결과 표시 ✓
  t=500ms  → "rea" 결과가 덮어씀 ✕  ← stale response!
```

**비유:** 식당에서 "파스타 취소, 스테이크로" 했는데 주방이 둘 다 만들어서 파스타가 나중에 나옴. 손님 앞에 스테이크가 있었는데 파스타로 교체되는 상황.

### 해법 1: AbortController

브라우저 네이티브 API. 이전 요청 자체를 **취소**합니다.

```ts
function Autocomplete() {
  const abortRef = useRef<AbortController>();

  const fetchSuggestions = async (query: string) => {
    // 이전 요청 취소
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/search?q=${query}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return; // 취소된 요청 → 무시
      }
      setError(e); // 진짜 에러
    }
  };
}
```

```
fetch("rea")  ──✕ abort!
fetch("react") ────→ 응답 → 화면 반영 ✓
```

**abort의 효과:** 네트워크 레벨에서 요청이 취소되어 **브라우저 연결 슬롯**도 해제됩니다 (브라우저당 동일 도메인 6개 제한).

### 해법 2: latest-wins (requestId 패턴)

abort를 지원하지 않는 환경이거나 추가 안전장치가 필요할 때:

```ts
function Autocomplete() {
  const latestIdRef = useRef(0);

  const fetchSuggestions = async (query: string) => {
    const requestId = ++latestIdRef.current;

    const data = await fetchAPI(query);

    // 내가 최신 요청인지 확인
    if (requestId !== latestIdRef.current) return; // stale → 버림

    setSuggestions(data);
  };
}
```

```
fetch("rea")   id=1 ──────────→ 응답 도착, but latestId=2 → 버림
fetch("react") id=2 ────→ 응답 도착, latestId=2 → 반영 ✓
```

### abort vs latest-wins

| | AbortController | latest-wins |
|---|---|---|
| 네트워크 취소 | ✓ 실제 취소 | ✕ 응답은 옴 |
| 구현 난이도 | 중 (에러 분기) | 하 (카운터만) |
| 서버 부하 감소 | ✓ | ✕ |
| **실전 추천** | **둘 다 조합** | **둘 다 조합** |

### 베스트: 둘 다 조합

```ts
// abort로 네트워크 취소 + latest-wins로 이중 안전장치
abortRef.current?.abort();
const requestId = ++latestIdRef.current;
const controller = new AbortController();
abortRef.current = controller;

try {
  const data = await fetch(url, { signal: controller.signal });
  if (requestId !== latestIdRef.current) return; // 이중 방어
  setSuggestions(await data.json());
} catch (e) {
  if (e.name === 'AbortError') return;
  if (requestId !== latestIdRef.current) return;
  setError(e);
}
```

abort가 race condition 대부분을 잡지만, **abort 시그널 전파가 느린 edge case**(서버가 이미 응답을 보내기 시작한 경우)에서 latest-wins가 마지막 방어선이 됩니다.

---

질문 있으시면 하시고, 없으면 축 3(상태 모델)으로 넘어갑니다.

---

## [11:04:22] 사용자

네 넘어가주세요

---

## [11:04:44] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 1 | 경과: 4분

## 축 3: 상태 모델 — idle / loading / success / error / empty

### 왜 상태 모델이 필요한가

상태를 명시적으로 정의하지 않으면 이런 버그가 생깁니다:

```
- loading 중인데 이전 결과가 보임
- 에러인데 로딩 스피너가 안 사라짐
- 결과 0건인데 에러 메시지가 보임
- 입력 지웠는데 결과 리스트가 남아있음
```

### 상태 전이 다이어그램

```
            입력 비어있음
                │
         ┌──────▼──────┐
         │    IDLE      │ ← 초기 상태, 리스트 숨김
         └──────┬──────┘
                │ 입력 + debounce 완료
         ┌──────▼──────┐
         │   LOADING    │ ← 스피너 표시
         └──┬───┬───┬──┘
            │   │   │
     결과≥1 │   │   │ 에러
     ┌──────▼┐  │  ┌▼──────┐
     │SUCCESS│  │  │ ERROR  │ ← 에러 메시지 + 재시도
     └───────┘  │  └────────┘
          ┌─────▼─────┐
          │   EMPTY    │ ← "결과 없음" 표시
          └───────────┘

  ※ 어떤 상태에서든 입력 비우면 → IDLE
  ※ 어떤 상태에서든 새 입력 → LOADING
```

### 구현: 판별 유니온 (discriminated union)

```ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: Item[] }  // items.length ≥ 1
  | { status: 'empty'; query: string }     // 결과 0건
  | { status: 'error'; error: Error };
```

**왜 boolean 플래그가 아닌 유니온인가:**

```ts
// ❌ boolean 조합 → 불가능한 상태가 표현 가능
{ isLoading: true, isError: true }  // 로딩이면서 에러?

// ✓ 유니온 → 불가능한 상태가 타입 레벨에서 차단
// status가 'loading'이면 error 필드 자체가 없음
```

### 렌더링 매핑

```ts
function renderContent(state: State) {
  switch (state.status) {
    case 'idle':    return null;
    case 'loading': return <Spinner />;
    case 'success': return <SuggestionList items={state.items} />;
    case 'empty':   return <p>"{state.query}" 결과 없음</p>;
    case 'error':   return <ErrorMessage onRetry={retry} />;
  }
}
```

### success vs empty를 나누는 이유

| 하나로 합칠 때 | 나눌 때 |
|---|---|
| `items.length === 0` 체크를 렌더 로직에 분산 | 상태 전이 시점에 한 번만 판단 |
| "결과 없음" UI를 잊기 쉬움 | 타입이 강제하므로 누락 불가 |

---

질문 있으시면 하시고, 없으면 축 4(키보드 내비게이션)로 넘어갑니다.

---

## [11:21:36] 사용자

이걸 보통 컴포넌트 내부에 useState로 관리하거나 useReducer를 이용한 커스텀 훅이 일반적인가요?

---

## [11:22:01] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 2 | 경과: 5분

둘 다 쓰이지만, **이 경우엔 useReducer 기반 커스텀 훅이 더 적합합니다.** 이유를 비교해보겠습니다.

## useState로 관리할 때

```ts
const [status, setStatus] = useState<'idle'|'loading'|'success'|'empty'|'error'>('idle');
const [items, setItems] = useState<Item[]>([]);
const [error, setError] = useState<Error | null>(null);

// 문제: 상태 전이마다 여러 setter를 호출
const onFetchSuccess = (data: Item[]) => {
  if (data.length > 0) {
    setStatus('success');
    setItems(data);      // 2번째 setter
    setError(null);      // 3번째 setter
  } else {
    setStatus('empty');
    setItems([]);
    setError(null);
  }
};
```

**문제점:**
- setter 3개를 **항상 올바른 조합**으로 호출해야 함
- 하나 빠뜨리면 `status: 'idle'`인데 `items`에 이전 데이터가 남는 버그
- React 18 batching이 있어 렌더링은 1번이지만, **로직의 정합성은 개발자 책임**

## useReducer로 관리할 때

```ts
type Action =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; items: Item[] }
  | { type: 'EMPTY'; query: string }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH':   return { status: 'loading' };
    case 'SUCCESS': return { status: 'success', items: action.items };
    case 'EMPTY':   return { status: 'empty', query: action.query };
    case 'ERROR':   return { status: 'error', error: action.error };
    case 'RESET':   return { status: 'idle' };
  }
}
```

**장점:**
- 전이 한 번에 **상태 전체가 교체** → 불가능한 조합 자체가 안 생김
- 전이 로직이 reducer **한 곳에 집중** → 리뷰/테스트 용이
- reducer는 순수 함수 → **컴포넌트 밖에서 단위 테스트 가능**

## 커스텀 훅으로 감싸기

```ts
function useAutocomplete(fetchFn: (q: string) => Promise<Item[]>, delay = 300) {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });
  const abortRef = useRef<AbortController>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = (query: string) => {
    clearTimeout(timerRef.current);
    if (!query) { dispatch({ type: 'RESET' }); return; }

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: 'FETCH' });

      try {
        const items = await fetchFn(query);
        if (controller.signal.aborted) return;
        items.length > 0
          ? dispatch({ type: 'SUCCESS', items })
          : dispatch({ type: 'EMPTY', query });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        dispatch({ type: 'ERROR', error: e as Error });
      }
    }, delay);
  };

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  return { state, search };
}
```

**이 훅 하나에 축 1(debounce), 축 2(abort+latest-wins), 축 3(상태 모델)이 전부 들어갑니다.**

## 판단 기준

| 기준 | useState | useReducer |
|------|:---:|:---:|
| 상태 필드 1~2개 | ✓ | 과잉 |
| **상태 필드 3개+, 전이 규칙 복잡** | 위험 | **✓** |
| 불가능한 상태 방지 | 수동 | 구조적 |
| 테스트 용이성 | 훅 통째 | reducer만 단위 테스트 |

autocomplete처럼 **5가지 상태 + 여러 전이 경로**가 있으면 useReducer + 커스텀 훅이 일반적인 선택입니다.

---

다음 질문 있으시면 하시고, 없으면 축 4(키보드 내비게이션)로 넘어갑니다.

---

## [11:22:19] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:27:11] 사용자

계속

---

## [11:27:33] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 2 | 경과: 6분

## 축 4: 키보드 내비게이션

### 필수 키 동작

```
┌─────────────────────────────┐
│  [react         ]  ← input │
├─────────────────────────────┤
│  ▸ React         ← active  │  ↑↓ 로 이동
│    React Native             │  Enter로 선택
│    React Router             │  Escape로 닫기
│    ReactDOM                 │
└─────────────────────────────┘
```

| 키 | 동작 | 엣지 케이스 |
|---|---|---|
| `ArrowDown` | 다음 항목으로 이동 | 마지막 → 첫 번째로 순환 (또는 멈춤) |
| `ArrowUp` | 이전 항목으로 이동 | 첫 번째 → 마지막으로 순환 (또는 멈춤) |
| `Enter` | 활성 항목 선택 → input에 반영, 리스트 닫기 | 활성 항목 없으면 무시 (폼 submit 방지) |
| `Escape` | 리스트 닫기, input 포커스 유지 | 이미 닫혀있으면 무시 |
| 일반 타이핑 | activeIndex 리셋, 새 검색 시작 | — |

### 구현 핵심: activeIndex 관리

```ts
const [activeIndex, setActiveIndex] = useState(-1);
// -1 = 아무것도 활성화 안 됨

const handleKeyDown = (e: React.KeyboardEvent) => {
  const { items } = state; // success 상태의 items

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault(); // 커서가 input 끝으로 가는 것 방지
      setActiveIndex(prev =>
        prev < items.length - 1 ? prev + 1 : 0  // 순환
      );
      break;

    case 'ArrowUp':
      e.preventDefault();
      setActiveIndex(prev =>
        prev > 0 ? prev - 1 : items.length - 1   // 순환
      );
      break;

    case 'Enter':
      e.preventDefault(); // 폼 submit 방지
      if (activeIndex >= 0) {
        selectItem(items[activeIndex]);
      }
      break;

    case 'Escape':
      dispatch({ type: 'RESET' });
      setActiveIndex(-1);
      break;
  }
};
```

### 설계 판단 포인트

**1. 순환 vs 멈춤**

```
순환: ... → 항목3 → 항목0 → 항목1 → ...   (구글 검색)
멈춤: ... → 항목3 (더 이상 안 감)           (일부 IDE)
```

면접에서는 어느 쪽이든 **의도적 선택임을 설명**하면 됩니다.

**2. e.preventDefault()가 필수인 이유**

| 키 | 기본 동작 | 방지 안 하면 |
|---|---|---|
| ArrowDown/Up | input 내 커서 이동 | 커서가 텍스트 앞뒤로 점프 |
| Enter | form submit | 페이지 새로고침 |

**3. 새 결과가 오면 activeIndex 리셋**

```ts
// search 함수 내
dispatch({ type: 'FETCH' });
setActiveIndex(-1);  // 새 검색 시작 → 하이라이트 초기화
```

이전 결과의 3번째 항목이 활성이었는데 새 결과가 2개뿐이면 → **범위 초과 버그**.

---

질문 있으시면 하시고, 없으면 마지막 축 5(접근성 — combobox/listbox)로 넘어갑니다.

---

## [11:28:40] 사용자

왜 인덱스로 관리하나요?

---

## [11:29:02] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 3 | 경과: 7분

핵심을 찌르는 질문입니다. "왜 item의 id가 아니라 index인가?"

## 대안 비교: index vs id

### index로 관리

```ts
const [activeIndex, setActiveIndex] = useState(-1);

// ArrowDown
setActiveIndex(prev => prev + 1);

// 렌더링
items.map((item, i) => (
  <li className={i === activeIndex ? 'active' : ''}>
```

### id로 관리

```ts
const [activeId, setActiveId] = useState<string | null>(null);

// ArrowDown → 현재 id의 위치를 찾아서 다음 id를 계산
setActiveId(prev => {
  const currentIdx = items.findIndex(item => item.id === prev);
  return items[currentIdx + 1]?.id ?? items[0].id;
});

// 렌더링
items.map(item => (
  <li className={item.id === activeId ? 'active' : ''}>
```

### 왜 index가 기본 선택인가

| 기준 | index | id |
|------|:---:|:---:|
| ↑↓ 이동 계산 | `+1`, `-1` | `findIndex` 후 계산 |
| 새 결과 도착 시 리셋 | `-1`로 끝 | 이전 id가 새 목록에 없을 수 있음 |
| 리스트가 정렬/고정 | ✓ 항상 일치 | ✓ |
| `aria-activedescendant` 연결 | `id={item-${index}}` 생성 필요 | 이미 있음 |

autocomplete 결과 리스트는:
- **매 검색마다 완전히 교체**됨 → 이전 id가 의미 없음
- **순서가 곧 의미** (relevance 순) → index가 자연스러움
- **한 번에 하나만 활성** → 복잡한 추적 불필요

### 그럼 id가 나은 경우는?

```
- 리스트가 실시간으로 항목이 추가/삭제됨 (채팅, 알림)
  → index 2가 가리키던 항목이 갑자기 다른 항목이 됨
- 항목 선택 후에도 리스트가 유지되면서 재정렬됨
  → index가 바뀌지만 같은 항목을 가리켜야 함
- 가상화(virtualized list)로 DOM에 일부만 렌더링
  → index보다 id로 추적이 안전
```

### 정리

```
autocomplete: 매 검색마다 리스트 교체 → index가 단순하고 충분
실시간 리스트: 항목이 동적 추가/삭제 → id가 안전
```

**autocomplete에서 index를 쓰는 이유는 "결과가 매번 통째로 바뀌기 때문"입니다.** 이전 결과를 추적할 필요가 없으니 가장 단순한 방식이 맞습니다.

---

다음 질문 있으시면 하시고, 없으면 축 5(접근성)로 넘어갑니다.

---

## [11:29:17] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:29:42] 사용자

계속

---

## [11:30:00] 사용자

[Request interrupted by user]

---

## [11:30:40] 사용자

다음

---

## [11:31:03] AI



> [ROUTINE] Phase 1/5 | autocomplete 설계/구현/테스트 | Q&A: 3 | 경과: 8분

## 축 5: 접근성 — combobox / listbox 패턴

### WAI-ARIA 역할 구조

```html
<div role="combobox" aria-expanded="true" aria-haspopup="listbox">
  <input
    aria-autocomplete="list"
    aria-controls="suggestions-list"
    aria-activedescendant="item-2"    ← 현재 활성 항목의 id
  />
</div>

<ul id="suggestions-list" role="listbox">
  <li id="item-0" role="option">React</li>
  <li id="item-1" role="option">React Native</li>
  <li id="item-2" role="option" aria-selected="true">React Router</li>
</ul>
```

### 핵심 속성 4개의 역할

| 속성 | 위치 | 역할 |
|------|------|------|
| `role="combobox"` | wrapper/input | "이건 콤보박스입니다" 선언 |
| `aria-expanded` | combobox | 리스트가 열려있는지 (`true`/`false`) |
| `aria-controls` | input | "내가 제어하는 리스트는 이것" (id 참조) |
| `aria-activedescendant` | input | "지금 활성인 항목은 이것" (항목 id 참조) |

### 왜 aria-activedescendant인가? (vs 실제 focus 이동)

```
방법 A: 실제 focus를 <li>로 이동
  input → focus → li[2] → focus → li[3]
  ❌ focus가 input을 떠나면 타이핑 불가

방법 B: aria-activedescendant (가상 포커스)
  input (focus 유지) + aria-activedescendant="item-2"
  ✓ 스크린 리더는 "item-2를 읽음"
  ✓ 사용자는 계속 타이핑 가능
```

**비유:** TV 리모컨의 하이라이트. 리모컨(input)은 손에 있지만, 화면의 하이라이트(activedescendant)가 움직입니다. 리모컨을 놓고 TV 앞에 가서 손가락으로 누르는 게 아닙니다.

### 상태별 aria 매핑

```ts
<input
  role="combobox"
  aria-expanded={state.status === 'success'}
  aria-controls="suggestion-list"
  aria-activedescendant={activeIndex >= 0 ? `item-${activeIndex}` : undefined}
  aria-autocomplete="list"
  onKeyDown={handleKeyDown}
  onChange={handleChange}
/>

{state.status === 'success' && (
  <ul id="suggestion-list" role="listbox">
    {state.items.map((item, i) => (
      <li
        key={item.id}
        id={`item-${i}`}
        role="option"
        aria-selected={i === activeIndex}
      >
        {item.label}
      </li>
    ))}
  </ul>
)}
```

### 흔한 실수

| 실수 | 결과 |
|------|------|
| `aria-expanded`를 안 바꿈 | 스크린 리더가 리스트 열린 걸 모름 |
| `aria-activedescendant` 없이 ↑↓만 구현 | 시각적 하이라이트만 되고 스크린 리더는 인식 못 함 |
| `role="option"` 누락 | listbox 내 항목으로 인식 안 됨 |
| 리스트 닫힐 때 `aria-activedescendant` 안 지움 | 존재하지 않는 id를 참조 |

---

5개 축을 전부 훑었습니다. 질문 있으시면 하시고, 없으면 `>>다음`으로 Phase 2(심화)로 넘어갑니다.

---

## [11:31:30] 사용자

>>다음

---

## [11:31:38] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:31:40] AI



> 도구 호출: mcp__study__routine_readLog

---

## [11:32:06] AI

> [ROUTINE] Phase 2/5 | autocomplete 설계/구현/테스트 | Q&A: 3 | 경과: 10분

---

## Phase 2: 심화 — "왜 이렇게 만들었는가"

Phase 1에서 5개 축의 **무엇/어떻게**를 다뤘습니다. 이제 **설계 의도와 트레이드오프**를 파고듭니다.

### 2-A. 설계 의도 추적: debounce vs throttle

autocomplete에서 debounce가 표준인데, throttle도 후보였습니다.

```
throttle(300ms):
  r──→fetch  re──rea──reac──→fetch  react──→fetch
  │          │                │              │
  300ms 간격으로 무조건 실행 (중간에도 요청 발생)

debounce(300ms):
  r──re──rea──reac──react──[300ms]──→fetch
                                     │
                    입력 멈춘 뒤 1번만 실행
```

| | debounce | throttle |
|---|---|---|
| 요청 수 | 최소 (멈춘 뒤 1번) | 중간 (고정 간격마다) |
| 체감 반응성 | 느림 (타이핑 중 아무 반응 없음) | 빠름 (타이핑 중에도 결과 갱신) |
| 서버 부하 | 낮음 | 높음 |
| stale response 위험 | 낮음 (요청 1개) | 높음 (요청 여러 개) |

**왜 debounce를 선택하는가:** autocomplete에서 중간 결과("rea"의 결과)를 보여줘봤자 사용자가 아직 타이핑 중이라 **의미 없고**, stale response 복잡도만 올라갑니다. 구글 검색도 debounce를 씁니다.

**throttle이 나은 경우:** 스크롤 이벤트, 지도 드래그 — 중간 피드백이 UX에 필수인 경우.

### 2-B. 설계 의도 추적: AbortController를 왜 catch에서 분기하는가

```ts
catch (e) {
  if (e.name === 'AbortError') return;  // ← 왜 무시?
  dispatch({ type: 'ERROR', error: e });
}
```

abort()를 호출하면 fetch의 Promise가 **reject**됩니다. 이건 사용자가 의도한 취소이지 에러가 아닙니다. 분기 안 하면:
- 사용자가 빠르게 타이핑할 때마다 **에러 UI가 깜빡임**
- 에러 로깅에 abort가 섞여서 **진짜 에러를 놓침**

---

### 출제: Phase 1에서 다룬 내용 기반으로 2문제

**Q1.** useReducer의 dispatch로 상태를 관리할 때, `{ status: 'success', items: [] }` 대신 `{ status: 'empty', query }` 를 별도 상태로 분리했습니다. 만약 success 하나로 합치고 `items.length === 0`으로 처리하면 **구체적으로 어떤 문제가 생길 수 있나요?**

**Q2.** `aria-activedescendant`를 쓰는 대신 ArrowDown을 누를 때마다 실제 `focus()`를 `<li>`로 옮기면 어떤 문제가 생기나요? (Phase 1에서 다뤘습니다)

---

## [11:35:44] 사용자

1. empty를 메뉴얼로 체크해야하므로 타입적으로 걸러지지 않아 실수 유발 가능
2. 사실 잘 이해를 못했ㅆ브닏

---

## [11:36:09] AI



> [ROUTINE] Phase 2/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 12분

### Q1 피드백

맞는 방향입니다. 좀 더 구체적으로 보면:

```ts
// success 하나로 합친 경우
case 'success':
  return <SuggestionList items={state.items} />;
  // ❌ items가 []일 때 빈 <ul>만 렌더링됨
  // "결과 없음" 메시지를 여기서 분기해야 하는데 잊기 쉬움
```

**핵심 문제:** `SuggestionList` 안에서, 혹은 렌더링하는 곳마다 `items.length === 0` 체크를 **매번** 해야 합니다. 분리하면 switch 문에서 `case 'empty'`를 빼먹으면 **TypeScript가 경고**해줍니다 (exhaustive check). 합치면 타입은 통과하지만 빈 리스트가 그냥 보이는 버그가 숨습니다.

---

### Q2 보충 설명

이건 중요한 부분이니 천천히 다시 짚겠습니다.

**핵심 문제: focus가 input을 떠나면 타이핑이 안 됩니다.**

```
시나리오: 사용자가 "rea"까지 치고 ArrowDown

방법 A: focus()를 <li>로 이동
┌──────────────────────┐
│  [rea          ]     │ ← focus 없음! 커서 사라짐
├──────────────────────┤
│  ▸ React        🔵   │ ← focus가 여기로 감
│    React Native      │
└──────────────────────┘
사용자가 "ct"를 더 치려면? → 안 됨. <li>에 focus가 있으니까.
Tab이나 클릭으로 input에 돌아가야 함 → UX 깨짐

방법 B: aria-activedescendant (가상 포커스)
┌──────────────────────┐
│  [rea|         ] 🔵  │ ← focus 유지! 타이핑 가능
├──────────────────────┤
│  ▸ React  (하이라이트)│ ← 시각적 + 스크린 리더 인식
│    React Native      │
└──────────────────────┘
사용자가 "ct"를 더 치면? → 바로 입력됨. 새 검색 시작.
```

**aria-activedescendant의 작동 원리:**
- focus는 **항상 input에 머뭄**
- input에 `aria-activedescendant="item-2"`만 설정
- 스크린 리더는 이 속성을 읽고 **"React Router"를 읽어줌**
- 실제 focus 이동 없이 **"여기를 보고 있다"를 선언**하는 방식

**비유를 다시 쓰면:** 손에 리모컨(input)을 쥔 채로 TV 화면(listbox)의 하이라이트만 움직이는 것. 리모컨을 놓고 TV 앞에 가서 버튼을 누르는 게 아닙니다. 리모컨을 놓으면(focus를 잃으면) 채널 번호를 입력(타이핑)할 수 없습니다.

이해가 되셨나요?

---

## [11:36:28] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:37:28] 사용자

아 네 이해했습니다

---

## [11:37:38] AI



> [ROUTINE] Phase 2/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 13분

좋습니다. Phase 2 심화 내용을 정리하면:

- **debounce vs throttle** — autocomplete는 중간 결과가 무의미하므로 debounce, 스크롤/드래그처럼 중간 피드백 필요 시 throttle
- **AbortError 분기** — abort는 의도된 취소이지 에러가 아님, 분기 안 하면 에러 UI 깜빡임 + 로그 오염
- **empty 분리** — exhaustive check로 타입 레벨 안전장치
- **aria-activedescendant** — focus를 input에 유지한 채 가상 포커스로 스크린 리더에 활성 항목 전달

추가 질문 있으시면 하시고, 없으면 `>>다음`으로 Phase 3(라이브 코딩)으로 넘어갑니다.

---

## [11:38:21] 사용자

>>다음

---

## [11:38:34] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:38:37] AI



> 도구 호출: mcp__study__routine_readLog

---

## [11:38:50] AI

> [ROUTINE] Phase 3/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 14분

---

## Phase 3: 라이브 코딩

### 과제

- **유형:** 구현
- **설명:** `useAutocomplete` 커스텀 훅을 TypeScript로 구현하세요.

**요구사항:**
1. `useReducer`로 `idle / loading / success / empty / error` 상태 관리 (discriminated union)
2. `useRef`로 debounce 타이머 관리
3. `AbortController`로 이전 요청 취소 + `AbortError` 분기
4. `search(query: string)` 함수 반환 — 빈 입력 시 RESET, debounce 후 fetch
5. 언마운트 시 cleanup (타이머 + abort)

**제약:**
- TypeScript
- 키보드/접근성은 이 훅의 범위 밖 (상태+비동기만 집중)
- 외부 라이브러리 없이 직접 구현
- `fetchFn: (query: string, signal: AbortSignal) => Promise<Item[]>`을 인자로 받음

**힌트 (필요하면 펼쳐보세요):**
<details>
<summary>힌트</summary>

- Action 타입: `FETCH`, `SUCCESS`, `EMPTY`, `ERROR`, `RESET` 5개
- reducer는 이전 상태와 무관하게 action만으로 새 상태 결정 가능
- `abortRef`와 `timerRef` 2개의 ref 필요
- cleanup은 `useEffect(() => () => { ... }, [])`

</details>

---

코드를 작성해주세요.

---

## [11:50:18] 사용자

  type Action =
    | { type: 'FETCH' }
    | { type: 'SUCCESS'; items: Item[] }
    | { type: 'EMPTY'; query: string }
    | { type: 'ERROR'; error: Error }
    | { type: 'RESET' };

  function reducer(state: State, action: Action): State {
    switch (action.type) {
      case 'FETCH':   return { status: 'loading' };
      case 'SUCCESS': return { status: 'success', items: action.items };
      case 'EMPTY':   return { status: 'empty', query: action.query };
      case 'ERROR':   return { status: 'error', error: action.error };
      case 'RESET':   return { status: 'idle' };
    }
  }

const useAutocomplete = (fetchFn: (q: string) => Promise<Item[]>, delay = 300) => {
  const [state, dispatch] = useReducer(reducer, {status: "idle"})
  const abortRef = useRef<AbortController>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  
  const search = async (query: string) => {
    clearTimeout(timerRef.current)
    if (!query) {
      dispatch({type: "RESET"})
      return;
    }

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      dispatch({type: "FETCH"})

      try {
        const items = await fetchFn(query)
        if (controller.signal.aborted) {
          return;
        }

        items.length > 0 ? dispatch({type: "SUCCESS", items}) : dispatch({type: "EMPTY", query})
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        dispatch({type: "ERROR", error})
      }
    }, delay)
  }

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  return {
    state, search
  }
}

---

## [11:50:28] AI



> [ROUTINE] Phase 3/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 16분

### 1차 리뷰

전체적으로 잘 작성했습니다. reducer, 상태 모델, cleanup 모두 정확합니다. **한 가지 문제**가 있습니다:

**`fetchFn`에 `signal`을 전달하지 않고 있습니다.**

```ts
// 현재 코드
const items = await fetchFn(query)

// fetchFn 시그니처는:
// fetchFn: (query: string, signal: AbortSignal) => Promise<Item[]>
```

`abortRef.current?.abort()`를 호출하고 `controller.signal.aborted`를 체크하고 있지만, **signal을 fetch에 안 넘기면 abort()가 실제로 요청을 취소하지 못합니다.** `signal.aborted` 체크는 작동하지만 이건 latest-wins 역할만 하고, 네트워크 레벨 취소는 안 됩니다.

수정해서 다시 제출하시겠습니까, 아니면 바로 모범 답안을 볼까요?

---

## [11:51:04] 사용자

모범답안

---

## [11:51:22] AI



> [ROUTINE] Phase 3/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 17분

### 모범 답안

```ts
type Item = { id: string; label: string };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: Item[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; error: Error };

type Action =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; items: Item[] }
  | { type: 'EMPTY'; query: string }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH':   return { status: 'loading' };
    case 'SUCCESS': return { status: 'success', items: action.items };
    case 'EMPTY':   return { status: 'empty', query: action.query };
    case 'ERROR':   return { status: 'error', error: action.error };
    case 'RESET':   return { status: 'idle' };
  }
}

const useAutocomplete = (
  fetchFn: (query: string, signal: AbortSignal) => Promise<Item[]>,
  delay = 300
) => {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });
  const abortRef = useRef<AbortController>();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = (query: string) => {          // ← async 불필요
    clearTimeout(timerRef.current);
    if (!query) {
      abortRef.current?.abort();               // ← 빈 입력 시 진행 중 요청도 취소
      dispatch({ type: 'RESET' });
      return;
    }

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: 'FETCH' });

      try {
        const items = await fetchFn(query, controller.signal);  // ← signal 전달
        if (controller.signal.aborted) return;

        items.length > 0
          ? dispatch({ type: 'SUCCESS', items })
          : dispatch({ type: 'EMPTY', query });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (controller.signal.aborted) return;  // ← 이중 방어
        dispatch({ type: 'ERROR', error: error as Error });
      }
    }, delay);
  };

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  return { state, search };
};
```

### 차이점 분석

| 포인트 | 사용자 코드 | 모범 답안 | 영향 |
|--------|:-:|:-:|------|
| **signal 전달** | `fetchFn(query)` | `fetchFn(query, controller.signal)` | 네트워크 레벨 취소 안 됨 vs 됨 |
| 빈 입력 시 abort | 안 함 | `abortRef.current?.abort()` | 진행 중 요청이 결과를 덮어쓸 수 있음 |
| search 함수 async | `async` 붙음 | 안 붙음 | setTimeout 안의 콜백이 async이므로 search 자체는 불필요 |
| catch 이중 방어 | 없음 | `controller.signal.aborted` 체크 | abort 전파 타이밍 edge case 방어 |

**잘한 부분:**
- reducer + discriminated union 완벽
- debounce 로직 (clearTimeout → setTimeout) 정확
- cleanup useEffect 정확
- AbortError 분기 정확

**핵심 학습 포인트:** abort 메커니즘을 만들었으면 **signal을 실제로 fetch에 연결**해야 합니다. 연결 안 하면 abort()는 아무 효과 없고, `signal.aborted` 체크만 latest-wins 역할을 합니다.

---

`>>다음`으로 Phase 4(체크포인트)로 넘어갑니다.

---

## [11:51:42] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:52:07] 사용자

>>다음

---

## [11:52:14] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:52:24] AI

> [ROUTINE] Phase 4/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 18분

---

## 체크포인트

오늘 배운 내용을 검증합니다. 코드를 보지 않고 답해주세요.

---

**Q1: "이게 왜 이렇게 동작해?"**

autocomplete에서 사용자가 "rea"를 치고 바로 "react"를 이어 치면, 내부적으로 debounce → abort → fetch → 상태 전이가 어떤 순서로 일어나는지 **처음부터 끝까지** 설명해주세요. (타이머, AbortController, reducer dispatch 각각 언급)

---

**Q2: "나라면 어떻게 만들었을까?"**

`aria-activedescendant` 없이 autocomplete의 키보드 내비게이션과 접근성을 구현하는 **대안 설계**를 생각해보고, 왜 `aria-activedescendant` 방식이 선택되었는지 트레이드오프를 설명해주세요.

---

## [11:56:55] 사용자

1. rea를 치고 지정한 딜레이 시간보다 짧은 시간안에 새로운 검색어인 react를 치면 debounce의 타이머 로직에 의해 (마지막 입력 후 delay ms 이후 콜백 로직 수행) 이전 rea에 대한 fetch가 진행되지 않음 만약 delay 시간보다 긴 차이로 검색을 하면 요청이 두개갈수있지만, abort 로직을 추가해놓으면 이전 요청을 취소하고 새로운 요청으로 다시 보냄

2. 대안: input에 한글자라도 써지면 submit 되기 전까지 focuse 유지? -> 하지만 이러면 단순 검색인 input에서 문제 발생

---

## [11:57:12] AI



> [ROUTINE] Phase 4/5 | autocomplete 설계/구현/테스트 | Q&A: 4 | 경과: 19분

### 피드백

**Q1: 좋습니다.** debounce → abort 흐름을 정확히 이해하고 있습니다. 빠진 부분을 보충하면:

- abort 후 **새 AbortController 생성 → signal을 fetchFn에 전달** → dispatch `FETCH` (loading 상태)
- 응답 도착 시 **`controller.signal.aborted` 체크** (이중 방어) → items 개수에 따라 `SUCCESS` 또는 `EMPTY` dispatch
- 에러 시 **AbortError 분기** → 무시, 그 외 → `ERROR` dispatch

전체 체인: `clearTimeout → setTimeout(delay) → abort 이전 → new Controller → dispatch FETCH → fetchFn(query, signal) → dispatch SUCCESS/EMPTY/ERROR`

**Q2: 아쉽습니다.** 질문의 의도는 `aria-activedescendant` **대신** 접근성을 구현하는 방법이었습니다.

대안은 **실제 focus를 `<li>`로 이동**하는 방식입니다:
- ArrowDown → `li.focus()` 호출 → 스크린 리더가 해당 항목을 읽음
- **문제:** focus가 input을 떠나므로 타이핑 불가 → 사용자가 검색어를 수정하려면 다시 input으로 돌아와야 함
- **트레이드오프:** focus 이동은 구현이 단순하고 스크린 리더 호환성도 좋지만, autocomplete에서는 **"탐색하면서 동시에 타이핑"**이 핵심 UX이므로 가상 포커스(`aria-activedescendant`)가 선택됨

이건 Phase 2에서 다뤘던 내용입니다. 리모컨 비유를 기억하시면 됩니다.

---

자기 평가를 해주세요:
- **PASS** → 핵심 개념을 review에 등록하고 정리합니다 (Phase 5)
- **FAIL** → gap을 기록하고 다음 접근 방식을 제안합니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.

---

## [11:57:51] 사용자

PASS

---

## [11:58:03] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [11:58:13] AI

이 세션에서 다룬 핵심 개념을 review에 등록합니다:

1. **debounce useRef 패턴** — 인스턴스 격리 + cleanup을 위해 모듈 스코프가 아닌 useRef 사용
2. **AbortController + signal 전달** — abort()만 호출이 아닌 signal을 fetchFn에 연결해야 네트워크 취소
3. **discriminated union 상태 모델** — idle/loading/success/empty/error를 useReducer로 불가능한 상태 차단
4. **aria-activedescendant 가상 포커스** — focus를 input에 유지한 채 스크린 리더에 활성 항목 전달
5. **abort + latest-wins 이중 방어** — signal.aborted 체크로 abort 전파 타이밍 edge case 방어

이 5개 개념으로 등록할까요?

---

## [11:58:17] AI



> 도구 호출: Edit

---

## [11:58:23] 사용자

네

---

## [11:58:26] AI



> 도구 호출: ToolSearch

---

## [11:58:32] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [11:58:35] AI

Review 등록 완료. Phase 5 정리를 진행합니다.

---

## [11:58:35] AI



> 도구 호출: mcp__study__routine_appendEntry

---
