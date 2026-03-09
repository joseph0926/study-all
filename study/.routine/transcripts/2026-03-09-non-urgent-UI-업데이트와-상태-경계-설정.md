# Transcript: non-urgent UI 업데이트와 상태 경계 설정
> 날짜: 2026-03-09 | 클라이언트: codex | 메시지: 47개

---

## [14:02:38] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 1 | 경과: 3분
첫 탐색 답변을 세션 로그에 원문 그대로 남깁니다. 이후 바로 이어서 같은 내용으로 Phase 1을 시작합니다.

---

## [14:03:15] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 1 | 경과: 4분
오리엔테이션과 첫 탐색 응답 기록까지 끝냈습니다. 이제 사용자의 다음 질문이나 선택에 맞춰 Phase 1을 이어가면 됩니다.

---

## [14:03:45] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 1 | 경과: 3분
## 루틴 시작
streak: 1일 | 총 세션: 10

### 최근 기록
- 03-09 배포 후 느려진 페이지 진단 실전
- 03-09 autocomplete 설계/구현/테스트
- 03-05 useEffect 실무 패턴

### 오늘의 시드
`non-urgent UI 업데이트와 상태 경계 설정`

### 소스
- `ref/react.dev/src/content/reference/react/startTransition.md`
- `ref/react.dev/src/content/reference/react/useDeferredValue.md`
- `ref/react.dev/src/content/reference/react/useSyncExternalStore.md`
- `ref/react.dev/src/content/learn/preserving-and-resetting-state.md`
- `study/learn/React-context-전달과-상태경계.md`
- 참고: `/Users/younghoonkim/dev/personal/@skills/some/interview/3/feedback.md`

### 비유
- 긴급 업데이트는 접수창 입력처럼 커서가 즉시 따라와야 하는 일입니다.
- non-urgent 업데이트는 뒤쪽 전광판이나 큰 차트처럼 조금 늦게 따라와도 되는 일입니다.
- 상태 경계는 "같은 책상 자리면 같은 서랍을 유지하고, 자리나 명패(`key`)가 바뀌면 새 서랍을 준다"에 가깝습니다.

### 코드/텍스트 설명
- `startTransition`은 상태 업데이트를 Transition으로 표시해서 non-blocking으로 처리합니다. 내가 직접 `setState`를 쥐고 있을 때 쓰는 도구입니다. 근거: `ref/react.dev/src/content/reference/react/startTransition.md:23`, `ref/react.dev/src/content/reference/react/startTransition.md:44`, `ref/react.dev/src/content/reference/react/startTransition.md:54`, `ref/react.dev/src/content/reference/react/startTransition.md:60`, `ref/react.dev/src/content/reference/react/startTransition.md:62`
- `useDeferredValue`는 값을 바로 바꾸는 대신, 현재 렌더에서는 이전 값을 유지하고 뒤에서 새 값으로 다시 렌더를 시도합니다. 즉 "값 계산 캐시"가 아니라 "UI 일부를 늦게 따라오게 하는 스케줄링"입니다. 근거: `ref/react.dev/src/content/reference/react/useDeferredValue.md:45`, `ref/react.dev/src/content/reference/react/useDeferredValue.md:49`, `ref/react.dev/src/content/reference/react/useDeferredValue.md:53`, `ref/react.dev/src/content/reference/react/useDeferredValue.md:55`, `ref/react.dev/src/content/reference/react/useDeferredValue.md:59`
- 추론: 그래서 인터뷰에서 흔들린 "바로 반영될 필요가 없는 값이면 `useMemo`?"는 결이 다릅니다. `useMemo`는 같은 우선순위 렌더 안에서 계산 결과를 캐시하는 쪽이고, `useDeferredValue`는 background re-render를 따로 열어 old UI를 잠시 유지합니다. reconciler도 `useDeferredValue`가 만든 deferred task를 별도 lane으로 다시 잡습니다. 근거: `ref/react/packages/react-reconciler/src/ReactFiberBeginWork.js:2335`, `ref/react/packages/react-reconciler/src/ReactFiberBeginWork.js:2371`
- 상태 경계는 "어디에 state를 둘까"만이 아니라 "어느 subtree가 같은 identity를 유지할까"의 문제입니다. React는 같은 컴포넌트가 같은 트리 위치에 있으면 state를 보존하고, 위치가 바뀌거나 `key`가 달라지면 state를 버립니다. 근거: `ref/react.dev/src/content/learn/preserving-and-resetting-state.md:275`, `ref/react.dev/src/content/learn/preserving-and-resetting-state.md:818`, `ref/react.dev/src/content/learn/preserving-and-resetting-state.md:1002`, `ref/react.dev/src/content/learn/preserving-and-resetting-state.md:1240`
- 외부 store는 여기서 한 단계 더 조심해야 합니다. transition 중 store snapshot이 바뀌면 React는 tearing을 피하려고 그 업데이트를 blocking으로 다시 수행합니다. 그래서 "자주 바뀌는 공유 데이터"와 "늦게 보여줘도 되는 무거운 시각화"는 같은 문제로 보면 안 됩니다. 근거: `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:56`, `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:60`, `ref/react.dev/src/content/reference/react/useSyncExternalStore.md:62`

### 시각화
```text
긴급성 축
입력값 자체            -> local state 즉시 반영
무거운 결과 리스트/차트 -> useDeferredValue 또는 startTransition

경계 축
테마/유저/액션 전달     -> Context
자주 바뀌는 공유 서버값 -> external store + 좁은 subscription
엔티티 전환 시 초기화   -> key 경계
같은 위치에서 유지      -> state preserve
```

### 연결
이번 참고 인터뷰에서 비었던 지점은 "non-urgent = 메모이제이션"으로 받아들인 부분이었습니다. 핵심은 캐시보다 먼저, 1) 어떤 업데이트가 긴급한지 2) 어떤 subtree가 같은 상태를 계속 가져가야 하는지 를 분리해서 보는 것입니다.

다음 질문은 두 방향 중 하나로 이어가면 됩니다. 검색창 예제로 `useDeferredValue`/`startTransition` 배치를 볼지, 아니면 `key`/Context/store 구독 범위로 상태 경계를 설계해볼지 정해주세요.

---

## [14:08:47] 사용자

"non-blocking으로 처리" << 이말은 원래 state 업데이트는 blocking이라는건가요? / 동기,비동기랑도 관련있는 개념인가요?
"이전 값을 유지하고 뒤에서 새 값으로 다시 렌더를 시도" << 다시 시도하는 시점은 정해져있나요?
"상태 ~~~" << 마지막 문단은 설명 자체를 이해못했씁니다. 저 부분은 제가 어떤 부분이 약하다고 판단해서 설명해주신건가요?

---

## [14:09:05] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 1 | 경과: 6분
질문 3개가 모두 같은 축에 묶여 있습니다. 현재 Phase를 로그로 확인하고, `useTransition/useDeferredValue` 문서에서 `blocking`, 재시도 시점, 그리고 제가 약점으로 짚은 근거를 바로 대조하겠습니다.

---

## [14:09:48] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 1 | 경과: 7분
설명은 정리됐고, 인용할 줄 번호만 보강하겠습니다. `non-interruptible` 예시와 제가 약점으로 본 문장을 정확히 짚고 답변을 마무리하겠습니다.

---

## [14:10:00] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 2 | 경과: 8분
이 답변을 Phase 1 두 번째 Q&A로 기록하겠습니다. 이어서 같은 축으로 한 단계 더 파고들 수 있게 예시를 남겨두겠습니다.

---

## [14:11:03] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 2 | 경과: 8분
질문을 세 덩어리로 나누면 됩니다.

1. `non-blocking`이 무슨 뜻인가
- "원래 모든 state 업데이트가 완전히 blocking이다"까지는 아닙니다. 더 정확히는, 기본 업데이트는 urgent하게 취급되고, 느린 렌더가 엮이면 그 일을 먼저 끝내려 해서 입력 같은 사용자 상호작용이 버벅일 수 있습니다. React 문서도 `useDeferredValue`가 없으면 각 키 입력이 큰 리스트를 즉시, non-interruptible하게 다시 렌더한다고 설명합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L730)
- 반대로 Transition은 그 업데이트를 interruptible한 background work로 표시합니다. 그래서 탭 전환이나 큰 차트 갱신이 진행 중이어도, 사용자가 다른 클릭이나 타이핑을 하면 그 입력을 먼저 처리할 수 있습니다. 근거: [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L164), [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L60)
- 이건 JS의 동기/비동기와는 직교하는 개념입니다. `startTransition`에 넘긴 함수 자체는 즉시 실행되고, 그 안에서 동기적으로 발생한 `setState`들이 Transition으로 표시됩니다. 심지어 `await` 뒤의 `setState`는 다시 `startTransition`으로 감싸야 한다고 문서가 말합니다. 즉 "비동기 함수니까 transition"도 아니고, "동기 함수니까 blocking"도 아닙니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L44), [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L153)
- 입력 제어는 예외입니다. 문서도 input 값 업데이트는 synchronous해야 한다고 못 박습니다. 그래서 보통 `text`는 즉시 반영하고, 무거운 리스트/차트만 transition이나 deferred value로 늦춥니다. 근거: [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L1661)

2. "뒤에서 다시 렌더"는 언제 일어나나
- 고정된 지연 시간은 없습니다. React가 현재 렌더를 마치면 곧바로 background re-render를 시작합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L53), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L59)
- 다만 그 렌더는 언제든 끊길 수 있습니다. 사용자가 다시 타이핑하면 이전 background render는 버리고 최신 값으로 다시 시작합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L427), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L824)
- 만약 background render가 Suspense로 막히면, old UI를 계속 보여주다가 데이터가 준비되면 그때 다시 시도해서 commit합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L423)

```text
query 변경
  -> 1차 렌더: input은 새 값, 결과 리스트는 이전 deferred 값
  -> background 렌더 시작
      -> 완료되면 commit
      -> 새 입력 오면 중단 후 최신 값으로 재시작
      -> suspend면 old UI 유지 후 데이터 준비 뒤 재시도
```

3. 마지막 문단에서 제가 말하려던 것
- 네. 정확히 당신의 약점으로 보인 지점을 짚은 말이었습니다. 근거는 참고 인터뷰 피드백입니다. 거기서 Q1에 대해 "ownership, subscription scope, non-urgent update를 어떤 primitive로 옮길지까지는 못 내려갔다"고 적혀 있고, non-urgent 값을 `useMemo` 문제로 받아들였다고 되어 있습니다. 근거: [feedback.md](/Users/younghoonkim/dev/personal/@skills/some/interview/3/feedback.md#L20), [feedback.md](/Users/younghoonkim/dev/personal/@skills/some/interview/3/feedback.md#L35)
- 제가 말한 "어떤 업데이트가 긴급한지"는 이런 뜻입니다.
  - 검색창 텍스트: 긴급, 즉시 반영
  - 검색 결과 리스트: 늦게 따라와도 됨
  - 실시간 숫자판: 공유 데이터라면 store/구독 범위 설계 문제
- 제가 말한 "어떤 subtree가 같은 상태를 계속 가져가야 하는지"는 이런 뜻입니다.
  - 같은 사용자 탭 안의 draft input: 유지할지?
  - 다른 사용자로 전환한 채팅창: 초기화할지?
  - 초기화하려면 `key`나 위치를 바꿔서 state boundary를 명시할지?
- 즉 상태 경계는 단순히 "state를 어디 선언하나"가 아니라 아래 3개를 같이 정하는 문제입니다.
  - 누가 값을 소유하나
  - 누가 그 값을 구독하나
  - 같은 상태를 유지할지, 전환 시 리셋할지

한 줄로 줄이면 이렇습니다.
- `useMemo`는 계산 캐시 문제
- `useDeferredValue`/Transition은 렌더 우선순위 문제
- `key`/위치는 상태 보존-리셋 경계 문제

여기까지 이해되면 다음 질문은 둘 중 하나가 좋습니다.
- 검색창 + 느린 결과 리스트 예제로 `state`와 `deferredValue`를 분리해보기
- 사용자 전환 화면 예제로 `state preserve`와 `key reset` 경계 보기

---

## [14:15:17] 사용자

네 예시로 3개의 설명을 자세히 설명해주세요, 우선 1번부터 설명해주세요

---

## [14:15:33] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 2 | 경과: 12분
이번에는 1번만 좁혀서, 검색창 + 느린 리스트 예시로 `blocking`과 `non-blocking`이 실제로 뭐가 다른지 설명하겠습니다. 설명 후에 현재 이해를 확인할 수 있게 짧은 체크 질문도 붙이겠습니다.

---

## [14:15:51] AI

설명에 넣을 코드/라인 근거를 조금 더 좁히겠습니다. 느린 리스트 예시의 `memo` 조건까지 확인해서, 왜 input만 즉시 반영되고 리스트는 뒤로 밀리는지 정확히 묶겠습니다.

---

## [14:16:08] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 2 | 경과: 14분
1번 설명은 예시가 중요해서, 검색창 + 느린 결과 리스트 시나리오로 풀겠습니다. 답변 후 이 내용을 Phase 1 Q&A로 기록하겠습니다.

---

## [14:17:26] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 3 | 경과: 14분
1번은 `non-blocking`이 실제 화면에서 무슨 뜻인지부터 잡으면 됩니다.

### 비유
- 접수창 직원이 `input`입니다. 사용자가 친 글자를 즉시 받아 적어야 합니다.
- 뒤에서 종이 묶음을 정리하는 직원이 느린 `SlowList`입니다.
- 기본 업데이트에서는 접수창 직원이 글자 하나 받을 때마다 뒤 직원 정리까지 같이 끝내려 해서, 다음 손님 응대가 밀릴 수 있습니다.
- non-blocking 업데이트에서는 접수창 직원은 먼저 바로 응대하고, 뒤 정리는 잠깐 늦게 하거나 중간에 멈췄다가 다시 해도 됩니다.

### 예시 1. 아무것도 안 쓴 기본 상태
```tsx
function SearchPage() {
  const [text, setText] = useState('');

  return (
    <>
      <input value={text} onChange={e => setText(e.target.value)} />
      <SlowList text={text} />
    </>
  );
}
```

여기서 `SlowList`가 아주 무겁다고 가정하겠습니다.

사용자가 `a`, `b`, `c`를 빠르게 입력하면 실제로는 이렇게 됩니다.

```text
1. onChange 발생
2. setText('a')
3. React가 input + SlowList 전체를 바로 다시 렌더
4. SlowList가 무거워서 오래 걸림
5. 그동안 다음 입력 이벤트 처리가 밀릴 수 있음
```

이걸 제가 앞서 `blocking`에 가깝다고 말한 이유는, 사용자 입장에서 다음 상호작용이 이 무거운 렌더가 끝날 때까지 답답하게 느껴질 수 있기 때문입니다. React 공식 예시도 `useDeferredValue`가 없으면 각 키 입력이 큰 리스트를 즉시 `non-interruptible`하게 다시 렌더한다고 설명합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L730)

중요한 보정:
- 이것은 "모든 setState가 본질적으로 나쁘다"는 뜻은 아닙니다.
- 정확히는 무거운 렌더가 urgent 업데이트와 같은 타이밍에 붙어 있으면, 사용자 입력까지 같이 무겁게 느껴질 수 있다는 뜻입니다.

### 예시 2. `useDeferredValue`로 input과 리스트를 분리
```tsx
function SearchPage() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);

  return (
    <>
      <input value={text} onChange={e => setText(e.target.value)} />
      <SlowList text={deferredText} />
    </>
  );
}
```

그리고 이 최적화가 먹으려면 `SlowList`는 `memo`로 감싸져 있어야 합니다. 이유는 부모가 빨리 다시 렌더될 때 `deferredText`가 아직 예전 값이면 `SlowList`가 리렌더를 건너뛸 수 있어야 하기 때문입니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L807)

이제 흐름은 이렇게 바뀝니다.

```text
1. onChange 발생
2. setText('a')
3. input은 새 값 'a'로 빨리 렌더
4. deferredText는 아직 이전 값일 수 있음
5. SlowList는 이전 props라면 잠깐 건너뜀
6. React가 뒤에서 deferredText='a'로 background render 시도
7. 중간에 사용자가 또 입력하면 그 background render는 버리고 최신 값으로 다시 시작
```

즉 핵심은:
- `text`는 urgent
- `deferredText`를 쓰는 무거운 리스트는 non-urgent
- 그래서 입력은 안 막히고, 무거운 리스트만 조금 늦게 따라옵니다

React 문서 표현 그대로 보면, `useDeferredValue`는 old 값을 먼저 유지한 채 background re-render를 잡고, 그 렌더는 interruptible합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L423), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L427), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L824)

### 예시 3. `startTransition`은 "이 상태 업데이트 자체"를 뒤로 미루는 경우
`useDeferredValue`는 이미 있는 값을 늦게 따라오게 만드는 도구이고, `startTransition`은 내가 직접 호출하는 상태 업데이트를 transition으로 표시하는 도구입니다.

```tsx
function TabPage() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function selectTab(nextTab: string) {
    startTransition(() => {
      setTab(nextTab);
    });
  }
}
```

이 경우는 탭 전환 렌더가 무겁더라도, React가 그 작업을 non-blocking transition으로 취급합니다. 공식 문서도 transition은 느린 기기에서도 UI를 responsive하게 유지한다고 설명합니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L70), [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L164)

### 그래서 "원래 state 업데이트는 blocking이냐"에 대한 정확한 답
짧게 말하면:
- 기본 state 업데이트는 보통 urgent하게 처리된다
- urgent 업데이트와 무거운 렌더가 붙으면 사용자가 blocking처럼 느낀다
- Transition/deferred update는 그 무거운 부분을 interruptible하게 만들어 urgent 입력을 먼저 살린다

즉 `blocking/non-blocking`은 여기서 렌더 우선순위와 interrupt 가능성의 말입니다.

### 동기/비동기와의 관계
이건 별개 축입니다.

- `onChange` 핸들러는 여전히 동기적으로 실행됩니다.
- `startTransition(() => setState(...))` 안의 함수도 즉시 호출됩니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L44)
- 차이는 Promise냐 `await`냐가 아니라, 그 state update를 React가 urgent work로 볼지, interruptible background work로 볼지입니다.

그래서 이렇게 정리하면 가장 안전합니다.

```text
동기/비동기  = JavaScript 실행 흐름 문제
blocking/non-blocking = React 렌더 스케줄링 문제
```

물론 둘이 섞일 수는 있습니다. 예를 들어 `await fetch()` 뒤에 `setState`를 하면 비동기 코드 안에서 상태를 바꾸는 것이지만, 그 업데이트를 transition으로 취급하려면 다시 `startTransition`으로 감싸야 합니다. 이 점도 문서에 명시돼 있습니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L44)

### 시각화
기본 업데이트:
```text
type 'a'
 -> input 업데이트
 -> 무거운 리스트 즉시 렌더
 -> 메인 스레드 오래 점유
 -> 다음 타이핑 체감이 버벅임
```

non-urgent 분리 후:
```text
type 'a'
 -> input 즉시 업데이트
 -> 화면에 'a' 바로 보임
 -> 리스트는 old 값 유지
 -> 뒤에서 새 리스트 렌더 시작
 -> 새 입력 오면 중단 후 최신 값으로 재시작
```

### 핵심 한 줄
`non-blocking`은 "비동기로 나중에 실행"이 아니라, 사용자 입력을 막지 않도록 무거운 렌더를 양보 가능하게 만드는 것에 가깝습니다.

짧게 확인해보겠습니다. 검색창 예시에서 `text`는 즉시 업데이트하고 `SlowList`만 늦게 따라오게 해야 하는 이유를, "누가 urgent이고 누가 non-urgent인지" 기준으로 한 번 설명해보세요.

---

## [14:22:05] 사용자

사용자의 입력인 text는 urgent / SlowList는 non-urgent

---

## [14:22:20] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 3 | 경과: 18분
체크 질문에 대한 답은 맞는 방향입니다. 이 응답을 Phase 1 Q&A로 기록하고, 바로 한 단계 더 정교하게 다듬어드리겠습니다.

---

## [14:22:43] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 4 | 경과: 18분
그 구분이 핵심입니다.

조금 더 정확히 말하면:
- `text`는 controlled input의 실제 값이라서 urgent입니다. 사용자가 키를 누르면 input에 바로 보여야 하고, React 문서도 input 업데이트는 synchronous해야 한다고 설명합니다. 근거: [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L1661)
- `SlowList`는 `text`를 바탕으로 그리는 무거운 파생 UI라서 non-urgent입니다. 최신 글자를 한 글자도 빠짐없이 즉시 따라올 필요는 없고, old 결과를 잠깐 보여주다가 뒤에서 최신 값으로 따라와도 UX가 유지됩니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L423), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L824)

문장으로 완성하면 이렇습니다.

```text
사용자 입력 자체(`text`)는 urgent라서 즉시 반영해야 하고,
그 입력을 바탕으로 계산/렌더되는 무거운 결과 리스트(`SlowList`)는 non-urgent라서
잠깐 늦게 따라와도 된다.
```

여기서 한 단계 더 나가면 기준은 "무겁다/안 무겁다" 하나만이 아닙니다.

```text
1. 사용자가 지금 즉시 봐야 하나?
2. 늦게 보여줘도 의미가 유지되나?
3. 중간 렌더를 버리고 최신 값만 보여줘도 되나?
```

`text`는 1번이 예라서 urgent입니다.  
`SlowList`는 2번, 3번이 예라서 non-urgent입니다.

반대로 같은 리스트라도 urgent가 될 수 있는 경우가 있습니다.
- 화살표 키로 움직이는 autocomplete active option
- 스크린리더가 바로 읽어야 하는 포커스/선택 상태
- 입력과 1:1로 붙어 즉시 피드백을 줘야 하는 검증 메시지

즉 리스트라서 non-urgent가 아니라, 그 리스트가 맡는 역할이 늦어져도 되는 성격이라 non-urgent인 것입니다.

다음으로 넘어가면 2번 설명, 즉 `useDeferredValue`가 old 값을 유지한 채 언제 background render를 다시 시작하고 버리는지 예시로 설명하겠습니다.

---

## [14:25:12] 사용자

네 예시보단 시각화가 필요합니다

---

## [14:25:24] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 4 | 경과: 19분
예시 대신 시각화 중심으로 다시 풀겠습니다. 이번 답변은 1번 개념을 타임라인과 2축 그림으로만 정리하고, 그대로 Q&A 로그에 남기겠습니다.

---

## [14:26:31] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 5 | 경과: 19분
좋습니다. 1번은 그림 3개로 보면 됩니다.

### 그림 1. 두 축은 다릅니다
```text
세로축 = JS 실행 방식
- sync: 지금 바로 함수 실행
- async: await 뒤에 나중에 이어짐

가로축 = React 업데이트 성격
- urgent: input처럼 바로 화면 반영
- non-urgent: 늦게 따라와도 되는 렌더
```

```text
                     React urgent                     React non-urgent
JS sync      onChange -> setText               startTransition(() => setTab(...))
JS async     await 후 setState                 await 후 startTransition(() => setState(...))
```

핵심은 이겁니다.

```text
sync / async        = 언제 JS 코드가 이어서 실행되나
urgent / non-urgent = 그 state update를 React가 어떤 우선순위로 렌더하나
```

즉 `blocking/non-blocking`은 보통 오른쪽 축, 즉 React의 렌더 스케줄링 이야기입니다.

### 그림 2. 기본 업데이트: 입력과 무거운 리스트가 같은 줄에 묶여 있음
```text
사용자          React
---------------------------------------------------------------
type a   ->   setText('a')
             -> input 렌더
             -> SlowList 렌더 (무거움)
             -> 이 구간이 길면 다음 입력 체감이 답답해짐

type b   ->   다시 input + SlowList 전체 렌더
```

더 압축하면:

```text
Urgent lane 하나만 있음

[type a] -> [input + SlowList 큰 렌더] -> [type b] -> [input + SlowList 큰 렌더]
```

여기서 말한 `blocking`은

```text
"무거운 렌더가 urgent 입력과 같은 줄에 붙어 있어서,
사용자 입장에서는 다음 입력이 막히는 것처럼 느껴진다"
```

라는 뜻입니다.

### 그림 3. non-blocking 분리: input은 앞줄, SlowList는 뒷줄
`useDeferredValue`나 `startTransition`을 쓰면 그림이 이렇게 바뀝니다.

```text
Urgent lane
text a  ------------> text b ------------> text c
(즉시 반영)            (즉시 반영)            (즉시 반영)

Deferred lane
list a 렌더 ----X
                 list b 렌더 ----X
                                   list c 렌더 ----> commit
```

이 그림에서 `X`는 중단입니다.

뜻은 이렇습니다.

```text
type a
 -> input 값 a는 바로 화면에 보임
 -> 리스트는 뒤에서 a 기준으로 렌더 시작

type b가 오면
 -> a 기준 리스트 렌더는 중단
 -> input 값 b를 먼저 바로 보여줌
 -> 리스트는 b 기준으로 다시 시작
```

즉 non-blocking은

```text
"일을 안 한다"가 아니라,
"무거운 렌더를 사용자 입력보다 뒤로 보내고,
중간에 끊고 최신 값으로 갈 수 있게 만든다"
```

입니다.

### 한 장으로 합치면
```text
기본 상태
[input 업데이트 + 무거운 렌더]가 한 덩어리
-> 타이핑 체감이 버벅일 수 있음

non-blocking 분리 후
[input 업데이트] 먼저
[무거운 렌더] 나중, 중단 가능
-> 타이핑은 부드럽고, 느린 UI만 뒤늦게 따라옴
```

### 딱 한 줄 결론
`non-blocking`은 "비동기 실행"이 아니라, React가 무거운 렌더를 urgent 입력과 분리해서 interruptible하게 처리하는 것입니다.

근거: [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L164), [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L1661), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L730), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L824)

원하면 2번도 같은 방식으로, `old value 유지 -> background render -> suspend면 재시도`를 타임라인 그림으로 설명하겠습니다.

---

## [14:28:16] 사용자

useDeferredValue는 이해했습니다: 원래 state를 deferred하게 만들어 이 값에 의해서 렌더되는 것의 우선순위를 낮춘다 << 맞나요?

---

## [14:28:36] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 5 | 경과: 21분
지금 문장은 거의 맞습니다. 다만 `state 자체의 우선순위`와 `그 값을 소비하는 렌더의 우선순위`를 섞기 쉬워서, 표현을 조금 정밀하게 다듬어 답하겠습니다.

---

## [14:28:39] AI

답변을 세밀하게 적고 그대로 세션 로그에 남기겠습니다. `useDeferredValue`의 핵심 오해 포인트는 "state를 늦춘다"보다 "그 state를 읽는 일부 UI를 늦게 따라오게 한다" 쪽입니다.

---

## [14:29:16] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 6 | 경과: 21분
대체로 맞습니다. 다만 한 군데만 더 정확히 잡아야 합니다.

### 더 정확한 표현
```text
useDeferredValue는 원래 state 자체를 바꾸는 것이라기보다,
그 state의 "늦게 따라오는 값"을 하나 만들어서,
그 deferred value를 읽는 UI 일부를 background에서 다시 렌더하게 만든다.
```

즉 당신 문장의 핵심은 맞고,  
`원래 state를 deferred하게 만든다` 보다는  
`원래 state로부터 deferred value를 만들어, 그 값을 쓰는 렌더를 늦춘다`가 더 정확합니다.

### 왜 이렇게 정정하냐
`useDeferredValue`의 원본 state는 그대로 urgent하게 업데이트될 수 있습니다.  
문서도 업데이트 시에:
- 현재 렌더에서는 old deferred value를 유지하고
- 그 다음 background re-render를 새 값으로 시도한다고 설명합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L45), [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L53)

그래서 구조는 이렇게 보는 게 맞습니다.

```text
원본 state:        text = "abc"        <- urgent, 즉시 바뀔 수 있음
지연된 값:         deferredText = "ab" <- 잠깐 뒤처질 수 있음
느린 리스트 UI:    deferredText를 보고 렌더
```

### 시각화
```text
source state
text: a ------> ab ------> abc     (즉시 갱신)

consumed deferred value
deferredText: a ---> a ---> ab ---> abc
               ^     ^
               |     └- 새 입력이 오면 이전 background render 버리고 다시 시작
               └- old value를 잠깐 유지
```

### 그래서 우선순위가 정확히 어디서 낮아지나
`text` 자체의 setter가 magically 느려지는 게 아닙니다.  
낮아지는 쪽은 보통 `deferredText`를 읽는 렌더 작업입니다.

예를 들면:
- `<input value={text} />` 는 urgent
- `<SlowList text={deferredText} />` 는 non-urgent

즉 같은 원본 state에서 출발해도,  
어떤 값으로 어떤 subtree를 렌더하느냐에 따라 urgent / non-urgent가 갈립니다.

### 중요한 보정 2개
1. `useDeferredValue`는 네트워크 요청 자체를 늦추지 않습니다.  
문서도 defer되는 것은 결과 표시이지 request 자체가 아니라고 설명합니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L57)

2. 이미 update가 Transition 안에 있으면 `useDeferredValue`는 새 값을 그대로 반환하고 별도 deferred render를 만들지 않습니다. 근거: [useDeferredValue.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useDeferredValue.md#L49)

### 한 줄 정리
```text
맞다.
다만 "state 자체를 deferred하게 만든다"보다
"그 state를 소비하는 일부 UI를 deferred value로 늦게 따라오게 만든다"가 정확하다.
```

원하면 다음 답에서는 이걸 `startTransition`과 나란히 놓고,
- `useDeferredValue`: 값을 늦게 소비하게 만드는 도구
- `startTransition`: 상태 업데이트 자체를 transition으로 표시하는 도구  
이 차이를 한 장 그림으로 정리해드리겠습니다.

---

## [14:30:47] 사용자

그러면 useDeferredValue는 업데이트가 늦게되는 값을 하나 만들어 그것을 소비하게 하여 우선순위를 낮춘느데 사용되는 훅이고,
startTransition은 해당 함수의 콜백으로 들어온 로직 자체의 우선순위를 낮추는건가요? 그 콜백안에는 상태 업데이트등도 포함될수있고..

---

## [14:30:59] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 6 | 경과: 26분
지금 질문은 `useDeferredValue`와 `startTransition`의 경계를 정확히 자르는 단계입니다. 한 군데만 보정하면 거의 맞는 설명이라, 그 차이를 중심으로 답하고 바로 로그에 남기겠습니다.

---

## [14:31:42] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 7 | 경과: 26분
거의 맞습니다. 다만 `startTransition` 쪽은 한 군데만 보정하면 됩니다.

### 1. `useDeferredValue`
이 표현은 거의 맞습니다.

```text
원본 값에서 lagging value 하나를 만들고,
그 deferred value를 읽는 UI를 늦게 따라오게 만든다.
```

즉,
- 원본 state는 그대로 urgent하게 바뀔 수 있고
- `deferredValue`를 소비하는 subtree가 non-urgent하게 따라옵니다.

그래서

```tsx
const [text, setText] = useState('');
const deferredText = useDeferredValue(text);
```

에서는:
- `text` 자체가 느려지는 게 아니라
- `deferredText`를 읽는 리스트/차트 쪽 렌더가 늦게 따라옵니다.

### 2. `startTransition`
여기는 표현을 이렇게 바꾸는 게 정확합니다.

```text
콜백 로직 전체의 우선순위를 낮춘다
```

보다는

```text
그 콜백 실행 중에 스케줄된 state update들을
Transition으로 표시한다
```

가 맞습니다.

왜냐하면:
- `startTransition`에 넘긴 함수 자체는 즉시 실행됩니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L44)
- React가 transition으로 취급하는 것은 그 함수 호출 동안 동기적으로 발생한 state update들입니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L44)

즉 이건 맞습니다.

```tsx
startTransition(() => {
  setTab(nextTab);
});
```

하지만 이런 식으로 이해하면 틀립니다.

```tsx
startTransition(() => {
  expensivePureJsLoop();
  setTab(nextTab);
});
```

이때 `expensivePureJsLoop()` 자체가 magically non-blocking이 되는 건 아닙니다.  
그 무거운 JS 계산은 여전히 지금 즉시 메인 스레드에서 실행됩니다.  
Transition이 되는 것은 주로 그 뒤에 이어지는 React state update와 그에 따른 렌더 work입니다.

### 시각화
#### `useDeferredValue`
```text
source state
text:        a ------> ab ------> abc

lagging value
deferredText a ---> a ---> ab ---> abc

consumer
SlowList     a ---> a ---> ab ---> abc
```

#### `startTransition`
```text
call startTransition(action)
        |
        +-> action 함수는 지금 즉시 실행
              |
              +-> setState(...) 발견
                    |
                    +-> 이 업데이트를 Transition으로 마킹
                          |
                          +-> 이 업데이트가 만드는 렌더를 non-urgent하게 처리
```

### 그래서 둘의 차이를 한 줄씩 자르면
- `useDeferredValue`: 값 하나를 늦게 따라오게 만들어, 그 값을 읽는 UI를 non-urgent하게 만든다.
- `startTransition`: 특정 state update를 Transition으로 마킹해서, 그 업데이트가 만드는 렌더를 non-urgent하게 만든다.

### 당신 문장을 가장 정확하게 다듬으면
```text
useDeferredValue는 원본 값의 deferred version을 만들어,
그 값을 소비하는 렌더를 늦게 따라오게 하는 훅이다.

startTransition은 콜백 로직 전체를 느리게 만드는 게 아니라,
그 콜백 안에서 발생한 state update를 Transition으로 표시하는 API다.
```

### 추가로 꼭 기억할 함정
1. `startTransition` 안의 모든 코드가 non-blocking이 되는 것은 아닙니다.
2. `await` 뒤의 `setState`는 다시 `startTransition`으로 감싸야 현재 문서 기준 transition으로 처리됩니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L58)
3. text input 제어 값은 transition으로 다루면 안 됩니다. input 값 업데이트는 synchronous해야 합니다. 근거: [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L1661)

짧게 확인하면,  
`startTransition(() => { expensiveCalc(); setTab('posts'); })`  
이 코드에서 transition으로 취급되는 것은 정확히 무엇인지 한 번 말해보세요.

---

## [14:33:19] 사용자

setTab('posts')

---

그러면 여러 상태 업데이트 함수가 있으면 그 함수들 전체가 transition으로 취급되나요?

---

## [14:33:34] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 7 | 경과: 31분
질문은 `startTransition`의 적용 범위를 확인하는 것입니다. 동기적으로 묶이는 업데이트와, 전이되지 않는 케이스를 같이 분리해서 답한 뒤 Phase 1 로그에 남기겠습니다.

---

## [14:34:18] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 31분
네. 같은 `startTransition` 콜백이 실행되는 동안 동기적으로 스케줄된 React state update들은 전부 Transition으로 취급됩니다.

### 시각화
```text
startTransition(() => {
  setTab('posts')
  setFilter('all')
  setPage(1)
})

= 이 3개 업데이트 모두 Transition 마킹
= 이 업데이트들이 만드는 렌더도 non-urgent하게 처리
```

즉 기준은 이것입니다.

```text
같은 콜백 안에 있나?          X
같은 호출 흐름 안에서
동기적으로 setState 되었나?   O
```

### 맞는 그림
```tsx
startTransition(() => {
  setTab('posts');
  setFilter('all');
  setPage(1);
});
```

이 경우 `setTab`, `setFilter`, `setPage` 모두 Transition입니다.

### 함수 호출로 감싸져 있어도 됨
```tsx
startTransition(() => {
  updateView();
});

function updateView() {
  setTab('posts');
  setFilter('all');
}
```

이것도 `updateView()`가 지금 즉시 실행되면서 그 안에서 동기적으로 `setState`를 호출하므로 둘 다 Transition입니다.

### 아닌 경우 1. `await` 뒤
```tsx
startTransition(async () => {
  setTab('posts');      // Transition
  await fetchSomething();
  setFilter('all');     // 자동으로는 Transition 아님
});
```

이때 `await` 뒤의 `setFilter`는 현재 문서 기준으로 다시 `startTransition`으로 감싸야 Transition으로 취급됩니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L58)

### 아닌 경우 2. `setTimeout` / 나중 실행
```tsx
startTransition(() => {
  setTab('posts');

  setTimeout(() => {
    setFilter('all');   // Transition 아님
  }, 0);
});
```

이 `setFilter`는 콜백이 끝난 뒤 나중에 실행되므로 같은 Transition에 포함되지 않습니다. 문서도 `setTimeout` 안의 업데이트는 마킹되지 않는다고 설명합니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L56)

### 그림으로 자르면
```text
Case A: 같은 동기 흐름
startTransition
  -> setA
  -> setB
  -> setC
= A, B, C 모두 Transition

Case B: 흐름이 끊김
startTransition
  -> setA
  -> await
  -> setB
= A만 Transition, B는 다시 감싸야 함

Case C: 나중 실행
startTransition
  -> setA
  -> setTimeout(...setB)
= A만 Transition
```

### 추가 보정
- `startTransition`은 React state update를 대상으로 생각하면 됩니다. 일반 JS 로직 전체가 transition이 되는 것은 아닙니다.
- text input 제어 state는 Transition으로 다루면 안 됩니다. 입력값 업데이트는 synchronous해야 합니다. 근거: [useTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/useTransition.md#L1661)
- 문서상 여러 ongoing Transition은 현재 함께 배치될 수 있습니다. 근거: [startTransition.md](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react.dev/src/content/reference/react/startTransition.md#L64)

### 한 줄 결론
```text
같은 startTransition의 동기 실행 구간 안에서 발생한 setState들은 전부 Transition이다.
하지만 await 뒤나 timeout 뒤처럼 실행 시점이 끊기면 자동으로 이어지지 않는다.
```

원하면 다음 답에서 이걸 `useDeferredValue`와 나란히 놓고,
- 여러 `setState`를 한 번에 transition으로 묶는 경우
- 값 하나를 defer해서 소비 렌더만 늦추는 경우  
를 비교표로 정리하겠습니다.

---

## [14:34:25] 사용자

>>다음

---

## [14:34:40] AI

> [ROUTINE] Phase 1/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 32분
Phase 1을 닫고 Phase 2로 넘어가겠습니다. 먼저 Phase 1 요약을 로그에 남기고, 현재 상태를 다시 읽은 뒤 `useDeferredValue`와 `startTransition`의 내부 구현을 추적하겠습니다.

---

## [14:34:57] AI

> [ROUTINE] Phase 2/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 33분
Phase 2에서는 이제 개념 설명이 아니라 구현 의도를 보겠습니다. `useDeferredValue`가 실제로 어디서 background task를 만들고, `startTransition`이 어디서 update를 Transition으로 표시하는지 소스 레벨로 추적하겠습니다.

---

## [14:35:07] AI

핵심 함수 위치는 찾았습니다. `useDeferredValue`의 mount/update 경로와 `useTransition`의 pending 상태 처리 부분을 조금 더 열어서, 왜 이렇게 설계했는지까지 설명 가능한 수준으로 묶겠습니다.

---

## [14:35:13] AI

deferred lane를 실제로 어떻게 붙이는지 마지막 구간이 더 필요합니다. 그 줄들만 추가로 읽고 Phase 2 설명과 첫 문제를 정리하겠습니다.

---

## [14:35:16] AI

`startTransition` 내부에서 pending 상태를 어떻게 다루는지도 한 번에 보겠습니다. 이 부분까지 묶이면 Phase 2 질문을 설계할 수 있습니다.

---

## [14:36:16] AI

> [ROUTINE] Phase 2/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 35분
Phase 2에서는 구현을 따라가겠습니다. 핵심은 `useDeferredValue`와 `startTransition`이 내부적으로 완전히 다른 방식으로 동작한다는 점입니다.

### 비유
- `useDeferredValue`는 원본 뉴스 속보는 바로 내보내고, 하단 분석 자막만 한 박자 늦게 갱신하는 방식입니다.
- `startTransition`은 "지금부터 이 state update들은 급한 뉴스가 아니라 배경 작업"이라고 스케줄러에 표식 붙이는 방식입니다.

### 코드 추적 1. `useDeferredValue`
핵심 구현은 [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3028) 에 있습니다.

```text
value가 prevValue와 같음
-> 바로 반환

value가 달라짐 + 지금 렌더가 urgent
-> deferred lane 예약
-> 이번 렌더에서는 prevValue 유지
-> 나중 deferred render에서 새 value 반영

value가 달라짐 + 지금 렌더가 이미 non-urgent
-> 새 value 바로 사용
```

소스 그대로 보면:
- 값 비교 후 같으면 bailout: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3034)
- urgent render면 `requestDeferredLane()` 호출: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3054)
- 그 뒤 `markSkippedUpdateLanes(deferredLane)` 하고 `prevValue` 반환: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3060)
- non-urgent render에서는 `hook.memoizedState = value`로 최신값 채택: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3071)

시각화하면:

```text
urgent render
text:          abc
deferredText:  ab   <- 이번엔 이전 값 유지
                 \
                  \ requestDeferredLane()
                   \
deferred render -> abc
```

즉 `useDeferredValue`는 "값을 늦게 소비하게 만드는 훅"이지, transition scope를 여는 API가 아닙니다.

### 코드 추적 2. deferred render는 누가 다시 잡나
`beginWork` 쪽에서 이 deferred 작업을 다시 살립니다.

- primary tree가 defer를 만들었으면 deferred lane을 다시 merge: [ReactFiberBeginWork.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberBeginWork.js#L2334)
- Suspense 경계도 `DidDefer` 플래그를 확인: [ReactFiberBeginWork.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberBeginWork.js#L2371)

즉 구조는:

```text
useDeferredValue
 -> "지금은 prevValue로 가자"
 -> deferred lane 예약
 -> beginWork가 그 lane으로 나중 렌더 재시도
```

### 코드 추적 3. `startTransition`
여기는 두 층이 있습니다.

1. 공개 API `React.startTransition`
- transition scope를 열고 `ReactSharedInternals.T`에 현재 transition을 넣음: [ReactStartTransition.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react/src/ReactStartTransition.js#L45)
- `scope()`는 즉시 실행: [ReactStartTransition.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react/src/ReactStartTransition.js#L75)
- 끝나면 이전 transition 복원: [ReactStartTransition.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react/src/ReactStartTransition.js#L95)

2. `useTransition` 내부 helper
- `mountTransition()`이 `start` 함수를 fiber/queue에 bind: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3397)
- 내부 `startTransition(...)`은 pending state를 optimistic하게 넣고: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3127)
- callback을 실행한 뒤: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3136)
- async면 thenable을 queue에 넣어 `isPending`을 유지: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3143)
- `updateTransition()`은 boolean 또는 thenable을 읽어 `isPending`을 계산: [ReactFiberHooks.js](/Users/younghoonkim/dev/personal/@skills/study-all/ref/react/packages/react-reconciler/src/ReactFiberHooks.js#L3415)

시각화:

```text
useTransition()
 -> [isPending, start] 반환

start(...)
 -> pendingState 먼저 넣음
 -> callback 실행
 -> callback 안의 setState들이 Transition으로 마킹
 -> async면 thenable로 pending 유지
```

### 왜 이렇게 설계했나
- `useDeferredValue`는 "원본 state는 urgent하게 두고, 소비자 subtree만 격리"하려는 설계입니다.
- `startTransition`은 "특정 state update들을 transition scope에 묶고, 필요하면 pending 상태까지 추적"하려는 설계입니다.
- 추론: 둘을 분리한 이유는 "값 지연"과 "업데이트 마킹"이 다른 문제이기 때문입니다. 하나로 합치면 input 같은 urgent state와 느린 consumer subtree를 섬세하게 분리하기 어렵습니다.

### 대안과 미채택 이유
- 대안: 새 value를 `useDeferredValue`에서 즉시 반영
- 미채택 이유: 그러면 urgent render에서도 느린 consumer subtree가 같이 붙어 다시 버벅입니다.

- 대안: `startTransition`이 JS 콜백 전체를 비동기화
- 미채택 이유: React가 제어할 수 있는 것은 state update와 렌더 스케줄링이지, 임의의 무거운 JS 계산 자체는 아닙니다.

### Phase 2 문제 1
코드 기준으로 답해보세요.

`useDeferredValue`는 왜 urgent render에서 새 `value`를 바로 `hook.memoizedState`에 넣지 않고, `prevValue`를 반환한 뒤 `requestDeferredLane()`만 예약할까요?  
답변에는 1. 입력 반응성 2. 느린 subtree 격리 3. 바로 새 값을 쓰는 대안이 왜 불리한지 를 포함해보세요.

---

## [14:36:45] 사용자

>>정리

---

## [14:37:25] AI

> [ROUTINE] Phase 2/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 36분
정리 신호를 받았으니 Phase 2를 닫고 마무리 절차로 넘어가겠습니다. 종료 기록에 PASS/FAIL이 필요해서, 먼저 현재 Phase 요약을 남기고 체크포인트용 최소 질문만 드리겠습니다.

---

## [14:37:51] AI

> [ROUTINE] Phase 4/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 35분
정리로 넘어가기 전에 결과 기록상 자기 평가만 필요합니다.

오늘 정리:
- `useDeferredValue`는 원본 state를 늦추는 게 아니라, deferred value를 만들어 그 consumer subtree를 늦게 따라오게 합니다.
- `startTransition`은 콜백 전체를 느리게 만드는 게 아니라, 그 동기 실행 구간 안의 state update들을 Transition으로 마킹합니다.
- `blocking/non-blocking`은 JS sync/async보다 React 렌더 스케줄링과 interruptibility에 가깝습니다.

한 줄로 답해주세요.
- `PASS`: 아래 개념들로 review 등록해도 되는지 같이 적어주세요.
  `deferred value와 consumer subtree`, `startTransition의 동기 구간 setState 마킹`, `blocking/non-blocking vs sync/async`
- `FAIL`: 어디서 막혔는지 한 줄로 적어주세요.  
  예: `FAIL - useDeferredValue와 startTransition의 경계는 알겠는데 deferred lane 재시도 흐름은 아직 흐립니다`

---

## [14:37:56] AI

> [ROUTINE] Phase 4/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 35분
정리로 넘어가기 전에 결과 기록상 자기 평가만 필요합니다.

오늘 정리:
- `useDeferredValue`는 원본 state를 늦추는 게 아니라, deferred value를 만들어 그 consumer subtree를 늦게 따라오게 합니다.
- `startTransition`은 콜백 전체를 느리게 만드는 게 아니라, 그 동기 실행 구간 안의 state update들을 Transition으로 마킹합니다.
- `blocking/non-blocking`은 JS sync/async보다 React 렌더 스케줄링과 interruptibility에 가깝습니다.

한 줄로 답해주세요.
- `PASS`: 아래 개념들로 review 등록해도 되는지 같이 적어주세요.
  `deferred value와 consumer subtree`, `startTransition의 동기 구간 setState 마킹`, `blocking/non-blocking vs sync/async`
- `FAIL`: 어디서 막혔는지 한 줄로 적어주세요.  
  예: `FAIL - useDeferredValue와 startTransition의 경계는 알겠는데 deferred lane 재시도 흐름은 아직 흐립니다`

---

## [14:37:57] 사용자

PASS

---

## [14:38:38] AI

> [ROUTINE] Phase 5/5 | non-urgent UI 업데이트와 상태 경계 설정 | Q&A: 8 | 경과: 36분
PASS로 기록하고 review 등록과 상태 파일 정리를 진행하겠습니다. 체크포인트 결과를 로그에 남기고, `state.md`/`history.md`를 갱신한 뒤 transcript 추출과 세션 로그 정리를 마무리하겠습니다.

---

## [14:38:43] AI

review 메타가 이미 있는지 먼저 확인하겠습니다. 새 토픽이면 바로 저장하고, 기존 메타가 있으면 덮어쓰지 않고 합쳐서 기록하겠습니다.

---

## [14:39:01] AI

체크포인트는 `>>정리`로 축약되어 진행됐기 때문에 self-eval 중심으로 기록합니다. 그 뒤 review 개념 3개를 `react` 카테고리에 등록하겠습니다.

---

## [14:39:05] AI

체크포인트 결과를 반영하는 임시 진행 마커를 `state.md`에 먼저 기록합니다. 그 다음 최종 세션 합산값으로 바로 덮어쓰면서 `history.md`도 같이 정리하겠습니다.

---

## [14:39:13] AI

최종 정리 값으로 `state.md`를 확정하고, 오늘 세션 한 줄을 `history.md`에 추가합니다. streak는 같은 날짜의 추가 세션이라 1로 유지하고 총 세션만 증가시킵니다.

---

## [14:39:29] AI

transcript를 아카이브하고 세션 로그를 완료 처리한 뒤 리셋하겠습니다. 마지막으로 상태 파일을 다시 읽어 결과를 확인하겠습니다.

---
