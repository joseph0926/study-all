# 도메인모델-표현레이어-분리패턴

> 최초 질문: 공통 도메인 모델과 채널별 표현 레이어 분리 패턴 (예시가 필요하면 react v19로)
> 일시: 2026-03-10

---

## Q1. 공통 도메인 모델과 채널별 표현 레이어 분리 패턴 (예시가 필요하면 react v19로)

### 비유: 본사 표준 레시피와 지점별 플레이팅

| 비유 요소 | 실제 대응 |
|-----------|-----------|
| 본사 표준 레시피 (재료·조리법·영양 정보) | **도메인 모델** — 비즈니스 규칙·엔티티·불변 조건 |
| 각 지점의 플레이팅·메뉴판 디자인 | **채널별 표현 레이어** — Web UI, Mobile UI, API JSON 등 |
| 레시피 → 플레이팅 변환 담당 셰프 | **매핑/변환 레이어** — DTO→Domain, Domain→ViewModel |
| "레시피는 하나, 플레이팅은 지점마다 다르다" | 도메인 로직 공유 + 표현만 채널별 분기 |

### 코드/텍스트 설명

Martin Fowler의 **Presentation-Domain-Data Layering**이 이 패턴의 원형.

> "You can build multiple presentations on top of the same domain logic without duplicating it — web apps, mobile native apps, APIs for scripting, or command-line interfaces."

근거: https://martinfowler.com/bliki/PresentationDomainDataLayering.html

세 가지 이점:
1. **인지 부하 감소** — 각 레이어를 독립적으로 사고 가능
2. **코드 재사용** — 하나의 도메인 로직 위에 여러 표현을 얹음
3. **테스트 용이성** — 도메인 로직을 UI 없이 단위 테스트 가능

#### 3-레이어 구조 (React v19 예시)

**① 도메인 모델** — 프레임워크 무관, 순수 TypeScript

```typescript
// domain/user.ts — 비유: "본사 표준 레시피"
export interface User {
  id: string;
  handle: string;
  avatar: string;
  info?: string;
  followerIds: string[];
}

export function isInfluencer(user: User): boolean {
  return user.followerIds.length >= 10_000;
}
```

**② API/데이터 레이어 + 매핑** — DTO → 도메인 변환 (비유: "셰프")

```typescript
// api/user/dto.ts — 서버 응답 구조 (DTO)
export interface UserDto {
  id: string;
  type: "user";
  attributes: { handle: string; avatar: string; info?: string };
  relationships: { followerIds: string[] };
}

// api/user/transform.ts — DTO → Domain 매핑
export function dtoToUser(dto: UserDto): User {
  return {
    id: dto.id,
    avatar: dto.attributes.avatar,
    handle: dto.attributes.handle,
    info: dto.attributes.info,
    followerIds: dto.relationships.followerIds,
  };
}

// api/user/api.ts — fetch + 변환
export async function getUser(handle: string): Promise<User> {
  const res = await fetch(`/api/user/${handle}`);
  const { data } = await res.json();
  return dtoToUser(data);   // ← 경계에서 변환, 이후는 도메인 모델만 흐름
}
```

외부 코드: (profy.dev, 2024 — Domain Entities & DTOs)

**③ 채널별 표현 레이어** — React v19 `use()` 활용

```tsx
// presentation/web/UserProfile.tsx — 웹 채널 표현
import { use, Suspense } from 'react';
import { getUser } from '@/api/user/api';
import { isInfluencer } from '@/domain/user';

function UserCard({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);   // React 19의 use()로 직접 resolve
  return (
    <article className="card">
      <img src={user.avatar} alt={user.handle} />
      <h2>@{user.handle}</h2>
      {isInfluencer(user) && <span className="badge">Influencer</span>}
      <p>{user.followerIds.length} followers</p>
    </article>
  );
}

// presentation/mobile/UserRow.tsx — 모바일 채널 표현
function UserRow({ user }: { user: User }) {
  return (
    <View style={styles.row}>
      <Avatar uri={user.avatar} size={40} />
      <Text>{user.handle}</Text>
      {isInfluencer(user) && <Badge label="★" />}
    </View>
  );
}

// presentation/api/userResponse.ts — API 채널 표현
export function toApiResponse(user: User) {
  return {
    id: user.id,
    displayName: `@${user.handle}`,
    isInfluencer: isInfluencer(user),
    followerCount: user.followerIds.length,
  };
}
```

추론: 세 채널 모두 같은 `User` 도메인 모델과 `isInfluencer` 비즈니스 규칙을 공유. 표현만 다름.

#### React v19에서 달라진 점

| 기존 (v18) | React v19 |
|------------|-----------|
| `useEffect` + `useState`로 fetch 후 상태 저장 | `use(promise)` + Suspense로 선언적 resolve |
| 로딩 상태 직접 관리 | Suspense boundary가 로딩 처리 |
| Server Component 없음 | Server Component에서 도메인 로직 실행 → 직렬화된 결과만 Client로 전달 |

근거: https://react.dev/blog/2024/12/05/react-19

### 시각화

```
┌─────────────────────────────────────────────────────────┐
│                    데이터 소스 (API / DB)                 │
│                    ┌──────────┐                          │
│                    │ UserDto  │  ← 서버 응답 구조        │
│                    └────┬─────┘                          │
│                         │ dtoToUser()                    │
│                         ▼                                │
│  ┌─────────────────────────────────────────────┐        │
│  │          도메인 모델 (Domain Layer)           │        │
│  │  ┌──────────┐   ┌──────────────────┐        │        │
│  │  │   User   │   │ isInfluencer()   │        │        │
│  │  │ (entity) │   │ (business rule)  │        │        │
│  │  └──────────┘   └──────────────────┘        │        │
│  │         "본사 표준 레시피" — 하나만 존재       │        │
│  └──────────┬──────────┬──────────┬────────────┘        │
│             │          │          │                      │
│       ┌─────▼──┐ ┌─────▼──┐ ┌────▼───┐                 │
│       │ Web UI │ │Mobile  │ │ API    │                  │
│       │ Card   │ │ Row    │ │ JSON   │                  │
│       │(React) │ │(RN)   │ │Response│                  │
│       └────────┘ └────────┘ └────────┘                  │
│        "A지점    "B지점     "C지점                        │
│        플레이팅"  플레이팅"  플레이팅"                      │
└─────────────────────────────────────────────────────────┘

의존 방향:  표현 → 도메인 → 데이터  (역방향 금지)
```

---

## Q2. 이 3-레이어 패턴에서 1번 도메인 레이어를 크게 보면 "서버"로 볼 수 있나요? 각 환경 내에서 한번 더 3-레이어 패턴으로 나눌 수 있는 거구요

### 매크로 관점: "서버 = 도메인 레이어"?

거의 맞지만, 정확히는 서버의 API 응답은 서버의 *표현 레이어*이다.

```
서버 내부:
  [DB 테이블] → [도메인 모델/비즈니스 규칙] → [API 응답 = 서버의 표현 레이어]
                                                      │
                                                      ▼  네트워크
클라이언트 입장:
  [API 응답 = DTO] → [클라이언트 도메인 모델] → [UI 표현]
```

추론: 클라이언트가 받는 JSON은 서버의 도메인 모델 **그 자체**가 아니라, 서버가 자기 도메인을 **직렬화한 표현**(DTO). 서버의 DB 스키마나 내부 엔티티 구조와 API 응답 구조가 다른 경우가 많은 이유.

### 마이크로 관점: 각 환경 내 재귀적 3-레이어

정확히 맞음. 프랙탈 구조 — 매크로(시스템)와 마이크로(각 클라이언트) 모두 같은 패턴 반복.

```
┌─ 전체 시스템 (매크로) ─────────────────────────────┐
│                                                    │
│  서버 ──API──┬── 웹 클라이언트                      │
│              ├── 모바일 앱                          │
│              └── 웹뷰                              │
│                                                    │
└────────────────────────────────────────────────────┘

┌─ 웹 클라이언트 내부 (마이크로) ────────────────────┐
│  [Data]  api/user/api.ts  ← fetch + dtoToUser()   │
│  [Domain] domain/user.ts  ← User, isInfluencer()  │
│  [Presentation] components/UserCard.tsx ← UI만    │
└────────────────────────────────────────────────────┘
```

| 사용자 이해 | 판정 | 보정 |
|------------|------|------|
| 서버 = 도메인 레이어 | △ 거의 맞음 | 서버의 API 응답은 서버의 표현 레이어이고, 클라이언트에게는 DTO로 도착 |
| 각 환경 내에서 다시 3-레이어 | ○ 정확 | 프랙탈 구조 |

---

## Q3. 이 패턴이 실무에서 왜 중요할까요? 당근마켓을 예시로 들어봅시다

당근은 같은 비즈니스 로직을 최소 3개 채널에서 표현한다:
- 네이티브 앱 (iOS/Android)
- 웹 (Next.js — SEO, 검색 유입)
- 앱 내 웹뷰 (React — 신규 사업, 결제)

근거: https://medium.com/daangn/tagged/front-end-development

### 문제 1: API 응답 구조 변경 → 전 채널 폭탄

```typescript
// 분리 없이: 수정 범위 = 웹 12곳 + 앱 8곳 + 웹뷰 5곳 = 25곳
// 분리 있을 때: 매핑 함수 1곳만 수정
function dtoToProduct(dto: ProductDto): Product {
  return {
    price: dto.price,
    sellerName: dto.author.nickname,  // ← 여기만 변경
  };
}
```

### 문제 2: 채널마다 다른 표현이 필요

```typescript
// domain/product.ts — 공통 도메인 모델
interface Product {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  status: 'selling' | 'reserved' | 'sold';
  sellerName: string;
  createdAt: Date;
}

function getDisplayPrice(p: Product): string {
  return p.isFree ? '나눔' : `${p.price.toLocaleString()}원`;
}
```

`getDisplayPrice()`, `getTimeAgo()`는 모든 채널이 공유하지만 레이아웃·인터랙션·메타태그는 채널별로 완전히 다름.

### 문제 3: 테스트·유지보수 비용

```
분리 없이:  UI 의존 통합 테스트 N벌, API mock 필요
분리 있으면: getDisplayPrice({ isFree: true, price: 0 }) === '나눔'
            → 순수 함수 단위 테스트 1개로 3채널 모두 보장
```

### 실무 요약

| 문제 | 분리 없을 때 | 분리 있을 때 |
|------|-------------|-------------|
| API 변경 | N개 채널 × M개 사용처 수정 | 매핑 함수 1곳 |
| 비즈니스 규칙 변경 | 채널별 복붙된 로직 전부 수정 | 도메인 함수 1곳 |
| 테스트 | UI 의존 통합 테스트 N벌 | 순수 함수 단위 테스트 1벌 |
| 새 채널 추가 | 도메인 로직 재구현 | 표현 레이어만 새로 작성 |
| 팀 간 협업 | "API 바꾸지 마세요" 갈등 | 매핑 레이어가 완충 역할 |

추론: 채널이 1개일 때는 분리의 이점이 작다. 채널이 2개 이상이 되는 순간 ROI가 급격히 올라감.

---

## Q4. 핵심은 도메인(진실의 원천)과 사용처를 디커플링하고, 둘의 연결은 한곳으로 좁혀서 진실의 원천이 수정되면 대응은 한곳만 하면 되게 하는 거군요

정확한 이해. 그 "한곳"이 **매핑 레이어(Anti-Corruption Layer)**.

```
❌ 직접 결합:   서버 변경 → 웹 수정 + 앱 수정 + 웹뷰 수정  (1:N)
✅ 디커플링:    서버 변경 → 매핑 레이어 수정 → 끝            (1:1)
```

이 원칙은 이 패턴에만 국한되지 않고 반복 등장:

| 패턴 | 진실의 원천 | 사용처 | 한곳의 연결 |
|------|-----------|--------|------------|
| 도메인-표현 분리 | 서버 API | 웹/앱/웹뷰 | 매핑 함수 (`dtoToUser`) |
| Context-상태 분리 | `useState`/`useReducer` | 하위 컴포넌트들 | `Context.Provider` |
| React 단방향 데이터 흐름 | 상위 컴포넌트 state | 하위 컴포넌트 | props |

추론: **"변경의 전파 범위를 1:1로 좁히는 것"**이 소프트웨어 설계에서 반복되는 근본 원칙이고, 도메인-표현 분리는 그 아키텍처 스케일 적용.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/React-context-전달과-상태경계/note.md` | **전달 vs 관리 분리** 원칙의 아키텍처 스케일 확장 | Context는 "전달 메커니즘과 상태 관리를 분리"하라고 가르침 → 이 패턴은 더 큰 스케일에서 "도메인 로직과 표현을 분리"하라는 같은 원칙. Q4에서 두 패턴 모두 "변경 전파 범위를 1:1로 좁히기"라는 동일 근본 원칙의 적용임을 확인 |
