# URL-shareable-vs-local-state-분류기준

> 최초 질문: URL shareable state vs local state 분류 기준 5가지
> 일시: 2026-03-11

---

## Q1. URL shareable state vs local state 분류 기준 5가지

### 비유: 도서관 책상 vs 도서관 주소

| 비유 요소 | 실제 개념 | 대응 이유 |
|-----------|-----------|-----------|
| **도서관 주소 + 층수 + 서가 번호** | URL searchParams (`?page=3&filter=asia`) | 누구에게든 전달하면 같은 위치에 도달 |
| **책상 위에 펼쳐놓은 메모** | useState/local state | 본인만 볼 수 있고, 자리를 떠나면 사라짐 |
| **주소를 카톡으로 공유** | URL 복사 & 공유 | 받는 사람이 동일한 상태를 재현 |
| **메모를 사진 찍어 보내기** | 스크린샷 공유 (상태 전달 불가) | 받는 사람이 그 상태로 직접 이동 불가 |
| **건물이 리모델링되어도 주소는 유효** | 새로고침/탭 복원 후에도 상태 유지 | 영속성 |

### 분류 기준 5가지

#### 1. 공유 가능성 (Shareability)

> "그 상태를 다른 사람에게 링크로 전달했을 때 의미가 있는가?"

- **URL state**: 필터, 검색어, 페이지네이션 → 링크를 받은 사람이 동일한 뷰를 봄
- **Local state**: 모달 열림/닫힘, 드롭다운 토글 → 공유해도 의미 없음

출처: [LogRocket - Why URL state matters](https://blog.logrocket.com/url-state-usesearchparams/)

#### 2. 영속성 (Persistence across reload)

> "새로고침했을 때 상태가 유지되어야 하는가?"

- **URL state**: 필터 설정, 정렬 순서 → 새로고침 후에도 유지
- **Local state**: 타이핑 중인 입력값, 호버 상태 → 휘발되어도 무방

출처: [LogRocket - Advanced URL state management](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)

#### 3. 탐색 통합성 (Navigation Integration)

> "브라우저 뒤로가기/앞으로가기에 반응해야 하는가?"

- **URL state**: 페이지네이션 `?page=2` → 뒤로가기 시 `?page=1`로 복원
- **Local state**: 아코디언 열림 상태 → 히스토리 스택에 쌓일 필요 없음

추론: URL에 상태가 있으면 `pushState`/`replaceState`를 통해 브라우저 히스토리와 자연스럽게 연동된다.

#### 4. 민감도 & 데이터 크기 (Sensitivity & Size)

> "URL에 노출되어도 안전한가? 길이가 적절한가?"

- **Local state**: 비밀번호, API 키, 개인정보 → URL 노출 금지
- **Local state**: 대용량 폼 데이터, 긴 텍스트 → URL 길이 제한(~2,000자) 초과
- **URL state**: 짧고 공개 가능한 값 (카테고리, 페이지 번호, 정렬 키)

출처: [LogRocket - Advanced URL state management](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/)

#### 5. 변경 빈도 (Update Frequency)

> "상태가 매 키입력/매 프레임마다 바뀌는가?"

- **Local state**: 검색창 타이핑 중간 값, 드래그 좌표, 애니메이션 값 → 매 변경마다 URL 갱신하면 성능 저하 + 히스토리 오염
- **URL state**: 검색 **완료** 후의 쿼리, 필터 **적용** 후의 값 → 안정된 시점에서만 갱신

추론: `useSearchParams` setter는 URL 변경 → 히스토리 엔트리 생성 → 리렌더링 체인이 발생하므로, 고빈도 업데이트에는 부적합하다.

### 시각화: 판별 플로차트

```
상태 값 발생
    │
    ▼
┌─────────────────────────┐
│ 다른 사람에게 공유 시     │──── No ──→ Local State
│ 의미 있는 상태인가?       │
└──────────┬──────────────┘
           Yes
           │
           ▼
┌─────────────────────────┐
│ 민감한 정보이거나         │──── Yes ──→ Local State
│ 2,000자를 초과하는가?     │            (+ 필요시 sessionStorage)
└──────────┬──────────────┘
           No
           │
           ▼
┌─────────────────────────┐
│ 초당 수십 회 이상         │──── Yes ──→ Local State
│ 변경되는가?               │            (확정 시 URL 동기화)
└──────────┬──────────────┘
           No
           │
           ▼
      URL State ✅
      (searchParams)
```

---

## Q2. 실무 적용 패턴 (당근마켓 예시로)

### 비유 연장: 당근마켓 = 동네 벼룩시장

| 비유 요소 | 당근 기능 | URL/Local 판정 |
|-----------|-----------|----------------|
| 벼룩시장 입구 안내판 | `/kr/buy-sell/?category=electronics&region=역삼동` | URL — 친구에게 "이 통로 가봐"라고 안내 |
| 내 손에 든 물건 목록 메모 | 장바구니, 비교 목록 (임시) | Local — 나만 보고 있는 메모 |
| 상인에게 "깎아주세요" 중인 대화 | 채팅 입력 중인 텍스트 | Local — 전송 전에는 의미 없음 |
| "가격 5만원 이하만 보여주세요" | 가격 필터 `?price_max=50000` | URL — 같은 조건으로 다시 찾아올 수 있어야 함 |
| 물건을 이리저리 살펴보는 행위 | 이미지 줌, 캐러셀 인덱스 | Local — 보는 행위 자체는 공유 대상 아님 |

### 패턴 1: 검색 — 디바운싱 분리

```
검색창 타이핑: "아이패"  →  Local (useState)
           ↓ 300ms 디바운스
검색 확정:  "아이패드"   →  URL (?q=아이패드)
```

```tsx
// nuqs 패턴 (출처: nuqs.dev, v2)
const [query, setQuery] = useQueryState("q",
  parseAsString.withDefault("").withOptions({
    debounceMs: 300,    // URL 갱신은 300ms 후
    shallow: false       // 서버 데이터 재요청
  })
);
```

**분류 기준 적용**: 변경 빈도(기준5) → 타이핑 중은 Local, 확정 후 URL

출처: [nuqs - Debounce & Schema Integration (InfoQ, 2025)](https://www.infoq.com/news/2025/09/nuqs-debounce-schema/)

### 패턴 2: 카테고리 + 가격 필터 — 즉시 URL

```tsx
const [category] = useQueryState("category", parseAsString);
const [priceMin] = useQueryState("price_min", parseAsInteger);
const [priceMax] = useQueryState("price_max", parseAsInteger);
```

- 공유 가능성(기준1) ✅ "디지털 5만원 이하 매물" 링크 공유
- 영속성(기준2) ✅ 새로고침 후에도 필터 유지
- 탐색 통합(기준3) ✅ 뒤로가기 → 이전 필터로 복원

### 패턴 3: 정렬 — URL (pushState vs replaceState 선택)

```tsx
const [sort, setSort] = useQueryState("sort",
  parseAsStringLiteral(["recent", "price_asc", "price_desc"])
    .withDefault("recent")
    .withOptions({ history: "replace" })  // ← replace
);
```

| 동작 | history 전략 | 이유 |
|------|-------------|------|
| 카테고리 변경 | `push` | 다른 데이터셋 → 뒤로가기로 복원 의미 있음 |
| 정렬 변경 | `replace` | 같은 데이터셋의 순서만 변경 → 히스토리 오염 방지 |
| 페이지네이션 | `push` | 이전 페이지로 돌아가기 기대 |

추론: pushState는 "새로운 뷰"에, replaceState는 "같은 뷰의 미세 조정"에 사용하는 것이 UX 관례.

### 패턴 4: UI 인터랙션 — 무조건 Local

```tsx
const [slideIndex, setSlideIndex] = useState(0);   // 이미지 캐러셀
const [isModalOpen, setIsModalOpen] = useState(false); // 모달
const [isExpanded, setIsExpanded] = useState(false);   // 더보기 토글
```

- 공유 가능성(기준1) ❌ "3번째 사진 보고 있어" 공유 무의미
- 변경 빈도(기준5) ⚠️ 스와이프마다 변경

### 패턴 5: 지역 선택 — URL 경로 vs 쿼리 파라미터

```
경로 방식: /kr/buy-sell/gangnam/         ← SEO 유리, 당근 실제 채택
쿼리 방식: /kr/buy-sell/?region=gangnam  ← 조합 필터에 유연
```

추론: 지역은 "필터"라기보다 "콘텐츠의 근본 범위"이므로, 경로에 넣는 것이 RESTful하고 SEO에도 유리하다. 가격·카테고리 같은 부가 필터는 쿼리 파라미터가 적합.

### 시각화: 당근마켓 상태 분류 맵

```
┌─────────────────────────────────────────────────────┐
│                    당근 중고거래                       │
├──────────────────┬──────────────────────────────────┤
│   URL State      │   Local State                    │
├──────────────────┼──────────────────────────────────┤
│ 📍 지역 (path)    │ 💬 채팅 입력 중 텍스트             │
│ 🔍 검색어 (확정)   │ 🔍 검색어 (타이핑 중)             │
│ 📂 카테고리        │ 📸 이미지 캐러셀 인덱스            │
│ 💰 가격 범위       │ 📋 모달/바텀시트 열림              │
│ 📄 페이지 번호     │ 🔽 더보기 토글                    │
│ ↕️ 정렬 기준       │ ✅ 체크박스 임시 선택              │
│                  │ 🖱️ 호버/포커스 상태               │
│ ── push ──       │                                  │
│ 카테고리, 페이지   │                                  │
│ ── replace ──    │                                  │
│ 정렬              │                                  │
└──────────────────┴──────────────────────────────────┘
```

---

## Q3. deep-link canonical meaning과 URL 계약 설계

### 비유: 건물 주소 시스템

| 비유 요소 | 실제 대응 |
|-----------|-----------|
| **건물 정문 주소** (서울시 강남구 테헤란로 123, 5층 501호) | **Deep Link** — 특정 리소스/상태를 가리키는 URL |
| **건물 주소 = 우편번호부 등록** (누구나 편지를 보낼 수 있음) | **Canonical meaning** — URL이 가리키는 리소스의 공적 약속 |
| **주소 체계 규칙** (시 → 구 → 로 → 번지 → 층 → 호) | **URL 계약(contract)** — 경로 구조·파라미터의 설계 규칙 |
| **빌딩 내부 임시 회의실 번호** (오늘만 3B로 쓰는 회의실) | **로컬 상태** — URL에 노출하지 않는 일시적 UI 상태 |
| **주소 변경 시 우편물 반송** | **URL 깨짐** — 계약 변경 시 기존 링크가 무효화됨 |

### Deep Link의 본래 의미 (Canonical Meaning)

웹에서 deep link란 **홈페이지가 아닌 특정 리소스를 직접 가리키는 URL**이다.

> "The technology behind the World Wide Web, the Hypertext Transfer Protocol (HTTP), does not actually make any distinction between 'deep' links and any other links — all links are functionally equal."
> — W3C TAG, "Deep Linking" in the World Wide Web

HTTP 프로토콜 관점에서 **모든 URL은 평등**하다. "deep"이라는 구분 자체가 기술적으로는 존재하지 않는다. URL은 리소스의 **유일한 식별자(identifier)**이며, 그 자체로 **공유 가능하고, 북마크 가능하고, 접근 가능**해야 한다.

Tim Berners-Lee의 1998년 원칙:

> "Cool URIs don't change. — 많은 것이 변해도 URI는 그대로여야 한다."

비유 매칭: 건물 정문 주소가 변하면 모든 우편물이 반송되듯, URL이 변하면 모든 기존 링크·북마크·공유가 깨진다.

### URL 계약 3대 약속

| 계약 항목 | 의미 | 예시 |
|-----------|------|------|
| **식별성 (Identity)** | 이 URL은 특정 리소스를 유일하게 가리킨다 | `/products/123` = 상품 123 |
| **재현성 (Reproducibility)** | 같은 URL은 같은 상태를 복원한다 | `/search?q=shoes&sort=price` → 항상 동일 필터 |
| **안정성 (Stability)** | URL 구조는 쉽게 바뀌지 않는다 | 내부 리팩토링해도 URL은 유지 |

Q1의 5가지 기준과의 대응:
- **공유 가능성** → 식별성 계약
- **영속성** → 안정성 계약
- **탐색 통합성** → 재현성 계약 (뒤로가기 시 이전 상태 복원)

### SPA에서의 URL 계약 위반과 수호

```
❌ 계약 위반 사례:
/dashboard          ← 모든 상태를 로컬에만 저장
(필터, 정렬, 선택된 탭이 URL에 없음 → 새로고침하면 초기 상태)

✅ 계약 수호 사례:
/dashboard?tab=analytics&period=7d&sort=revenue
(URL만으로 동일 화면 재현 가능 → 공유·북마크·뒤로가기 모두 동작)
```

추론: URL 계약 설계의 핵심 질문은 **"이 URL을 다른 사람에게 보냈을 때, 동일한 화면을 볼 수 있는가?"**이다.

### URL 계약 설계 원칙

| 원칙 | 설명 | 안티패턴 |
|------|------|----------|
| **리소스 중심** | URL은 동사가 아닌 명사 | `/getProduct?id=1` → `/products/1` |
| **계층 반영** | 경로가 리소스 계층을 표현 | `/users/42/orders/7` |
| **구현 은닉** | 기술 스택 노출 금지 | `/api/v1/cgi-bin/handler.php` → `/api/v1/orders` |
| **쿼리 = 필터/뷰** | 리소스 식별은 경로, 표현 방식은 쿼리 | `/products?sort=price&page=2` |
| **안정성 보장** | 변경 시 301 리다이렉트 | URL 삭제 대신 리다이렉트 |

### 시각화

```
URL 계약 구조도
═══════════════════════════════════════════════════════════

  URL = /products/123?variant=blue&view=gallery
        ├─────────────┤├──────────────────────┤
        │ 경로(Path)    │ 쿼리(Query)           │
        │              │                       │
        ▼              ▼                       ▼
   리소스 식별      필터/표현 방식         뷰 모드
   (계약: Identity)  (계약: Reproducibility)

  ┌─────────────────────────────────────────────┐
  │              URL 계약 3대 약속              │
  ├──────────────┬──────────────┬───────────────┤
  │  식별성       │  재현성       │  안정성        │
  │  Identity    │  Reproduce   │  Stability    │
  ├──────────────┼──────────────┼───────────────┤
  │ 같은 URL =   │ 같은 URL =   │ URL 구조는    │
  │ 같은 리소스   │ 같은 상태    │ 변하지 않음    │
  ├──────────────┼──────────────┼───────────────┤
  │ Q1 기준:     │ Q1 기준:     │ Q1 기준:      │
  │ 공유 가능성   │ 탐색 통합성   │ 영속성        │
  └──────────────┴──────────────┴───────────────┘
```

출처:
- [W3C TAG - Deep Linking](https://www.w3.org/2001/tag/doc/deeplinking.html)
- [Cool URIs don't change](https://www.w3.org/Provider/Style/URI)
- [Deep linking - Wikipedia](https://en.wikipedia.org/wiki/Deep_linking)
- [Revisiting URL-Based State Management in SPAs](https://dev.to/0rok/-revisiting-url-based-state-management-in-spas-3fje)
- [Respecting Browser Navigation in SPAs](https://rakhman.info/blog/respecting-browser-navigation-spa/)

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/useState-useReducer-관계/note.md` | 저장소 차원의 확장 | nuqs의 `useQueryState`는 useState와 동일한 `[value, setter]` 인터페이스를 제공하면서 저장소만 URL로 바꾼 것. 비유: 같은 메모 양식을 책상 메모(local)에 쓸지, 건물 안내판(URL)에 쓸지의 차이 |
| `study/learn/topics/React-context-전달과-상태경계/note.md` | 상태 경계 우회 | URL state는 전역 접근 가능하므로 Context Provider 경계 문제를 우회. 비유: 건물 주소는 어느 층에서든 읽을 수 있지만, 특정 사무실 내부 메모는 그 방에 들어가야 볼 수 있음 |
| `study/learn/topics/React-외부-store-필요조건/note.md` | URL = 외부 store | URL은 브라우저가 관리하는 "외부 store". `useSyncExternalStore`로 URL 변경을 구독하는 패턴이 이 관점을 뒷받침 |
