# B2B-고객사설정-feature-flag-경계

> 최초 질문: B2B 고객사 설정 테이블 설계와 feature flag 경계 (예시는 리액트로)
> 일시: 2026-03-11

---

## Q1. B2B 고객사 설정 테이블 설계와 feature flag 경계 (예시는 리액트로)

### 비유: 호텔 체인의 "객실 기본 세팅" vs "시설 개방 키카드"

| 비유 요소 | 실제 대응 |
|-----------|-----------|
| 호텔 체인 본사 | B2B SaaS 플랫폼 |
| 각 지점(프랜차이즈) | 고객사(Tenant) |
| 객실 기본 세팅 (베개 종류, 미니바 구성, 조식 메뉴, 체크인 시간) | **고객사 설정 테이블** — 고객사마다 다른 비즈니스 설정값 |
| 시설 개방 키카드 (수영장 O, 사우나 X, VIP 라운지 O) | **Feature Flag** — 기능 자체의 활성화/비활성화 |
| "베개를 메밀 → 라텍스로 변경" | 설정값 변경 (기능은 존재, 값만 다름) |
| "사우나 시설을 아예 잠금" | Feature flag OFF (기능 자체가 없음) |

핵심 차이: **설정은 "어떻게(how)"를 조절**하고, **feature flag는 "있냐 없냐(whether)"를 결정**한다.

### 코드/텍스트 설명

#### 구분 기준

| 기준 | 고객사 설정 (Config) | Feature Flag |
|------|---------------------|--------------|
| 질문 | "이 기능을 **어떻게** 쓸까?" | "이 기능이 **존재하나**?" |
| 값 타입 | 다양 (string, number, JSON, enum) | boolean (또는 variant) |
| 변경 주체 | 고객사 어드민 (셀프서비스) | 플랫폼 운영팀 / 플랜 |
| 변경 빈도 | 수시 (비즈니스 설정) | 드물게 (기능 출시/플랜 변경) |
| 예시 | 로고 URL, 결제 수단, 알림 시간 | SSO 활성화, AI 분석 기능, 대시보드 v2 |

근거: AWS SaaS Lens — "Use feature flags to manage tenant variations… Store feature flags as part of your tenant management function and propagate these flags to your identity provider where they are stored as custom claims"
(https://wa.aws.amazon.com/saas.question.OPS_4.en.html)

#### DB 테이블 설계

```sql
-- 1) 고객사 설정 테이블: "객실 기본 세팅"
CREATE TABLE tenant_configs (
  tenant_id   UUID REFERENCES tenants(id),
  config_key  VARCHAR(100) NOT NULL,
  config_val  JSONB NOT NULL,
  updated_by  UUID,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, config_key)
);

-- 2) Feature Flag 테이블: "시설 개방 키카드"
CREATE TABLE tenant_features (
  tenant_id    UUID REFERENCES tenants(id),
  feature_key  VARCHAR(100) NOT NULL,
  enabled      BOOLEAN DEFAULT false,
  variant      VARCHAR(50),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, feature_key)
);

-- 3) 플랜 기본값 (feature flag의 진실 원천)
CREATE TABLE plan_features (
  plan_id      UUID REFERENCES plans(id),
  feature_key  VARCHAR(100) NOT NULL,
  enabled      BOOLEAN DEFAULT false,
  PRIMARY KEY (plan_id, feature_key)
);
```

추론: `tenant_features`는 `plan_features`를 오버라이드하는 구조. 플랜이 기본값을 정하고, 개별 고객사에 예외를 부여한다.

#### React 구현 — Context 분리 패턴

```tsx
// 타입 정의 — 설정과 flag를 명확히 분리
interface TenantConfig {
  logoUrl: string;
  primaryColor: string;
  notificationTime: string;
  paymentMethods: string[];
}

interface TenantFeatures {
  sso: boolean;
  aiAnalytics: boolean;
  dashboardV2: boolean;
  bulkExport: boolean;
}

// 별도 Context — 변경 빈도와 소비자가 다르므로 분리
const TenantConfigContext = createContext<TenantConfig | null>(null);
const TenantFeatureContext = createContext<TenantFeatures | null>(null);
```

```tsx
// Provider
function TenantProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth();
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [features, setFeatures] = useState<TenantFeatures | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tenants/${tenantId}/config`).then(r => r.json()),
      fetch(`/api/tenants/${tenantId}/features`).then(r => r.json()),
    ]).then(([c, f]) => {
      setConfig(c);
      setFeatures(f);
    });
  }, [tenantId]);

  if (!config || !features) return <LoadingScreen />;

  return (
    <TenantConfigContext.Provider value={config}>
      <TenantFeatureContext.Provider value={features}>
        {children}
      </TenantFeatureContext.Provider>
    </TenantConfigContext.Provider>
  );
}
```

```tsx
// 사용 — 경계가 명확해지는 지점
function Dashboard() {
  const config = useTenantConfig();
  const hasAI = useFeatureFlag('aiAnalytics');
  const hasDashV2 = useFeatureFlag('dashboardV2');

  return (
    <div style={{ color: config.primaryColor }}>       {/* 설정: "어떻게" */}
      <img src={config.logoUrl} alt="logo" />           {/* 설정: "어떻게" */}
      {hasDashV2 ? <DashboardV2 /> : <DashboardV1 />}  {/* flag: "있냐 없냐" */}
      {hasAI && <AIInsightsPanel />}                     {/* flag: "있냐 없냐" */}
    </div>
  );
}
```

근거: Clerk — "Creating a context to manage tenant-specific data allows different parts of the application to access tenant information easily"
(https://clerk.com/articles/multi-tenancy-in-react-applications-guide)

Context를 분리하는 이유: 설정 변경(로고 URL 수정) → TenantConfigContext만 리렌더. 기능 토글(AI 기능 ON) → TenantFeatureContext만 리렌더. 합치면 로고 바꿨는데 feature flag 소비자도 전부 리렌더.

#### 경계가 흐려지는 안티패턴

```tsx
// ❌ 안티패턴: 설정과 flag 혼합
const tenantSettings = {
  logoUrl: "...",              // 설정
  ssoEnabled: true,            // flag인데 설정처럼 섞임
  primaryColor: "#333",        // 설정
  maxUsers: 50,                // 이건 뭔가? → 플랜 제한? 설정?
  dashboardV2: true,           // flag인데 설정처럼 섞임
};
```

섞이면: 고객사 어드민이 `ssoEnabled`를 직접 끌 수 있게 되어 플랜 무력화, `maxUsers`가 설정인지 제한인지 모호 → 변경 권한 혼란, flag 변경 시 config 캐시까지 무효화 → 불필요한 API 호출.

### 시각화

```
┌─ 판단 플로차트 ──────────────────────────────────────────┐
│                                                          │
│  새로운 고객사별 차이 발견                                  │
│          │                                               │
│          ▼                                               │
│  ┌──────────────────┐                                    │
│  │ 기능 자체가 있냐  │                                    │
│  │ 없냐의 문제인가?  │                                    │
│  └────┬────────┬────┘                                    │
│    Yes│        │No                                       │
│       ▼        ▼                                         │
│  ┌─────────┐  ┌──────────────────┐                       │
│  │Feature  │  │ 값의 범위가       │                       │
│  │Flag     │  │ boolean 이상인가? │                       │
│  │테이블   │  └────┬────────┬────┘                       │
│  └─────────┘    Yes│        │No(boolean)                 │
│  "키카드"        ▼        ▼                              │
│            ┌─────────┐  ┌─────────┐                      │
│            │Config   │  │어느 쪽?  │                      │
│            │테이블   │  │문맥 판단 │                      │
│            └─────────┘  └─────────┘                      │
│            "객실세팅"                                     │
└──────────────────────────────────────────────────────────┘
```

---

## Q2. 설정과 플래그 영역을 정확히 어떻게 나누는지 궁금합니다

### 비유 확장: 호텔 체인의 "회색지대" 사례

| 호텔 상황 | 판단 | 이유 |
|-----------|------|------|
| 조식 시간을 7시→8시로 변경 | **객실 세팅** (Config) | 조식 기능은 존재, 운영 방식만 다름 |
| 조식 서비스 자체를 폐지 | **키카드** (Flag) | 기능 존재 여부 |
| 수영장 운영 시간 변경 | **객실 세팅** (Config) | 수영장은 존재, 시간만 조절 |
| 수영장을 VIP 전용으로 제한 | **?? 회색지대** | 기능은 있지만 접근 권한 문제 |
| 미니바 음료 종류 변경 | **객실 세팅** (Config) | 값의 범위가 enum/list |
| 미니바 자체를 없앰 | **키카드** (Flag) | 기능 존재 여부 |

회색지대가 생기는 이유: **"기능이 있긴 한데, 일부 조건에서만 보인다"**는 상황.

### 3단 판별 프레임워크

#### 1단: 존재 질문 — "이 기능의 UI/API 엔드포인트가 아예 없어야 하는가?"

```
Yes → Feature Flag (끝)
No  → 2단으로
```

```tsx
// Flag: 기능 자체가 렌더 트리에서 사라짐
{hasAIAnalytics && <AIInsightsPanel />}
// 이 고객사에는 AI 분석 메뉴 자체가 없다 → Flag
```

#### 2단: 변경 주체 질문 — "고객사 어드민이 스스로 바꿔도 되는가?"

```
Yes → Config (끝)
No  → 3단으로
```

```tsx
// Config: 고객사 어드민이 설정 페이지에서 직접 변경
<NotificationSettings
  defaultTime={config.notificationTime}    // "09:00" → "10:00"
  channels={config.notificationChannels}   // ["email", "slack"]
/>
```

#### 3단: 과금/계약 질문 — "이 차이가 플랜/계약에 묶여 있는가?"

```
Yes → Feature Flag (플랜 레벨에서 제어)
No  → Config
```

### 3영역 분리: Config + Flag + Limits

boolean으로 부족한 플랜 제한은 **Limits**라는 세 번째 영역으로 분리.

```sql
-- Flag의 확장: 플랜 제한(Limits/Quotas)
CREATE TABLE plan_limits (
  plan_id      UUID REFERENCES plans(id),
  limit_key    VARCHAR(100) NOT NULL,
  limit_value  INTEGER NOT NULL,
  PRIMARY KEY (plan_id, limit_key)
);

CREATE TABLE tenant_limit_overrides (
  tenant_id    UUID REFERENCES tenants(id),
  limit_key    VARCHAR(100) NOT NULL,
  limit_value  INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, limit_key)
);
```

```tsx
// React에서 3영역을 Context로 분리
interface TenantConfig {     // 어드민이 바꿈
  logoUrl: string;
  primaryColor: string;
  notificationTime: string;
  timezone: string;
}

interface TenantFeatures {   // 플랫폼이 제어 (boolean)
  sso: boolean;
  aiAnalytics: boolean;
  dashboardV2: boolean;
  bulkExport: boolean;
}

interface TenantLimits {     // 플랜이 결정 (숫자/enum)
  maxUsers: number;
  maxStorageGb: number;
  apiRateLimit: number;
  exportFormats: ('csv' | 'pdf' | 'xlsx')[];
}
```

```tsx
// 실제 소비 — 각 영역이 어디서 쓰이는지 명확
function TeamManagement() {
  const config   = useTenantConfig();
  const hasBulk  = useFeatureFlag('bulkExport');
  const maxUsers = useTenantLimit('maxUsers');
  const members = useTeamMembers();

  return (
    <div style={{ color: config.primaryColor }}>     {/* Config: 어떻게 */}
      <h2>팀 ({members.length} / {maxUsers}명)</h2>  {/* Limits: 얼마나 */}
      {members.length >= maxUsers && <UpgradeBanner />}
      <MemberList members={members} />
      {hasBulk && <BulkExportButton />}               {/* Flag: 있냐 없냐 */}
    </div>
  );
}
```

### 시각화: 판별 치트시트

```
┌───────────────────────────────────────────────────────────┐
│          "이 고객사별 차이를 어디에 넣지?"                    │
│                                                           │
│  Q1. UI/API가 아예 없어야 하나?                             │
│       │                                                   │
│    Yes ──→ 🚩 Feature Flag (tenant_features)              │
│       │                                                   │
│    No ──→ Q2. 고객사 어드민이 직접 바꿔도 되나?              │
│                │                                          │
│             Yes ──→ ⚙️  Config (tenant_configs)            │
│                │                                          │
│             No ──→ Q3. 플랜/계약에 묶인 숫자/범위인가?       │
│                       │                                   │
│                    Yes ──→ 📊 Limits (plan_limits)         │
│                       │                                   │
│                    No ──→ 🚩 Feature Flag                 │
│                          (변경 권한이 플랫폼에 있으므로)      │
└───────────────────────────────────────────────────────────┘
```

| 영역 | 변경 주체 | 값 타입 | 변경 빈도 | DB 테이블 | React Context |
|------|----------|---------|----------|-----------|---------------|
| Config | 고객사 어드민 | any | 수시 | `tenant_configs` | `ConfigCtx` |
| Flag | 플랫폼 운영 | boolean | 드묾 | `tenant_features` | `FeatureCtx` |
| Limits | 플랜/영업 | number/enum | 계약 시 | `plan_limits` | `LimitsCtx` |

---

## Q3. 이게 실무에서 어떻게 적용됩니까? (당근마켓을 예시로)

### 비유 연결: 당근비즈니스 = "동네 상점들이 입점한 백화점"

| 비유 요소 | 당근비즈니스 대응 |
|-----------|-----------------|
| 백화점 본사 | 당근 플랫폼 |
| 입점 상점 (자영업자) | 비즈프로필 = **Tenant** |
| 매장 인테리어 (간판 색상, 진열 방식) | **Config** — 프로필 꾸미기, 영업시간, 소식글 스타일 |
| 매장 층수/위치 배정 (1층 vs 지하) | **Flag** — 광고 전문가모드, 상품 판매 기능 활성화 |
| 월 광고비 한도, 상품 등록 개수 제한 | **Limits** — 플랜별 쿼터 |

근거: https://business.daangn.com/ , https://about.daangn.com/company/pr/archive/ (비즈프로필 상품 판매 기능 전국 오픈)

### 당근비즈니스 기능을 3영역으로 분류

3단 판별 프레임워크 적용:

| 기능 | 영역 | 판별 근거 |
|------|------|----------|
| 프로필 이미지, 소개글, 영업시간 | ⚙️ Config | 사장님이 수시로 변경 |
| 소식글 발행 설정 | ⚙️ Config | 사장님이 직접 관리 |
| 알림 수신 채널 (카톡/문자) | ⚙️ Config | 사장님 선호 |
| 전문가모드 광고 | 🚩 Flag | 메뉴 자체 유무 |
| 상품 판매 기능 | 🚩 Flag | 승인 업종만 활성화 |
| 정밀 타겟팅 (인구통계/관심사) | 🚩 Flag | 전문가모드에 종속 |
| 검색광고 | 🚩 Flag | 별도 상품, 활성화 여부 |
| 월 광고 예산 상한 | 📊 Limits | 플랜별 숫자 제한 |
| 등록 가능 상품 수 | 📊 Limits | 플랜별 쿼터 |
| 소식글 월 발행 횟수 | 📊 Limits | 무료/유료 플랜 차등 |

### DB 설계 — 당근비즈니스 버전

```sql
CREATE TABLE biz_profiles (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL,
  plan_id     UUID REFERENCES plans(id),
  biz_name    VARCHAR(100),
  category    VARCHAR(50),
  region_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ⚙️ Config
CREATE TABLE biz_configs (
  biz_id      UUID REFERENCES biz_profiles(id),
  config_key  VARCHAR(100) NOT NULL,
  config_val  JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (biz_id, config_key)
);

-- 🚩 Flag (플랜 기본 + 개별 오버라이드)
CREATE TABLE plan_features (
  plan_id      UUID REFERENCES plans(id),
  feature_key  VARCHAR(100) NOT NULL,
  enabled      BOOLEAN DEFAULT false,
  PRIMARY KEY (plan_id, feature_key)
);

CREATE TABLE biz_feature_overrides (
  biz_id       UUID REFERENCES biz_profiles(id),
  feature_key  VARCHAR(100) NOT NULL,
  enabled      BOOLEAN NOT NULL,
  reason       VARCHAR(200),  -- '베타 테스트 참여', '업종 승인'
  PRIMARY KEY (biz_id, feature_key)
);

-- 📊 Limits
CREATE TABLE plan_limits (
  plan_id      UUID REFERENCES plans(id),
  limit_key    VARCHAR(100) NOT NULL,
  limit_value  INTEGER NOT NULL,
  PRIMARY KEY (plan_id, limit_key)
);
```

#### Flag 해석 로직 — COALESCE 오버라이드 우선

```sql
SELECT COALESCE(
  bfo.enabled,           -- 1순위: 개별 오버라이드 (업종 승인 등)
  pf.enabled,            -- 2순위: 플랜 기본값
  false                  -- 3순위: 기본 OFF
) AS is_enabled
FROM biz_profiles bp
LEFT JOIN plan_features pf
  ON bp.plan_id = pf.plan_id AND pf.feature_key = 'product_sales'
LEFT JOIN biz_feature_overrides bfo
  ON bp.id = bfo.biz_id AND bfo.feature_key = 'product_sales'
WHERE bp.id = :biz_id;
```

### React 구현 — 당근비즈니스 어드민

```tsx
interface BizConfig {
  businessHours: Record<string, string>;
  profileImage: string;
  introduction: string;
  notification: { channel: 'kakao' | 'sms'; quietHours: string };
}

interface BizFeatures {
  expertAds: boolean;
  productSales: boolean;
  searchAds: boolean;
  precisionTargeting: boolean;
}

interface BizLimits {
  monthlyAdsBudget: number;
  maxProducts: number;
  monthlyNewsLimit: number;
}
```

```tsx
// 사이드바: Flag만 소비
function BizAdminSidebar() {
  const hasExpertAds    = useFeature('expertAds');
  const hasProductSales = useFeature('productSales');
  const hasSearchAds    = useFeature('searchAds');

  return (
    <nav>
      <SidebarItem to="/profile" label="비즈프로필" />
      <SidebarItem to="/news" label="소식" />
      <SidebarItem to="/ads" label="광고" />
      {hasExpertAds && <SidebarItem to="/ads/expert" label="전문가모드" />}
      {hasProductSales && <SidebarItem to="/products" label="상품 판매" />}
      {hasSearchAds && <SidebarItem to="/ads/search" label="검색광고" />}
    </nav>
  );
}
```

```tsx
// 상품 등록: 3영역 혼합 소비
function ProductRegistration() {
  const config = useBizConfig();
  const limits = useBizLimits();
  const hasProductSales = useFeature('productSales');
  const { products } = useMyProducts();

  // 🚩 Flag: 기능 자체가 없으면 진입 차단
  if (!hasProductSales) return <FeatureLockedPage feature="상품 판매" />;

  // 📊 Limits: 쿼터 초과 시 업셀
  if (products.length >= limits.maxProducts) {
    return <QuotaExceeded current={products.length} max={limits.maxProducts} upgradeTo="프로 플랜" />;
  }

  // ⚙️ Config + 📊 Limits: 정상 등록 화면
  return (
    <form>
      <ImageUploader />
      <Input label="상품명" />
      <Input label="가격" />
      <p className="hint">등록 가능: {products.length} / {limits.maxProducts}개</p>
      <p className="hint">영업시간: {config.businessHours.mon}</p>
    </form>
  );
}
```

### 시각화: 당근비즈니스 3영역 흐름

```
┌─ 당근비즈니스 3영역 아키텍처 ────────────────────────────────┐
│                                                              │
│  사장님 (Tenant Admin)              당근 플랫폼 (Platform)    │
│       │                                   │                  │
│       │ "내 가게 설정 변경"                │ "플랜/기능 관리"  │
│       ▼                                   ▼                  │
│  ┌──────────┐          ┌──────────────┐  ┌──────────┐       │
│  │biz_configs│         │biz_feature_  │  │plan_limits│       │
│  │(JSONB)   │          │overrides     │  │          │       │
│  └────┬─────┘          └──────┬───────┘  └────┬─────┘       │
│       │                       │               │              │
│       │              ┌────────┴───────┐       │              │
│       │              │  COALESCE      │       │              │
│       │              │  override →    │       │              │
│       │              │  plan_feat →   │       │              │
│       │              │  default       │       │              │
│       │              └────────┬───────┘       │              │
│       │                       │               │              │
│  ─────┼───── API ─────────────┼───────────────┼──────────── │
│       ▼                       ▼               ▼              │
│  ┌─────────┐          ┌──────────┐     ┌──────────┐         │
│  │ConfigCtx│          │FeatureCtx│     │LimitsCtx │         │
│  │변경: 수시│          │변경: 드묾│     │변경: 계약│         │
│  └────┬────┘          └────┬─────┘     └────┬─────┘         │
│       │                    │                │                │
│       ▼                    ▼                ▼                │
│  ┌──────────────────────────────────────────────────┐       │
│  │            React 컴포넌트 트리                      │       │
│  │                                                    │       │
│  │  프로필 편집  │  사이드바 메뉴  │  상품 등록 화면    │       │
│  │  ⚙️ Config만  │  🚩 Flag만     │  ⚙️+🚩+📊 혼합   │       │
│  │  소비         │  소비          │  소비             │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  리렌더 격리:                                                 │
│  로고 변경 → ConfigCtx만 → 프로필 편집만 리렌더               │
│  플랜 업그레이드 → FeatureCtx + LimitsCtx → 사이드바+상품만   │
└──────────────────────────────────────────────────────────────┘
```

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/React-context-전달과-상태경계/note.md` | **Context 분리 원칙의 실전 적용** | Config Context와 Feature Context를 분리하는 이유가 "변경 빈도가 다른 데이터는 Context를 나눠라"는 원칙. "장부와 방송망" 비유에서 여기서는 장부가 3개(설정·기능·제한), 방송망도 3개로 분리 |
| `study/learn/topics/도메인모델-표현레이어-분리패턴/note.md` | **도메인 경계 설계의 확장** | 도메인-표현 분리가 "데이터(what) vs 보여주기(how it looks)"의 경계라면, Config-Flag-Limits 분리는 "누가 바꾸나(who) × 바꾸는 빈도(when)"의 경계. Q4에서 다룬 "변경 전파 범위를 1:1로 좁히기" 원칙이 여기서도 적용 — flag 변경은 feature 소비자만, 설정 변경은 config 소비자만 영향 |
