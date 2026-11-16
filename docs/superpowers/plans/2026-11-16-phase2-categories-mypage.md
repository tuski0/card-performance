# 2단계 작업 목록: 분류 개편, 마이페이지, 달력 가독성

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지인에게 나눠 줄 수 있도록 분류를 "대분류 + 브랜드"로 바꾸고, 마이페이지(내 카드 선택, 카드 추가 요청)를 넣고, 달력 금액을 읽기 쉽게 한다.

**Architecture:** 카드 규칙은 계속 코드(`lib/cards/`)에 둔다. 카드 추가는 사용자가 요청만 남기고 관리자가 코드에 규칙을 넣어 배포한다. 결제에는 대분류(`category`)와 브랜드(`brand`)를 함께 저장하고, 혜택은 브랜드 또는 대분류로 판정한다. 계산 방식(한도, 실적, 통합 한도)은 바꾸지 않는다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, Supabase JS v2, Vitest. 새 라이브러리는 추가하지 않는다.

**Spec:** `docs/designs/card-performance.md` (1단계 요구사항). 이 문서의 "결정 사항"이 2단계 요구사항이다.

## 결정 사항 (사용자와 합의, 2026-11-16)

- 카드 규칙은 DB로 옮기지 않는다. 카드 추가는 "요청 → 관리자가 코드에 기입" 방식이다.
- 분류는 대분류 11개로 고정한다. 가맹점 이름은 브랜드로 정리해 함께 저장한다.
- 처음 보는 가맹점은 대분류를 한 번 고르면 계정별로 기억한다.
- 계정마다 보유 카드를 고른다. 고르지 않은 계정은 전체 카드를 보여준다.
- 가입은 앱에서 받지 않는다. 관리자가 Supabase 대시보드에서 계정을 만들어 준다.
- 달력 날짜 칸은 금액을 12px 진한 글자로 키우고 혜택은 파란 줄로 따로 표시한다.

## Global Constraints

- 금액은 원 단위 정수. 날짜·월 경계는 Asia/Seoul (`lib/engine/month.ts`의 `dayKey`, `monthKey` 사용).
- 화면 문구는 해요체, 버튼은 짧은 명사형("저장", "결제 기록").
- 색과 부품은 `app/globals.css`의 토큰(`bg-brand`, `text-ink-3` 등)과 `components/ui.tsx`만 쓴다.
- 브라우저 기본 `confirm()`/`alert()` 금지(앱 내 브라우저에서 막힘). 삭제는 "한 번 더 누르면 삭제" 두 단계 버튼.
- Supabase 오류는 `Error` 인스턴스가 아니다. 메시지는 `errMsg(e, fallback)` (`lib/format.ts`)로 꺼낸다.
- 개발 서버가 켜져 있을 때 `npm run build`를 돌리지 않는다(`.next`가 덮여 화면이 500이 된다). 검증은 `npx tsc --noEmit`, `npm run lint`, `npm test`로 하고, 빌드는 Task 7에서 서버를 끄고 한다.
- DB 비밀번호와 service_role 키는 쓰지 않는다. SQL은 사용자가 Supabase SQL Editor에서 실행한다.
- 작업마다 테스트를 먼저 쓰고(실패 확인) 구현한 뒤 커밋한다. 화면 변경은 미리보기 서버(`.claude/launch.json`의 `web`)에서 휴대폰 폭(375px)과 데스크톱 폭으로 확인한다.
- macOS다. `sed -i ''`를 쓰고, 한글이 든 파일을 스크립트로 고칠 때는 UTF-8로 읽고 쓴다.

## Review Focus

- 옛 분류값(`starbucks`, `burger` 등)이 저장된 결제를 불러와도 화면이 깨지지 않고 "미분류"로 보인다. (Task 2 테스트 `legacyCategoryFallsBackToUnknown`)
- 브랜드는 알지만 지점명이 낯선 알림("씨유(CU) 구로예성점")도 브랜드 CU, 대분류 편의점·마트로 잡힌다. (Task 2 `brandFromBranchName`)
- 보유 카드를 하나도 고르지 않은 계정은 빈 화면이 아니라 전체 카드를 본다. (Task 4 `ownedDefaultsToAll`)
- 보유 카드에서 뺀 카드의 지난 결제는 내역과 달력에 계속 보인다. (Task 4 화면 확인 단계)
- 가맹점 기억은 계정별이다. 다른 계정의 기억이 섞이지 않는다. (Task 3 RLS)

---

### Task 0: 확인용 데이터 정리

- [ ] 미리보기에서 `/cards/recurring`의 "테스트 반복결제"를 삭제한다(두 번 누름).
- [ ] 달력 11월 1일의 1,000원 결제를 열어 "이 결제 삭제"로 지운다.
- [ ] 달력 지출이 0원으로 돌아왔는지 확인한다. 커밋할 것은 없다.

### Task 1: 달력 금액 가독성

**Files:** Modify `app/(tabs)/page.tsx` (날짜 칸 버튼 부분), `lib/format.ts`, Test `lib/format.test.ts` (새로 만듦)

- [ ] **테스트:** `short(5980) === '5,980'`, `short(99999) === '99,999'`, `short(123000) === '12.3만'`, `short(1250000) === '125만'`.
- [ ] `short`를 10만 원 미만은 쉼표 숫자, 그 이상은 만 단위로 바꾼다.
- [ ] 날짜 칸: 높이 `h-[66px] md:h-[76px]`, 날짜 숫자 원 `h-7 w-7 text-[14px]`, 금액 `text-[12px] font-bold text-ink`, 혜택이 있으면 그 아래 `text-[10px] font-semibold text-brand`로 `+{short(benefit)}`. "오늘" 글자는 없앤다(오늘은 숫자 색으로만 구분).
- [ ] 375px 폭에서 "99,999"가 칸 밖으로 넘치지 않는지 확인한다(결제를 임시로 기록해 보고 지운다).
- [ ] 커밋 `style: readable daily amounts on calendar`.

### Task 2: 분류를 대분류 + 브랜드로 개편

**Files:**
- Modify: `lib/cards/types.ts`, `lib/cards/kb-talktalk.ts`, `kb-nara.ts`, `kb-youth-b.ts`, `toss.ts`, `lib/engine/compute.ts`, `lib/merchants.ts`, `lib/data/payments.ts`, `lib/data/recurring.ts`, `lib/engine/schedule.ts`, `components/PaymentForm.tsx`, `app/(tabs)/cards/recurring/page.tsx`
- Create: `lib/brands.ts`, `supabase/migrations/0003_phase2.sql`
- Test: `lib/brands.test.ts`, 기존 `lib/cards/cards.test.ts`, `lib/engine/compute.test.ts`, `lib/merchants.test.ts`, `lib/engine/history.test.ts`, `lib/engine/schedule.test.ts` 수정

**Interfaces (Produces):**
- `type Category = 'food' | 'cafe' | 'convenience' | 'transit' | 'telecom' | 'shopping' | 'leisure' | 'subscription' | 'overseas' | 'excluded' | 'etc' | 'unknown'`
- `CATEGORY_LABELS`: 식비, 카페, 편의점·마트, 교통, 통신, 쇼핑, 문화·여가, 구독, 해외 결제, 실적 제외(세금·상품권 등), 기타, 미분류
- `type Brand = { id: string; name: string; category: Category; match: RegExp }`, `BRANDS: Brand[]` (`lib/brands.ts`)
- `findBrand(merchant: string): Brand | null`
- `guessCategory(merchant: string): Category` → 브랜드가 있으면 그 대분류, 없으면 `'unknown'` (기존 함수 유지, 내부만 교체)
- `normalizeCategory(value: string): Category` → 목록에 없는 값은 `'unknown'`
- `Payment`에 `brand: string | null` 추가. `Recurring`에도 `brand: string | null` 추가.
- `Benefit`: `categories: Category[] | 'all'`을 `categories?: Category[] | 'all'`로, `brands?: string[]` 추가. 결제가 `brands`에 있거나 `categories`에 있으면 대상이다(둘 다 없으면 대상 아님).
- `CardRule.performanceExcludedBrands?: string[]` 추가.
- `pendingQuestions(cardId, category, brand)` — 세 번째 인자 추가.

**브랜드 목록 (id → 이름, 대분류, 알림에 오는 표기):**

| id | 이름 | 대분류 | 표기 |
|---|---|---|---|
| starbucks | 스타벅스 | cafe | 스타벅스, starbucks |
| cu | CU | convenience | `(^|\s|\()cu(?![a-z])`, 씨유 |
| gs25 | GS25 | convenience | gs25, 지에스25 |
| mcdonalds / burgerking / lotteria / momstouch / kfc | 각 이름 | food | 맥도날드, 버거킹, 롯데리아, 맘스터치, kfc |
| outback / vips | 아웃백 / VIPS | food | 아웃백, vips, 빕스 |
| baemin / coupangeats | 배달의민족 / 쿠팡이츠 | food | 배달의민족, 배민, 우아한형제들, 쿠팡이츠 |
| public-transit | 대중교통 | transit | 지하철, 버스, 티머니, 후불교통 |
| taxi | 택시 | transit | 택시, 카카오t |
| cgv | CGV | leisure | cgv |
| everland / lotteworld | 에버랜드 / 롯데월드 | leisure | 에버랜드, 롯데월드 |
| toeic / jpt | TOEIC / JPT | leisure | toeic, 토익, jpt |
| kyobo | 교보문고 | shopping | 교보문고 |
| musinsa / 29cm / wconcept / zigzag / ably | 각 이름 | shopping | 무신사, 29cm, w컨셉, 지그재그, 에이블리 |
| oliveyoung | 올리브영 | shopping | 올리브영 |
| yanolja | 야놀자 | leisure | 야놀자 |
| naverplus / coupangwow | 네이버플러스 / 쿠팡와우 | subscription | 네이버플러스, 쿠팡와우, 쿠팡 와우 |
| skt / kt / lguplus / liivm | 각 이름 | telecom | `(^|\s)skt`, sk텔레콤, `(^|\s)kt(\s|$)`, lg ?u\+, 엘지유플러스, liiv ?m |

**카드 규칙 옮기기 (혜택 id, 할인율, 한도, 질문은 그대로 두고 대상만 바꾼다):**

| 카드 | 혜택 | 새 대상 |
|---|---|---|
| 톡톡 | starbucks | brands `['starbucks']` |
| 톡톡 | burger | brands `['mcdonalds','burgerking','lotteria','momstouch','kfc']` |
| 톡톡 | easyPay | categories `'all'` |
| 톡톡 | basic | brands `['public-transit','taxi']`, categories `['telecom']` |
| 나라사랑 | transit | brands `['public-transit']` |
| 나라사랑 | cgv / themepark / starbucks / familyRestaurant / bookstore / languageTest | brands `['cgv']` / `['everland','lotteworld']` / `['starbucks']` / `['outback','vips']` / `['kyobo']` / `['toeic','jpt']` |
| 나라사랑 | telecom | categories `['telecom']` |
| 나라사랑 | 실적 제외 | `performanceExcludedCategories: ['excluded','overseas']`, `performanceExcludedBrands: ['public-transit']` |
| Youth B | shoppingMembership | brands `['naverplus','coupangwow']` |
| Youth B | telecom | categories `['telecom']` |
| Youth B | fashion | brands `['musinsa','29cm','wconcept','zigzag','ably']` |
| Youth B | life | brands `['oliveyoung','yanolja']` |
| Youth B | delivery | brands `['baemin','coupangeats']` |
| Youth B | convenience | brands `['cu','gs25']` (KB Pay 질문 유지) |
| Youth B | date | brands `['outback','vips','everland','lotteworld']` |
| 토스 | anywhere | categories `'all'` |

- [ ] **Step 1: 테스트 먼저.** `lib/brands.test.ts`: `brandFromBranchName` (`findBrand('씨유(CU) 구로예성점')?.id === 'cu'`, `findBrand('지에스25 수지하음점')?.id === 'gs25'`, `findBrand('CUBE카페') === null`, `findBrand('동네식당') === null`), `legacyCategoryFallsBackToUnknown` (`normalizeCategory('starbucks') === 'unknown'`, `normalizeCategory('food') === 'food'`). 기존 엔진 테스트의 `pay()` 도우미를 `(cardId, amount, brandOrCategory, paidAt, extra)`에서 브랜드 id를 받으면 `brand`와 그 대분류를 채우도록 고치고, 기대값(할인액, 한도, 실적)은 바꾸지 않는다. 추가 테스트: 브랜드 없는 `category: 'cafe'` 결제는 톡톡 스타벅스 할인을 받지 않는다; 나라사랑 `public-transit` 결제는 실적에서 빠진다.
- [ ] **Step 2:** `npm test`로 실패 확인.
- [ ] **Step 3:** 구현. `compute.ts`의 `matches`는 `p.brand`가 `b.brands`에 있거나 `b.categories`가 `'all'`/포함일 때 참. `NEVER_BENEFIT`(unknown, excluded, overseas)은 유지하되, 브랜드가 있으면 대분류는 브랜드 것이므로 그대로 통과한다. `lib/data/payments.ts`는 `brand` 칸을 읽고 쓰며 `category`는 `normalizeCategory`를 거친다.
- [ ] **Step 4:** 입력 화면. 가맹점을 입력하면 `findBrand`로 브랜드와 대분류를 채운다. 브랜드가 잡히면 분류 아래에 `브랜드: CU`를 작게 보여준다. 분류 선택 목록은 대분류 12개. 사용자가 분류를 직접 바꿔도 브랜드는 유지한다. 반복 결제 폼도 같다.
- [ ] **Step 5:** `0003_phase2.sql`에 `alter table public.payments add column brand text;`, `alter table public.recurring_payments add column brand text;`, `update public.payments set category = 'unknown' where category not in (새 12개);`를 쓴다. (이 파일은 Task 3, 4에서 이어서 채운다. 사용자 실행은 Task 4 끝에 한 번.)
- [ ] **Step 6:** `npm test`, `npx tsc --noEmit`, `npm run lint` 통과 후 커밋 `feat: top-level categories with brand matching`.

### Task 3: 가맹점 분류 기억

**Files:** Create `lib/data/merchantMemory.ts`; Modify `components/PaymentForm.tsx`, `supabase/migrations/0003_phase2.sql`; Test `lib/merchants.test.ts`

**Interfaces:**
- `merchantKey(merchant: string): string` → 브랜드가 있으면 `brand:<id>`, 없으면 공백 제거·소문자 이름에서 끝의 `점`/지점 표기를 뗀 값. 테스트: `merchantKey('동네식당 구로점') === merchantKey('동네식당구로점')`, `merchantKey('씨유(CU) 구로예성점') === 'brand:cu'`.
- `getMerchantMemory(db): Promise<Record<string, Category>>`, `rememberMerchant(db, merchant, category): Promise<void>`
- SQL: `merchant_categories(user_id uuid default auth.uid(), merchant_key text, category text, primary key (user_id, merchant_key))` + RLS `user_id = auth.uid()` (0001의 정책과 같은 모양).

- [ ] 테스트 → 구현.
- [ ] 입력 화면: 브랜드가 없고 기억에 있으면 그 대분류를 채운다. 저장할 때 브랜드가 없는 결제의 대분류가 `unknown`이 아니면 `rememberMerchant`를 부른다(실패해도 저장은 계속).
- [ ] 미분류로 저장하려 하면 막지 않고, 분류 칸 아래 안내 문구만 유지한다.
- [ ] 커밋 `feat: remember category per merchant`.

### Task 4: 마이페이지 (내 카드 선택, 카드 추가 요청)

**Files:** Create `app/(tabs)/my/page.tsx`, `lib/data/myCards.ts`, `lib/cards/owned.ts`; Modify `components/TabBar.tsx` (탭 4개: 달력, 내역, 카드, 마이), `lib/data/useMonthData.ts`, `app/(tabs)/cards/page.tsx`, `components/PaymentForm.tsx`, `app/(tabs)/cards/recurring/page.tsx`, `app/(tabs)/history/page.tsx`, `supabase/migrations/0003_phase2.sql`; Test `lib/cards/owned.test.ts`

**Interfaces:**
- SQL: `alter table public.user_cards add column owned boolean not null default false;`, `card_requests(id uuid default gen_random_uuid() primary key, user_id uuid default auth.uid(), card_name text not null, note text, created_at timestamptz default now())` + RLS(본인 행만 insert/select).
- `ownedCards(rows: { cardId: CardId; owned: boolean }[]): CardId[]` → owned가 참인 카드. 하나도 없으면 전체 카드(`ownedDefaultsToAll` 테스트).
- `getMyCards(db)`, `setOwned(db, cardId, owned)`, `requestCard(db, cardName, note)`
- `searchCards(query: string): CardRule[]` → 카드 이름에 검색어(공백 무시, 대소문자 무시)가 들어간 카드.

**화면 (`/my`):**
- 내 카드: 검색 입력 + 카드 목록. 카드마다 켜고 끄는 스위치(반복 결제 화면의 스위치와 같은 모양). 켠 카드는 끝자리(`settings.last4`)를 보여주고 지울 수 있다.
- 찾는 카드가 없을 때: "카드 추가 요청" 폼(카드 이름 필수, 메모 선택). 보내면 "요청을 받았어요. 추가되면 목록에 나와요."
- 반복 결제 바로가기, 로그아웃 버튼(`supabase.auth.signOut()` 후 `/login`).

- [ ] 테스트 → 구현.
- [ ] 보유 카드만 보이게: 카드 탭 목록, 결제 입력과 반복 결제의 카드 선택, 내역의 카드 필터. 달력과 내역의 결제 목록, 합계는 보유 여부와 상관없이 모든 결제를 보여준다.
- [ ] **사용자 단계:** `0003_phase2.sql`을 Supabase SQL Editor에서 실행해 달라고 요청하고, 실행 뒤 REST로 `merchant_categories`, `card_requests`, `user_cards?select=owned`, `payments?select=brand`가 200인지 확인한다.
- [ ] 화면 확인: 카드 2장만 켜고 카드 탭과 결제 입력에 2장만 나오는지, 끈 카드로 기록했던 결제가 내역에 남는지, 카드 요청이 저장되는지.
- [ ] 커밋 `feat: my page with card selection and card requests`.

### Task 5: 가입을 앱에서 빼기

**Files:** Modify `app/login/page.tsx`

- [ ] 가입 전환 버튼과 `signUp` 호출을 지우고 로그인만 남긴다. 아래에 "계정은 관리자에게 요청해 주세요" 한 줄.
- [ ] **사용자 단계 안내(작업 보고에 적는다):** Supabase → Authentication → Sign In / Providers에서 "Allow new users to sign up"을 끄고, 지인 계정은 Authentication → Users → Add user로 만든다. 카드 요청은 Table Editor의 `card_requests`에서 본다.
- [ ] 커밋 `feat: login only; accounts are created by the admin`.

### Task 6: 내역에 대분류별 합계

**Files:** Modify `lib/engine/history.ts`, `app/(tabs)/history/page.tsx`; Test `lib/engine/history.test.ts`

- [ ] `byCategory(payments, benefit): { category: Category; spent: number; count: number }[]` — 취소 제외, 지출 큰 순, 0원은 빼기. 테스트 먼저.
- [ ] 내역 요약 칸 아래에 선택한 기간의 대분류별 막대(이름, 금액, 비율 막대)를 넣는다. 결제가 없으면 숨긴다.
- [ ] 커밋 `feat: spending by category in history`.

### Task 7: 운영 빌드 확인

- [ ] 미리보기 서버를 끈다(`preview_stop`). `.next`를 지우고 `npm run build`가 오류 없이 끝나는지 확인한다.
- [ ] `npm test`, `npm run lint` 최종 통과. `docs/designs/card-performance.md`의 "결정 사항"에 2단계 결정(이 문서 위쪽 목록)을 덧붙인다.
- [ ] 커밋하고, 사용자에게 남은 일(0003 SQL 실행 여부, 가입 끄기, GitHub·Vercel 배포)을 정리해 보고한다.
