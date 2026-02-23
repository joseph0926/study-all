# React-Core-API Review QnA

---

## 2026-02-23 (via /review)

### $$typeof Symbol 보안 [first_pass → L2]
**Q**: React Element의 $$typeof에 Symbol.for('react.transitional.element')를 사용하는 보안적 이유는? 공격자가 DB에 악의적 데이터를 저장하고 JSON으로 전달할 때, Symbol이 어떻게 방어 역할을 하는지 설명해주세요.
**A**: JSON으로 전달한다라는 말은 직렬화하여 전달한다는 말과 같습니다. 하지만 Symbol의 경우 직렬화시 단순 string이 되어 내부 코드에서 역직렬화하면 Symbol이 아니므로 가드됩니다
**Score**: first_pass

### H 슬롯 Dispatcher 생명주기 [first_pass → L2]
**Q**: ReactSharedInternals의 H 슬롯에는 렌더링 단계에 따라 서로 다른 Dispatcher가 주입됩니다. Mount/Update/완료 후 각각 어떤 Dispatcher가 들어가며, 렌더링 완료 후의 Dispatcher는 왜 그런 설계인가요?
**A**: 앱 시작: H = null → 렌더 시작: H = HooksDispatcherOnMount → 렌더 완료: H = ContextOnlyDispatcher → 리렌더 시작: H = HooksDispatcherOnUpdate → 리렌더 종료: H = ContextOnlyDispatcher / ContextOnlyDispatcher는 더이상 훅을 호출할수없다(내부적으로 에러를 던짐)를 명시함
**Score**: first_pass

### memo 객체 반환 이유 [retry_pass → L1]
**Q**: memo()가 래핑된 함수가 아닌 { $$typeof, type, compare } 객체를 반환하는 이유는? 함수를 반환하면 안 되는 기술적 근거를 설명해주세요.
**A**: 1. typeof === 'function' 분기에 걸리지 않고 특별하게 처리하기 위해 / 2. 함수 비교보다 객체 비교가 맞는데, 정확한 이유가 기억이 안납니다 → (힌트 후) memo가 객체인 이유는 함수가 아니어야 하기 때문, 분기에 안걸려서 특별 검사 로직으로 빠질 수 있으므로
**Hint**: 함수 비교 vs 객체 비교 문제가 아니라, Reconciler가 접근해야 하는 정보가 핵심입니다. memo가 이전 props와 같으면 스킵하려면 Reconciler가 무엇에 접근해야 할까요?
**Score**: retry_pass

### 서버 Hook 제한 이유 [first_pass → L2]
**Q**: 서버에서 허용되는 Hook은 5개(use, useId, useCallback, useMemo, useDebugValue)뿐입니다. useState, useEffect, useRef 등이 빠지는 이유를 서버 렌더링의 실행 모델 관점에서 설명해주세요.
**A**: 서버에서 사용 불가능이기때문입니다. useEffect로 예시를 들면, 서버에서는 리렌더링이라는 개념 자체가 없기때문에 useEffect 훅 자체가 불가능합니다 → 서버는 한번 렌더링된것을 전달해주고 끝인데, useEffect는 리렌더링시 발생하는 부수효과 컨트롤 훅이기때문입니다
**Score**: first_pass

### Children.map 평탄화 메커니즘 [retry_pass → L1]
**Q**: React.Children.map()에서 콜백의 반환값이 배열일 때, 어떻게 항상 1차원 배열을 보장하나요? 재귀가 무한히 반복되지 않는 이유도 함께 설명해주세요.
**A**: mapIntoArray 함수의 5번째 인자인 c => c는 입력을 그대로 반환하므로 → (힌트 후) c => c는 더 이상 변환하지 말고 펼치기만 해라는 의미, 사용자가 배열을 반환하라고 한 지시는 1단계만 수행되고 그 이후 재귀 단계에서는 모두 펼치기만 한다
**Hint**: c => c로 재귀했을 때, 각 원소가 리프(Element, string 등)면 어떻게 되고, 그래서 왜 재귀가 반드시 끝나는지?
**Score**: retry_pass
