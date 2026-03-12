# React-상태분류-의사결정트리

> 최초 질문: 리액트로 구현된 커뮤니티 앱에서 본인의 글의 제목을 수정하는 서버 요청을 보내어 제목을 수정하는 작업을할때 어떻게 상태관리를 할지에 대해서 논의해봅시다 (요청 보내는것부터 응답 받아 상태관리하는것까지)
> 일시: 2026-03-12

---

## Q1. 리액트 커뮤니티 앱에서 글 제목 수정 시 어떻게 상태관리를 할 것인가?

### 비유: 식당 주문 수정

| 비유 요소 | 실제 개념 |
|-----------|-----------|
| 식당 주문서 (주방에 보관) | 서버 DB의 게시글 데이터 |
| 테이블 위 주문 현황판 (내가 보는 것) | 클라이언트 캐시/UI 상태 |
| "제목 바꿔주세요" 요청 | HTTP PATCH/PUT 요청 (mutation) |
| 점원이 즉시 "바꿨어요" → 주방 확인은 나중에 | **Optimistic Update** |
| 주방에서 확인 후에야 "바꿨습니다" | **Pessimistic Update** (서버 응답 대기) |
| 주방 확인 실패 → 원래 주문으로 되돌림 | **Rollback** (onError) |
| 전체 주문 현황판 새로고침 | **Cache Invalidation** (invalidateQueries) |

핵심: **"내 테이블 현황판"(클라이언트 캐시)과 "주방 주문서"(서버 DB)는 항상 동기화가 필요**하며, 이 동기화를 어떤 타이밍에 하느냐가 상태관리 전략의 핵심이다.

### 코드/텍스트 설명

#### 전략 1: Pessimistic Update (서버 응답 대기 후 반영)

가장 안전한 기본 전략. 서버가 성공 응답을 줘야만 UI를 갱신한다.

```tsx
const updateTitle = useMutation({
  mutationFn: (newTitle: string) =>
    fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: newTitle }),
    }).then(res => res.json()),

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['posts', postId] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});

// UI 상태: updateTitle.isPending / isError / isSuccess 로 제어
```

비유 매칭: 주방 확인이 끝난 후에야 테이블 현황판을 갱신하는 것.

(근거: [TanStack Query - Invalidations from Mutations](https://tanstack.com/query/v4/docs/react/guides/invalidations-from-mutations))

#### 전략 2: Optimistic Update (즉시 반영 + 실패 시 롤백)

```tsx
const updateTitle = useMutation({
  mutationFn: (newTitle: string) =>
    fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: newTitle }),
    }).then(res => res.json()),

  onMutate: async (newTitle) => {
    // 1. 진행 중인 refetch 취소 (덮어쓰기 방지)
    await queryClient.cancelQueries({ queryKey: ['posts', postId] });
    // 2. 이전 값 스냅샷 (롤백용)
    const previousPost = queryClient.getQueryData(['posts', postId]);
    // 3. 캐시를 낙관적으로 갱신
    queryClient.setQueryData(['posts', postId], (old: Post) => ({
      ...old,
      title: newTitle,
    }));
    // 4. 롤백 컨텍스트 반환
    return { previousPost };
  },

  onError: (_err, _newTitle, context) => {
    // 실패 → 스냅샷으로 롤백
    queryClient.setQueryData(['posts', postId], context?.previousPost);
  },

  onSettled: () => {
    // 성공이든 실패든 → 서버 데이터로 동기화
    queryClient.invalidateQueries({ queryKey: ['posts', postId] });
  },
});
```

비유 매칭: 점원이 "바꿨어요"라고 즉시 말하고(onMutate), 주방에서 "안 돼요"라고 하면 원래대로 되돌리며(onError), 어떤 경우든 최종 확인을 한 번 더 한다(onSettled).

(근거: [TanStack Query v5 - Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates))

#### 전략 3: 응답값으로 직접 캐시 업데이트

```tsx
onSuccess: (updatedPost) => {
  queryClient.setQueryData(['posts', postId], updatedPost);
},
```

(근거: [TanStack Query - Updates from Mutation Responses](https://tanstack.com/query/v4/docs/react/guides/updates-from-mutation-responses))

#### 전략 선택 기준

| 조건 | 추천 전략 |
|------|-----------|
| 수정 실패율이 낮고 UX가 중요 | Optimistic Update |
| 데이터 정합성이 최우선 | Pessimistic + invalidation |
| API가 수정된 전체 객체를 반환 | 응답값으로 직접 캐시 갱신 |

추론: 커뮤니티 앱의 "본인 글 제목 수정"은 실패율이 낮고 즉각적 피드백이 중요하므로 Optimistic Update가 가장 적합하다.

### 시각화: Optimistic Update 전체 흐름

```
사용자                    클라이언트 캐시             서버
  │                          │                      │
  │─── "제목 수정" 클릭 ───▶│                      │
  │                          │                      │
  │  ┌─ onMutate ──────────┐│                      │
  │  │ 1. cancelQueries    ││                      │
  │  │ 2. snapshot 저장    ││                      │
  │  │ 3. setQueryData     ││                      │
  │  └────────────────────┘│                      │
  │                          │                      │
  │◀── UI 즉시 갱신 ────────│                      │
  │   (새 제목 표시)         │── PATCH /posts/123 ─▶│
  │                          │                      │
  │                          │      ┌───────────────┤
  │                          │      │ DB UPDATE      │
  │                          │      └───────────────┤
  │                          │                      │
  │                    ┌─────┼──── 200 OK ◀─────────│
  │                    │     │                      │
  │          ┌─ onSettled ──┐│                      │
  │          │invalidate    ││                      │
  │          │Queries       ││── GET /posts/123 ──▶│
  │          └──────────────┘│◀── 최신 데이터 ──────│
  │                          │                      │
  │◀── 최종 동기화 완료 ─────│                      │
```

### 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/React-데이터-페칭-불관여/note.md` | **전제 지식** | React가 fetch/mutate에 관여하지 않기 때문에 TanStack Query 같은 외부 라이브러리가 mutation 상태를 관리함 |
| `study/learn/topics/캐시-개념/note.md` | **하위 메커니즘** | `invalidateQueries`가 정확히 캐시의 "무효화(Invalidation)" 동작 |
| `study/learn/topics/React-외부-store-필요조건/note.md` | **상위 판단 기준** | TanStack Query의 캐시는 "값의 원천이 React 밖(서버)에 있는" 전형적인 외부 store |

---

## Q2. 면접관의 3문 연쇄 — 상태 분류 능력의 체계적 검증

면접에서 당근마켓 면접관이 3개 질문을 연쇄로 내린 의도 분석.

| 면접 질문 | 검증하는 상태 유형 | 핵심 판단 |
|-----------|-------------------|-----------|
| "글 제목 수정 시 상태관리" | **서버 상태** (mutation) | 캐시 무효화, 낙관적 갱신, 롤백 |
| "캘린더 달/주/일 뷰 상태관리" | **URL 상태** + 파생 상태 | 뷰 모드를 어디에 저장할 것인가? |
| "다중 선택 + 키보드 숏컷 상태관리" | **로컬 상태** (useState vs useRef) | 렌더링 상태와 참조값 구분 |

면접관이 캘린더 질문을 **힌트로** 준 이유: 캘린더는 상태 분류가 더 직관적이기 때문이다.

"상태관리를 어떻게 할 것이냐"라는 질문의 본질은 **"상태를 분류할 줄 아느냐"**이다.

### 캘린더 상태 분류 예시

```
┌──────────────┬──────────────┬───────────────────────┐
│  서버 상태     │   URL 상태    │     로컬 상태          │
│ (TanStack Q)  │ (searchParams)│   (useState)         │
├──────────────┼──────────────┼───────────────────────┤
│ 일정 목록     │ view=month   │ 드래그 중인 일정        │
│ 일정 상세     │ date=2026-03 │ 호버된 시간 슬롯        │
│ 참석자 정보   │ eventId=123  │ 생성 모달 열림 여부      │
└──────────────┴──────────────┴───────────────────────┘
```

### 글 제목 수정 상태 분류

```
├─ 서버 상태: 게시글 데이터 (제목 포함) → useMutation + invalidation
├─ URL 상태: 현재 보고 있는 글 ID → /posts/:id (라우트 파라미터)
└─ 로컬 상태: 편집 모드 on/off, 수정 중인 임시 제목값 → useState
```

---

## Q3. 다중 선택 + 키보드 숏컷의 상태 설계

### 비유: 텍스트 에디터의 커서와 선택 영역

| 비유 요소 | 실제 개념 |
|-----------|-----------|
| 파란 선택 영역 (하이라이트) | `selectedIds: Set<string>` — 화면에 체크 표시 |
| 커서 위치 (깜빡이는 ┃) | `lastClickedIndex` — 마지막 클릭 위치 |
| 클릭 | 커서 이동 + 기존 선택 해제 |
| Shift+클릭 | 커서~클릭 지점까지 **범위 선택** |
| Ctrl/Cmd+클릭 | 선택 영역에 **개별 추가/제거** |

핵심: 커서 위치는 **화면에 직접 보이지 않지만**, Shift+클릭이 작동하려면 반드시 어딘가에 기억되어야 한다.

### 상태 분류

```
다중 선택 UI 상태
├─ 렌더링에 필요 (→ useState)
│   └─ selectedIds: Set<string>    ← 체크박스 checked 여부 결정
│
├─ 렌더링에 불필요, 로직에만 필요 (→ useRef)
│   └─ lastClickedIndex: number    ← Shift+클릭 범위 계산용
│
└─ 외부에서 오는 데이터 (→ server state)
    └─ posts: Post[]              ← useQuery로 가져온 목록
```

### 코드

```tsx
function PostList({ posts }: { posts: Post[] }) {
  // 렌더링 O → useState
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 렌더링 X, 로직에만 사용 → useRef
  const lastClickedIndex = useRef<number | null>(null);

  const handleClick = (index: number, e: React.MouseEvent) => {
    const id = posts[index].id;

    if (e.shiftKey && lastClickedIndex.current !== null) {
      // Shift+클릭: 범위 선택
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      const rangeIds = posts.slice(start, end + 1).map(p => p.id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        rangeIds.forEach(id => next.add(id));
        return next;
      });
    } else if (e.metaKey || e.ctrlKey) {
      // Ctrl/Cmd+클릭: 개별 토글
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } else {
      // 일반 클릭: 단일 선택
      setSelectedIds(new Set([id]));
    }

    lastClickedIndex.current = index;  // ref 갱신 (리렌더 없음)
  };

  return (
    <ul>
      {posts.map((post, i) => (
        <li key={post.id} onClick={(e) => handleClick(i, e)}>
          <input type="checkbox" checked={selectedIds.has(post.id)} readOnly />
          {post.title}
        </li>
      ))}
    </ul>
  );
}
```

추론: `lastClickedIndex`를 `useRef`로 설계하는 이유 — 이 값이 변해도 UI에 반영할 것이 없으므로, `useState`로 만들면 불필요한 렌더 사이클이 발생한다.

### 시각화: Shift+클릭 흐름

```
게시글 목록         selectedIds        lastClickedIndex.current
─────────────      ──────────         ─────────────────────
□ 게시글 A                             null
□ 게시글 B
□ 게시글 C
□ 게시글 D
□ 게시글 E

── [클릭: B] ──────────────────────────────────────────────
■ 게시글 B         { B }               1

── [Shift+클릭: D] ────────────────────────────────────────
■ 게시글 B ┐
■ 게시글 C │ range  { B, C, D }        3
■ 게시글 D ┘

── [Ctrl+클릭: A] ─────────────────────────────────────────
■ 게시글 A  ← 토글  { A, B, C, D }      0
■ 게시글 B
■ 게시글 C
■ 게시글 D
```

---

## Q4. 면접 결과 분석

앞 30~40분은 mock interview 준비 기반으로 막힘없이 답변했지만, 마지막 20분의 상태관리 3문에서 무너진 상황.

**부정적 신호**: 면접관이 힌트를 2번 줬다(캘린더→다중선택). 상태 분류는 미드 레벨 기본기이며 최신 효과(recency bias)로 끝부분 기억이 강하게 남는다.

**긍정적 신호**: 앞 30~40분 막힘없는 답변은 실무 역량 증명. 힌트를 준 것 자체가 "통과시키고 싶은데 근거가 부족하다"는 의미일 수 있다.

**핵심 진단**: 지식이 없었던 게 아니라(URL state 분류 기준을 이미 학습했으므로), **질문과 지식을 연결하는 프레임이 없었던 것**이다. "상태관리 어떻게?" → "분류부터"라는 연결 고리 하나가 부재했다.

---

## Q5. 상태 분류 의사결정 트리 — 4단계 질문

### 비유: 우편물 분류 센터

| 비유 요소 | 실제 대응 |
|-----------|-----------|
| "이 편지 주인이 우리 건물 밖에 있나?" | 값의 원천이 서버에 있는가? |
| "이 편지를 다른 사람에게 전달하면 의미가 있나?" | 링크로 공유했을 때 같은 화면을 보는가? |
| "이 편지가 내 책상 위에서만 의미 있나?" | 이 컴포넌트 안에서만 쓰이는가? |
| "이건 메모지인데 화면에 안 붙여도 되나?" | 렌더링에 쓰이지 않는 참조값인가? |

### 의사결정 트리

```
Q1. "이 값의 원천(source of truth)이 서버인가?"
 │
 ├─ YES → 🔵 서버 상태
 │         도구: TanStack Query, SWR, RTK Query
 │         예: 게시글 목록, 유저 프로필, 일정 데이터
 │
 └─ NO
     │
     Q2. "이 값을 URL로 공유하면 받는 사람이 같은 화면을 보는가?"
      │
      ├─ YES → 🟢 URL 상태
      │         도구: searchParams, 라우트 파라미터
      │         예: 필터, 정렬, 페이지, 뷰 모드, 선택된 탭
      │
      └─ NO
          │
          Q3. "이 값이 바뀌면 화면이 달라져야 하는가?"
           │
           ├─ YES → 🟡 로컬 렌더링 상태
           │         도구: useState, useReducer
           │         예: 모달 열림, 체크박스 선택, 입력값
           │
           └─ NO → ⚪ 로컬 참조값
                    도구: useRef
                    예: 마지막 클릭 인덱스, 타이머 ID, DOM 참조
```

### 전체 시각화

```
                    ┌──────────────┐
                    │  새로운 상태  │
                    └──────┬───────┘
                           │
                  원천이 서버인가?
                    ┌──────┴──────┐
                   YES            NO
                    │              │
              🔵 서버 상태    공유하면 같은
              ┌──────────┐   화면을 보는가?
              │useQuery  │   ┌──────┴──────┐
              │useMutation│  YES            NO
              └──────────┘   │              │
                        🟢 URL 상태    화면이 달라
                        ┌──────────┐  져야 하는가?
                        │searchPrms│  ┌──────┴──────┐
                        │route prms│ YES            NO
                        └──────────┘  │              │
                                 🟡 useState    ⚪ useRef
                                 ┌──────────┐  ┌──────────┐
                                 │체크박스   │  │lastIndex │
                                 │모달 열림  │  │timer ID  │
                                 │입력값    │  │DOM ref   │
                                 └──────────┘  └──────────┘
```

### 면접 3문제 적용

**글 제목 수정:**
- "제목" → 원천이 서버? YES → 🔵 서버 상태 (useMutation)
- "편집 모드 on/off" → 서버? NO → 공유? NO → 화면 변경? YES → 🟡 useState
- "수정 중 임시 제목" → 서버? NO → 공유? NO → 화면 변경? YES → 🟡 useState

**캘린더 뷰 모드:**
- "일정 목록" → 원천이 서버? YES → 🔵 서버 상태
- "month/week/day" → 서버? NO → 공유? YES → 🟢 URL 상태
- "호버된 셀" → 서버? NO → 공유? NO → 화면 변경? YES → 🟡 useState

**다중 선택 + 숏컷:**
- "게시글 목록" → 원천이 서버? YES → 🔵 서버 상태
- "selectedIds" → 서버? NO → 공유? NO → 화면 변경? YES → 🟡 useState
- "lastClickedIndex" → 서버? NO → 공유? NO → 화면 변경? NO → ⚪ useRef

### 엣지 케이스

| 상태 | 헷갈리는 이유 | 판단 |
|------|-------------|------|
| 다크모드 토글 | 서버에 저장할 수도 있고 안 할 수도 | 영속 필요하면 서버, 아니면 로컬+localStorage |
| 검색어 입력 중 | 타이핑 중엔 로컬, 검색 실행 후엔 URL | 두 상태가 다름: 입력값(🟡)과 확정된 검색어(🟢) |
| 선택된 게시글 ID (상세 페이지) | 로컬? URL? | `/posts/:id`로 접근 가능 → 🟢 URL |
| 무한스크롤 커서 | 서버가 줌, 공유 불필요 | 🔵 서버 상태 (쿼리 키에 포함) |

---

## 핵심 명제

1. "상태관리를 어떻게 할 것이냐"라는 질문의 본질은 **상태 분류 능력**이다 (근거: 면접관의 3문 연쇄가 서버/URL/로컬을 하나씩 검증)
2. 상태 분류는 4단계 의사결정 트리로 수행한다: **원천이 서버? → 공유 의미? → 화면 변경?** → 각각 서버 상태/URL 상태/useState/useRef (근거: URL state 분류 기준 5가지의 집약)
3. Optimistic Update는 **onMutate(취소+스냅샷+낙관적갱신) → onError(롤백) → onSettled(무효화)** 3단계 패턴이다 (근거: [TanStack Query v5 공식 문서](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates))
4. 렌더링에 쓰이지 않는 참조값(`lastClickedIndex`, timer ID)은 `useRef`로, 화면에 반영되는 값(`selectedIds`)은 `useState`로 구분해야 불필요한 리렌더를 방지한다 (추론: ref 변경은 렌더 사이클을 트리거하지 않음)
5. 오해 → 정정: **지식이 있어도 프레임이 없으면 면접에서 적용할 수 없다** — URL state 분류 기준을 학습했지만 "상태관리" 질문을 "분류부터"로 연결하는 고리가 없으면 지식이 활성화되지 않는다

## 활용 프레임워크

- **"상태관리를 어떻게 할 것이냐" 질문을 들으면**, "먼저 상태를 서버/URL/로컬로 분류합니다"로 시작한다
  - 예시: 면접에서 "이 기능의 상태관리?" → "이 기능에서 관여하는 상태를 분류하면: 서버 상태는 X, URL 상태는 Y, 로컬 상태는 Z. 각각 TanStack Query / searchParams / useState로 관리합니다"
- **새로운 상태를 설계할 때**, 4단계 트리(서버? → 공유? → 화면변경? → ref)를 순서대로 적용한다
  - 예시: 드래그 중인 위치 → 서버? NO → 공유? NO → 화면 변경? YES → useState

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/React-데이터-페칭-불관여/note.md` | **전제 지식** | React가 fetch/mutate에 관여하지 않기 때문에 외부 라이브러리가 mutation 상태를 관리함 |
| `study/learn/topics/캐시-개념/note.md` | **하위 메커니즘** | `invalidateQueries`가 캐시의 "무효화(Invalidation)" 동작에 정확히 대응 |
| `study/learn/topics/React-외부-store-필요조건/note.md` | **상위 판단 기준** | TanStack Query 캐시는 "값의 원천이 React 밖(서버)에 있는" 외부 store |
| `study/learn/topics/URL-shareable-vs-local-state-분류기준/note.md` | **동일 개념의 실전 적용** | 5가지 분류 기준이 의사결정 트리 Q2 분기에 집약됨 |
| `study/learn/topics/useRef-렌더링-참조규칙/note.md` | **하위 메커니즘** | useRef가 렌더링을 트리거하지 않는 원리가 Q3→useRef 분기의 근거 |
