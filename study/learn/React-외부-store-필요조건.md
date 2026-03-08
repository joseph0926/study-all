# React-외부-store-필요조건

> 최초 질문: React에서 외부 store가 필요한 경우,조건이 뭔가요?
> 일시: 2026-03-08

---

## Q1. React에서 외부 store가 필요한 경우,조건이 뭔가요?

### 비유: 건물 안 장부와 건물 밖 전광판

| 비유 요소 | 실제 대응 |
|-----------|-----------|
| 건물 안 장부 | `useState` / `useReducer` |
| 장부 내용을 층마다 알리는 방송 | `Context` |
| 건물 밖 전광판, 센서 | 외부 store / 브라우저 API / 서드파티 상태 라이브러리 |
| 전광판 숫자를 읽어오는 중계기 | `useSyncExternalStore` |

핵심은 "상태가 많다"가 아니라 "값의 원천이 React 밖에 있는가"입니다.

### 코드/텍스트 설명

외부 store가 필요한 조건은 이쪽에 가깝습니다.

- 값의 소유자가 React 밖에 있다.
- 그 값이 React 렌더링 데이터 흐름 밖에서 바뀐다.
- 화면이 그 값을 렌더링에 사용해야 한다.
- 그 변화를 구독해서 다시 렌더해야 한다.

React 공식 문서는 `useSyncExternalStore`를 "외부 store를 구독하는 Hook"으로 소개하고, 대상 예시로 서드파티 상태 라이브러리와 브라우저의 mutable API를 듭니다.  
근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:7`, `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:86`

또한 `You Might Not Need an Effect`는 React state 밖의 데이터가 React 모르게 변할 수 있으므로, 이런 경우 수동 Effect 동기화 대신 `useSyncExternalStore`를 권장합니다.  
근거: `ref/react.dev/src/content/learn/you-might-not-need-an-effect.md:640`, `ref/react.dev/src/content/learn/you-might-not-need-an-effect.md:671`

반대로 단순히 여러 컴포넌트가 같은 값을 써야 하는 정도라면, 가장 가까운 공통 부모로 state를 올리거나 reducer + context 조합이 우선입니다.  
근거: `ref/react.dev/src/content/learn/sharing-state-between-components.md:7`, `ref/react.dev/src/content/learn/scaling-up-with-reducer-and-context.md:7`

추론: 외부 store는 "공유 상태가 크다"의 문제보다 "React가 소유하지 않는 변하는 값을 UI와 연결해야 한다"의 문제를 해결하는 도구입니다.

### 시각화

```text
값이 바뀜
├─ React 내부 state가 소유함
│  └─ useState / useReducer / Context
└─ React 밖에서 바뀜
   ├─ 렌더링에 안 씀
   │  └─ 이벤트 시점에만 읽기
   └─ 렌더링에 씀
      └─ external store + useSyncExternalStore 고려
```

### 연결

이 질문은 `React-context-전달과-상태경계`와 직접 연결됩니다. `Context`는 전달자이고, 외부 store는 값의 소유자라는 역할 분리가 핵심입니다.

## Q2. 그러면 최대한 외부 store 사용 판단을 추상화하면 -> 외부에서 바뀌는 값을 리액트 앱에서 렌더링하는데 사용할 때 고려해볼수있음 << 맞을까요?

### 비유: "밖에서 바뀌는 값" + "화면 전광판에 실시간 표시"

밖에서 바뀌는 숫자가 있어도, 사람이 버튼을 누를 때만 한 번 확인하면 전광판 시스템은 필요 없습니다.  
하지만 화면이 그 숫자를 계속 보여줘야 하면 구독 장치가 필요합니다.

### 코드/텍스트 설명

거의 맞습니다. 다만 "고려"를 한 단계 더 좁히면 더 정확합니다.

- React 밖에서 변하는 값을
- React 렌더링 결과에 사용해야 하고
- 그 변화를 React가 직접 추적하지 못해서
- 구독이 필요할 때

외부 store를 고려한다고 정리하는 편이 정확합니다.

React 문서는 mutable 외부 값은 React가 의존성으로 추적할 수 없고, 렌더링 데이터 흐름 밖에서 바뀌므로 `useSyncExternalStore`로 읽고 구독해야 한다고 설명합니다.  
근거: `ref/react.dev/src/content/learn/lifecycle-of-reactive-effects.md:584`, `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:86`

추론: "외부에서 바뀐다"만으로는 부족하고, "UI가 그 변화를 계속 따라가야 한다"가 추가되어야 외부 store 판단 기준이 됩니다.

### 시각화

```text
외부 값
├─ 렌더링에 사용 안 함
│  └─ ref / imperative read
└─ 렌더링에 사용
   ├─ React 내부로 끌어올릴 수 있음
   │  └─ useState / useReducer / Context
   └─ 원천이 밖에 남아 있어야 함
      └─ external store
```

### 연결

`React-context-전달과-상태경계`에서 본 "값 전달"과 "상태 소유"의 분리가 여기서 판단 기준으로 다시 나타납니다.

## Q3. 외부 store는 무조건 useSyncExternalStore 사용이 나을까요?

### 비유: 창고와 중계기

`useSyncExternalStore`는 창고 자체가 아니라 창고와 화면을 연결하는 중계기입니다.

- 창고를 집 안에 둘 수 있으면 `useState` / `useReducer`
- 창고가 밖에 있고 화면이 계속 읽어야 하면 `useSyncExternalStore`

### 코드/텍스트 설명

무조건은 아닙니다.

React 문서는 가능하면 내장 state(`useState`, `useReducer`)를 먼저 쓰라고 하고, `useSyncExternalStore`는 기존 non-React 코드와 통합할 때 주로 유용하다고 설명합니다.  
근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:172`

반면 외부 mutable 값을 렌더링에 구독해야 하는 경우에는 수동 Effect 동기화보다 `useSyncExternalStore`가 권장됩니다.  
근거: `ref/react.dev/src/content/learn/you-might-not-need-an-effect.md:671`

또한 보통은 컴포넌트에서 직접 반복해서 쓰기보다 custom Hook이 이 Hook을 감싸는 형태를 권장합니다.  
근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:244`

다만 제약도 있습니다.

- snapshot은 immutable해야 함
- transition 중 store 변경 시 blocking으로 fallback 가능
- store 값 기반 Suspense는 권장되지 않음

근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:54`

추론: `useSyncExternalStore`는 외부 store를 React에 연결하는 표준에 가깝지만, "외부 store를 직접 만들든 말든"의 1차 선택 기준은 아닙니다.

### 시각화

```text
외부 값 구독 필요?
├─ 아니오
│  └─ 내장 React state 우선
└─ 예
   └─ useSyncExternalStore 계열 접근 권장
      ├─ 직접 사용
      └─ custom hook / 상태관리 라이브러리 hook으로 감싸기
```

### 연결

`React-리렌더링-트리거`와 연결됩니다. 외부 store의 subscribe callback 역시 React 렌더를 다시 여는 입구가 되기 때문입니다.

## Q4. snapshot은 immutable해야 하고, store 변경은 transition을 blocking으로 되돌릴 수 있으며, store 값 기반 Suspense는 권장되지 않습니다 << 여기서 스냅샷의 불변성을 어떻게 지킬수있나요? 스냅샷은 계속 바뀌어야하지 않나요? 리액트 state처럼 불변성 지키라는건가요?(복사등을 이용해서) 또한 transition을 blocking으로 되돌릴 수 있으며 << 이게 무슨말인가요?

### 비유: 창고 사진과 초안 작업

| 비유 요소 | 실제 대응 |
|-----------|-----------|
| 실제 창고 | mutable store |
| 창고를 찍은 사진 | snapshot |
| 사진을 몰래 덧칠함 | 같은 참조를 mutate |
| 창고가 바뀔 때 새 사진 촬영 | 변경 시 새 immutable snapshot 생성 |
| 천천히 그리는 화면 초안 | transition |
| 초안 중 창고 물건이 바뀜 | transition 중 external store mutation |

snapshot은 "영원히 안 바뀌는 것"이 아니라, **같은 store 상태에서는 같은 참조를 유지하는 읽기 결과**입니다.

### 코드/텍스트 설명

React 문서는 다음을 요구합니다.

- store가 안 바뀐 동안 `getSnapshot()`은 같은 값을 반환해야 함
- snapshot은 immutable해야 함
- mutable store라면 변경 시에만 새 immutable snapshot을 만들고, 변경이 없으면 마지막 cached snapshot을 재사용해야 함

근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:44`, `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:56`, `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:400`

즉 질문하신 "리액트 state처럼 복사 등을 이용해서 불변성을 지키라는 건가요?"에 대한 답은 거의 "네"입니다.  
다만 대상은 store 내부 구현 전체가 아니라 **`getSnapshot()` 반환값**입니다.

문서의 잘못된 예시는 `getSnapshot()`이 호출될 때마다 새 객체를 만드는 경우이고, 이러면 매번 값이 달라 보이므로 무한 루프가 날 수 있다고 설명합니다.  
근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:376`

예를 들면:

```js
let store = {
  todos: [],
  version: 0,
};

let cachedVersion = -1;
let cachedSnapshot = null;

export function addTodo(text) {
  store.todos.push({ id: crypto.randomUUID(), text });
  store.version += 1;
  emitChange();
}

export function getSnapshot() {
  if (cachedVersion !== store.version) {
    cachedVersion = store.version;
    cachedSnapshot = {
      todos: [...store.todos],
    };
  }

  return cachedSnapshot;
}
```

이 패턴의 핵심은:

```text
store 안 바뀜  -> 같은 snapshot 참조 반환
store 바뀜     -> 새 snapshot 생성 후 반환
```

이제 transition fallback 부분입니다.

React 문서는 transition 중 external store가 mutate되면, React가 DOM 커밋 직전에 `getSnapshot()`을 한 번 더 읽고 값이 달라졌을 경우 그 업데이트를 blocking으로 다시 수행한다고 설명합니다.  
근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:60`

또한 React 18 upgrade guide와 React Labs 글은 `useSyncExternalStore`가 외부 store 업데이트를 synchronous하게 처리해 concurrent rendering을 지원하며, 그 대가로 transition 같은 concurrent 기능에서 bail out 할 수 있다고 설명합니다.  
근거: `ref/react.dev/src/content/blog/2022/03/08/react-18-upgrade-guide.md:228`, `ref/react.dev/src/content/blog/2025/04/23/react-labs-view-transitions-activity-and-more.md:14349`

추론: 이유는 tearing 방지입니다. transition 초안 앞부분은 옛 snapshot, 뒷부분은 새 snapshot을 보는 식으로 화면이 찢어지지 않게 하려는 것입니다.

### 시각화

```text
1. transition 시작
2. React가 snapshot A로 렌더 초안 생성
3. 커밋 직전 getSnapshot() 재확인
4. snapshot B가 나옴 (A !== B)
5. concurrent 초안 폐기
6. blocking 렌더로 재시작
7. 화면 전체를 B 기준으로 맞춤
```

즉 "transition을 blocking으로 되돌린다"는 말은,
"백그라운드에서 여유 있게 하던 렌더를 포기하고, 화면 일관성을 위해 지금 동기적으로 다시 처리한다"는 뜻입니다.

### 연결

이 설명은 `React-리렌더링-트리거`와 연결됩니다. 외부 store 구독은 단순 값 읽기가 아니라, React가 안전하게 다시 렌더링하도록 연결하는 메커니즘이기 때문입니다.

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/React-context-전달과-상태경계.md` | 역할 분리 | `Context`는 전달자, 외부 store는 값의 소유자라는 구분이 이번 판단 기준의 출발점이다. |
| `study/learn/React-리렌더링-트리거.md` | 인과 관계 | external store의 subscribe callback은 React가 다시 렌더를 여는 입구가 되며, transition fallback 설명도 렌더 트리거와 일관성 보장 문제로 연결된다. |
