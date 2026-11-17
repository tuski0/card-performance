# 안드로이드 앱 · 카드 알림 자동 기록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 갤럭시에 직접 설치하는 APK가 카드 결제 알림을 읽어 서버로 보내고, 서버가 결제를 자동으로 기록한다.

**Architecture:** APK는 얇은 껍데기다. 화면은 WebView로 배포된 웹앱(`https://card-performance.vercel.app`)을 그대로 띄우고, `NotificationListenerService`가 카드 알림만 골라 `POST /api/ingest`로 보낸다. 서버는 기존 `parsePaymentText`로 해석하고, 무엇을 할지(기록/취소/보관함/무시)는 순수 함수 `decideIngest`가 정한다. DB 접근은 기기 토큰으로 사용자를 찾는 `security definer` SQL 함수 2개로만 해서, Vercel에 Supabase secret key를 두지 않는다.

**Tech Stack:** Next.js 15 route handler, Supabase Postgres(SQL 함수, pgcrypto), Vitest / Kotlin 2.x, Android Gradle Plugin 8.x, minSdk 26, targetSdk 35, WebView, WorkManager, JUnit4

**Spec:** 이 대화에서 정한 요구사항 (`docs/designs/card-performance.md` 의 결제 기록 규칙을 그대로 따름)
- 나만 쓰는 APK (플레이스토어 X, 직접 설치)
- 알림이 오면 자동 등록, KB Pay 같은 질문이 필요한 건 일단 등록하고 앱에 "확인 필요"로 표시
- 같은 알림 중복 등록 금지, 취소 알림은 원래 결제를 취소 처리
- 화면 수정은 Vercel 배포만으로 반영 (APK 재설치 불필요)

## Global Constraints

- 웹앱 주소: `https://card-performance.vercel.app` (APK에 상수로)
- 서버로는 결제처럼 보이는 알림만 보낸다: 본문에 `\d원` 이 있고 `승인|결제|사용|취소` 중 하나가 있을 것. 그 외 알림 내용은 기기 밖으로 나가지 않는다.
- 기기 토큰은 32바이트 랜덤 hex. DB에는 sha256 hex만 저장한다.
- 요청 본문의 `text`는 2,000자 넘으면 400.
- Vercel 환경 변수 추가 없음 (기존 publishable key만 사용).
- 새 마이그레이션은 사용자가 Supabase SQL Editor에서 직접 실행한다 (기존 0001~0004와 같은 방식).
- 실행 중인 dev 서버가 있으면 `npm run build` 금지 (README 규칙).
- APK 서명은 debug 키(`~/.android/debug.keystore`)로 한다. 이 파일이 바뀌면 업데이트 설치가 안 되니 지우지 말 것.

## Review Focus

1. **같은 알림이 두 번 들어옴** (삼성이 알림을 갱신하며 재게시, 또는 재시도) → 결제는 하나만 생긴다. → Task 2 SQL `ingest_save` 10분 중복 검사 + Task 5 기기 쪽 최근 키 기억.
2. **카드를 알 수 없는 알림** (끝자리가 아직 등록 안 된 카드) → 잃어버리지 않고 보관함에 남아, 누르면 내용이 채워진 결제 기록 화면으로 간다. → Task 1 `no-card` 테스트, Task 3 화면.
3. **원 결제를 못 찾는 취소 알림** → 아무 결제나 취소하지 않고 보관함으로. → Task 1 `no-cancel-target` 테스트.
4. **오프라인일 때 결제** → 연결되면 다시 보내고, 결제 시각은 보낸 시각이 아니라 알림이 온 시각. → Task 1 `postedAt` 테스트, Task 5 WorkManager 재시도.
5. **결제가 아닌 알림** ("이번 달 1,000원 적립 혜택 안내" 같은 광고) → 기기에서 걸러지거나, 서버에서 금액·가맹점이 없으면 무시. → Task 5 필터 테스트, Task 1 `ignore` 테스트.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `supabase/migrations/0005_ingest.sql` | `device_tokens`, `notification_inbox` 테이블, `payments.source`/`source_key` 컬럼, SQL 함수 `ingest_context`, `ingest_save` |
| `lib/ingest.ts` | 순수 함수 `decideIngest` (해석 결과 + 사용자 데이터 → 할 일) |
| `lib/ingest.test.ts` | 위 함수 테스트 |
| `app/api/ingest/route.ts` | 토큰 확인 → `ingest_context` → `decideIngest` → `ingest_save` |
| `middleware.ts` | `/api/ingest`는 로그인 리다이렉트에서 제외 |
| `lib/data/deviceTokens.ts` | 토큰 만들기(해시 저장)·해제 |
| `lib/data/review.ts` | 확인 필요 결제 판정 `needsReview`, 보관함 읽기/정리 |
| `app/review/page.tsx` | "자동 기록 확인" 화면 |
| `components/ReviewBanner.tsx` | 달력 위 "확인 필요 N건" 배너 |
| `components/AppLink.tsx` | 마이페이지 "알림 자동 기록" 섹션 (APK 안에서만 보임) |
| `android/` | Gradle 프로젝트 (아래 Task 4~6) |

---

### Task 1: 서버 판단 로직 `decideIngest`

**Files:**
- Create: `lib/ingest.ts`, `lib/ingest.test.ts`
- Modify: `lib/cards/types.ts` (`Payment`에 `source?: 'manual' | 'notification'` 추가)

**Interfaces:**
- Consumes: `parsePaymentText`, `findCancelTarget` (`lib/parse.ts`), `findBrand`, `guessCategory`, `merchantKey`
- Produces:
  ```ts
  export type IngestContext = {
    cardNumbers: Record<string, CardId>;        // last4 → card
    merchantMemory: Record<string, Category>;   // merchantKey → category
    recent: Payment[];                          // 최근 31일 결제
  };
  export type IngestAction =
    | { kind: 'record'; payment: Omit<Payment, 'id'> }        // source: 'notification', answers: {}
    | { kind: 'cancel'; paymentId: string }
    | { kind: 'inbox'; reason: 'no-card' | 'no-cancel-target' | 'no-merchant' }
    | { kind: 'ignore' };
  export function decideIngest(text: string, ctx: IngestContext, postedAt: Date): IngestAction;
  ```

규칙: 금액 없음 → `ignore`. 카드 = 알림의 카드 이름 → 없으면 `cardNumbers[last4]` → 없으면 `inbox no-card`. 가맹점 없음 → `inbox no-merchant`. 취소면 `findCancelTarget(ctx.recent, …)` → 있으면 `cancel`, 없으면 `inbox no-cancel-target`. 분류 = `merchantMemory[merchantKey]` → `findBrand(m)?.category` → `guessCategory(m)`. `parsePaymentText(text, postedAt)`로 시각을 정한다 (본문에 시각 없으면 알림 시각).

- [ ] **Step 1: 실패하는 테스트 작성** — `lib/ingest.test.ts`
  - `records a KB notification`: `'KB국민카드 5351 승인\n홍*동님\n5,000원 일시불\n11/16 08:34\nCU 역삼점'`, `cardNumbers {'5351':'kb-youth-b'}` → `kind 'record'`, `payment.cardId 'kb-youth-b'`, `amount 5000`, `brand 'cu'`, `category 'convenience'`, `source 'notification'`, `answers {}`
  - `no-card when last4 is unknown`: 같은 문구, `cardNumbers {}` → `{ kind:'inbox', reason:'no-card' }`
  - `card name in text wins`: `'토스뱅크 체크 12,000원 결제 스타벅스'` → `cardId 'toss'`
  - `remembered category wins over guess`: `merchantMemory {[merchantKey('동네식당')]: 'cafe'}` → `category 'cafe'`
  - `cancels the matching payment`: recent에 같은 카드·금액·가맹점 결제 `p1` → `{ kind:'cancel', paymentId:'p1' }`
  - `no-cancel-target`: recent 비어 있음 → `{ kind:'inbox', reason:'no-cancel-target' }`
  - `uses postedAt when the text has no time`: postedAt `2026-11-10T03:00:00Z`, `'토스뱅크 체크 12,000원 결제 스타벅스'` → `payment.paidAt === '2026-11-10T03:00:00.000Z'`
  - `ignore`: `'이번 주 혜택을 확인하세요'` → `{ kind:'ignore' }`
- [ ] **Step 2:** `npx vitest run lib/ingest.test.ts` → FAIL (module not found)
- [ ] **Step 3:** `lib/ingest.ts` 구현, `Payment.source` 추가 (`toPayment`은 Task 2에서 매핑)
- [ ] **Step 4:** `npm test` → 전부 PASS (기존 103 + 신규)
- [ ] **Step 5:** `git commit -m "feat: decide what to do with a card notification"`

---

### Task 2: DB 마이그레이션 + `/api/ingest`

**Files:**
- Create: `supabase/migrations/0005_ingest.sql`, `app/api/ingest/route.ts`
- Modify: `middleware.ts` (조건에 `!path.startsWith('/api/ingest')`), `lib/data/payments.ts` (`PaymentRow.source`, `toPayment`에 `source` 매핑)

**Interfaces:**
- Consumes: `decideIngest`, `IngestContext`, `IngestAction` (Task 1)
- Produces:
  - 테이블 `device_tokens(id uuid pk, user_id uuid default auth.uid(), token_hash text unique, created_at, last_used_at)` — RLS own rows
  - 테이블 `notification_inbox(id uuid pk, user_id uuid default auth.uid(), text text, reason text, posted_at timestamptz, source_key text, resolved boolean default false, created_at)` — RLS own rows
  - `payments.source text not null default 'manual'`, `payments.source_key text`
  - `ingest_context(p_token text) returns jsonb` → `{ cardNumbers, merchantMemory, recent }` (recent = 최근 31일, `Payment` 모양 그대로의 camelCase), 토큰이 없으면 `null`. `last_used_at` 갱신.
  - `ingest_save(p_token text, p_action jsonb, p_source_key text, p_text text, p_posted_at timestamptz) returns text` → `'recorded' | 'canceled' | 'inboxed' | 'duplicate' | 'unauthorized'`. 같은 사용자·같은 `source_key` 결제(또는 보관함 항목)가 10분 안에 있으면 `'duplicate'`. `cancel`은 해당 사용자의 결제만 `canceled = true`. 함수 안에서는 `auth.uid()`가 비어 있으니 insert 때 `user_id`를 토큰으로 찾은 값으로 직접 넣는다.
  - 둘 다 `security definer`, `set search_path = public, extensions`, `grant execute … to anon, authenticated`. 토큰 해시는 `encode(extensions.digest(p_token, 'sha256'), 'hex')`.
  - HTTP: `POST /api/ingest`, 헤더 `Authorization: Bearer <token>`, 본문 `{ text: string, package: string, postedAt: number /* epoch ms */, key: string }` → `200 { result }` / `400` (본문 오류, text 2,000자 초과) / `401` (토큰 무효)

- [ ] **Step 1:** `0005_ingest.sql` 작성 → 사용자에게 SQL Editor에서 실행 요청 (실행됐다는 답을 받고 진행)
- [ ] **Step 2:** route 작성. Supabase 클라이언트는 `createClient(url, publishableKey)` (쿠키 없이). 흐름: 본문 검사 → `rpc('ingest_context')` → null이면 401 → `decideIngest(text, ctx, new Date(postedAt))` → `ignore`면 `200 {result:'ignored'}` → 아니면 `rpc('ingest_save')`
- [ ] **Step 3:** 확인 — 브라우저 콘솔에서 테스트 토큰 하나를 `device_tokens`에 넣고(Task 3 함수 없이 SQL로 해시 직접 insert) dev 서버에 curl:
  ```bash
  curl -s -X POST localhost:3000/api/ingest -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
    -d '{"text":"KB국민카드 5351 승인\n5,000원 일시불\n11/16 08:34\nCU 역삼점","package":"test","postedAt":1763249640000,"key":"t1"}'
  ```
  기대: 첫 번째 `{"result":"recorded"}`, 같은 요청 다시 → `{"result":"duplicate"}`, 토큰 틀리면 401. 끝나면 테스트 결제·토큰 삭제.
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit` PASS
- [ ] **Step 5:** `git commit -m "feat: ingest endpoint for card notifications"`

---

### Task 3: 웹앱 쪽 — 확인 필요 화면, 배너, 마이페이지 연결

**Files:**
- Create: `lib/data/review.ts` (+ `lib/data/review.test.ts`), `lib/data/deviceTokens.ts`, `app/review/page.tsx`, `components/ReviewBanner.tsx`, `components/AppLink.tsx`
- Modify: `app/(tabs)/page.tsx` (배너 줄에 `<ReviewBanner />`), `app/(tabs)/my/page.tsx` (`<AppLink />` 섹션), `components/PaymentForm.tsx` (`?inbox=<id>`로 열렸으면 저장 후 그 항목 `resolved = true`)

**Interfaces:**
- Produces:
  ```ts
  // lib/data/review.ts
  export function needsReview(p: Payment): boolean; // source==='notification' && !canceled && (category==='unknown' || pendingQuestions(p.cardId, p.category, p.brand).some(q => !(q.key in p.answers)))
  export type InboxItem = { id: string; text: string; reason: string; postedAt: string };
  export async function listInbox(db: SupabaseClient): Promise<InboxItem[]>;     // resolved = false, 최신순
  export async function resolveInbox(db: SupabaseClient, id: string): Promise<void>;
  // lib/data/deviceTokens.ts
  export async function createDeviceToken(db: SupabaseClient): Promise<string>;  // 랜덤 32바이트 hex, sha256(hex)을 insert, 원문 반환
  export async function revokeDeviceTokens(db: SupabaseClient): Promise<void>;
  // APK가 WebView에 넣어 주는 객체 (Task 4)
  declare global { interface Window { CardApp?: { setToken(t: string): void; hasToken(): boolean; hasNotificationAccess(): boolean; openNotificationAccess(): void; openBatterySettings(): void } } }
  ```
- 화면 문구:
  - 배너: `자동 기록 확인 {n}건` → `/review`
  - `/review` 두 묶음: "답이 필요한 결제"(누르면 `/new?id=`), "카드를 모르는 알림"(누르면 `/new?{toFormQuery(text)}&inbox={id}`, 옆에 `지우기`)
  - 마이페이지 섹션 제목 `알림 자동 기록`. `window.CardApp`이 없으면 섹션을 숨긴다. 버튼: `이 폰 연결`(토큰 생성 → `CardApp.setToken`), `알림 접근 허용`, `배터리 예외 설정`, `연결 해제`. 상태 줄: `연결됨 · 알림 접근 허용됨` / `알림 접근이 꺼져 있어요`

- [ ] **Step 1:** `review.test.ts` — `needsReview`: (a) 수동 입력은 false, (b) 알림 + CU + `answers {}` (kb-youth-b) → true, (c) 같은 결제 `answers {kbPay:false}` → false, (d) 알림 + `category 'unknown'` → true, (e) 취소된 결제 → false
- [ ] **Step 2:** `npx vitest run lib/data/review.test.ts` → FAIL
- [ ] **Step 3:** 구현 (테스트 대상 함수 + 화면들)
- [ ] **Step 4:** `npm test` PASS. 브라우저 미리보기에서: Task 2에서 쓴 curl로 결제 1건(KB Pay 질문 필요)과 카드 모름 1건을 넣고 → 달력 배너 `자동 기록 확인 2건` → `/review`에서 각각 눌러 처리 → 배너 사라짐. 끝나면 테스트 데이터 삭제.
- [ ] **Step 5:** `git commit -m "feat: review auto-recorded payments and unmatched notices"`

---

### Task 4: 빌드 도구 설치 + 안드로이드 프로젝트 뼈대 (WebView)

**Files:**
- Create: `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties`, `android/app/build.gradle.kts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/app/cardperf/MainActivity.kt`, `android/app/src/main/java/app/cardperf/Bridge.kt`, `android/app/src/main/res/` (아이콘은 `public/icons`의 PNG 재사용), `android/.gitignore`
- Modify: 루트 `.gitignore`(`android/local.properties`, `android/build`, `android/app/build`, `android/.gradle`)

**Interfaces:**
- Produces: `applicationId "app.cardperf"`. `Prefs` (SharedPreferences `"card"`): `token: String?`, `recentKeys: List<String>` (최대 50). `Bridge`는 WebView에 `CardApp`이라는 이름으로 등록, 메서드는 Task 3의 `Window.CardApp`과 같은 이름.

- [ ] **Step 1:** 설치 (사용자 확인 후, 수 GB):
  ```bash
  brew install --cask temurin@17 android-commandlinetools
  brew install gradle
  sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
  ```
  `android/local.properties`에 `sdk.dir=/opt/homebrew/share/android-commandlinetools`. 확인: `java -version`이 17, `adb version` 출력.
- [ ] **Step 2:** Gradle 프로젝트 작성 후 `cd android && gradle wrapper` 로 wrapper 생성
- [ ] **Step 3:** `MainActivity`: WebView 전체 화면, JavaScript·DOM storage 켬, 쿠키 유지(`CookieManager.flush()` onPause), 뒤로가기 = WebView 뒤로, 웹앱 도메인 밖 링크는 외부 브라우저로. `Bridge`: `setToken`(Prefs 저장), `hasToken`, `hasNotificationAccess`(`NotificationManagerCompat.getEnabledListenerPackages`), `openNotificationAccess`(`Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`), `openBatterySettings`(`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).
- [ ] **Step 4:** `./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk` 생성
- [ ] **Step 5:** `git commit -m "feat(android): WebView shell app"`

---

### Task 5: 알림 읽기 + 서버 전송

**Files:**
- Create: `android/app/src/main/java/app/cardperf/PaymentListener.kt`, `NoticeFilter.kt`, `IngestWorker.kt`, `android/app/src/test/java/app/cardperf/NoticeFilterTest.kt`
- Modify: `AndroidManifest.xml` (listener service + `BIND_NOTIFICATION_LISTENER_SERVICE`, `INTERNET`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`), `app/build.gradle.kts` (`androidx.work:work-runtime-ktx`, `junit:junit`)

**Interfaces:**
- Consumes: `Prefs` (Task 4), `POST /api/ingest` 형식 (Task 2)
- Produces:
  ```kotlin
  object NoticeFilter {
      fun looksLikePayment(text: String): Boolean          // Global Constraints의 정규식
      fun keyOf(pkg: String, text: String): String          // sha256 hex of "$pkg|$text"
  }
  class IngestWorker : CoroutineWorker  // inputData: text, package, postedAt(Long), key
  ```

흐름: `onNotificationPosted(sbn)` → 자기 앱 알림 무시 → `text = title + "\n" + (EXTRA_BIG_TEXT ?: EXTRA_TEXT)` → `looksLikePayment` 아니면 끝 → `keyOf`가 `recentKeys`에 있으면 끝, 아니면 추가 → 토큰 없으면 끝 → `IngestWorker`를 네트워크 연결 조건 + 지수 백오프로 enqueue. Worker: 2xx → success, 400/401 → failure(재시도 안 함), 그 외·네트워크 오류 → retry.

- [ ] **Step 1:** `NoticeFilterTest`: `"KB국민카드 5351 승인\n5,000원 일시불"` → true, `"토스뱅크 체크카드 12,000원 결제"` → true, `"승인취소 5,000원 CU"` → true, `"이번 주 혜택을 확인하세요"` → false, `"카톡: 내일 3시에 봐"` → false, `"택배가 도착했어요 (1,000원 착불)"` → false; `keyOf("a","x") == keyOf("a","x")`, `keyOf("a","x") != keyOf("b","x")`
- [ ] **Step 2:** `./gradlew testDebugUnitTest` → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** `./gradlew testDebugUnitTest assembleDebug` → PASS, APK 생성
- [ ] **Step 5:** `git commit -m "feat(android): forward card notifications to the ingest endpoint"`

---

### Task 6: 폰에 설치하고 실제로 확인

사용자와 같이 진행한다 (폰 조작은 사용자).

- [ ] **Step 1:** APK를 폰으로 옮긴다. USB 디버깅을 켰으면 `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, 아니면 카톡 "나에게 보내기"나 Quick Share로 파일 전송 후 설치 ("출처를 알 수 없는 앱" 허용)
- [ ] **Step 2:** 앱 실행 → 로그인 → 마이페이지 `알림 자동 기록` → `이 폰 연결` → `알림 접근 허용` → `배터리 예외 설정`
- [ ] **Step 3:** 실제 카드로 소액 결제 1건 → 1분 안에 달력에 기록되는지, KB Pay 질문이 필요한 결제면 배너가 뜨는지 확인. 실패하면 Vercel 로그(`/api/ingest`)와 `adb logcat -s CardPerf` 확인
- [ ] **Step 4:** 알림 앱 패키지명을 로그로 확인해서 문서에 적는다 (나중에 필터를 좁힐 때 사용)
- [ ] **Step 5:** README에 "안드로이드 앱 빌드·설치" 절 추가, `git commit -m "docs: android app build and install"`

---

## 알려진 한계 (이번엔 안 함)

- 앱 안 WebView에서는 엑셀 내보내기 다운로드가 안 될 수 있음 → 데스크탑에서 사용
- 문자(SMS)로만 오는 카드 알림은 메시지 앱 알림으로 들어오므로 필터만 통과하면 같이 처리됨. 따로 SMS 권한은 쓰지 않음
- 지인에게 배포하려면 서명 키 관리·업데이트 방법을 따로 정해야 함
