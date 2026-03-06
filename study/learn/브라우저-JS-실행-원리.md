# 브라우저-JS-실행-원리

> 최초 질문: 브라우저는 어떻게 구성/동작하길래 프로그래밍 언어는 오직 js만 인식하나요?
> 일시: 2026-03-06

## Q1. 브라우저는 어떻게 구성/동작하길래 프로그래밍 언어는 오직 js만 인식하나요?

요약: 브라우저는 “아무 프로그래밍 언어나 읽는 범용 VM”이 아니라, **웹 표준 전용 호스트 런타임**이라서 기본 스크립팅 언어 계약이 **JavaScript(ECMAScript)** 로 고정돼 있습니다. `ref/`에 직접 근거가 없어 공식 문서/스펙 기준으로 답합니다.

**비유**
브라우저를 “웹 전용 공연장”으로 보면 이해가 쉽습니다.

| 비유 요소 | 실제 개념 | 대응 이유 |
|---|---|---|
| 공연장 건물 | 브라우저 | HTML/CSS/스크립트/입력/렌더링을 통합 운영 |
| 무대 설치팀 | HTML/CSS 파서 + 렌더링 엔진 | 문서를 구조화하고 화면으로 그림 |
| 통역 부스 | JS 엔진(V8, SpiderMonkey, JavaScriptCore 등) | 스크립트 텍스트를 실행 가능한 의미로 해석 |
| 조명/기계 제어판 | DOM, fetch, timer 같은 Web API | JS가 브라우저 기능을 조작하는 창구 |
| 진행 큐 매니저 | 이벤트 루프 | 입력, 네트워크, 렌더링, 콜백 실행 순서를 조정 |
| 공연장 규격 대본 | JavaScript | “이 무대에서 실행 가능한 스크립트 포맷”으로 표준화됨 |

핵심은 이겁니다. 브라우저는 “언어를 알아서 판별하는 존재”가 아니라, **처음부터 JavaScript를 실행하도록 설계된 웹 런타임**입니다.

**코드/텍스트 설명**
1. 브라우저의 본체는 JS가 아니라 브라우저 엔진입니다. Chromium 기준으로 렌더 프로세스가 DOM/CSS/입력/렌더링을 처리하고, 그 안의 이벤트 루프가 무엇을 언제 실행할지 정합니다. 공식 문서도 렌더링, 입력 라우팅, DOM 상태, 이벤트 루프 러너를 별도 구성요소로 설명합니다.  
출처: Chrome RenderingNG 아키텍처, 조회 2026-03-06  
<https://developer.chrome.com/docs/chromium/renderingng-architecture>

2. “왜 JS만 되나?”의 직접 답은 HTML 표준에 있습니다. `<script>` 는
   - `type` 생략/빈 문자열/JS MIME 이면 **classic JavaScript**
   - `type="module"` 이면 **JavaScript module**
   - 그 외 값이면 **data block** 이라서 브라우저가 실행하지 않습니다.  
   그리고 HTML 표준은, 현재는 JavaScript 외 언어를 브라우저가 지원하는 것이 표준과 충돌한다고 적고 있습니다. 즉 `<script type="text/python">...</script>` 같은 건 기본 브라우저가 실행하지 않습니다.  
출처: WHATWG HTML Living Standard, 2026-02-27 갱신 / 조회 2026-03-06  
<https://html.spec.whatwg.org/multipage/scripting.html#the-script-element>  
<https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages>

3. JS가 `document`, `window`, `fetch()` 를 쓰는 이유는 브라우저가 자기 내부 객체를 JS에 “바인딩”해서 노출하기 때문입니다. Web IDL 표준은 `Node`, `Document` 같은 DOM 객체가 브라우저 구현체의 platform object라고 설명하고, 이 객체들은 C++ 같은 언어로 구현될 수도 있다고 말합니다. V8 문서도 각 window/iframe 이 독립 JS context를 가지며, Chrome이 C++ DOM 노드를 JS 객체로 감싼다고 설명합니다.  
출처: Web IDL, 조회 2026-03-06  
<https://webidl.spec.whatwg.org/#es-platform-objects>  
출처: V8 embed docs, 조회 2026-03-06  
<https://v8.dev/docs/embed#contexts>

4. 실행 흐름은 대략 이렇습니다.
   - 브라우저가 HTML을 파싱
   - `<script>` 를 만나면 표준 규칙에 따라 “이건 JS다 / 아니다” 판정
   - JS면 엔진의 현재 context에서 실행
   - JS가 DOM/Web API를 호출
   - 변경 결과가 다시 렌더링 파이프라인으로 흘러감
   - 이 전체 순서를 이벤트 루프가 조정  
   HTML 표준도 이벤트, 스크립트, 렌더링, 네트워킹을 이벤트 루프로 조정한다고 설명합니다.  
출처: WHATWG HTML event loops, 조회 2026-03-06  
<https://html.spec.whatwg.org/multipage/webappapis.html#event-loops>

5. “그럼 다른 언어는 아예 못 도나?”는 조금 다르게 봐야 합니다.
   - TypeScript/JSX는 브라우저가 직접 실행하는 게 아니라 **미리 JS로 변환**됩니다.
   - Rust/C/C++는 **WebAssembly** 로 컴파일되면 브라우저에서 돌 수 있습니다.
   - 다만 WebAssembly도 웹 플랫폼에서 **JS를 보완하는 방향**으로 설계됐고, 역사적으로 웹 VM은 JS만 로드해 왔습니다.  
출처: MDN WebAssembly Concepts, 조회 2026-03-06  
<https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Concepts>

추론: 브라우저가 Python, Ruby, Rust 소스까지 “직접” 이해하려면, 각 언어의 파서/런타임/GC/모듈 시스템/보안 모델/디버깅/DOM 바인딩을 브라우저 간 공통 표준으로 맞춰야 합니다. 웹은 그 복잡성을 피하려고 **스크립팅 계약을 JS 하나로 고정**하고, 나머지는 “JS로 변환” 또는 “Wasm으로 컴파일”하는 방향으로 발전해 왔습니다.

**시각화**
```text
[HTML/CSS/JS 파일 도착]
          |
          v
   HTML Parser ------> DOM
      |                 |
      | <script> 발견   |
      v                 v
  script type 판정   CSS Parser -> CSSOM
      |
      +-- JS/classic,module --> JS Engine(Context)
      |                           |
      |                           +--> Web APIs(document, fetch, timer)
      |                           |
      |                           +--> Task / Microtask queue
      |
      +-- 그 외 type -----------> data block (실행 안 함)

DOM + CSSOM + JS 변경
          |
          v
     Layout / Paint / Composite
```

**연결**
- [JSX-객체-반환-원리.md:55](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/JSX-객체-반환-원리.md:55)  
  DOM 노드가 브라우저 환경에 종속적이라 React가 plain object를 중간 표현으로 택했다는 이전 정리와 이어집니다. “브라우저 고유 객체”와 “JS 데이터 표현”을 분리한다는 점이 같습니다.
- [scheduleUpdateOnFiber.md:684](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/scheduleUpdateOnFiber.md:684)  
  이전에 본 `microtask queue` 가 바로 이번 설명의 이벤트 루프 계층입니다. React의 스케줄링도 결국 브라우저의 task/microtask 모델 위에서 돌아갑니다.

한 줄 결론: 브라우저가 JS만 “인식”하는 이유는, 브라우저가 범용 언어 실행기가 아니라 **웹 표준이 정한 JS 전용 스크립트 호스트**이기 때문입니다.

원하면 다음 질문으로는 `script 태그를 만나면 파서가 왜 멈추는가` 또는 `WebAssembly가 있어도 왜 DOM은 보통 JS를 거치는가`를 이어서 설명할 수 있습니다.

## Q2. 그러면 브라우저 보다 js가 먼저있던겁니까?

네. **브라우저가 먼저**였습니다.

정확한 순서는 대략 이렇습니다.

- **1990년**: Tim Berners-Lee가 최초의 웹 브라우저 `WorldWideWeb`(나중에 `Nexus`로 개명)를 만듦
- **1993년**: `Mosaic` 브라우저가 대중화
- **1994년**: `Netscape Navigator` 등장
- **1995년**: Brendan Eich가 Netscape용 스크립트 언어로 JavaScript를 만듦
- **1997년**: JavaScript가 `ECMAScript`로 표준화

그래서 역사적으로는:

1. 먼저 브라우저가 있었고
2. 그 브라우저는 처음엔 주로 문서 표시와 링크 이동을 했고
3. 나중에 페이지를 “동적으로” 만들 필요가 생겨서 JavaScript가 붙었습니다

즉, “브라우저가 JS를 위해 만들어졌다”가 아니라, **브라우저가 먼저 있었고 그 위에서 동작할 스크립트 언어로 JS가 채택된 것**에 가깝습니다.

원하면 다음으로는 `왜 하필 JavaScript가 살아남고 다른 언어는 브라우저 기본 언어가 못 됐는지`까지 이어서 설명하겠습니다.

## Q3. 왜 js가 채택되었나요?

### 비유: 대형 공구와 현장 리모컨
1995년의 Netscape가 브라우저를 만들 때 필요한 건 두 종류였습니다.

| 비유 요소 | 실제 개념 | 대응 이유 |
|---|---|---|
| 공장에서 쓰는 대형 기계 | Java | 규모 있는 프로그램/컴포넌트 제작 쪽에 맞춰져 있었음 |
| 현장 작업자용 리모컨 | JavaScript | HTML 문서 안에 바로 넣어서 작은 동작을 빠르게 붙이기 쉬웠음 |
| 작업 현장 | 브라우저 + 웹페이지 | 사용자가 즉시 반응을 보길 원하는 공간 |
| 현장 작업자 | HTML 페이지 작성자 | 전문 개발자가 아니어도 다룰 수 있어야 했음 |

핵심은 이겁니다. **브라우저가 원한 것은 “무거운 범용 언어”보다 “페이지 작성자가 바로 박아 넣을 수 있는 가벼운 스크립트 언어”**였습니다.

### 설명
JavaScript가 채택된 이유는 “기술적으로 최고라서”라기보다, 당시 웹의 문제에 가장 잘 맞았기 때문입니다.

1. **웹페이지 작성자용 언어가 필요했습니다.**  
   Netscape와 Sun의 1995년 12월 4일 발표는 JavaScript를 `easy-to-use object scripting language`로 소개했고, **전문가와 비전문가 모두**를 대상으로 한다고 설명했습니다. 또 Java를 대체하는 게 아니라 **complement**한다고 했습니다.  
   출처: Netscape/Sun 발표, 1995-12-04  
   <https://web.archive.org/web/20070916144913/http://wp.netscape.com/newsref/pr/newsrelease67.html>

2. **처음부터 Java의 “경량 보조 언어” 역할로 설계됐습니다.**  
   Brendan Eich는 나중에 당시 Netscape 내부 판단을 회고하면서, 대상 사용자가 둘로 나뉘어 있었다고 설명했습니다.  
   - C++/Java로 컴포넌트를 만드는 사람
   - HTML 안에 스크립트를 박아 넣는 사람  
   그래서 “Java 하나로 다 하자”가 아니라, **Java는 큰 부품용 / JavaScript는 페이지 스크립팅용**으로 역할을 나눈 겁니다. 또 경영진이 새 언어가 **Java처럼 보여야 한다**고 요구해서 Python/Tcl류가 아니라 Java-like 문법으로 갔다고 설명합니다.  
   출처: Brendan Eich, `Popularity`, 2008-04-03  
   <https://brendaneich.com/2008/04/popularity/>

3. **브라우저에 내장돼 배포가 쉬웠습니다.**  
   별도 설치 없이 브라우저만 있으면 실행됐습니다. 웹에선 이게 매우 컸습니다. 사용자가 런타임을 따로 깔 필요가 없으니, 페이지 작성자가 즉시 동적인 기능을 배포할 수 있었습니다.  
   추론: “웹페이지 안에 직접 붙일 수 있는 스크립트”라는 성격과 브라우저 번들 배포 구조가 채택을 가속했습니다.

4. **빨리 표준화되어 굳어졌습니다.**  
   Ecma는 **1996년 11월**에 표준화 작업이 시작됐고, **1997년 6월** ECMA-262 1판이 승인됐다고 정리합니다. 이 시점부터 “Netscape의 언어”가 아니라 **브라우저들이 맞춰야 하는 표준 언어**가 되었습니다.  
   출처: Ecma International, ECMAScript history  
   <https://ecma-international.org/news/ecmascript-history/>

정리하면, JavaScript는 이렇게 굳었습니다.

- **문제 적합성**: HTML 작성자가 쓰기 쉬움
- **제품 적합성**: 브라우저에 기본 탑재
- **사업 적합성**: 당시 Java 열풍과 결합하기 좋음
- **제도 적합성**: 빠르게 표준화됨

즉, **브라우저가 JS를 선택했다기보다, Netscape가 웹페이지용 언어로 JS를 밀었고, 그게 배포와 표준화에서 이겨서 브라우저 기본 언어가 된 것**에 가깝습니다.

### 시각화
```text
정적 HTML만으로는 부족
        |
        v
브라우저 안에서 바로 도는 "가벼운 스크립트" 필요
        |
        v
Netscape: Java는 무겁고 대상이 다름
        |
        v
JavaScript 도입
- HTML에 직접 삽입 가능
- 비전문가도 접근 가능
- Java의 보조 언어 포지션
        |
        v
브라우저 기본 탑재로 빠른 확산
        |
        v
ECMAScript 표준화 (1996-11 시작, 1997-06 승인)
        |
        v
브라우저의 기본 스크립트 언어로 고착
```

### 연결
- 이전 질문과 직접 연결됩니다. “브라우저가 왜 JS만 실행하나?”의 답은 결국 **역사적으로 JS가 브라우저 표준 스크립트 언어로 굳어졌기 때문**입니다.
- [scheduleUpdateOnFiber.md:684](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/scheduleUpdateOnFiber.md:684) 에서 봤던 microtask/event loop도, 이렇게 채택된 JavaScript가 브라우저 호스트 위에서 실행되는 현재 구조의 결과입니다.

한 줄 결론: **JS가 채택된 이유는 성능 최강 언어라서가 아니라, 1995년 웹에 가장 잘 맞는 “브라우저 내장형, HTML 친화적, 비전문가도 쓸 수 있는 가벼운 스크립트”였기 때문입니다.**

원하면 다음엔 `그럼 왜 Python이나 Java가 아니라 하필 JS 문법이었나`를 더 파고들 수 있습니다.

## Q4. 그러면 브라우저는 js를 어떻게 인식/처리하나요? 예를들어 js에서 변수를 선언/할당, 함수 실행등 간단한 예시로 설명해주세요

### 비유: 접수 데스크 + 통역기 + 작업대
브라우저가 JS를 처리하는 모습은 이렇게 보면 됩니다.

| 비유 요소 | 실제 개념 | 대응 이유 |
|---|---|---|
| 접수 데스크 | HTML 파서 | 문서에서 `<script>`를 발견하고 “이게 실행할 JS인지” 분류 |
| 통역기 | JS 엔진(V8, SpiderMonkey, JavaScriptCore) | JS 텍스트를 읽어서 실행 가능한 내부 형태로 바꿈 |
| 이름표 서랍 | 실행 컨텍스트의 바인딩(bindings) | 변수/함수 이름과 값을 보관 |
| 임시 작업대 | 콜 스택의 함수 프레임 | 함수가 호출될 때마다 지역 변수와 매개변수를 따로 관리 |

핵심은 브라우저가 JS를 “문법만 보고 대충 알아채는” 게 아니라, **HTML/웹 표준이 정한 위치와 규칙으로 JS임을 판정하고**, 그다음 **JS 엔진에 넘겨 파싱/컴파일/실행**한다는 점입니다.

### 코드/텍스트 설명
예시는 `<script>` 기준으로 보겠습니다.

```html
<script>
  let x = 1;

  function add(n) {
    const y = x + n;
    return y;
  }

  x = 5;
  const result = add(2);
  console.log(result);
</script>
```

#### 1. 브라우저가 “이건 JS다”라고 인식하는 단계
HTML 파서가 `<script>`를 만나면 `type`을 봅니다.

- `type`이 없거나 비어 있으면: **classic JavaScript**
- `type="module"`이면: **JavaScript module**
- 그 외 값이면: **실행 안 하는 data block**

즉 아래는 실행됩니다.

```html
<script>...</script>
<script type="module">...</script>
```

하지만 아래는 기본 브라우저가 실행하지 않습니다.

```html
<script type="text/python">...</script>
```

근거: HTML Standard는 `<script>`의 `type` 분류를 이렇게 정의하고, 다른 값은 data block으로 처리한다고 설명합니다. 또한 현재 표준 모델상 브라우저에서 JS 이외 언어를 지원하는 것은 충돌한다고 적고 있습니다.  
출처: WHATWG HTML Standard, 조회 2026-03-06  
<https://html.spec.whatwg.org/multipage/scripting.html#the-script-element>  
<https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages>

#### 2. 브라우저가 JS 엔진에 코드를 넘기는 단계
브라우저는 JS 소스 문자열을 엔진에 넘깁니다. Chrome/V8 기준으로는:

- parser가 소스를 읽어 **AST(문법 트리)** 를 만들고
- Ignition compiler가 AST를 받아 **bytecode** 를 만들고
- interpreter가 그 bytecode를 실행합니다

출처: V8 공식 문서, 조회 2026-03-06  
<https://v8.dev/blog/background-compilation>  
<https://v8.dev/blog/ignition-interpreter>

추론: Firefox(SpiderMonkey), Safari(JavaScriptCore)도 내부 구현은 다르지만, 큰 흐름은 비슷합니다. “텍스트 → 파싱 → 내부 표현 → 실행”입니다.

#### 3. 변수 선언/할당은 어떻게 처리되나
브라우저 자체가 아니라 **JS 엔진**이 실행 컨텍스트를 만들고, 그 안에 이름표 서랍 같은 바인딩 공간을 둡니다. MDN도 실행 컨텍스트가 `var`, `let`, `const`, `function` 같은 바인딩을 추적한다고 설명합니다.

이 예시에서 전역 실행 컨텍스트는 대략 이런 느낌입니다.

```text
Global Execution Context
- x
- add
- result
- this / global object(window)
```

이제 줄별로 보면:

```js
let x = 1;
```

- `x`라는 이름을 위한 바인딩이 현재 스코프에 준비됨
- 이 줄이 실행되면서 `x`에 `1`이 들어감

```js
x = 5;
```

- 새 변수를 만드는 게 아니라
- 이미 있는 `x` 바인딩의 값을 `5`로 바꿈

즉:

- 선언: 이름표 서랍을 만듦
- 할당: 그 서랍 안 값을 바꿈

#### 4. 함수 선언/호출은 어떻게 처리되나
```js
function add(n) {
  const y = x + n;
  return y;
}
```

엔진은 `add`를 함수 객체로 만들고, `add`라는 이름에 연결합니다.

이후:

```js
const result = add(2);
```

가 실행되면:

1. `add(2)` 호출
2. 콜 스택에 `add`용 새 프레임 추가
3. 그 프레임 안에 `n = 2`, `y` 같은 지역 바인딩 공간 생성
4. `x + n` 계산  
   여기서 `x`는 바깥 전역 스코프의 값을 참조합니다. 지금 `x`는 5이므로:
   - `x + n` = `5 + 2` = `7`
5. `y = 7`
6. `return y`로 `7` 반환
7. `add` 프레임 제거
8. 바깥으로 돌아와 `result = 7`

그다음:

```js
console.log(result);
```

- `result` 값을 읽어서
- 브라우저가 제공한 `console` API를 호출합니다

여기서 `console`은 JS 언어 자체보다는 **브라우저 호스트가 제공하는 기능**입니다.  
출처: MDN JavaScript execution model, 조회 2026-03-06  
<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model>

### 시각화
```text
HTML 문서
  |
  v
<script> 발견
  |
  v
type 검사
  |
  +-- 없거나 JS MIME --> "이건 JS"
  |                     |
  |                     v
  |              JS 엔진으로 전달
  |                     |
  |                     v
  |          Parser -> AST -> Bytecode -> Execute
  |
  +-- 다른 type -------> data block (실행 안 함)


예제 실행 시점:

전역 컨텍스트:
[x=?, add=fn, result=?]

let x = 1
[x=1, add=fn, result=?]

x = 5
[x=5, add=fn, result=?]

add(2) 호출
Stack:
- Global
- add frame: [n=2, y=?]

const y = x + n
add frame: [n=2, y=7]

return y
Stack:
- Global

const result = 7
[x=5, add=fn, result=7]
```

### 연결
- [scheduleUpdateOnFiber.md:684](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/scheduleUpdateOnFiber.md:684)  
  이전에 봤던 microtask/event loop는 “실행된 뒤의 비동기 작업이 언제 다시 돌아오나”의 문제이고, 이번 답변은 그보다 앞단인 “JS가 처음 어떻게 읽히고 실행되나”입니다.
- [JSX-객체-반환-원리.md:55](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/JSX-객체-반환-원리.md:55)  
  React가 DOM 대신 JS 객체를 중간 표현으로 쓰는 것도, 결국 브라우저가 JS 엔진과 DOM 호스트 API를 분리해 운용하기 때문입니다.

한 줄로 줄이면: **브라우저는 `<script>` 문맥으로 JS를 판정하고, JS 엔진이 그 코드를 파싱해 내부 코드로 바꾼 뒤, 실행 컨텍스트와 콜 스택을 써서 변수와 함수를 처리합니다.**

원하면 다음엔 이 예시를 이어서 `호이스팅`, `TDZ`, `클로저`까지 연결해서 설명하겠습니다.

## Q5. 보통 면접등에서 물어보는 "google.com을 주소창에 입력하여 엔터를 누르면 어떤일이 일어나나요?" / "critical rendering path는 뭔가요?" 같은 질문을 이해하고 제가 설명할수있을정도로 알고싶습니다

### 비유: 택배 배송 + 무대 설치
이 두 질문은 사실 하나로 연결됩니다.

| 비유 요소 | 실제 개념 | 대응 이유 |
|---|---|---|
| 주소를 적고 배송 요청 | 주소창에 URL 입력 후 엔터 | 사용자가 navigation 시작 |
| 물류센터 조회 | DNS/TCP/TLS/HTTP | 서버를 찾고 연결하고 응답 받음 |
| 배송 온 박스 개봉 | HTML 수신 및 파싱 | 문서를 해석하기 시작 |
| 무대 골조 설치 | DOM 생성 | 화면 구조가 만들어짐 |
| 조명/의상 세팅 | CSSOM 생성 | 어떻게 보여야 하는지 결정 |
| 배우 대사 수정 | JavaScript 실행 | DOM/CSSOM을 바꾸거나 추가 요청 |
| 실제 무대 배치 | Render Tree + Layout | 보이는 요소의 위치/크기 계산 |
| 조명 켜기 | Paint + Composite | 픽셀을 화면에 그림 |

핵심은 이겁니다.

- `google.com 입력 후 엔터` 질문은 **브라우저의 전체 네비게이션 흐름**
- `critical rendering path` 질문은 그중 **“응답을 받은 뒤 화면에 첫 픽셀이 나오기까지”의 렌더링 구간**

즉, **CRP는 전체 흐름의 뒷부분 서브셋**입니다.

### 설명
#### 1. `google.com` 입력 후 엔터를 누르면
면접에서는 보통 아래 순서로 말하면 됩니다.

1. **브라우저가 URL을 해석합니다.**  
   주소창 입력이 검색어인지 URL인지 판별하고, navigation을 시작합니다. Chrome 문서도 이 시작점은 browser process가 담당한다고 설명합니다.  
   출처: Chrome for Developers, *Inside look at modern web browser (part 2)*, 2018-09-07  
   <https://developer.chrome.com/blog/inside-browser-part2/>

2. **캐시 / 서비스워커 / 기존 연결을 먼저 확인할 수 있습니다.**  
   항상 네트워크로 바로 나가는 게 아닙니다. 브라우저 HTTP 캐시, DNS 캐시, 서비스워커, 연결 재사용이 있으면 일부 단계를 건너뛸 수 있습니다.  
   로컬 연결: [캐시-개념.md:122](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:122), [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)

3. **필요하면 DNS 조회를 합니다.**  
   `google.com` 도메인을 IP로 바꿉니다.

4. **연결을 수립합니다.**  
   보통 HTTPS이므로 TCP/QUIC 계층 연결과 TLS 협상이 들어갑니다. MDN도 navigation에는 DNS lookup, TCP handshake, TLS negotiation이 포함된다고 설명합니다.  
   출처: MDN, *Navigation and resource timings*, 2025-10 갱신 기준  
   <https://developer.mozilla.org/en-US/docs/Web/Performance/Navigation_and_resource_timings>

5. **HTTP 요청을 보냅니다.**  
   서버가 HTML 문서를 응답합니다. 여기까지가 흔히 네트워크 구간입니다.  
   이 시점의 지표가 TTFB와 연결됩니다.  
   출처: MDN, *Time to First Byte (TTFB)*, 2025-07-18 수정  
   <https://developer.mozilla.org/docs/Glossary/time_to_first_byte>

6. **브라우저가 HTML을 받으면서 바로 파싱합니다.**  
   렌더러 프로세스의 메인 스레드가 HTML을 DOM으로 바꾸기 시작합니다. Chrome 문서도 renderer process가 commit된 navigation의 HTML을 받아 DOM으로 만든다고 설명합니다.  
   출처: Chrome for Developers, *Inside look at modern web browser (part 3)*, 2018  
   <https://developer.chrome.com/blog/inside-browser-part3>

7. **추가 리소스를 발견하고 가져옵니다.**  
   HTML 안의 CSS, JS, 이미지 등을 요청합니다.

8. **CSS를 파싱해서 CSSOM을 만듭니다.**  
   CSS는 렌더링을 막는 자원이 될 수 있습니다. MDN은 CRP 설명에서 CSSOM이 완성돼야 렌더가 진행된다고 설명합니다.  
   출처: MDN, *Critical rendering path*  
   <https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path>

9. **JavaScript를 파싱하고 실행합니다.**  
   이 과정에서 DOM을 바꾸거나, 추가 요청을 날리거나, 렌더링을 지연시킬 수 있습니다. 특히 전통적인 동기 `<script>`는 HTML 파서를 멈출 수 있습니다. MDN은 parser-blocking resources와 render-blocking CSS를 함께 설명합니다.  
   출처: MDN, *Critical rendering path*  
   <https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path>

10. **DOM + CSSOM으로 Render Tree를 만들고 Layout을 계산합니다.**  
    무엇을 보일지, 어디에 보일지 계산합니다.

11. **Paint / Composite를 거쳐 화면에 픽셀을 그립니다.**  
    여기서 사용자가 “페이지가 떴다”고 느끼기 시작합니다.  
    로컬 연결: [useEffect-사이드이펙트-역할.md:59](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/useEffect-사이드이펙트-역할.md:59)

12. **그 뒤에도 끝이 아닙니다.**  
    `DOMContentLoaded`, `load`, 이후 비동기 JS, 이미지 로드, hydration, SPA 로직 등이 계속 이어질 수 있습니다.  
    출처: MDN, *Navigation and resource timings*  
    <https://developer.mozilla.org/en-US/docs/Web/Performance/Navigation_and_resource_timings>

#### 2. Critical Rendering Path는 무엇인가
면접에서는 이렇게 정의하면 됩니다.

> Critical Rendering Path는 브라우저가 **HTML, CSS, JS를 화면의 픽셀로 바꾸는 핵심 단계의 연쇄**입니다.

보통 단계는 이렇게 말합니다.

1. HTML 파싱 -> **DOM**
2. CSS 파싱 -> **CSSOM**
3. DOM + CSSOM -> **Render Tree**
4. **Layout** -> 크기/위치 계산
5. **Paint** -> 픽셀 그리기
6. **Composite** -> 레이어 합성

MDN은 핵심 CRP를 DOM, CSSOM, render tree, layout, paint로 설명합니다. Chrome 문서는 실제 브라우저 파이프라인에서 compositing까지 포함해 설명합니다.  
출처: MDN, *Critical rendering path*  
<https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path>  
출처: Chrome for Developers, *Inside look at modern web browser (part 3)*  
<https://developer.chrome.com/blog/inside-browser-part3>

#### 3. 면접에서 자주 보는 함정
- **항상 DNS부터 한다**: 아닙니다. 캐시 hit, 서비스워커, 기존 연결 재사용이면 건너뛸 수 있습니다.
- **CRP = 네트워크 전체**: 아닙니다. 보통 CRP는 응답 이후 렌더링 핵심 구간을 뜻합니다.
- **JS는 항상 렌더를 막는다**: 아닙니다. `async`, `defer`, `module`, worker 등에 따라 다릅니다. 다만 동기 스크립트는 파서를 막을 수 있습니다.
- **DOMContentLoaded가 곧 완전 렌더 완료**: 아닙니다. 이미지, 폰트, 후속 JS, hydration 등은 이후에도 진행됩니다.

### 시각화
```text
[주소창에 google.com 입력]
          |
          v
Browser Process
- URL 해석
- 캐시 / 서비스워커 / 연결 재사용 확인
          |
          v
Network
- DNS
- TCP or QUIC
- TLS
- HTTP 요청/응답
          |
          v
HTML 도착
          |
          v
Renderer Process
- HTML 파싱 -> DOM
- CSS 요청/파싱 -> CSSOM
- JS 요청/실행 -> DOM/CSSOM 변경 가능
          |
          v
Render Tree
          |
          v
Layout
          |
          v
Paint
          |
          v
Composite
          |
          v
화면 표시

전체 질문: ----------------------------------------------->
"google.com 입력 후 엔터"

CRP 질문:                           ----------------------->
                                  "DOM/CSSOM -> Layout -> Paint"
```

### 면접용 답변
#### 30초 버전
`google.com`을 입력하고 엔터를 누르면 브라우저가 먼저 URL을 해석하고, 캐시나 서비스워커를 확인한 뒤 필요하면 DNS 조회, 연결 수립, TLS 협상 후 HTTP 요청을 보냅니다. HTML 응답이 오면 렌더러가 HTML을 파싱해 DOM을 만들고, CSSOM과 JS 실행을 거쳐 render tree, layout, paint, composite 순서로 화면에 그립니다. Critical Rendering Path는 이 전체 중에서 HTML/CSS/JS가 픽셀로 변하는 렌더링 핵심 구간을 말합니다.

#### 2분 버전
브라우저 네비게이션은 크게 네트워크 구간과 렌더링 구간으로 나눌 수 있습니다. 사용자가 URL을 입력하면 browser process가 navigation을 시작하고, 캐시나 서비스워커, 기존 연결 재사용 가능성을 확인합니다. 필요하면 DNS lookup으로 IP를 찾고, TCP 또는 QUIC 연결과 TLS 협상을 거쳐 HTTPS 요청을 보냅니다. 서버가 HTML을 응답하면 renderer process의 main thread가 HTML을 파싱하며 DOM을 만들고, 동시에 CSS와 JS 같은 하위 리소스를 발견해 가져옵니다. CSS는 CSSOM을 만들고 렌더링을 막을 수 있으며, 동기 JavaScript는 파싱을 멈추거나 DOM을 변경할 수 있습니다. DOM과 CSSOM이 준비되면 render tree를 만들고, layout에서 각 요소의 위치와 크기를 계산한 뒤 paint와 composite를 통해 실제 픽셀을 화면에 그립니다. 이 뒤에도 DOMContentLoaded, load, 후속 JS 실행은 계속될 수 있습니다. Critical Rendering Path는 이 중 DOM 생성부터 CSSOM, render tree, layout, paint로 이어지는 화면 표시 핵심 경로입니다.

### 연결
- [캐시-개념.md:122](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:122), [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)  
  이번 질문의 앞단인 HTTP 캐시, DNS 캐시와 직접 연결됩니다.
- [useEffect-사이드이펙트-역할.md:59](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/useEffect-사이드이펙트-역할.md:59)  
  React의 effect가 “브라우저 paint 이후”에 실행된다는 내용은, 이번 CRP의 `paint` 단계와 직접 맞닿아 있습니다.
- [scheduleUpdateOnFiber.md:684](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/scheduleUpdateOnFiber.md:684)  
  렌더링 이후의 비동기 흐름은 결국 브라우저의 event loop / microtask 모델 위에서 돌아갑니다.

한 줄 결론: **`google.com 입력 후 엔터`는 브라우저의 end-to-end navigation 질문이고, `critical rendering path`는 그중 응답 이후 화면이 만들어지는 렌더링 핵심 경로 질문입니다.**

원하면 다음 단계로 바로 이어서
1. 제가 면접관처럼 질문하고
2. 당신이 답하고
3. 제가 문장 단위로 교정해드릴 수 있습니다.

## Q6. "google.com" 답변 2번중 "항상 네트워크로 바로 나가는게 아니다"라는 말이라면 저기서 언급된 캐시는 사용자 로컬에 있는겁니까?

네, **대체로는 사용자 로컬**이라고 보면 됩니다. 다만 **전부 다 로컬은 아닙니다**.

짧게 구분하면 이렇습니다.

| 항목 | 위치 | 로컬 여부 |
|---|---|---|
| 브라우저 HTTP 캐시 | 브라우저 메모리/디스크 | 예 |
| Service Worker의 `Cache Storage` | 브라우저 저장소 | 예 |
| 브라우저 메모리 캐시 | 브라우저 프로세스 메모리 | 예 |
| DNS 캐시 | 브라우저 / OS / 공유기 / ISP 리졸버 | 경우에 따라 다름 |
| CDN 캐시 | 사용자 근처의 서버 | 아니오 |

즉 제가 말한 “항상 네트워크로 바로 나가는 게 아니다”에서 핵심 예시는 보통 이런 것들입니다.

- **브라우저 HTTP 캐시 hit**
  - 사용자 컴퓨터 안의 브라우저 캐시에서 바로 응답
  - 서버까지 안 감
- **Service Worker가 가로채서 응답**
  - 이것도 사용자 브라우저 안에서 처리
  - 서버까지 안 감
- **DNS 캐시 hit**
  - 이건 조금 다릅니다
  - 브라우저나 OS에 있으면 로컬이 맞지만
  - 공유기나 ISP DNS 서버 캐시일 수도 있어서 완전한 “내 컴퓨터 로컬”만은 아닙니다
- **기존 연결 재사용**
  - 이건 엄밀히 말해 “캐시”라기보다 이미 열려 있던 연결을 다시 쓰는 겁니다

면접에서는 이렇게 말하면 깔끔합니다.

> 항상 origin 서버까지 네트워크 요청이 가는 것은 아닙니다. 브라우저 HTTP 캐시나 서비스워커 캐시가 hit 되면 사용자 로컬에서 바로 응답할 수 있고, DNS도 브라우저나 OS 캐시에서 해결될 수 있습니다. 다만 DNS 캐시는 공유기나 ISP 리졸버 계층에도 있을 수 있어서 전부가 로컬 캐시는 아닙니다.

로컬 연결:
[캐시-개념.md:122](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:122), [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)

원하면 다음엔 제가 `google.com 입력 후 엔터` 흐름을 **“캐시 hit인 경우” / “cache miss인 경우”**로 나눠서 다시 설명해드릴게요.

## Q7. 정리하면 사용자가 주소를 입력 -> 이동을 하려할때 "브라우저가" 요청을 보내야할지를 판단하는거고, 그 판단에는 "사용자" 컴퓨터나 "사용자" 브라우저에 이미 주소와 대응되는 결과가 있다면 그대로 반환하고 요청을 안보낸다는거죠?

네, **큰 흐름은 맞습니다.** 다만 정확히 말하면:

> 사용자가 주소를 입력하면 브라우저가 navigation을 시작하고,  
> **반드시 origin 서버까지 새 요청을 보낼지**,  
> **로컬 캐시/서비스워커로 처리할지**,  
> **조건부 검증만 할지**를 판단합니다.

조금만 더 정확히 고치면 이렇게 됩니다.

1. **브라우저가 먼저 판단합니다.**
   - 캐시가 있는지
   - 서비스워커가 가로챌지
   - DNS를 다시 조회해야 하는지
   - 기존 연결을 재사용할 수 있는지
   - HTTP 캐시가 아직 유효한지

2. **“이미 결과가 있다”도 경우가 나뉩니다.**
   - **완전한 캐시 hit**
     - 브라우저/서비스워커가 로컬에 있는 응답을 그대로 사용
     - origin 서버 요청 안 보낼 수 있음
   - **조건부 검증(revalidation)**
     - 로컬에 응답은 있지만, 아직 최신인지 서버에 확인
     - `If-None-Match`, `If-Modified-Since` 같은 조건부 요청 전송
     - 서버가 `304 Not Modified`를 주면 본문 없이 로컬 캐시 재사용
   - **cache miss**
     - 새로 네트워크 요청

3. **모든 캐시가 “응답 전체”를 대신해 주는 건 아닙니다.**
   - **HTTP 캐시**: HTML/CSS/JS 응답 자체를 대신할 수 있음
   - **DNS 캐시**: IP만 기억함  
     - DNS 조회는 생략할 수 있지만
     - HTTP 요청 자체는 여전히 보낼 수 있음

그래서 당신 문장을 면접용으로 다듬으면 이렇게 말하면 좋습니다.

> 사용자가 URL을 입력하면 브라우저가 먼저 navigation을 시작하고, 로컬 HTTP 캐시나 서비스워커 캐시를 사용할 수 있는지 판단합니다. 캐시가 유효하면 origin 서버까지 새 요청을 보내지 않을 수 있고, 캐시는 있지만 최신 여부 확인이 필요하면 조건부 요청만 보냅니다. DNS 캐시는 도메인 해석 단계만 줄여줄 뿐이고, 응답 본문 캐시와는 역할이 다릅니다.

한 줄로 더 압축하면:

> **브라우저가 “무조건 요청”하는 게 아니라, 캐시 정책에 따라 `로컬 사용 / 검증 요청 / 새 요청` 중 하나를 선택한다**가 정확합니다.

원하면 다음엔 이걸 기준으로 `cache hit`, `304`, `cache miss` 3가지 경우를 타임라인으로 그려드릴게요.

## Q8. DNS가 뭔가요?

DNS는 **Domain Name System**이고, 한 줄로 말하면:

> `google.com` 같은 **사람이 읽는 이름**을  
> `142.250.x.x` 같은 **컴퓨터가 연결할 주소(IP)** 로 바꿔주는 시스템입니다.

비유하면 **인터넷 전화번호부**입니다.

- 사람은 `google.com`을 기억함
- 컴퓨터는 IP 주소로 통신함
- DNS가 둘을 연결해 줌

예를 들면:

```text
사용자 입력: google.com
DNS 조회 결과: 142.250.xx.xx
브라우저: 아, 이 IP로 연결하면 되는구나
```

중요한 점은 DNS가 **페이지 내용을 주는 게 아니라**,  
**“어디로 요청 보내야 하는지”만 알려준다**는 겁니다.

그래서 흐름은 보통 이렇게 됩니다.

1. 사용자가 `google.com` 입력
2. 브라우저/OS가 DNS 캐시 확인
3. 없으면 DNS 서버에 물어봄
4. IP 주소를 받음
5. 그 IP로 HTTP/HTTPS 요청
6. 서버가 HTML/CSS/JS 응답

즉:

- **DNS 캐시**: “주소 변환 결과”를 캐시
- **HTTP 캐시**: “응답 본문(HTML/CSS/JS)”을 캐시

이 둘은 다릅니다.

짧게 면접식으로 말하면:

> DNS는 도메인 이름을 IP 주소로 변환하는 분산 시스템입니다. 브라우저가 URL로 요청을 보내기 전에 먼저 DNS를 통해 서버 주소를 알아내고, 이후 그 IP로 실제 HTTP/HTTPS 통신을 합니다.

원하면 다음엔 `브라우저가 DNS를 실제로 어떻게 조회하는지`를 `브라우저 캐시 -> OS 캐시 -> DNS resolver` 순서로 설명해드릴게요.

## Q9. DNS에 결과가 없을수도있나요? 즉 "some.com"을 입력했는데 DNS에 대응되는 IP주소가 없을수도있는지?

네, **그럴 수 있습니다.**

정확히는 몇 가지 경우가 있습니다.

1. **도메인 자체가 없음**
   - 예: 등록되지 않은 도메인
   - DNS는 보통 `NXDOMAIN` 같은 의미로 “그 이름 자체가 없다”고 응답합니다.

2. **도메인은 있는데 IP 레코드가 없음**
   - 도메인은 존재하지만 `A`(IPv4) / `AAAA`(IPv6) 레코드가 없을 수 있습니다.
   - 이 경우도 브라우저는 연결할 IP를 못 얻습니다.

3. **DNS 설정이 깨졌거나 조회 실패**
   - DNS 서버 오류, timeout, 전파 지연 등으로
   - 원래는 있어야 할 IP를 지금 못 받을 수도 있습니다.

중요한 구분은 이겁니다.

- **DNS에 IP가 없음**: 어디로 가야 할지 모름
- **IP는 있음, 그런데 서버가 죽어 있음**: 어디로 갈지는 아는데 응답이 안 옴

즉 질문에 답하면:

> 네. 사용자가 어떤 도메인을 입력했을 때, DNS가 그 이름에 대응되는 IP를 못 줄 수 있습니다.

면접식으로 짧게 말하면:

> 가능합니다. 도메인이 존재하지 않거나, 존재해도 A/AAAA 레코드가 없거나, DNS 조회 자체가 실패하면 브라우저는 IP를 얻지 못해 서버에 연결할 수 없습니다.

원하면 다음엔 `A`, `AAAA`, `CNAME`이 각각 뭐고 브라우저가 어떤 순서로 따라가는지도 설명해드리겠습니다.

## Q10. 그러면 OS나 브라우저에 DNS 캐싱되었는지 확인 << 이건 이미 내가 예전에 갔다온 주소에 대응되는 IP가 있는걸까요?

네, **대체로 맞습니다.**

정확히 말하면 DNS 캐시에 들어 있는 건:

> “예전에 조회했던 도메인 이름 -> 그때 받은 DNS 결과(IP 등)” 입니다.

즉 브라우저나 OS가 DNS 캐시를 본다는 건 보통 이런 뜻입니다.

```text
google.com -> 142.250.xx.xx
example.com -> 93.184.216.34
```

그래서 당신이 이해한

> “예전에 갔다 온 주소에 대응되는 IP가 있는지 확인한다”

는 표현은 **거의 정확합니다.**

다만 2가지는 같이 알아야 합니다.

### 비유
DNS 캐시는 “예전에 적어둔 전화번호 메모”에 가깝습니다.

- `google.com` = 사람 이름
- IP 주소 = 전화번호
- DNS 캐시 = 예전에 적어둔 전화번호 메모

브라우저는 먼저 메모를 보고,
있으면 그 번호를 바로 쓰고,
없거나 오래됐으면 다시 전화번호부(DNS 서버)에 물어봅니다.

### 정확히 보정할 점
1. **반드시 “직접 방문한 적 있는 주소”만은 아닙니다.**
   - 내가 페이지 하나 방문했을 때
   - 그 안에서 이미지, CSS, JS, API, 광고, 폰트 도메인도 같이 조회될 수 있습니다.
   - 그래서 사용자가 주소창에 직접 친 적 없는 도메인도 DNS 캐시에 있을 수 있습니다.

2. **영원히 저장되는 게 아닙니다.**
   - DNS 결과에는 **TTL(Time To Live)** 이 있어서
   - 일정 시간이 지나면 캐시가 만료됩니다.
   - 그러면 다시 DNS 서버에 물어봐야 합니다.

즉 더 정확한 문장은 이겁니다.

> 브라우저나 OS는 과거에 조회한 도메인 이름에 대한 DNS 결과(IP 주소 등)가 캐시에 남아 있는지 먼저 확인하고, 남아 있고 TTL이 유효하면 그 결과를 재사용합니다.

### 시각화
```text
사용자: google.com 입력
        |
        v
브라우저/OS DNS 캐시 확인
        |
        +-- 있음 + TTL 유효
        |      -> 저장된 IP 재사용
        |
        +-- 없음
        |      -> DNS 서버에 새로 조회
        |
        +-- 있음 but TTL 만료
               -> DNS 서버에 다시 조회
```

### 연결
- [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)  
  DNS 캐시는 “도메인명 -> 조회 결과”를 TTL 기준으로 보관한다는 점에서 이번 질문과 직접 연결됩니다.
- 앞에서 정리한 HTTP 캐시와는 다릅니다. DNS 캐시는 **어디로 갈지**를 기억하고, HTTP 캐시는 **무엇을 받았는지**를 기억합니다.

한 줄로 답하면:

> 네, 보통은 “예전에 조회했던 도메인에 대한 IP 결과가 캐시에 남아 있는지 확인한다”는 뜻이 맞습니다. 다만 직접 방문한 주소만이 아니라, 페이지 로딩 중 간접 조회된 도메인도 포함될 수 있고 TTL이 지나면 다시 조회합니다.

원하면 다음엔 `DNS 캐시 hit`와 `HTTP 캐시 hit`를 비교해서 헷갈리지 않게 표로 정리해드리겠습니다.

## Q11. 1. DNS 캐시 무효화는 무조건 TTL 만료시에만 이루어지나요?
2. 로컬에 DNS가 어떻게 저장되나요?

### 비유
DNS 캐시는 “전화번호 메모”에 가깝습니다.

- `google.com` = 사람 이름
- `142.250.x.x` = 전화번호
- DNS 캐시 = 예전에 받아 적은 메모

중요한 점은 이 메모가 **유통기한(TTL)** 이 있긴 하지만, **유통기한 전에도 버릴 수 있다**는 겁니다.

### 설명
#### 1. DNS 캐시 무효화는 TTL 만료시에만 이루어지나요?
아니요. **TTL 만료는 가장 대표적인 조건일 뿐, 유일한 조건은 아닙니다.**

DNS 표준도 TTL을 “최대 보관 시간”으로 봅니다. RFC 9499는 RRset이 **TTL이 끝나기 전에도 cache에서 flush될 수 있다**고 설명합니다.  
출처: RFC 9499, 2024-03  
<https://www.rfc-editor.org/rfc/rfc9499>

그래서 실제로는 이런 경우에도 캐시가 무효화되거나 버려질 수 있습니다.

- **TTL 만료**
  - 가장 기본적인 만료 방식입니다.
- **수동 flush**
  - Windows: `ipconfig /flushdns`
  - macOS: `dscacheutil -flushcache` 등
  - 브라우저 자체 host cache clear
- **프로세스/서비스 재시작**
  - 브라우저 재시작
  - OS의 resolver daemon 재시작
- **네트워크 변경**
  - Wi-Fi 변경, VPN 연결, DNS 서버 변경 등
  - Chromium은 host cache entry를 `expired`뿐 아니라 `network_changes` 기준으로도 stale 처리합니다. `Invalidate()`가 호출되면 이후 조회에서 stale miss로 취급됩니다.  
    출처: Chromium source, `host_cache.cc`  
    <https://chromium.googlesource.com/chromium/src/+/HEAD/net/dns/host_cache.cc>
- **캐시 용량/메모리 정책에 따른 eviction**
  - 오래 안 쓴 항목이나 정책상 버릴 수 있습니다.
- **음수 캐시/실패 캐시의 별도 규칙**
  - 예: `NXDOMAIN` 같은 negative answer도 TTL이 있고, TTL 0이 되면 다시 쓰면 안 됩니다.
  - dead/unreachable server 캐시는 RFC 2308에서 최대 5분까지만 허용합니다.  
    출처: RFC 2308, 1998-03  
    <https://www.rfc-editor.org/rfc/rfc2308>

즉 면접식으로 말하면:

> TTL은 “최대 보관 시간”이고, 실제 캐시는 그보다 먼저 flush, eviction, network change, process restart 등으로 사라질 수 있습니다.

#### 2. 로컬에 DNS가 어떻게 저장되나요?
보통 “거대한 DNS 파일”로 저장된다기보다, **브라우저나 OS의 resolver/cache가 메모리 기반 자료구조로 들고 있는 경우가 많습니다.**

추론: 구현체마다 차이는 있지만, 공통적으로는 “키-값 캐시”에 가깝습니다.

대략 이런 모양입니다.

```text
key: (google.com, A)
value: 142.250.xx.xx
expires_at: 11:23:40
source: previous DNS response
```

또는

```text
key: (some.com, A)
value: NXDOMAIN
expires_at: 11:02:10
```

즉 저장되는 건 보통:

- 질의 이름: `google.com`
- 레코드 타입: `A`, `AAAA`, `CNAME` 등
- 결과값: IP, alias 등
- 만료 시각: TTL 기반
- 경우에 따라 실패 결과도 포함

로컬 계층을 나누면 이렇게 봐야 합니다.

- **브라우저 DNS 캐시**
  - Chromium 계열은 network stack 안에 `HostCache`를 두고, entry에 `expires = now + ttl` 같은 형태의 만료 시각을 저장합니다.
  - host별 clear, network change invalidation도 있습니다.  
    출처: Chromium source, `net/dns/README.md`, `host_cache.cc`  
    <https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/dns>  
    <https://chromium.googlesource.com/chromium/src/+/HEAD/net/dns/host_cache.cc>

- **OS DNS 캐시**
  - macOS: `mDNSResponder`가 system-wide unicast DNS resolver로 동작하며, reply cache를 유지합니다.
  - 로컬 `man mDNSResponder`, `man dscacheutil` 기준으로, 질의 결과를 cache에 넣고 `-flushcache`로 비울 수 있습니다.
  - Windows: DNS Client service가 먼저 local resolver cache를 확인하고, 여기에
    - `Hosts` 파일에서 로드된 매핑
    - 이전 DNS 응답에서 얻은 resource record
    가 들어갑니다. `ipconfig /displaydns`로 볼 수 있고 `ipconfig /flushdns`로 비울 수 있습니다.  
    출처: Microsoft Learn  
    <https://learn.microsoft.com/en-us/windows-server/networking/dns/queries-lookups>  
    <https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig>

주의할 점은 `hosts` 파일과 DNS 캐시는 다르다는 겁니다.

- `hosts` 파일: 사람이 직접 적는 **정적 매핑**
- DNS 캐시: 조회 결과를 임시로 저장하는 **동적 캐시**

### 시각화
```text
[앱/브라우저가 google.com 조회]
            |
            v
  1) 브라우저 DNS cache 확인
            |
            +-- hit -> 결과 사용
            |
            v
  2) OS DNS cache 확인
            |
            +-- hit -> 결과 사용
            |
            v
  3) DNS 서버에 질의
            |
            v
  응답 수신
  - A/AAAA/CNAME 결과
  - 또는 NXDOMAIN
            |
            v
  브라우저/OS cache에 저장
  - key: (name, type)
  - value: result
  - expires_at: now + TTL
```

### 연결
- [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)  
  이전에 본 DNS 캐시도 결국 `key / storage / invalidation` 3요소를 갖는 일반 캐시 패턴입니다.
- 지금 질문은 HTTP 캐시와도 자주 헷갈립니다.
  - DNS 캐시: “어디로 갈지”
  - HTTP 캐시: “무엇을 받았는지”

한 줄로 정리하면:

> 1. DNS 캐시는 TTL 만료 때만 사라지는 게 아니라, flush, restart, network change, eviction 등으로 더 일찍 무효화될 수 있습니다.  
> 2. 로컬 DNS는 보통 브라우저/OS의 resolver가 `도메인 + 레코드 타입 -> 결과 + 만료시각` 형태로 메모리 캐시에 저장합니다.

원하면 다음엔 이걸 이어서 `A / AAAA / CNAME` 이 실제 조회에서 어떤 순서로 엮이는지 설명해드리겠습니다.

## Q12. 그러면 OS에도 캐시되어있고, 브라우저에도 캐시되어있으면 뭘 바라보나요?
그리고 위 경우일때 둘이 다르면 어떻게 하나요?

### 비유
브라우저 DNS 캐시와 OS DNS 캐시는 **“내 손메모”와 “집 공용 주소록”** 관계로 보면 됩니다.

- 브라우저 DNS 캐시 = 브라우저가 자기 안에 들고 있는 손메모
- OS DNS 캐시 = 컴퓨터 전체가 공유하는 주소록

핵심은:

> 보통 **둘을 동시에 펼쳐놓고 비교하지 않습니다.**  
> **위에서부터 계층적으로** 확인합니다.

### 설명
#### 1. 둘 다 있으면 뭘 보나요?
일반적으로는 **브라우저 쪽 캐시를 먼저** 봅니다.

Chrome/Chromium 문서 기준으로, 상위 HostResolver 레이어가 먼저 **HostCache** 를 확인하고, cache miss이면 그다음 resolution job을 시작합니다.  
출처: Chromium host resolver 문서  
<https://chromium.googlesource.com/chromium/src.git/+/71.0.3578.0/net/docs/host-resolver.md>  
출처: Chromium `net/dns/README.md`  
<https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/dns/README.md>

즉 개념적으로는 이 흐름입니다.

```text
브라우저 DNS cache 확인
    |
    +-- hit -> 그 결과 사용
    |
    +-- miss -> 다음 resolver 호출
                  |
                  +-- system resolver 사용 시:
                  |      OS cache / hosts / DNS 순으로 처리 가능
                  |
                  +-- built-in DNS 사용 시:
                         브라우저가 DNS 서버로 직접 질의
```

중요한 점:

- **브라우저 캐시 hit면** 보통 OS 캐시를 다시 안 봅니다.
- **브라우저 캐시 miss일 때만** 다음 단계로 내려갑니다.
- system resolver를 쓰면 OS가 자기 cache/hosts/DNS를 봅니다.
- built-in DNS client를 쓰는 브라우저/상황에선 **OS DNS cache를 우회**할 수도 있습니다.

Chromium 공식 문서도 system resolver는 `getaddrinfo()`를 통해 OS를 사용하고, OS는 자기 internal cache, `HOSTS`, DNS, 때로 mDNS를 조회한다고 설명합니다.  
출처: Chromium `net/dns/README.md`  
<https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/dns/README.md>

#### 2. 둘이 다르면 어떻게 하나요?
핵심은:

> **둘이 달라도, 먼저 본 계층의 값을 그대로 씁니다.**  
> “둘 중 더 최신인 걸 비교해서 고른다” 같은 중앙 조정은 보통 없습니다.

예를 들어:

- 브라우저 캐시: `google.com -> IP A`
- OS 캐시: `google.com -> IP B`

이면,

- **브라우저 캐시가 아직 유효하면** -> 브라우저는 **IP A** 사용
- 브라우저 캐시가 **만료/무효화되면** -> 그때 OS resolver 또는 DNS 질의로 내려가고, 그 결과(B 또는 새 값)로 **브라우저 캐시를 갱신**

즉 **상위 캐시가 하위 캐시를 가립니다(shadowing)**.

#### 3. 왜 둘이 다를 수 있나요?
충분히 가능합니다.

- TTL이 서로 다르게 적용됨
- 캐시된 시점이 다름
- 브라우저는 이미 갱신됐는데 OS는 예전 값일 수 있음
- 반대로 OS는 갱신됐는데 브라우저는 예전 값을 들고 있을 수 있음
- 브라우저가 system resolver가 아니라 built-in DNS를 쓰면 OS cache와 더 쉽게 어긋날 수 있음

Chromium 쪽도 host cache가 network changes나 expiration 기준으로 stale 될 수 있다고 설명합니다.  
출처: Chromium `host_resolver.h`, `host_resolver_cache.h`  
<https://chromium.googlesource.com/chromium/src/+/HEAD/net/dns/host_resolver.h>  
<https://chromium.googlesource.com/chromium/src/+/HEAD/net/dns/host_resolver_cache.h>

#### 4. 면접에서 어떻게 말하면 되나요?
이렇게 답하면 깔끔합니다.

> 브라우저와 OS가 각각 DNS 캐시를 가질 수 있는데, 보통 브라우저는 자기 캐시를 먼저 보고 hit면 그 값을 사용합니다. miss일 때만 system resolver나 built-in resolver로 내려갑니다. 그래서 둘의 값이 다를 수 있고, 이 경우 보통 둘을 비교하지 않고 먼저 참조한 계층의 값을 사용합니다. 상위 캐시가 만료되거나 무효화되면 그때 하위 계층이나 실제 DNS 조회 결과로 다시 갱신됩니다.

### 시각화
```text
질의: google.com

1) Browser DNS cache
   - hit -> 사용 끝
   - miss -> 2번으로

2) Resolver 선택
   - system resolver -> OS cache / hosts / DNS
   - built-in DNS   -> DNS 서버 직접 조회

3) 결과를 받아
   - 연결 시도
   - 필요하면 브라우저 캐시 갱신
```

### 연결
- [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)  
  DNS 캐시도 결국 key/domain 기준의 일반 캐시이고, invalidation이 핵심이라는 점에서 이어집니다.
- 앞서 정리한 HTTP 캐시와 구분하면 더 명확합니다.
  - DNS 캐시: 어디로 갈지
  - HTTP 캐시: 무엇을 받을지

한 줄로 요약하면:

> **둘 다 있으면 보통 브라우저가 자기 DNS 캐시를 먼저 보고, miss일 때만 OS나 실제 DNS 조회로 내려갑니다. 값이 다를 때도 둘을 비교해 합치지 않고, 먼저 참조한 계층의 값을 사용합니다.**

원하면 다음엔 이걸 바탕으로 `브라우저 캐시 hit`, `OS 캐시 hit`, `실제 DNS 조회` 3가지 타임라인을 표로 그려드리겠습니다.

## Q13. 그러면 저장도 같은 순서/계층으로 진행되나요?
브라우저에 먼저 저장 -> OS에 저장 / 또한 무조건 둘다 저장되나요?

### 비유
아니요. **“브라우저에 먼저 저장하고 그다음 OS에 밀어넣는다” 같은 write-through 구조로 보면 안 됩니다.**

더 정확한 비유는 이겁니다.

- 브라우저 DNS 캐시 = 브라우저 자기 메모
- OS DNS 캐시 = 컴퓨터 공용 메모

브라우저가 새 번호를 알게 됐다고 해서 **반드시 공용 메모까지 같이 갱신하는 건 아닙니다.**

### 설명
핵심만 먼저 말하면:

> **저장도 “브라우저 -> OS” 순서로 무조건 같이 일어나는 게 아닙니다.**  
> **어떤 경로로 조회했는지에 따라, 브라우저만 저장될 수도 있고, OS만 저장될 수도 있고, 둘 다 저장될 수도 있습니다.**

#### 경우 1. 브라우저 캐시 hit
```text
Browser cache hit
-> 브라우저가 자기 값 사용
-> OS에 질의 안 함
-> OS cache는 갱신되지 않을 수 있음
```

이 경우는 **브라우저만 보고 끝**입니다.  
OS는 아예 관여하지 않을 수 있습니다.

#### 경우 2. 브라우저 miss + system resolver 사용
```text
Browser cache miss
-> OS resolver 호출
-> OS cache hit 또는 실제 DNS 조회
-> 결과 반환
-> OS가 자기 cache 갱신 가능
-> 브라우저도 받은 결과를 자기 cache에 저장 가능
```

이 경우는 **둘 다 저장될 수 있습니다.**  
하지만 이것도 “브라우저가 OS에 써준다”가 아니라, **각자 자기 계층에 저장**하는 겁니다.

#### 경우 3. 브라우저 miss + built-in DNS 사용
```text
Browser cache miss
-> 브라우저가 DNS 서버에 직접 질의
-> 결과를 브라우저 cache에 저장
-> OS cache는 관여 안 함
```

이 경우는 **브라우저만 저장**될 수 있습니다.

### 그래서 질문에 대한 직접 답
#### 1. 저장도 같은 순서/계층으로 진행되나요?
조회는 계층적으로 보지만, 저장은 **단순한 상향/하향 write-through가 아닙니다.**  
**조회 경로에 참여한 계층만 자기 방식대로 저장**한다고 보는 게 맞습니다.

#### 2. 브라우저에 먼저 저장 -> OS에 저장인가요?
보통 **아닙니다.**  
브라우저가 OS 캐시에 직접 “써 넣는” 구조로 이해하면 틀립니다.

#### 3. 무조건 둘 다 저장되나요?
**아닙니다.**

- 브라우저만 저장될 수 있음
- OS만 저장될 수도 있음
- 둘 다 저장될 수도 있음

브라우저 구현과 resolver 경로에 따라 달라집니다.

### 왜 이렇게 되나요?
브라우저 DNS 캐시와 OS DNS 캐시는 **서로 다른 주체가 관리**합니다.

- 브라우저 캐시: 브라우저 network stack이 관리
- OS 캐시: system resolver / DNS client service / mDNSResponder 등이 관리

Chromium은 자체 `HostCache`를 두고, 경우에 따라 system resolver를 쓰거나 built-in DNS를 씁니다.  
출처: Chromium DNS README  
<https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/dns/README.md>  
출처: Chromium host resolver docs  
<https://chromium.googlesource.com/chromium/src.git/+/71.0.3578.0/net/docs/host-resolver.md>

macOS 쪽도 로컬 `man mDNSResponder` 기준으로 system-wide DNS resolver가 **자기 cache**를 유지합니다. 즉 OS 계층도 별도로 캐시를 갖습니다.

### 시각화
```text
A. Browser cache hit
Browser cache O
OS cache ? (안 봄)
=> 브라우저 값 사용

B. Browser miss -> OS resolver
Browser cache X
OS cache O / 또는 DNS 조회
=> OS 결과 반환
=> OS cache 갱신 가능
=> Browser cache도 갱신 가능

C. Browser miss -> Built-in DNS
Browser cache X
OS cache (우회 가능)
=> 브라우저가 DNS 직접 조회
=> Browser cache만 갱신
```

### 연결
- [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)  
  DNS 캐시도 일반 캐시처럼 “조회 경로”와 “무효화”가 핵심입니다.
- 앞 질문의 연장선으로 보면, 브라우저와 OS 캐시는 **동기화된 하나의 캐시**가 아니라 **겹쳐 놓인 별도 캐시 계층**입니다.

한 줄로 정리하면:

> **브라우저와 OS DNS 캐시는 무조건 함께 저장되는 구조가 아니고, 조회에 실제로 참여한 계층이 각자 자기 캐시를 관리한다고 이해하는 게 맞습니다.**

원하면 다음엔 이걸 기준으로 `1) browser hit`, `2) OS hit`, `3) real DNS lookup` 세 경우를 **면접에서 그대로 말할 수 있게** 답변 문장으로 만들어드리겠습니다.

## Q14. 그러면 OS에 캐시되는 기회자체가 적어보이는데 제가 본게 맞나요?

네, **“브라우저 기준으로 보면 OS 캐시에 도달할 기회가 상대적으로 줄어든다”**는 감각은 맞습니다.

다만 더 정확히 말하면:

> **브라우저 캐시가 앞단에 있어서 OS 캐시가 덜 보일 뿐**,  
> **OS 캐시가 쓸모없을 정도로 드물지는 않습니다.**

이렇게 이해하면 됩니다.

### 맞는 부분
브라우저가 자기 DNS 캐시에 hit하면:

- OS까지 안 내려감
- 그래서 **브라우저 내부에서 반복되는 동일 조회**는 OS 캐시 기회가 줄어듭니다

즉 당신이 느낀

> “OS에 캐시될 기회가 적어 보인다”

는 건 **브라우저 단일 관점에서는 부분적으로 맞습니다.**

### 그런데 OS 캐시가 여전히 중요한 이유
1. **브라우저 cache miss면 OS cache가 바로 쓰일 수 있습니다**
   - 브라우저 캐시는 비었는데
   - OS에는 남아 있을 수 있음

2. **브라우저를 껐다 켜도 OS cache는 남아 있을 수 있습니다**
   - 브라우저 캐시는 프로세스 생명주기에 더 영향을 받음
   - OS 캐시는 시스템 차원에서 유지될 수 있음

3. **브라우저 말고 다른 앱도 OS cache를 공유합니다**
   - 터미널 `curl`
   - 앱 업데이트 프로그램
   - 메신저
   - 다른 브라우저 탭/프로세스  
   이런 것들이 OS resolver를 쓰면 공용 캐시 이점이 있습니다

4. **브라우저가 system resolver를 쓰는 경로에서는 OS cache가 꽤 자주 쓰입니다**
   - 특히 브라우저/설정/플랫폼에 따라 OS cache 의존도가 달라집니다

### 한 줄 보정
그래서 이렇게 말하면 가장 정확합니다.

> **브라우저 내부 캐시가 앞단에 있어서 브라우저 입장에서는 OS 캐시 조회 빈도가 줄 수는 있지만, OS 캐시는 프로세스 간 공유 캐시라서 여전히 의미가 크다.**

### 짧은 예시
```text
1차 방문
브라우저 miss
OS miss
실제 DNS 조회
-> 브라우저 cache 저장
-> OS cache 저장

곧바로 2차 방문
브라우저 hit
-> OS 안 감

브라우저 재시작 후 3차 방문
브라우저 miss
OS hit
-> 실제 DNS 조회 없이 해결 가능
```

즉, **반복 방문 중에는 브라우저 캐시가 앞에서 많이 먹고**,  
**브라우저 miss나 재시작, 다른 앱 접근 때는 OS 캐시가 의미를 가집니다.**

원하면 다음엔 이걸 면접 답변 스타일로 3문장짜리로 압축해드리겠습니다.

## Q15. 좋습니다 이제 처음인 "사용자가 브라우저에 주소 검색 -> DNS 조회"까지는 어느정도 머리에 그려집니다. 다음은 뭔가요?

### 비유
DNS까지 끝났다는 건, 이제 **“어느 건물로 갈지 주소를 찾았다”**는 뜻입니다.  
그다음은:

- 건물 입구에 실제로 가서
- 출입 절차를 밟고
- “이 페이지 주세요”라고 요청하고
- 받은 문서를 펼쳐 읽기 시작합니다

즉 **DNS 다음은 “연결 수립 -> 요청 -> 응답 -> 파싱 시작”** 입니다.

### 설명
`google.com`에 대해 DNS 조회로 IP를 얻었다고 가정하면, 다음 흐름은 보통 이렇습니다.

1. **브라우저가 기존 연결을 재사용할 수 있는지 확인**
   - 이미 같은 origin에 열린 연결이 있으면 그걸 재사용할 수 있습니다.
   - 없으면 새 연결을 만듭니다.

2. **서버와 연결 수립**
   - 전통적으로는 **TCP 연결**
   - 최신 환경에서는 **QUIC(HTTP/3)** 일 수도 있습니다

3. **HTTPS라면 보안 협상(TLS)**
   - 인증서 확인
   - 암호화 키 협상
   - 어떤 HTTP 버전을 쓸지도 여기서 정해질 수 있습니다(ALPN)

4. **브라우저가 HTTP 요청 전송**
   - 대략 이런 요청을 보냅니다:

```http
GET / HTTP/1.1
Host: google.com
User-Agent: ...
Accept: text/html,...
```

5. **서버가 HTTP 응답 반환**
   - 상태코드
   - 헤더
   - 본문(대개 HTML)

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: ...
...
<html>...</html>
```

6. **브라우저가 응답을 받기 시작하면 렌더러가 HTML 파싱 시작**
   - HTML을 받자마자 전부 다 기다렸다가 읽는 게 아니라
   - **스트리밍으로** 읽으면서 DOM 생성을 시작할 수 있습니다
   - 그러면서 CSS, JS, 이미지 같은 하위 리소스도 발견합니다

이걸 면접 식으로 한 문장으로 줄이면:

> DNS로 IP를 얻은 뒤 브라우저는 서버와 TCP/QUIC 연결을 맺고, HTTPS면 TLS 협상을 거친 뒤 HTTP 요청을 보내며, 응답이 오기 시작하면 렌더러가 HTML 파싱을 시작합니다.

### 시각화
```text
사용자 URL 입력
   |
   v
DNS 조회
   |
   v
IP 획득
   |
   v
기존 연결 재사용 가능한지 확인
   |
   +-- 가능 -> 바로 요청
   |
   +-- 불가 -> 새 연결 수립
               |
               +-- TCP 또는 QUIC
               +-- HTTPS면 TLS 협상
   |
   v
HTTP 요청 전송
   |
   v
HTTP 응답 수신 (headers + body)
   |
   v
렌더러가 HTML 파싱 시작
   |
   v
DOM / CSSOM / Render Tree ...
```

### 연결
- [캐시-개념.md:127](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/캐시-개념.md:127)  
  지금까지 본 DNS 캐시는 “어디로 갈지”를 해결한 단계입니다. 그 다음부터는 실제 네트워크 연결 단계로 넘어갑니다.
- [useEffect-사이드이펙트-역할.md:59](/Users/younghoonkim/dev/personal/@skills/study-all/study/learn/useEffect-사이드이펙트-역할.md:59)  
  이후 렌더링이 진행되어 `paint`가 일어나고, 그 뒤에 React effect 같은 후속 작업이 붙습니다.

외부 근거:
- MDN, Navigation and resource timings: DNS -> connect -> request -> response 순서  
  <https://developer.mozilla.org/en-US/docs/Web/Performance/Navigation_and_resource_timings>
- Chrome, Inside look at modern web browser part 3: 응답 HTML 수신 후 renderer가 DOM 파싱 시작  
  <https://developer.chrome.com/blog/inside-browser-part3>

한 줄 결론: **DNS 다음은 “IP를 얻었으니 실제 서버와 연결을 맺고, HTTPS 협상 후 HTTP 요청을 보내고, 응답 HTML을 받자마자 파싱을 시작하는 단계”입니다.**

원하면 다음 답변에서는 이 흐름을 이어서 **“HTTP 응답을 받은 뒤 Critical Rendering Path가 정확히 어디서 시작되는지”** 붙여서 설명하겠습니다.

## Q16. "연결을 만든다"는 표현이 정확히 이해가안됩니다. "요청을 보낸다"와는 다른건가요?

### 비유
네, **다릅니다.**

가장 쉬운 비유는 **전화 연결**입니다.

- **연결을 만든다** = 상대방과 **전화가 연결된 상태**를 만든다
- **요청을 보낸다** = 전화가 연결된 뒤에  
  “메인 페이지 주세요”라고 **말하는 것**

즉:

> 연결은 **통로를 여는 일**이고,  
> 요청은 그 통로 위에 **실제 메시지를 보내는 일**입니다.

### 코드/텍스트 설명
브라우저 기준으로 층을 나누면 이렇게 됩니다.

1. **DNS 조회**
   - `google.com` -> IP 주소 확인

2. **연결 수립**
   - 그 IP와 통신할 수 있는 채널을 만듦
   - 보통:
     - TCP 연결
     - 그 위에 TLS(HTTPS 보안 연결)
   - 또는 HTTP/3라면 QUIC 연결

3. **HTTP 요청 전송**
   - 연결이 준비된 뒤
   - 그 통로 위에 HTTP 메시지를 보냄

예시:

```text
DNS:
google.com -> 142.250.xx.xx

연결:
브라우저 <-> 142.250.xx.xx 사이에 TCP/TLS 채널 준비

요청:
GET / HTTP/1.1
Host: google.com
```

즉 `GET / ...` 이게 **요청**이고,  
그걸 보낼 수 있게 먼저 깔아두는 채널이 **연결**입니다.

#### 왜 분리해서 보나요?
왜냐하면 **한 번 연결해 놓고 요청을 여러 번 보낼 수 있기 때문**입니다.

예를 들면:

```text
연결 1개 생성
  ├─ 요청 1: GET /
  ├─ 요청 2: GET /styles.css
  ├─ 요청 3: GET /app.js
  └─ 요청 4: GET /logo.png
```

특히 HTTP/2, HTTP/3에서는 **하나의 연결에서 여러 요청을 동시에 흘릴 수 있습니다.**  
그래서 “연결”과 “요청”은 같은 개념이 아닙니다.

#### 아주 단순화한 실제 순서
HTTP/1.1 + HTTPS라고 아주 단순하게 보면:

```text
1. DNS 조회
2. TCP 연결
3. TLS 협상
4. HTTP 요청 전송
5. HTTP 응답 수신
```

여기서:

- 2~3 = 연결 준비
- 4 = 요청 전송

입니다.

#### 예외처럼 보이는 경우
이미 연결이 열려 있으면:

```text
DNS 확인
-> 기존 연결 재사용
-> 바로 HTTP 요청 전송
```

그래서 어떤 순간에는 “연결하는 과정이 안 보이고 바로 요청하는 것처럼” 보일 수 있습니다.  
하지만 그건 **이미 연결이 있었기 때문**입니다.

### 시각화
```text
[DNS]
google.com -> IP

[연결 수립]
Browser ===== secure channel ===== Server
        (TCP / TLS or QUIC)

[요청 전송]
Browser ---- "GET /" -----------> Server

[응답 수신]
Browser <--- "200 OK + HTML" ---- Server
```

또는 더 짧게:

```text
연결 = 도로 깔기
요청 = 그 도로로 트럭 보내기
응답 = 트럭이 짐 싣고 돌아오기
```

### 연결
- 앞에서 정리한 DNS는 “**어디로 갈지 찾는 단계**”였습니다.
- 이번 질문의 연결 수립은 “**그곳까지 통신 통로를 여는 단계**”입니다.
- 그 다음 HTTP 요청은 “**그 통로로 실제로 무엇을 달라고 말하는 단계**”입니다.

한 줄로 정리하면:

> **연결을 만든다**는 건 서버와 통신할 채널을 준비하는 것이고, **요청을 보낸다**는 건 그 채널 위에 HTTP 메시지를 보내는 것입니다.

원하면 다음엔 이걸 기준으로 `TCP 3-way handshake`, `TLS handshake`, `HTTP 요청`을 패킷 순서처럼 아주 구체적으로 그려드리겠습니다.

## Q17. 그러면 TCP는 A(브라우저)와 B(요청받을 서버)가 대화할 공간 이라고 보면되나요?

### 비유
네, **아주 거칠게는 맞습니다.**  
다만 “공간”보다는 **“전화선”** 또는 **“양방향 파이프”**로 생각하는 게 더 정확합니다.

- A = 브라우저 쪽
- B = 서버 쪽
- TCP = 둘 사이에 만든 **신뢰성 있는 통신 통로**

즉:

> TCP는 A와 B가 HTTP 같은 데이터를 주고받을 수 있게 해주는  
> **양방향 연결 통로**라고 보면 됩니다.

### 코드/텍스트 설명
당신 표현을 조금 더 정확히 바꾸면 이렇게 됩니다.

- 맞는 표현:
  - **“A와 B가 대화할 통로”**
  - **“A와 B 사이의 연결”**
- 덜 정확한 표현:
  - **“그냥 공간”**
    - 공간이라고 하면 너무 추상적이라
    - TCP의 핵심인 **연결성, 순서 보장, 재전송, 신뢰성**이 빠집니다

RFC 9293는 TCP를 **reliable, in-order, byte-stream service** 라고 설명합니다.  
즉 TCP는:

1. **연결 지향적(connection-oriented)** 이고
2. **양방향(bidirectional)** 이며
3. **순서를 보장(in-order)** 하고
4. **유실 시 재전송(retransmission)** 해서
5. 애플리케이션에 **바이트 스트림**을 제공합니다

출처: RFC 9293, 2022-08  
<https://www.rfc-editor.org/rfc/rfc9293>  
출처: MDN TCP Glossary, 2025-07-11 수정  
<https://developer.mozilla.org/en-US/docs/Glossary/TCP>

그래서 HTTP와 관계를 붙이면:

- **TCP**: 통로를 만든다
- **HTTP**: 그 통로 위에서 무슨 말을 할지 정한다

예:

```text
TCP 연결 수립
A <=====================> B

그 위에서 HTTP 요청/응답
A ---- GET / -----------> B
A <--- 200 OK + HTML ---- B
```

즉 HTTP 메시지가 “대화 내용”이고,  
TCP는 그 대화 내용이 오가는 **전화선**입니다.

### 시각화
```text
[TCP]
Browser <====== reliable byte stream ======> Server
         (연결, 순서 보장, 재전송)

[HTTP over TCP]
Browser ---- "GET /" ----------------------> Server
Browser <--- "200 OK + HTML" -------------- Server
```

### 연결
- 앞 질문에서 구분한 것처럼
  - DNS = 어디로 갈지 찾기
  - TCP = 그곳과 통신 통로 만들기
  - HTTP = 그 통로로 실제 요청/응답 보내기
- QUIC/HTTP3는 이 TCP 자리를 다른 transport가 대체하는 경우입니다.

한 줄로 정리하면:

> 네, TCP를 “브라우저와 서버가 대화할 통로”라고 보면 됩니다. 다만 더 정확히는 **신뢰성 있게, 순서대로 데이터를 주고받게 해주는 양방향 연결**입니다.

원하면 다음엔 `TCP 3-way handshake`를 `SYN -> SYN/ACK -> ACK` 수준으로 바로 이어서 설명하겠습니다.

## Q18. 왜 TCP인가요? 뭐의 약자인가요?

`TCP`는 **Transmission Control Protocol**의 약자입니다.

이름을 풀면 대략 이런 뜻입니다.

- `Transmission`: 데이터 전송
- `Control`: 전송을 제어
- `Protocol`: 통신 규약

즉, **데이터를 그냥 보내기만 하는 게 아니라, 제대로 도착했는지/순서가 맞는지/너무 빨리 보내지 않는지까지 관리하는 전송 규약**이라는 뜻입니다.

왜 TCP를 쓰냐면, **IP만으로는 부족하기 때문**입니다.

- `IP`는 기본적으로 “일단 목적지로 보내보자”에 가깝습니다
- 그런데 중간에
  - 패킷이 유실될 수도 있고
  - 순서가 뒤바뀔 수도 있고
  - 중복될 수도 있습니다

TCP는 그 위에서 이런 걸 보완합니다.

- 도착 확인
- 유실 시 재전송
- 순서 보장
- 흐름 제어
- 혼잡 제어

그래서 웹에서 HTML, CSS, JS 같은 데이터를 받을 때는
**“정확히, 순서대로”** 받는 게 중요해서 전통적으로 TCP를 많이 썼습니다.

아주 짧게 정리하면:

> IP는 “보내는 역할”, TCP는 “제대로 보내지도록 관리하는 역할”입니다.

다만 하나 보정할 점은, **웹이 항상 TCP만 쓰는 건 아닙니다.**

- HTTP/1.1, HTTP/2: 보통 TCP 위
- HTTP/3: **QUIC(UDP 기반)** 위

즉 “왜 TCP인가?”에 대한 고전적인 답은:

> 웹은 신뢰성 있고 순서 보장되는 전송이 필요했기 때문에 TCP를 사용해 왔다

입니다.

원하면 다음엔 `IP`와 `TCP`를 한 그림으로 묶어서  
`IP는 길 찾기 / TCP는 안전 배송` 식으로 설명해드리겠습니다.

## Q19. 그러니까 기능적으로는 IP만 확정되어도 소통이 가능하긴한데 "안전성"을 위해 TCP를 이용한다 가 맞나요?

네, **방향은 맞습니다.**  
다만 더 정확히는 이렇게 말해야 합니다.

> **IP만으로도 “어디로 보낼지”는 정할 수 있지만,**
> **애플리케이션이 기대하는 안정적인 통신을 위해 TCP 같은 전송 계층이 필요하다**  
> 가 맞습니다.

핵심 보정은 두 가지입니다.

1. **IP는 목적지 전달 중심**
   - “이 패킷을 어느 호스트로 보낼까?”
   - 즉 **주소 지정과 라우팅**이 핵심입니다

2. **TCP는 신뢰성 있는 통신 제공**
   - 순서 보장
   - 유실 시 재전송
   - 중복/손실 처리
   - 흐름 제어
   - 혼잡 제어

그래서 당신 말의 “안전성”은 보통 네트워크에서는 **신뢰성(reliability)** 이라고 표현하는 게 더 정확합니다.

### 더 정확한 한 문장
> **IP는 목적지까지 보내는 역할이고, TCP는 그 데이터가 애플리케이션이 쓰기 좋게 신뢰성 있게 도착하도록 관리하는 역할입니다.**

### 비유
- `IP` = 택배 주소만 보고 일단 보내는 배송 시스템
- `TCP` = 배송 추적, 분실 재배송, 순서 정리까지 해주는 서비스

### 중요한 보정 하나
“IP만 확정되어도 소통이 가능하다”는 말은 **아주 낮은 수준에서는 맞지만**,  
웹 브라우저/서버 같은 일반 앱 통신 관점에서는 보통 **TCP/UDP 같은 transport protocol이 같이 있어야** 의미 있는 통신이 됩니다.

즉 실무적으로는:

- `IP`만으로는 부족하고
- 보통 `TCP` 또는 `UDP`
- HTTP/3는 `QUIC(UDP 기반)`를 사용

입니다.

### 면접식 답변
> IP는 목적지 호스트를 찾는 계층이고, TCP는 그 위에서 신뢰성 있고 순서가 보장된 데이터 전송을 제공합니다. 그래서 웹에서는 단순히 IP 주소만 아는 것으로 끝나지 않고, TCP 같은 transport 계층을 통해 실제 애플리케이션 통신을 수행합니다.

한 줄로 줄이면:

> **네, 큰 방향은 맞지만 “안전성”보다는 “신뢰성 있는 전송”이라고 표현하는 게 더 정확합니다.**

## Q20. 보통 TCP/UDP 같은 transport protocol이 같이 있어야 의미 있는 통신 << 이유가 받는쪽에서 TCP/UDP가 같이 있는걸 기대해서인가요?

### 비유
네, **부분적으로는 맞습니다.**  
하지만 더 정확히는:

> **받는 쪽이 “TCP/UDP가 오겠지” 하고 막연히 기대해서가 아니라,**
> **IP 패킷 안에 “이 payload는 TCP인지 UDP인지”가 적혀 있고,**
> **그에 맞는 방식으로 해석해야 하기 때문**입니다.

비유하면:

- `IP` = 건물 주소
- `TCP/UDP` = 택배 상자에 붙은 **배송 방식 라벨**
- `포트` = 건물 안 몇 호실로 갈지

주소만 있어도 건물까지는 갈 수 있지만,  
**무슨 방식의 짐인지 / 어느 방으로 보내야 하는지**가 없으면 앱이 제대로 받을 수 없습니다.

### 설명
핵심은 3가지입니다.

1. **IP만으로는 “어느 호스트”까지만 갑니다.**
   - RFC 791도 IP의 기본 기능을 **addressing + routing**으로 설명합니다.
   - 그리고 IP 헤더에는 `Protocol` 필드가 있어서, 이 payload가 다음 계층에서 **TCP인지 UDP인지**를 나타냅니다.  
   출처: RFC 791, `Protocol` field  
   <https://www.rfc-editor.org/rfc/rfc791>

2. **받는 쪽 OS는 그 값을 보고 어디로 넘길지 결정합니다.**
   - `Protocol = 6` 이면 TCP
   - `Protocol = 17` 이면 UDP  
   즉 받는 쪽은 “기대”라기보다 **IP 헤더의 protocol field를 보고 TCP 모듈/UDP 모듈로 디스패치**합니다.

3. **그다음 transport가 앱까지 연결합니다.**
   - TCP/UDP는 **포트 번호**를 가지고 있어서
   - “이 데이터는 브라우저/웹서버/게임서버 중 누구에게 줄까?”를 결정합니다.
   - RFC 9293는 TCP가 **reliable, in-order byte-stream service**를 제공하고, **port numbers로 application services를 식별**한다고 설명합니다.
   - RFC 768은 UDP가 **application programs to send messages to other programs** 를 위한 최소 메커니즘이라고 설명합니다.  
   출처: RFC 9293  
   <https://www.rfc-editor.org/rfc/rfc9293>  
   출처: RFC 768  
   <https://www.rfc-editor.org/rfc/rfc768>

즉 질문에 대한 직접 답은:

> **네, 받는 쪽도 TCP/UDP를 같이 알아야 하는 건 맞습니다.**  
> 하지만 이유는 “기대해서”라기보다, **IP만으로는 payload를 어떻게 해석하고 어떤 앱에 전달할지 부족해서**입니다.

### 아주 짧은 예시
브라우저가 서버에 보낸다고 해보면:

```text
IP 헤더:
- 목적지 IP: 142.250.xx.xx
- Protocol: TCP(6)

TCP 헤더:
- 목적지 포트: 443

Payload:
- HTTPS 데이터
```

서버는 이걸 받고:

1. IP 보고 “내 주소로 왔네”
2. Protocol=TCP 보고 “TCP 모듈로 넘겨야겠네”
3. TCP 포트 443 보고 “웹서버(HTTPS)로 넘겨야겠네”

이렇게 처리합니다.

만약 TCP/UDP 같은 transport 정보가 없으면:

- 어떤 규칙으로 데이터를 읽어야 할지
- 어떤 앱에 줘야 할지
- 재전송/순서 보장 같은 전송 의미가 뭔지

를 알기 어렵습니다.

### 시각화
```text
[IP 계층]
목적지: 서버 IP
Protocol: TCP or UDP
        |
        v
[Transport 계층]
TCP/UDP 헤더 확인
- 포트 번호 확인
- TCP면 연결/순서/재전송 규칙 적용
- UDP면 datagram 규칙 적용
        |
        v
[Application]
웹서버 / DNS 서버 / 게임 서버 등 해당 프로세스에게 전달
```

### 연결
- 앞에서 정리한 “TCP는 대화 통로” 설명의 다음 단계입니다.
- 이번 질문에서 추가된 핵심은:
  - **IP는 호스트까지**
  - **TCP/UDP는 앱까지**
  - 그리고 **전송 의미(신뢰성/메시지성)** 도 transport가 결정한다는 점입니다.

한 줄로 정리하면:

> **네, 받는 쪽도 TCP/UDP를 알아야 하는 건 맞지만, 더 본질적으로는 IP만으로는 “어떤 전송 규칙으로 어떤 앱이 받아야 하는지”를 알 수 없어서 transport protocol이 필요한 것입니다.**

원하면 다음엔 `포트 번호`가 정확히 뭔지, 왜 `443` 같은 숫자가 나오는지 바로 이어서 설명하겠습니다.

## Q21. "알기 어렵다, 처리하기 어렵다"입니까? "못한다, 에러난다"입니까? 즉 TCP, UDP같은 프로토콜이 필수인가요? (일반적인 모던웹)

### 비유
이건 **“조금 불편하다” 수준이 아니라, 보통은 대화 규칙이 아예 안 맞아서 통신이 성립하지 않는다**에 가깝습니다.

- `IP` = 건물 주소만 적힌 상태
- `TCP/QUIC` = 택배 회사 규칙
- `HTTP` = 상자 안 문서 형식

주소만 있어도 건물까지는 갈 수 있지만,  
**어떤 운송 규칙으로, 어떤 창구로, 어떤 순서로 전달할지**가 없으면 웹서버와 브라우저는 보통 대화를 못 합니다.

### 설명
질문에 바로 답하면:

> **일반적인 모던 웹에서는 “알기 어렵다”보다 “사실상 못한다/성립하지 않는다”가 맞습니다.**

정확히는 이렇게 나눠야 합니다.

#### 1. 순수 IP 레벨에서는
완전히 “불가능”은 아닙니다.

- IP 헤더에는 `Protocol` 필드가 있어서
- TCP, UDP 말고 다른 상위 프로토콜도 실을 수는 있습니다

즉 이론적으로는 **커스텀 IP 상위 프로토콜**도 만들 수 있습니다.

하지만 RFC 791도 IP는 **end-to-end reliability, flow control, sequencing**을 제공하지 않는다고 설명합니다.  
즉 IP만으로는 웹이 기대하는 전송 의미가 없습니다.  
출처: RFC 791  
<https://www.rfc-editor.org/rfc/rfc791>

#### 2. 브라우저 + 웹서버 + 모던 웹에서는
여기서는 사실상 **필수**입니다.

왜냐하면 브라우저와 웹서버는 보통 이렇게 구현되어 있기 때문입니다.

- HTTP/1.1, HTTP/2 -> **TCP 기반**
- HTTP/3 -> **QUIC 기반(UDP 위)**

RFC 9113은 HTTP/2가 **TCP connection 위에서 동작**한다고 명시합니다.  
RFC 9114는 HTTP/3가 **QUIC 위의 HTTP semantics mapping**이라고 설명합니다.  
출처: RFC 9113  
<https://www.rfc-editor.org/rfc/rfc9113.html>  
출처: RFC 9114  
<https://www.rfc-editor.org/rfc/rfc9114.html>

즉 브라우저가 웹서버와 말할 때는:

- TCP/TLS로 말하거나
- QUIC(UDP 기반)로 말하거나

둘 중 하나여야 합니다.

#### 3. 그래서 “받는 쪽이 기대해서”도 맞나요?
**부분적으로 맞습니다.**  
더 정확히는:

- 서버 OS는 IP packet을 보고 `Protocol` 필드로 TCP/UDP/기타를 구분
- 그다음 TCP/UDP 스택으로 넘김
- 그 위에서 포트 번호를 보고 웹서버 프로세스로 전달

즉 **서버가 막연히 기대하는 게 아니라**,  
운영체제와 서버 스택 자체가 **그 프로토콜로 오도록 설계**되어 있습니다.

예를 들어:

- 서버는 TCP 443에서 HTTPS를 듣고 있음
- 클라이언트가 raw IP나 엉뚱한 프로토콜로 보내면
- 보통 웹서버까지 가지도 못하고 drop/ignore/error가 납니다

### 결론
- **일반 네트워킹 이론**: TCP/UDP가 절대 유일한 선택지는 아님
- **일반적인 모던 웹**: 브라우저와 웹서버가 지원하는 transport가 사실상 필수
- 그래서 면접에서는 이렇게 말하면 됩니다:

> IP만으로는 목적지 전달만 가능하고, 웹이 필요로 하는 신뢰성 있는 전송과 애플리케이션 전달은 TCP나 QUIC 같은 transport가 맡습니다. 그래서 일반적인 모던 웹에서는 지원되는 transport protocol이 사실상 필수입니다.

### 시각화
```text
IP만 있음
-> 목적지 호스트까지는 감
-> 하지만 웹서버가 이해할 웹 전송 규칙이 없음
-> 보통 성립 안 함

TCP or QUIC 있음
-> 전송 규칙 성립
-> 포트/세션/전송 의미 성립
-> 그 위에서 HTTP 동작
```

한 줄로 요약하면:

> **모던 웹에서는 TCP/QUIC 같은 transport protocol이 사실상 필수이고, 없으면 “조금 불편한” 정도가 아니라 보통 웹 통신이 성립하지 않습니다.**

원하면 다음엔 이걸 바로 이어서 `포트 443은 정확히 무엇이고 왜 필요한가`로 설명하겠습니다.

## Q22. 좋습니다 그러면 TCP는 정확히 어떻게 "신뢰성"을 더하나요?

### 비유: 번호표 붙은 택배 배송
TCP를 택배로 보면 가장 이해가 쉽습니다.

| 비유 요소 | TCP 개념 | 대응 이유 |
|---|---|---|
| 상자마다 붙는 번호표 | `Sequence Number` | 어떤 데이터가 몇 번째 바이트인지 식별 |
| 수령 확인 문자 | `ACK` | “여기까지 받았고 다음 번호를 보내라”를 알림 |
| 분실 상자 재배송 | 재전송 | ACK가 안 오면 다시 보냄 |
| 한 번에 받을 수 있는 상자 수 | `Window` | 수신자가 지금 감당 가능한 양을 광고 |
| 도로 정체 보고 | 혼잡 제어 | 네트워크가 막히면 전송량을 줄임 |
| 포장 이상 검사 | `Checksum` | 전송 중 비트 손상 여부를 검사 |

핵심은 이겁니다.

> TCP는 “그냥 보낸다”가 아니라  
> **번호 붙이기 -> 받았는지 확인 -> 안 왔으면 다시 보내기 -> 너무 많이 안 보내기**  
> 를 해서 신뢰성을 만듭니다.

### 설명
TCP의 신뢰성은 보통 5개 메커니즘으로 이해하면 됩니다.

1. **Sequence Number**
   - 각 TCP 세그먼트에는 “이 세그먼트의 첫 바이트 번호”가 들어갑니다.
   - RFC 9293도 `Sequence Number`를 “first data octet in this segment”라고 정의합니다.  
   출처: RFC 9293  
   <https://www.rfc-editor.org/rfc/rfc9293.html>

2. **ACK**
   - 받는 쪽은 “다음에 기대하는 바이트 번호”를 ACK로 보냅니다.
   - 즉 “1,2,3 받았고 다음은 4 보내” 같은 뜻입니다.
   - RFC 9293도 ACK를 “next sequence number the sender of the segment is expecting to receive”라고 설명합니다.  
   출처: RFC 9293  
   <https://www.rfc-editor.org/rfc/rfc9293.html>

3. **재전송**
   - 보낸 쪽이 ACK를 못 받으면 “유실됐구나”라고 보고 다시 보냅니다.
   - RFC 9293는 retransmission timeout이 나면 retransmission queue 맨 앞 세그먼트를 다시 보내라고 정의합니다.  
   출처: RFC 9293  
   <https://www.rfc-editor.org/rfc/rfc9293.html>

4. **Window 기반 흐름 제어**
   - 수신자는 “지금 이만큼까지는 받을 수 있음”을 window로 광고합니다.
   - 송신자는 그 범위를 넘겨 무작정 보내지 않습니다.
   - 그래서 상대 버퍼를 넘치게 만들지 않습니다.  
   출처: RFC 9293  
   <https://www.rfc-editor.org/rfc/rfc9293.html>

5. **혼잡 제어**
   - 네트워크가 막히는 상황에서는 sender가 `cwnd`를 줄여 과하게 밀어 넣지 않습니다.
   - RFC 5681은 `cwnd`가 ACK를 받기 전까지 네트워크에 넣을 수 있는 데이터 양의 상한이라고 설명합니다.  
   출처: RFC 5681  
   <https://www.rfc-editor.org/rfc/rfc5681.html>

추가로 **Checksum**도 있습니다.

- 전송 중 비트가 깨졌는지 검사합니다.
- 다만 이건 **손상 감지**이지, 보안 암호화는 아닙니다.  
출처: RFC 9293  
<https://www.rfc-editor.org/rfc/rfc9293.html>

MDN도 TCP를 “전송 보장 + 보낸 순서대로 전달”로 요약합니다.  
출처: MDN TCP Glossary  
<https://developer.mozilla.org/en-US/docs/Glossary/TCP>

### 간단한 예시
브라우저가 서버에 `"HELLO"`를 보낸다고 가정하겠습니다.

#### 정상 케이스
```text
송신:
Seq=1, Data="HE"
Seq=3, Data="LL"
Seq=5, Data="O"

수신:
"HE" 받음 -> ACK=3
"LL" 받음 -> ACK=5
"O"  받음 -> ACK=6
```

여기서 `ACK=6`은  
“1~5 바이트까지 받았고, 다음엔 6번 바이트를 기대한다”는 뜻입니다.

#### 중간 유실 케이스
```text
송신:
Seq=1, Data="HE"   ---->
Seq=3, Data="LL"   ---->  (중간에서 유실)
Seq=5, Data="O"    ---->

수신:
"HE" 받음 -> ACK=3
"O"는 왔지만 3,4 바이트가 비어서 순서대로 넘길 수 없음
-> 계속 ACK=3 또는 재전송 유도

송신:
ACK=3만 계속 보이거나 timeout 발생
-> Seq=3, Data="LL" 재전송

수신:
이제 "LL"까지 받음
-> ACK=6
```

즉 TCP는 **“빠진 조각이 있으면 그 뒤가 와도 완성으로 치지 않는다”**가 핵심입니다.

### 시각화
```text
보내는 쪽                          받는 쪽
---------                          ---------
Seq=1  "HE"  --------------------> 수신, ACK=3
Seq=3  "LL"  ----X(유실)          
Seq=5  "O"   --------------------> 앞 조각이 비어서 완전 전달 불가, ACK=3

[timeout or duplicate ACKs]

Seq=3  "LL"  --------------------> 빈 조각 채움
                                   ACK=6
```

정리하면:

- `Sequence` = 순서표
- `ACK` = 어디까지 받았는지 확인
- `재전송` = 빠진 조각 복구
- `Window` = 상대가 감당할 수 있는 속도 존중
- `혼잡 제어` = 네트워크 자체가 버티는 속도 존중

### 연결
이전 질문에서 TCP를 “브라우저와 서버가 대화할 통로”라고 봤다면,  
이번 질문은 그 통로가 **왜 믿을 만한지**를 설명한 것입니다.

- 이전: TCP는 통로
- 이번: 그 통로는 `seq/ack/retransmission/window` 때문에 신뢰성이 생김

한 줄로 요약하면:

> TCP의 신뢰성은 **순서 번호를 붙이고, ACK로 확인하고, 안 오면 재전송하고, 상대와 네트워크가 감당할 만큼만 보내는 것**에서 나옵니다.

원하면 다음엔 이걸 이어서 `3-way handshake가 왜 필요한가`까지 붙여 설명하겠습니다.

## Q23. 3-way 핸드쉐이크는 뭔가요?

### 비유: “통화 연결되었는지” 서로 확인하는 절차
3-way handshake는 TCP에서 **본격적인 데이터 전송 전에, 서로 연결을 열 준비가 되었는지 확인하는 3번의 왕복 절차**입니다.

| 비유 요소 | 실제 TCP 개념 | 대응 이유 |
|---|---|---|
| “나 들려?” | `SYN` | 내가 연결을 시작하겠다는 신호 |
| “들리고, 너 말도 들려. 나도 시작할게” | `SYN + ACK` | 상대 SYN을 확인했고, 나도 내 SYN을 보냄 |
| “좋아, 네 말도 들려” | `ACK` | 상대 SYN까지 최종 확인 |

핵심은:

> 한쪽만 “연결하자” 말하는 것으로는 부족하고,  
> **양쪽이 서로의 시작 번호와 수신 가능 상태를 확인해야**  
> TCP connection이 `ESTABLISHED` 됩니다.

### 설명
#### 1. 왜 필요한가
TCP는 데이터를 **순서 번호(sequence number)** 로 관리합니다.  
그래서 연결을 시작할 때 양쪽이 서로의 **초기 sequence number(ISN)** 를 알아야 합니다.

RFC 9293는 연결을 위해 두 peer가 서로의 **initial sequence number를 synchronize** 해야 하고, 이때 `SYN` 비트를 사용한다고 설명합니다.  
출처: RFC 9293, 2022-08  
<https://www.rfc-editor.org/rfc/rfc9293.html>

#### 2. 3단계가 정확히 뭐냐
브라우저를 클라이언트 A, 서버를 B라고 하면:

1. **A -> B: SYN**
   - “연결 시작하고 싶다”
   - “내 초기 sequence number는 예를 들어 100이다”

2. **B -> A: SYN + ACK**
   - “네 SYN 잘 받았고, 다음엔 101을 기대한다”
   - “나도 연결 시작한다. 내 초기 sequence number는 예를 들어 300이다”

3. **A -> B: ACK**
   - “네 SYN도 잘 받았고, 다음엔 301을 기대한다”

이 3단계가 끝나면 둘 다 `ESTABLISHED` 상태로 들어갑니다.

RFC 9293의 기본 예시도 정확히 이 흐름입니다.  
출처: RFC 9293, Section 3.5, Figure 6  
<https://www.rfc-editor.org/rfc/rfc9293.html>

#### 3. 왜 하필 3-way인가
가장 중요한 이유는 **오래된 중복 SYN(old duplicate SYN)** 때문에 헷갈리지 않게 하려는 것입니다.

RFC 9293는 3-way handshake의 주된 이유를  
**old duplicate connection initiations가 혼란을 일으키는 것을 막기 위해서**라고 설명합니다.  
출처: RFC 9293  
<https://www.rfc-editor.org/rfc/rfc9293.html>

즉 2번만 주고받으면 이런 문제가 생길 수 있습니다.

- 예전에 네트워크에 떠돌던 오래된 SYN이 뒤늦게 도착
- 서버가 그걸 새로운 연결 요청으로 착각
- 실제로는 클라이언트가 그 연결을 원하지 않는데도 연결이 열린 것처럼 보일 수 있음

세 번째 ACK가 있으면:

- 서버는 “이 클라이언트가 **지금 내 SYN-ACK를 실제로 받았구나**”
- “즉 이 연결은 진짜 현재 시점의 연결이구나”

를 더 확실히 알 수 있습니다.

#### 4. 이게 “데이터 전송”이랑 어떻게 다르냐
3-way handshake는 아직 **HTTP 요청을 보내는 단계가 아닙니다.**

- handshake = **통로를 여는 단계**
- HTTP request = **그 통로 위에 `GET /`를 보내는 단계**

즉 순서는:

1. DNS
2. TCP 3-way handshake
3. HTTPS라면 TLS handshake
4. HTTP 요청
5. HTTP 응답

입니다.

#### 5. 상태 변화로 보면
서버는 보통 처음 `LISTEN` 상태입니다.

- 클라이언트: `CLOSED -> SYN-SENT -> ESTABLISHED`
- 서버: `LISTEN -> SYN-RECEIVED -> ESTABLISHED`

RFC 9293도 `SYN-SENT`, `SYN-RECEIVED`, `ESTABLISHED` 상태를 정의합니다.  
출처: RFC 9293  
<https://www.rfc-editor.org/rfc/rfc9293.html>

### 아주 간단한 예시
```text
클라이언트 A                    서버 B

1) SYN, seq=100  ------------>
                              2) SYN+ACK, seq=300, ack=101
   <--------------------------

3) ACK, ack=301  ------------>

이제 둘 다 ESTABLISHED
그다음부터 HTTP 요청 가능
```

여기서:

- `seq=100` = “내 시작 번호는 100”
- `ack=101` = “네 100은 받았고 다음엔 101 기대”
- `ack=301` = “네 300은 받았고 다음엔 301 기대”

### 시각화
```text
Client                           Server
------                           ------
CLOSED                           LISTEN

SYN, seq=100  ----------------->

                    <-----------  SYN+ACK, seq=300, ack=101

ACK, ack=301  ----------------->

ESTABLISHED                      ESTABLISHED
```

짧게 요약하면:

```text
SYN      = 나 연결 시작할게
SYN+ACK  = 네 시작 확인, 나도 시작할게
ACK      = 네 시작도 확인
```

### 연결
- 이번 질문은 바로 직전의 “TCP가 어떻게 신뢰성을 더하나”와 직접 연결됩니다.  
  handshake는 **신뢰성 있는 통신을 시작하기 위한 준비 단계**이고, 그 다음부터 `seq/ack/retransmission`이 본격적으로 돌아갑니다.
- 네비게이션 흐름에서는 **DNS 다음, HTTP 요청 전** 단계입니다.  
  즉 `DNS -> TCP handshake -> TLS handshake -> HTTP request` 순서로 이해하면 됩니다.

한 줄로 정리하면:

> **3-way handshake는 TCP 연결을 시작할 때 양쪽이 서로의 초기 sequence number와 수신 가능 상태를 3번의 메시지로 확인해 `ESTABLISHED` 상태를 만드는 절차입니다.**

원하면 다음엔 바로 이어서  
`그럼 TLS handshake는 왜 또 필요한가? TCP handshake와 뭐가 다른가?`  
를 비교해서 설명하겠습니다.

## Q24. 아 간단히 말하면 "A: 나 연결했어 -> B: 확인했어, 난 어때? -> A: 연결확인했어" 이거군요

네, **거의 정확합니다.**

조금만 더 정확히 다듬으면:

> `A: 연결 시작할게`
> `B: 네 시작 확인했고, 나도 시작할게`
> `A: 네 시작도 확인했어`

입니다.

즉 핵심은 단순히 “연결했어”가 아니라,

- **내가 연결 시작한다는 의사**
- **네 의사를 내가 확인했다는 사실**
- **내 의사도 네가 확인했는지에 대한 확인**

이 **서로 확인**되는 겁니다.

아주 짧게 줄이면:

> **서로 연결 의사와 수신 가능 상태를 3번 주고받아 확정하는 절차**입니다.

이제 이 다음 단계는 자연스럽게:

- TCP 연결 성립
- HTTPS라면 TLS handshake
- 그 다음 HTTP 요청

으로 넘어갑니다.

원하면 바로 이어서 `TLS handshake는 TCP handshake와 뭐가 다른가` 설명하겠습니다.

## Q25. 일단 여기까지 보면, 실제 요청 결과를 받기전까지는 정리된거같습니다. 맞나요?

네, **맞습니다.**

지금까지 정리된 건 대략 **“실제 HTTP 응답 본문을 받기 직전까지”** 입니다.

흐름으로 쓰면:

1. 사용자가 주소 입력
2. 브라우저가 navigation 시작
3. 캐시/서비스워커/DNS 캐시 등 확인
4. 필요하면 DNS 조회
5. IP 확보
6. 기존 연결 재사용 여부 확인
7. 없으면 TCP 연결 수립
8. HTTPS면 TLS handshake
9. HTTP 요청 전송
10. 서버가 응답을 보내기 시작함

즉 지금 머릿속에 잡힌 범위는:

> **“브라우저가 어디로 어떻게 요청을 보낼 준비를 하고, 실제 요청을 보내는 단계”**

까지라고 보면 됩니다.

아직 다음 단계는 남아 있습니다.

- 응답 헤더/본문 수신
- HTML 파싱 시작
- CSS/JS/이미지 추가 요청
- DOM/CSSOM
- render tree
- layout
- paint
- composite

즉 면접 질문으로 보면 지금까지는  
**네트워크 준비 + 요청 전송까지** 정리된 상태이고,  
이제부터가 **응답 이후 렌더링 파트(Critical Rendering Path 포함)** 입니다.

한 줄로 정리하면:

> **네, 지금까지는 “응답을 받기 전까지의 네트워크/연결 단계”가 정리된 상태라고 보면 됩니다.**

원하면 다음부터는 `HTTP 응답을 받기 시작한 순간부터 브라우저에서 무슨 일이 일어나는지` 이어서 설명하겠습니다.

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/JSX-객체-반환-원리.md` | 브라우저 고유 객체와 JS 표현 계층 연결 | DOM은 브라우저 고유 객체이고, JS는 그 객체를 다루는 표현 계층이라는 점에서 이번 주제의 출발점과 맞닿아 있습니다. |
| `study/learn/scheduleUpdateOnFiber.md` | 이벤트 루프/마이크로태스크 연결 | 브라우저가 JS를 실행하고 콜백 순서를 조정하는 event loop, microtask 개념이 React 스케줄링 이해와 직접 이어집니다. |
| `study/learn/캐시-개념.md` | 네비게이션 전 캐시 판단 연결 | `google.com` 입력 후 바로 네트워크로 나가지 않을 수 있다는 설명은 브라우저/OS/DNS/HTTP 캐시 계층을 이해해야 정확히 설명할 수 있습니다. |

---

## 2026-03-06 (via recovered jsonl >>정리)

원본 Codex jsonl 세션에서 2026-03-06 학습 Q&A 25개를 복구해 브라우저/JS 실행, 네비게이션, DNS 캐시, TCP 연결/3-way handshake 흐름 문서로 정리함.
