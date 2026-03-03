# Transcript: useReducer 실무 패턴
> 날짜: 2026-03-03 | 클라이언트: claude-code | 메시지: 67개

---

## [17:44:27] AI



> 도구 호출: Agent

---

## [17:44:29] AI



> 도구 호출: Agent

---

## [17:46:35] AI

> [ROUTINE] Phase 1/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 1분

## Phase 1: 탐색 — useReducer 실무 패턴

소스코드와 공식 문서를 탐색 완료했습니다. 먼저 핵심부터 잡고 갑니다.

---

### useReducer의 정체: useState의 범용 버전

**비유: 자판기 vs 주문 시스템**

- **useState** = 자판기. 버튼 누르면(action) 음료가 나옴. 내부 로직이 고정되어 있음.
- **useReducer** = 주문 시스템. 주문서(action)를 제출하면, 주방장(reducer)이 레시피대로 처리. 주방장을 교체하면 같은 주문서로 다른 결과.

실제 소스에서도 이 관계가 그대로 드러납니다:

```js
// ref/react/packages/react-reconciler/src/ReactFiberHooks.js:1922
function updateState(initialState) {
  return updateReducer(basicStateReducer, initialState);  // useState는 useReducer를 호출!
}

// 라인 1251: useState의 고정된 reducer
function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}
```

useState는 `basicStateReducer`라는 고정 레시피를 쓰는 useReducer의 **특수 케이스**입니다.

---

### 핵심 차이: dispatch 함수

| | useState (`dispatchSetState`) | useReducer (`dispatchReducerAction`) |
|---|---|---|
| eager state 최적화 | O (큐 비어있으면 즉시 계산, 같으면 렌더 스킵) | X |
| dispatch 안정성 | 안정적 | 안정적 |
| 소스 | `ReactFiberHooks.js:3628` | `ReactFiberHooks.js:3555` |

**비유 한계:** 자판기도 주문 시스템도 결국 같은 공장(updateReducerImpl)에서 처리됩니다. 차이는 입구(dispatch 함수)에서의 최적화 유무뿐.

---

### 실무에서 useReducer를 쓰는 3가지 시점

공식 문서 (`ref/react.dev/.../extracting-state-logic-into-a-reducer.md:877`):

> "We recommend using a reducer if you often encounter bugs due to incorrect state updates"

1. **여러 이벤트 핸들러가 비슷한 방식으로 state를 변경할 때** — 로직 중복 제거
2. **state 변경 원인을 추적하고 싶을 때** — action.type으로 모든 변경 로깅 가능
3. **Context + dispatch 패턴** — dispatch는 안정적 정체성이라 리렌더 최적화에 유리

---

### 연결: 이전 학습과의 관계

어제 학습한 **useRef**는 `hook.memoizedState`에 `{current: value}` 객체를 저장했죠. useReducer도 같은 Hook 링크드 리스트 구조를 사용합니다:

```
Hook {
  memoizedState: 현재 state 값,
  baseState: 기본 state (우선순위 스킵 이전),
  baseQueue: 재처리 대기 업데이트,
  queue: UpdateQueue { pending, dispatch, lastRenderedReducer, ... },
  next: → 다음 Hook
}
```

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:194-200`

---

궁금한 점이 있으면 질문해주세요. 예를 들어:

- "dispatch가 렌더 중에 호출되면 어떻게 되지?"
- "eager state 최적화가 정확히 뭐야?"
- "Reducer + Context 패턴의 실무 구조가 궁금해"
- "update queue의 circular linked list는 왜 쓰는 거야?"

최소 Q&A 3회를 목표로 합니다. 자유롭게 질문하세요!

---

## [17:48:11] 사용자

솔직히 3년간 근무하면서 useReducer를 사용해야될 이유를 찾아보지도 않았고, 필요성도 느끼지 못하였습니다 (보통 복잡한 상태관리도 useState 여러개 or 컴포넌트 분리 or 커스텀 훅 분리로 해결되니)

그럼에도 여전히 useReducer는 유효한 해결책중 하나일까요?

---

## [17:48:44] AI



> [ROUTINE] Phase 1/5 | useReducer 실무 패턴 | Q&A: 1 | 경과: 3분

좋은 질문입니다. 솔직한 출발점이고, 실제로 많은 시니어 개발자들이 같은 생각을 합니다.

---

### 결론부터: 유효하지만, "필수"는 아니다

당신의 3가지 전략 — **useState 여러 개, 컴포넌트 분리, 커스텀 훅 분리** — 이것들로 대부분의 실무 케이스는 해결됩니다. 틀린 게 아닙니다.

그런데 useReducer가 **유일하게 더 나은** 순간이 있습니다.

---

### 비유: 가계부

- **useState 여러 개** = 항목별 메모장. "식비 -3만", "교통 -1만" 각각 따로 적음.
- **useReducer** = 복식부기 장부. 모든 거래가 하나의 장부에 type별로 기록됨.

메모장으로 충분하면 메모장 쓰면 됩니다. 복식부기가 필요한 건 **항목 간에 서로 영향을 줄 때**입니다.

---

### useReducer가 진짜 빛나는 케이스

**useState 여러 개로 하면 버그가 나는 상황:**

```tsx
// ❌ useState로 하면 불일치 가능
const [status, setStatus] = useState('idle');
const [data, setData] = useState(null);
const [error, setError] = useState(null);

async function fetch() {
  setStatus('loading');
  setError(null);      // 까먹으면?
  try {
    const res = await api();
    setData(res);
    setStatus('success');
  } catch (e) {
    setError(e);
    setStatus('error');
    setData(null);      // 이것도 까먹으면?
  }
}
```

3개의 setter를 **항상 올바른 조합**으로 호출해야 합니다. 한 줄 빼먹으면 `status === 'error'`인데 `data`에 이전 값이 남는 불일치 상태가 됩니다.

```tsx
// ✅ useReducer — 상태 전이가 원자적
function reducer(state, action) {
  switch (action.type) {
    case 'fetch':
      return { status: 'loading', data: null, error: null };
    case 'success':
      return { status: 'success', data: action.data, error: null };
    case 'error':
      return { status: 'error', data: null, error: action.error };
  }
}
```

**핵심: 여러 state가 "항상 함께" 변해야 할 때**, reducer는 그 조합을 강제합니다. setter 하나 빼먹을 수 없는 구조.

---

### 그런데... 커스텀 훅으로도 되지 않나?

됩니다:

```tsx
function useFetch() {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const fetch = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setData(null);
    // ...
  }, []);
  
  return { status, data, error, fetch };
}
```

이것도 동작합니다. 하지만 **setter 조합의 정확성을 보장하는 건 개발자의 기억력**입니다. reducer는 **구조가 보장**합니다.

차이를 정리하면:

| | 커스텀 훅 + useState | useReducer |
|---|---|---|
| 불일치 방지 | 개발자가 주의 | 구조적으로 불가능 |
| 상태 전이 가시성 | 함수 내부를 읽어야 | action.type만 보면 됨 |
| 테스트 | 훅 전체를 마운트 | reducer 함수만 단위 테스트 |
| 복잡도 임계점 | 상태 3-4개까지 OK | 그 이상에서 강점 |

---

### 솔직한 판단 기준

```
상태가 독립적 → useState (대부분의 경우)
상태가 서로 의존적 + 전이 규칙이 있음 → useReducer 고려
```

3년간 필요성을 못 느꼈다면, 아마 **상태 간 의존성이 높은 복잡한 폼/워크플로우**를 만날 기회가 적었거나, 컴포넌트 분리로 의존성 자체를 피해온 것일 수 있습니다. 그건 좋은 설계입니다.

useReducer는 "반드시 써야 하는 도구"가 아니라 **"상태 전이가 복잡해졌을 때 꺼내는 도구"**입니다.

---

궁금한 점 더 있으면 질문하세요. 예를 들어:
- "그러면 실무에서 reducer + context 패턴은 어떤 상황에서 쓰는 건지?"
- "상태 전이가 복잡하다는 기준이 뭔지?"
- "reducer를 테스트하기 쉽다는 게 실제로 어떤 모습인지?"

---

## [17:50:57] 사용자

- 상태끼리 의존성이 높다 => A 상태로 인해 B,C,.. 상태가 영향을 받는다

그러면 이건 애초에 좋은 설계인가? 아니면 이렇게 설계해야하만하는 "어쩔수없는" 상황이 존재하나?

---

## [17:51:32] AI



> [ROUTINE] Phase 1/5 | useReducer 실무 패턴 | Q&A: 2 | 경과: 5분

핵심을 찌르는 질문입니다. 설계 관점에서 정리하겠습니다.

---

### 결론: 둘 다 존재한다

상태 의존성이 높은 건 **나쁜 설계일 때도 있고, 본질적으로 피할 수 없는 때도 있습니다.**

---

### Case 1: 나쁜 설계 — 분리해야 하는 걸 안 한 경우

```tsx
// ❌ 하나의 컴포넌트에 때려넣음
const [isOpen, setIsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const [searchQuery, setSearchQuery] = useState('');
const [filteredItems, setFilteredItems] = useState([]);
const [highlightIndex, setHighlightIndex] = useState(-1);

// isOpen 바뀌면 → searchQuery 리셋, highlightIndex 리셋, filteredItems 리셋...
```

이건 **Dropdown, SearchInput, ItemList로 컴포넌트를 분리**하면 의존성이 사라집니다. 당신이 3년간 해온 방식이 정확히 이 케이스입니다. 올바른 접근.

---

### Case 2: 본질적으로 피할 수 없는 — "상태 머신"

**비유: 신호등**

신호등의 상태는 `빨강 → 초록 → 노랑 → 빨강`입니다. 이건 분리할 수 없습니다. "빨강 컴포넌트", "초록 컴포넌트"로 쪼개는 게 아니라, **전이 규칙 자체가 도메인 로직**이기 때문입니다.

실무에서 이런 케이스:

**멀티스텝 폼 (위자드)**
```
idle → editing → validating → submitting → success
                                         → error → editing
```
- `step`, `formData`, `errors`, `isSubmitting`이 **하나의 전이 규칙**으로 묶여 있음
- step이 바뀌면 errors가 리셋되어야 하고, submitting이면 editing이 불가능해야 함
- 이걸 분리하면? step은 A 컴포넌트, errors는 B 컴포넌트... 오히려 동기화 버그 발생

**비동기 데이터 fetch**
```
idle → loading → success(data)
              → error(message) → retry → loading
```
- `status`, `data`, `error`는 **동시에 변해야** 하는 하나의 단위
- React Query/SWR이 내부적으로 이 패턴을 useReducer로 구현하는 이유

**드래그 앤 드롭**
```
idle → dragging(item, position) → hovering(target) → dropped
                                                   → cancelled
```
- `dragItem`, `dragPosition`, `hoverTarget`, `isDragging`이 모두 연결됨

---

### 판별 기준

```
질문: "이 상태들을 다른 컴포넌트로 분리할 수 있는가?"

  YES → 분리하라. useState로 충분. (Case 1)
  
  NO, 이것들은 "하나의 것"의 여러 측면이다
      → 본질적 의존성. useReducer가 적합. (Case 2)
```

더 구체적으로:

| 신호 | 분리 가능 (useState) | 본질적 묶음 (useReducer) |
|------|---------------------|------------------------|
| 상태 A가 바뀔 때 B를 리셋 | 대부분 | 가끔 |
| **"이 상태 조합은 불가능"**이 존재 | — | 거의 항상 |
| useEffect로 상태 동기화 중 | 설계 재고 필요 | reducer로 전환 검토 |

두 번째 줄이 핵심입니다. **"불가능한 상태 조합"이 있다면** — 예: `status === 'idle'`인데 `data !== null` — 이건 별도의 useState로는 구조적으로 막을 수 없고, reducer만이 **전이 규칙으로 차단**할 수 있습니다.

---

### 현실적인 빈도

솔직히 말하면, **Case 2는 자주 안 나옵니다.** 대부분의 UI 상태는 독립적이거나 분리 가능합니다. 그래서 3년간 필요성을 못 느낀 게 자연스럽습니다.

하지만 마주치면 — 특히 `useEffect`로 상태 A→B 동기화를 하고 있다면 — 그게 useReducer를 꺼내야 할 신호입니다.

---

자유롭게 더 질문하세요. 예를 들어:
- "useEffect로 동기화하는 걸 reducer로 바꾸는 구체적인 예시?"
- "React Query 같은 라이브러리가 내부에서 reducer를 어떻게 쓰는지?"
- 또는 `>>다음`으로 Phase 2(심화)로 넘어갈 수 있습니다.

---

## [17:53:11] 사용자

useEffect로 상태 A의 변화마다 상태 B를 업데이트하고있음 -> useReducer로 전환하는게 무조건 이득인가요?

---

## [17:53:40] AI



> [ROUTINE] Phase 1/5 | useReducer 실무 패턴 | Q&A: 3 | 경과: 7분

**아닙니다. 무조건은 아닙니다.**

---

### 먼저 구분: 왜 useEffect로 동기화하고 있는가?

**비유: 도미노 vs 리모컨**

- **도미노** = 상태 A가 넘어지면 B도 넘어짐. 연쇄 반응. 의도치 않게 복잡해짐.
- **리모컨** = 버튼 하나로 TV + 스피커 + 조명을 동시에 제어. 하나의 의도, 하나의 조작.

useEffect 동기화가 도미노인지 리모컨인지에 따라 답이 다릅니다.

---

### 케이스별 정리

#### 1. useReducer가 이득인 경우: **파생이 아닌 동기화**

```tsx
// ❌ useEffect 도미노
const [status, setStatus] = useState('idle');
const [error, setError] = useState(null);

useEffect(() => {
  if (status !== 'error') {
    setError(null);  // status가 바뀔 때마다 error 리셋
  }
}, [status]);
```

이건 **불필요한 중간 렌더**를 만듭니다:
```
setStatus('loading') → 렌더1 → useEffect 실행 → setError(null) → 렌더2
```

reducer로 바꾸면 **한 번의 렌더**로 끝납니다:
```tsx
// ✅ 원자적 전이
dispatch({ type: 'fetch' })
// → { status: 'loading', error: null } 한 번에
```

**이득: 불필요한 렌더 제거 + 중간 불일치 상태 제거**

---

#### 2. useReducer가 아닌 경우: **파생 상태 (derived state)**

```tsx
const [items, setItems] = useState([]);
const [query, setQuery] = useState('');

// ❌ 이걸 useEffect로 동기화
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(items.filter(i => i.name.includes(query)));
}, [items, query]);
```

이건 reducer로 바꿔도 해결이 아닙니다. **filtered는 상태가 아니라 계산값**이니까요:

```tsx
// ✅ 정답: 그냥 계산
const filtered = items.filter(i => i.name.includes(query));

// 비싸면 useMemo
const filtered = useMemo(
  () => items.filter(i => i.name.includes(query)),
  [items, query]
);
```

**원칙: A로부터 계산 가능한 B는 상태로 두지 않는다.**

---

#### 3. useReducer가 아닌 경우: **외부 시스템과의 동기화**

```tsx
const [theme, setTheme] = useState('light');

useEffect(() => {
  document.body.className = theme;  // DOM 동기화
}, [theme]);
```

이건 useEffect의 **정당한 용도**입니다. 외부 시스템(DOM, localStorage, API)과의 동기화는 reducer의 영역이 아닙니다. reducer는 순수 함수여야 하니까요.

---

### 판별 플로우차트

```
useEffect에서 setState를 하고 있다
│
├─ B는 A로부터 계산 가능한가?
│  YES → B를 상태에서 제거. useMemo나 변수로 전환.
│
├─ 외부 시스템(DOM/API/Storage)과 동기화인가?
│  YES → useEffect 유지. 정당한 용도.
│
├─ "A가 바뀌면 B도 바뀌어야 한다"는 규칙인가?
│  YES → 애초에 A와 B를 동시에 바꾸는 게 맞음.
│         → useReducer 또는 이벤트 핸들러에서 함께 처리.
│
└─ 여기까지 왔으면 설계를 재검토.
```

---

### 요약

| useEffect 패턴 | 해결책 | useReducer? |
|---|---|---|
| A 바뀌면 B setState | 함께 바꾸기 | **O** |
| A로부터 B 계산 | useMemo / 변수 | X |
| 외부 시스템 동기화 | useEffect 유지 | X |

**"useEffect 안에서 setState를 하고 있다" 자체가 냄새**입니다. 하지만 답이 항상 useReducer는 아닙니다. 파생 상태 제거가 먼저이고, 그래도 남는 "A와 B가 함께 변해야 하는" 케이스에서만 useReducer가 이득입니다.

---

Q&A 3회를 달성했습니다. 더 궁금한 게 있으면 계속 질문하시고, `>>다음`으로 Phase 2(소스코드 심화)로 넘어갈 수도 있습니다.

---

## [17:56:41] 사용자

솔직히 지금 느낀건 / useReucer를 고려해야하는 상황은 구조 자체가 잘못되지 않았나?를 점검해야하는 포인트인것처럼 보일정도로 실무에서 활용 우선순위가 떨어져보입니다

---

## [17:56:54] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [17:56:59] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [17:57:04] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [17:57:35] AI

> [ROUTINE] Phase 1/5 | useReducer 실무 패턴 | Q&A: 3 | 경과: 7분

날카로운 관찰입니다. 동의하는 부분과 반론을 함께 드리겠습니다.

---

### 동의: 대부분의 경우 맞다

useReducer가 필요해 보이는 순간의 **80%는 설계 점검 신호**입니다.

```
"상태 A, B, C가 서로 의존적이다"
  → 1차 점검: 컴포넌트 분리 가능한가?
  → 2차 점검: B, C가 파생 상태 아닌가?
  → 3차 점검: 이벤트 핸들러에서 함께 처리하면 되지 않나?

여기서 대부분 해결됨.
```

이게 당신이 3년간 해온 방식이고, **실무에서 정답률이 높은 사고 흐름**입니다.

---

### 반론: 나머지 20%

그런데 점검을 다 했는데도 남는 케이스가 있습니다. 공통점은 **"상태 전이 규칙 자체가 비즈니스 로직"**인 경우입니다.

실제 예시 하나만 보겠습니다:

```tsx
// 결제 플로우 — 컴포넌트 분리로 해결 안 됨
// 왜? 이 상태들이 "하나의 결제"라는 도메인 객체의 측면들이라서.

type PaymentState = {
  step: 'cart' | 'address' | 'payment' | 'confirm' | 'done';
  canGoBack: boolean;     // step에 따라 다름
  isEditable: boolean;    // submitting이면 false
  validationErrors: {};   // step 전환 시 리셋
};

// "confirm에서 뒤로 가면 payment로, 
//  payment에서 뒤로 가면 address로,
//  address에서 뒤로 가면 cart로,
//  done에서는 뒤로 갈 수 없음"
// 
// 이 규칙을 useState 4개 + 이벤트 핸들러로 관리하면?
// → 가능하지만, 규칙이 이벤트 핸들러 곳곳에 흩어짐
// → 새 step 추가 시 모든 핸들러를 점검해야 함
```

이건 컴포넌트를 아무리 분리해도 **전이 규칙은 어딘가에 존재해야** 합니다. 그 "어딘가"를 이벤트 핸들러에 분산시킬지, reducer에 집중시킬지의 차이입니다.

---

### 실무 우선순위에 대한 솔직한 평가

```
상태 관리 도구 선택 (실무 빈도순)

1. useState              ███████████████████ 80%  일상적
2. 컴포넌트/훅 분리       ██████████████     15%  자주
3. useReducer            █                   3%  가끔
4. 외부 상태관리(zustand등) █                  2%  특수
```

**useReducer의 실무 활용 우선순위가 낮다는 관찰은 정확합니다.**

다만 "우선순위가 낮다 = 몰라도 된다"는 아닙니다. 소화기와 비슷합니다. 평생 안 쓸 수도 있지만, 필요한 순간에 없으면 곤란합니다. 그 순간이 **"상태 전이 규칙이 비즈니스 로직인 경우"**입니다.

---

이 관점을 갖고 Phase 2에서 소스코드 수준으로 "그러면 내부적으로 useState와 뭐가 다른데?"를 파볼 수 있고, 아니면 실무 적용 쪽으로 더 탐색할 수도 있습니다.

더 궁금한 게 있으면 질문, 아니면 `>>다음`으로 Phase 2로 넘어가세요.

---

## [17:58:43] 사용자

상태 관리 도구 선택 (실무 빈도순) << 이거 솔직히 외부 상태관리를 먼저 떠올리지 않나요?

---

## [17:59:10] AI



> [ROUTINE] Phase 1/5 | useReducer 실무 패턴 | Q&A: 4 | 경과: 8분

맞습니다. 솔직히 그렇습니다.

---

### 현실적인 실무 빈도

제가 아까 그린 그래프는 **React 내장 도구만 놓고 본 빈도**였습니다. 실제 현장을 반영하면:

```
상태 관리 (실제 실무 사고 흐름)

"이 상태 어디에 둘까?"

1. 이 컴포넌트에서만 쓰임?
   → useState                        가장 먼저, 가장 자주

2. 여러 컴포넌트가 공유?
   → zustand / jotai / redux         바로 여기로 감
   
3. 서버 데이터?
   → tanstack-query / SWR            여기로 감

4. URL 상태?
   → searchParams / router state     여기로 감

... useReducer를 고려하는 시점이 없음
```

**솔직한 현실:** 대부분의 팀에서 "상태가 복잡해졌다" → zustand 같은 외부 라이브러리를 먼저 도입합니다. useReducer를 고려하는 단계가 사고 흐름에 끼어들 자리가 없습니다.

---

### 그러면 useReducer는 정말 쓸 데가 없나?

남는 자리가 **딱 하나** 있습니다:

```
"외부 라이브러리 없이, 이 컴포넌트(또는 훅) 안에서 
 복잡한 상태 전이를 캡슐화해야 할 때"
```

구체적으로:

| 상황 | 선택 |
|------|------|
| 전역 공유 상태 | zustand / jotai |
| 서버 상태 | tanstack-query |
| 컴포넌트 로컬 + 단순 | useState |
| **컴포넌트 로컬 + 전이 규칙 복잡** | **useReducer** |

네 번째 칸이 useReducer의 유일한 자리입니다. 그리고 그 칸이 실무에서 **정말 좁습니다.**

---

### 흥미로운 점: 라이브러리들은 내부에서 useReducer를 쓴다

당신이 직접 안 쓸 뿐, 이미 쓰고 있습니다:

- **React Hook Form** — 폼 상태 머신 내부에 useReducer
- **TanStack Query** — query 상태(idle/loading/error/success) 관리에 reducer 패턴
- **React Router** — navigation 상태 전이

이 라이브러리들이 useReducer(또는 그 패턴)를 쓰는 이유가 정확히 위에서 말한 "상태 전이 규칙이 비즈니스 로직"인 케이스이기 때문입니다.

**결국 useReducer는 "앱 개발자의 도구"보다 "라이브러리/인프라 개발자의 도구"에 가깝습니다.**

---

### 정리

당신의 직감이 맞습니다:
- 실무에서 useReducer를 직접 쓸 일은 거의 없다
- 외부 상태관리가 먼저 떠오르는 게 자연스럽다
- useReducer의 실질적 가치는 **라이브러리 내부 / 커스텀 훅 내부**에서 상태 머신을 만들 때

이 관점으로 Phase 2에서 "라이브러리들이 reducer를 어떻게 활용하는지" 소스 수준에서 볼 수 있습니다. 또는 다른 방향이 있으면 말씀하세요.

`>>다음`으로 Phase 2 진입 가능합니다.

---

## [18:00:05] 사용자

>>다음

---

## [18:00:15] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:00:19] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:00:24] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:00:36] AI

> [ROUTINE] Phase 2/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 10분

## Phase 2: 심화 — 소스코드 수준으로

Phase 1에서 "useReducer는 라이브러리/인프라 개발자의 도구에 가깝다"는 결론에 도달했습니다. Phase 2에서는 **왜 그런지** 소스코드로 검증합니다.

---

### 핵심 질문: useState와 useReducer는 내부적으로 뭐가 다른가?

---

## [18:00:38] AI



> 도구 호출: Read

---

## [18:00:39] AI



> 도구 호출: Read

---

## [18:01:09] AI

> [ROUTINE] Phase 2/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 11분

### 소스 코드 비교: dispatch 두 형제

두 dispatch 함수를 나란히 놓으면 **진짜 차이 한 가지**가 보입니다.

---

#### `dispatchReducerAction` (useReducer용) — `ReactFiberHooks.js:3555`

```
Update 생성 → 큐에 넣기 → 렌더 스케줄. 끝.
```

일직선입니다. "reducer가 뭘 반환할지 모르니까 일단 렌더 걸어."

---

#### `dispatchSetState` → `dispatchSetStateInternal` (useState용) — `ReactFiberHooks.js:3628`

```
Update 생성 → 큐가 비어있나? 
  YES → eager 계산 시도:
         lastRenderedReducer(currentState, action)
         → 같은 값? → bailout (렌더 스킵!) ← 이것
         → 다른 값? → 큐에 넣기 → 렌더 스케줄
  NO  → 큐에 넣기 → 렌더 스케줄
```

핵심은 `ReactFiberHooks.js:3648-3678`:

```js
// 큐가 비어있으면 (다른 pending 업데이트 없으면)
if (fiber.lanes === NoLanes && (alternate === null || alternate.lanes === NoLanes)) {
  const eagerState = lastRenderedReducer(currentState, action);
  update.hasEagerState = true;
  update.eagerState = eagerState;
  
  if (is(eagerState, currentState)) {
    // 같은 값! 렌더 자체를 스킵
    enqueueConcurrentHookUpdateAndEagerlyBailout(fiber, queue, update);
    return false;  // ← didScheduleUpdate = false
  }
}
```

---

### 비유: 택배 vs 퀵

- **dispatchReducerAction** (useReducer) = 택배. 무조건 물류센터(렌더)를 거침.
- **dispatchSetStateInternal** (useState) = 퀵. "이거 같은 건데요?" 하면 배송 자체를 취소할 수 있음.

---

### 왜 useReducer에는 eager 최적화가 없나?

**reducer가 바뀔 수 있기 때문입니다.**

```tsx
// reducer가 렌더마다 새로 생성될 수 있음
function MyComponent({ multiplier }) {
  const reducer = (state, action) => {
    switch (action.type) {
      case 'increment': return state + multiplier;  // 외부 변수 캡처
    }
  };
  const [count, dispatch] = useReducer(reducer, 0);
}
```

dispatch 시점의 reducer와 렌더 시점의 reducer가 **다를 수 있습니다**. 그래서 "지금 계산해봤자 나중에 달라질 수 있으니" eager 계산을 안 합니다.

반면 useState의 `basicStateReducer`는 **절대 안 바뀌는 고정 함수**라서 eager 계산이 안전합니다.

```
┌─────────────────────────────────────────────┐
│ useState:  dispatch 시점 reducer = 렌더 시점  │ → eager OK
│ useReducer: dispatch 시점 reducer ≠ 렌더 시점  │ → eager 불가
└─────────────────────────────────────────────┘
```

---

### 설계 의도: 왜 이렇게 만들었나?

React 팀의 트레이드오프:

| | useState | useReducer |
|---|---|---|
| reducer 안정성 | 보장 (basicStateReducer 고정) | 보장 못함 (사용자 제공) |
| eager bailout | 가능 → **성능 이점** | 불가능 |
| 유연성 | 낮음 (값 or 함수만) | 높음 (커스텀 로직) |

**"유연성을 얻으면 최적화를 잃는다"** — 이것이 useState와 useReducer의 근본적인 트레이드오프입니다.

라이브러리가 useReducer를 쓰는 이유가 여기서 명확해집니다: **유연성이 필요**하기 때문. 그리고 그 대가로 eager bailout을 포기합니다.

---

### Q&A

이 소스를 보고 질문을 드리겠습니다.

**Q1: `dispatchSetStateInternal`에서 eager bailout 조건이 `fiber.lanes === NoLanes`인 이유는 뭘까요?**

즉, "큐가 비어있을 때만" eager 계산을 하는 이유가 뭘까요? 큐에 다른 업데이트가 있으면 왜 eager를 안 하는 걸까요?

---

## [18:05:38] 사용자

큐에 대기중인게 실행후 결과가 바뀔수도있게때문에
예를들어 eager bailout으로 판단하여 리렌더 안하였는데, 큐에 결과로 인해 eager bailout한 값이 바뀐다면?

---

## [18:05:52] AI



> [ROUTINE] Phase 2/5 | useReducer 실무 패턴 | Q&A: 1 | 경과: 12분

정확합니다.

구체적으로 소스에서 확인하면:

```js
// ReactFiberHooks.js:3648-3650
if (
  fiber.lanes === NoLanes &&
  (alternate === null || alternate.lanes === NoLanes)
) {
```

`fiber.lanes !== NoLanes` = 아직 처리 안 된 업데이트가 있다는 뜻입니다. 이 상황에서 eager 계산을 하면:

```
큐: [update1(pending), update2(pending)]
새로운 dispatch: update3

eager 계산: reducer(currentState, update3.action)
→ "현재 상태와 같네? bailout!"

하지만 실제 렌더 시:
reducer(reducer(reducer(currentState, update1), update2), update3)
→ update1, update2 적용 후의 상태가 달라졌으므로 update3 결과도 다름
```

**currentState는 "마지막 렌더 결과"이지, "모든 pending 적용 후 상태"가 아닙니다.** 그래서 pending이 있으면 eager 계산의 기준 자체가 틀려집니다.

---

**Q2: 그러면 한 가지 더. Phase 1에서 "useReducer는 라이브러리/인프라 개발자의 도구에 가깝다"고 결론냈는데, 이 eager bailout 차이를 보고 나면 — 앱 개발자 입장에서 useReducer를 쓰면 성능상 손해인가요?**

---

## [18:07:40] 사용자

같은 맥락아닐까요? 우리가 Phase 1에서 본 케이스처럼 useReducer를 써야만하는 경우에서는 쓰는게 맞고 아니면 다른 패턴으로 처리하는게 이득이라봅니다 / useState 여러개로 처리 가능하면 방금말한대로 eager bailout 될수있는 확률이있지만 useRudcer로 가면 그 확률이 0이되니까

---

## [18:08:01] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:08:15] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:08:26] AI

> [ROUTINE] Phase 2/5 | useReducer 실무 패턴 | Q&A: 2 | 경과: 13분

Phase 1의 직감을 소스코드가 뒷받침했습니다. 깔끔하게 연결됩니다.

정리하면 오늘 세션에서 도출된 **하나의 일관된 결론**:

```
useReducer의 위치
├─ 실무 빈도: 매우 낮음 (Phase 1)
├─ 유일한 자리: 컴포넌트 로컬 + 상태 전이 규칙이 비즈니스 로직 (Phase 1)
├─ 성능 트레이드오프: eager bailout 포기 (Phase 2, 소스 검증)
└─ 결론: "써야만 하는 좁은 케이스에서만 쓰는 도구"
```

Phase 2 심화는 충분합니다. `>>다음`으로 Phase 3(라이브 코딩)으로 넘어가겠습니다. 준비되면 말씀하세요.

---

## [18:08:35] 사용자

>>다음

---

## [18:08:50] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:09:06] AI

> [ROUTINE] Phase 3/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 14분

## Phase 3: 라이브 코딩

오늘 학습 내용을 기반으로 코딩 과제 1개를 출제합니다.

---

### 과제

- **유형**: 리팩터링
- **설명**: 아래 코드는 `useEffect` 안에서 setState로 상태를 동기화하는 안티패턴을 포함하고 있습니다. 오늘 학습한 판별 기준을 적용하여 올바른 패턴으로 리팩터링하세요.

```tsx
function OrderForm() {
  const [items, setItems] = useState([
    { id: 1, name: '커피', price: 5000, qty: 1 },
    { id: 2, name: '케이크', price: 8000, qty: 2 },
  ]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discountRate, setDiscountRate] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [status, setStatus] = useState('editing'); // editing | submitting | done | error
  const [error, setError] = useState(null);

  useEffect(() => {
    const sum = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    setTotalPrice(sum);
  }, [items]);

  useEffect(() => {
    if (totalPrice >= 20000) setDiscountRate(0.1);
    else if (totalPrice >= 10000) setDiscountRate(0.05);
    else setDiscountRate(0);
  }, [totalPrice]);

  useEffect(() => {
    setFinalPrice(totalPrice * (1 - discountRate));
  }, [totalPrice, discountRate]);

  const handleSubmit = async () => {
    setStatus('submitting');
    setError(null);
    try {
      await submitOrder(items, finalPrice);
      setStatus('done');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  // ... JSX 생략
}
```

- **제약 조건**: TypeScript/JavaScript. useReducer를 써야 하는 부분과 쓰지 않아야 하는 부분을 구분하세요. "전부 useReducer"는 정답이 아닙니다.
- <details><summary>힌트</summary>오늘 배운 3가지 판별 기준을 각 상태에 적용해보세요: (1) 파생 상태인가? (2) 외부 동기화인가? (3) 상태 전이 규칙이 있는가?</details>

---

코드를 작성해주세요. 준비되면 보내주시면 됩니다.

---

## [18:12:04] 사용자

price 파생값(계산된 값)들은 단순 계산 변수로 또는 useMemo로 / handleSubmitㅇ 내부 로직을 useReducer로 개선하는게 현실적으로 보입니다

---

## [18:12:13] AI

> [ROUTINE] Phase 3/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 15분

방향이 정확합니다. 실제 코드로 작성해주시겠어요?

판별까지는 완벽한데, **코드로 옮기는 과정**이 이 Phase의 핵심입니다. 특히:

- 파생 값들을 어떻게 바꾸는지
- reducer의 state 타입과 action 타입을 어떻게 정의하는지
- handleSubmit이 reducer와 어떻게 연결되는지

코드로 보여주세요!

---

## [18:23:28] 사용자

const REDUCER_TYPE = {
  SUBMIT: "submit",
  DONE: "done",
  ERROR: "error"
}

function OrderForm() {
    const [items, setItems] = useState([
      { id: 1, name: '커피', price: 5000, qty: 1 },
      { id: 2, name: '케이크', price: 8000, qty: 2 },
    ]);
    const [discountRate, setDiscountRate] = useState(0);
    const [status, setStatus] = useState('editing'); // editing | submitting | done | error
    const [error, setError] = useState(null);

  const reducer = (_, action) => {
    switch (action.type) {
      case REDUCER_TYPE.SUBMIT:
        setStatus('submitting');
        setError(null);
        break
      case REDUCER_TYPE.DONE:
          setStatus('done');
      case REDUCER_TYPE.ERROR:
          setError(action.message);
          setStatus('error');
      default:
        return state
    }
  }

    const [, dispatch] = useReducer(reducer)

    // useMemo 고려
    const totalPrice = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    const finalPrice = totalPrice * (1 - discountRate)

    useEffect(() => {
      if (totalPrice >= 20000) setDiscountRate(0.1);
      else if (totalPrice >= 10000) setDiscountRate(0.05);
      else setDiscountRate(0);
    }, [totalPrice]);

    const handleSubmit = async () => {
      dispatch({type: REDUCER_TYPE.SUBMIT})
      try {
        await submitOrder(items, finalPrice);
      dispatch({type: REDUCER_TYPE.DONE})
      } catch (e) {
      dispatch({type: REDUCER_TYPE.ERROR, message: e.message})
      }
    };

    // ... JSX 생략
  }

---

## [18:23:38] AI

> [ROUTINE] Phase 3/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 16분

### 1차 리뷰 (답 보류)

**잘한 부분:**
- `totalPrice`를 파생 값(계산 변수)으로 전환 — 정확
- `finalPrice`도 파생 값으로 전환 — 정확
- handleSubmit에서 dispatch로 전환하려는 방향 — 맞음

**틀린 부분 2가지:**

1. **reducer 안에서 setState를 호출하고 있습니다.** reducer의 역할이 뭔지 다시 생각해보세요. reducer는 어떤 함수여야 하나요?

2. **discountRate는 아직 useEffect + setState로 남아있습니다.** 이것도 Phase 1에서 다룬 판별 기준 중 하나에 해당합니다. totalPrice로부터 _____ 가능한 값입니다.

수정해서 다시 제출하시겠어요? 아니면 모범 답안으로 넘어갈까요?

---

## [18:24:18] 사용자

1. 순수함수
2. 파생

---

## [18:24:24] AI

> [ROUTINE] Phase 3/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 17분

맞습니다. 그러면 그 두 가지를 반영해서 코드를 수정해주시겠어요?

특히:
- reducer가 **새로운 state를 반환**하는 순수 함수로
- discountRate를 파생 값으로

코드로 보여주세요! 아니면 모범 답안으로 넘어가도 됩니다.

---

## [18:26:41] 사용자

const REDUCER_TYPE = {
  SUBMIT: "submit",
  DONE: "done",
  ERROR: "error"
}

  const reducer = (state, action) => {
    switch (action.type) {
      case REDUCER_TYPE.SUBMIT:
        state.status = 'submitting';
        setError(null);
        state.error = null
        return state
      case REDUCER_TYPE.DONE:
          state.status = 'done';
          return state
      case REDUCER_TYPE.ERROR:
          state.error = action.message;
          state.status = 'error';
          return state
      default:
        return state
    }
  }

function OrderForm() {
    const [items, setItems] = useState([
      { id: 1, name: '커피', price: 5000, qty: 1 },
      { id: 2, name: '케이크', price: 8000, qty: 2 },
    ]);
    const [discountRate, setDiscountRate] = useState(0);

    const [state, dispatch] = useReducer(reducer)

    // useMemo 고려
    const totalPrice = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    const finalPrice = totalPrice * (1 - discountRate)

    const discountRate = () => {
      if (totalPrice >= 20000) 0.1;
      else if (totalPrice >= 10000) 0.05;
      else 0;
    }

    const handleSubmit = async () => {
      dispatch({type: REDUCER_TYPE.SUBMIT})
      try {
        await submitOrder(items, finalPrice);
      dispatch({type: REDUCER_TYPE.DONE})
      } catch (e) {
      dispatch({type: REDUCER_TYPE.ERROR, message: e.message})
      }
    };

    // ... JSX 생략
  }

---

## [18:27:07] AI

> [ROUTINE] Phase 3/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 18분

### 2차 리뷰 + 모범 답안

방향은 맞아가고 있습니다. 남은 문제점을 짚고 모범 답안을 보여드리겠습니다.

**남은 문제:**

1. **reducer에서 state를 직접 변경(mutate)하고 있습니다.** `state.status = 'submitting'`은 기존 객체를 수정하는 것. React는 `Object.is()`로 이전/다음 state를 비교하므로, 같은 참조를 반환하면 변경을 감지 못합니다. 새 객체를 반환해야 합니다.

2. **reducer 안에 `setError(null)`이 남아있습니다.** (지우다 만 흔적)

3. **discountRate가 함수로 바꿨지만 return이 없고, useState 선언과 이름이 충돌합니다.**

4. **useReducer 초기값이 빠져있습니다.**

---

### 모범 답안

```tsx
const REDUCER_TYPE = {
  SUBMIT: 'submit',
  DONE: 'done',
  ERROR: 'error',
} as const;

type State = {
  status: 'editing' | 'submitting' | 'done' | 'error';
  error: string | null;
};

type Action =
  | { type: 'submit' }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ✅ 순수 함수: 새 객체 반환, side effect 없음
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'submit':
      return { status: 'submitting', error: null };
    case 'done':
      return { status: 'done', error: null };
    case 'error':
      return { status: 'error', error: action.message };
    default:
      return state;
  }
}

function OrderForm() {
  const [items, setItems] = useState([
    { id: 1, name: '커피', price: 5000, qty: 1 },
    { id: 2, name: '케이크', price: 8000, qty: 2 },
  ]);

  // ✅ status + error는 전이 규칙이 있는 묶음 → useReducer
  const [state, dispatch] = useReducer(reducer, {
    status: 'editing',
    error: null,
  });

  // ✅ 파생 값 — 상태가 아니라 계산
  const totalPrice = items.reduce(
    (acc, item) => acc + item.price * item.qty, 0
  );
  const discountRate =
    totalPrice >= 20000 ? 0.1 :
    totalPrice >= 10000 ? 0.05 : 0;
  const finalPrice = totalPrice * (1 - discountRate);

  const handleSubmit = async () => {
    dispatch({ type: 'submit' });
    try {
      await submitOrder(items, finalPrice);
      dispatch({ type: 'done' });
    } catch (e) {
      dispatch({ type: 'error', message: e.message });
    }
  };
}
```

---

### 차이점 분석

| 항목 | 제출 코드 | 모범 답안 |
|------|----------|----------|
| reducer 순수성 | `state.status = ...` (mutate) | `{ ...새 객체 }` (immutable) |
| 파생 값 처리 | discountRate 함수화 시도 (return 누락) | 삼항 연산자로 단순 계산 |
| 초기값 | useReducer 초기값 누락 | `{ status: 'editing', error: null }` |
| 타입 | 없음 | State/Action 타입으로 불가능한 조합 차단 |

### 학습 포인트

1. **reducer = 새 객체 반환이 철칙.** `state.x = y; return state`는 React가 변경을 감지 못함. `Object.is(oldState, newState) === true`이므로 리렌더 안 됨.

2. **파생 값은 상태도 함수도 아닌, 그냥 변수.** discountRate는 totalPrice에서 바로 계산되므로 `const discountRate = 조건식`이면 충분.

3. **useReducer에 넣을 것과 뺄 것의 판별**: status + error는 "불가능한 조합"이 존재하는 묶음(status가 'editing'인데 error가 있으면 안 됨) → reducer. items, 가격 계산 → 독립적/파생 → useState + 변수.

---

`>>다음`으로 Phase 4(체크포인트)로 넘어갈 수 있습니다.

---

## [18:29:14] 사용자

const REDUCER_TYPE = {
  SUBMIT: "submit",
  DONE: "done",
  ERROR: "error"
}

  const reducer = (state, action) => {
    switch (action.type) {
      case REDUCER_TYPE.SUBMIT:
        return {status: 'submitting', error: null}
      case REDUCER_TYPE.DONE:
        return {status: 'done', error: null}
      case REDUCER_TYPE.ERROR:
        return {status: 'error', error: action.message}
      default:
        return state
    }
  }

function OrderForm() {
    const [items, setItems] = useState([
      { id: 1, name: '커피', price: 5000, qty: 1 },
      { id: 2, name: '케이크', price: 8000, qty: 2 },
    ]);
    const [discountRate, setDiscountRate] = useState(0);

    const [state, dispatch] = useReducer(reducer, {
      status: "editting",
      error: null
    })

    // useMemo 고려
    const totalPrice = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    const finalPrice = totalPrice * (1 - discountRate)
    const discountRate =
      totalPrice >= 20000 ? 0.1 :
      totalPrice >= 10000 ? 0.05 : 0;

    const handleSubmit = async () => {
      dispatch({type: REDUCER_TYPE.SUBMIT})
      try {
        await submitOrder(items, finalPrice);
      dispatch({type: REDUCER_TYPE.DONE})
      } catch (e) {
      dispatch({type: REDUCER_TYPE.ERROR, message: e.message})
      }
    };

    // ... JSX 생략
  }

---

## [18:29:22] AI



> [ROUTINE] Phase 3/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 19분

거의 다 왔습니다. reducer가 순수 함수로 정리되었고, 파생 값도 올바르게 전환했습니다.

작은 잔여 이슈 2개만:

1. **discountRate가 useState 선언과 `const` 선언이 중복.** `useState` 줄을 제거하면 됩니다.
2. **finalPrice가 discountRate보다 먼저 선언됨.** 순서를 바꿔야 합니다 (totalPrice → discountRate → finalPrice).

핵심 구조는 정확합니다. `>>다음`으로 Phase 4 진입할까요?

---

## [18:29:41] 사용자

>>다음

---

## [18:29:54] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:29:57] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:30:05] AI

> [ROUTINE] Phase 4/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 20분

## 체크포인트

오늘 배운 내용을 검증합니다. 코드를 보지 않고 답해주세요.

---

### Q1: "이게 왜 이렇게 동작해?"

**useState의 `dispatchSetState`에는 eager bailout 최적화가 있고, useReducer의 `dispatchReducerAction`에는 없습니다. 왜 useReducer에는 이 최적화를 넣지 않았을까요?**

---

답변해주세요.

---

## [18:30:51] 사용자

useReducer의 reducer 함수는 사용자가 제공합니다. 이 함수의 참조가 안정적이라는 보장을 할수없으므로 최적화를 포기하더라도 리렌더링을 강제합니다

---

## [18:30:57] AI

> [ROUTINE] Phase 4/5 | useReducer 실무 패턴 | Q&A: 1 | 경과: 21분

정확합니다.

---

### Q2: "나라면 어떻게 만들었을까?"

**실무에서 `useEffect` 안에 `setState`가 있는 코드를 발견했습니다. 이걸 어떻게 개선할지 판단하는 당신만의 기준을 설명해주세요. 어떤 순서로 뭘 확인하나요?**

---

## [18:32:13] 사용자

1. 단순 파생값인가? -> 일반 변수 or useMemo로 전환
2. 의존값인가? -> useEffect가 필요한가? (사이드이펙트) -> 아니라면 useReducer

---

## [18:32:29] AI

> [ROUTINE] Phase 4/5 | useReducer 실무 패턴 | Q&A: 2 | 경과: 22분

좋습니다. 핵심 흐름을 잡았습니다.

### 피드백

**잘 답한 부분:**
- 파생 값 제거가 1순위라는 판단 — 정확
- useEffect의 정당성(사이드이펙트 여부)을 확인하는 단계 — 맞음

**보충할 부분:**
- 2번에서 "사이드이펙트가 맞다면" → **useEffect 유지**라는 갈래가 빠졌습니다. 외부 시스템(DOM, API, localStorage) 동기화는 useEffect가 정당한 용도.
- 또한 useReducer 이전에 "이벤트 핸들러에서 함께 처리"라는 선택지가 있습니다. 단순히 setter 2개를 한 핸들러에서 호출하면 되는 경우도 많습니다.

완전한 흐름:
```
useEffect 안에 setState 발견
├─ 1. 파생 값? → 변수 / useMemo
├─ 2. 외부 시스템 동기화? → useEffect 유지
├─ 3. 이벤트 핸들러에서 함께 처리 가능? → 그렇게
└─ 4. 상태 전이 규칙이 있는 묶음? → useReducer
```

---

### 자기 평가

```
자기 평가를 해주세요:
- PASS → 핵심 개념을 review에 등록하고 정리합니다 (Phase 5)
- FAIL → gap을 기록하고 다음 접근 방식을 제안합니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.
```

---

## [18:32:43] 사용자

PASS

---

## [18:32:58] AI

> [ROUTINE] Phase 4/5 | useReducer 실무 패턴 | Q&A: 2 | 경과: 23분

오늘 세션에서 다룬 핵심 개념 5개를 추출했습니다. review에 등록할 목록을 확인해주세요:

| # | 개념 | 설명 |
|---|------|------|
| 1 | useState는 useReducer의 특수 케이스 | updateState → updateReducer(basicStateReducer) 위임 |
| 2 | eager bailout 최적화 차이 | useState는 큐 비어있을 때 즉시 계산+bailout 가능, useReducer는 reducer 참조 불안정으로 불가 |
| 3 | useEffect 내 setState 판별 플로우 | 파생값 제거 → 외부 동기화 유지 → 핸들러에서 함께 처리 → useReducer |
| 4 | reducer 순수성 원칙 | 새 객체 반환 필수(Object.is 비교), state mutate 금지, side effect 금지 |
| 5 | useReducer 실무 위치 | 컴포넌트 로컬 + 불가능한 상태 조합이 존재하는 전이 규칙이 있을 때만 |

이 5개로 등록할까요?

---

## [18:33:02] 사용자

네

---

## [18:33:10] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [18:33:15] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:33:22] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [18:33:30] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:33:39] AI



> 도구 호출: mcp__study__context_resolve

---

## [18:33:46] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [18:33:53] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:33:59] AI

> [ROUTINE] Phase 5/5 | useReducer 실무 패턴 | Q&A: 0 | 경과: 24분

Review 등록 완료. Phase 5 정리를 시작합니다.

---

## [18:34:00] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [18:34:00] AI



> 도구 호출: Read

---

## [18:34:01] AI



> 도구 호출: Read

---

## [18:34:05] AI



> 도구 호출: Write

---

## [18:34:11] AI



> 도구 호출: Write

---
