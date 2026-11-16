# 카드 실적 관리 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 휴대폰에서 결제를 기록하고, 데스크톱에서도 같은 카드별 실적·혜택을 보는 반응형 웹앱.

**Architecture:** Next.js(App Router) 앱을 Vercel에 배포한다. 로그인과 저장은 Supabase(Auth + Postgres, RLS로 본인 데이터만 접근). 실적·혜택 계산은 DB와 분리된 순수 TypeScript 함수(`lib/engine`)로 만들고, 화면은 저장된 결제 목록을 읽어 매번 다시 계산한다(수정·취소 시 자동 재계산).

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase JS v2, Vitest.

**Spec:** `docs/designs/card-performance.md`

## Global Constraints

- 금액은 원 단위 정수(`number`)로만 다룬다. 소수 계산 결과는 `Math.floor`.
- 월 경계는 한국 시간(Asia/Seoul) 기준.
- 취소(`canceled = true`) 결제는 실적과 할인 계산에서 모두 제외한다.
- 가맹점 분류가 `unknown`인 결제는 혜택을 적용하지 않는다(실적에는 포함).
- 전월 실적을 모르면 혜택 자격은 `'unknown'`(미확인)으로 표시한다.
- 시작 실적을 입력하지 않은 달은 집계 범위를 "기록한 결제 기준"으로 표시한다.
- 나라사랑카드는 할인 거래도 결제금액 전체를 실적에 넣는다(`discountedCountsToward: true`, 카드 설정값 하나로 바꿀 수 있게).
- 토스뱅크 체크카드는 ‘어디서나’ 0.3% 적립, 건당 334원 이상, 월 한도 없음, 시즌 6은 2027-01-20까지.

## Review Focus

- 지난달 결제를 이번 달에 수정·취소 → 그 달 실적과 이번 달 혜택 자격이 같이 바뀌어야 한다. (Task 2 테스트 `prevMonthEditChangesEligibility`)
- 한도를 넘는 결제 → 남은 한도만큼만 할인, 남은 한도 0 표시. (Task 2 `capsAtRemainingLimit`)
- 월말 23:30 KST 결제 → UTC로는 다음날이라도 그 달 실적. (Task 2 `usesSeoulMonthBoundary`)
- 같은 결제에 두 혜택(톡톡 스타벅스+간편결제) → 각 한도에서 따로 차감. (Task 2 acceptance 테스트)
- 다른 계정으로 로그인 → 내 결제가 보이지 않아야 한다. (Task 3 RLS 확인 단계)

---

### Task 1: 프로젝트 뼈대와 카드 규칙 데이터

**Files:**
- Create: Next.js 앱 (`npx create-next-app@15 . --ts --tailwind --app --eslint`), `vitest.config.ts`
- Create: `lib/cards/types.ts`, `lib/cards/kb-talktalk.ts`, `lib/cards/kb-nara.ts`, `lib/cards/toss.ts`, `lib/cards/kb-youth-b.ts`, `lib/cards/index.ts`
- Test: `lib/cards/cards.test.ts`

**Interfaces:**
- Produces:
  - `type Category = 'starbucks' | 'convenience' | 'transit' | 'cgv' | 'themepark' | 'family_restaurant' | 'telecom' | 'bookstore' | 'language_test' | 'shopping_membership' | 'fashion' | 'life' | 'delivery' | 'date' | 'other' | 'unknown'`
  - `type Payment = { id: string; cardId: CardId; amount: number; merchant: string; category: Category; paidAt: string /*ISO*/; canceled: boolean; answers: Record<string, boolean> }`
  - `type Benefit = { id: string; label: string; categories: Category[]; kind: 'discount' | 'cashback'; rate?: number; fixed?: number; minAmount?: number; monthlyCap?: number; monthlyCount?: number; requires?: Question[]; excludesFromPerformance: boolean }`
  - `type Question = { key: string; text: string }` (예: `{ key: 'kbPay', text: 'KB Pay로 결제했나요?' }`)
  - `type CardRule = { id: CardId; name: string; tiers: { min: number; totalCap: number | null }[]; benefits: Benefit[]; performanceExcludedCategories: Category[]; newCardGrace?: { months: number; totalCap: number } ; validUntil?: string }`
  - `CARDS: Record<CardId, CardRule>`, `CardId = 'kb-talktalk' | 'kb-nara' | 'toss' | 'kb-youth-b'`

- [ ] **Step 1:** 앱 생성, `vitest` 설치, `npm test`가 돌도록 설정.
- [ ] **Step 2: Write test** `cards.test.ts`: 네 카드가 `CARDS`에 있고, `CARDS['kb-youth-b'].benefits.find(b=>b.id==='convenience').monthlyCap === 2000`, `CARDS['toss'].benefits[0].rate === 0.003 && minAmount === 334 && monthlyCap === undefined`, `CARDS['kb-nara'].tiers`가 `[100000→5000, 200000→10000, 300000→20000, 500000→30000, 1000000→50000]`.
- [ ] **Step 3:** 규칙 파일 작성. 값은 spec 표 그대로(나라사랑은 spec 행의 영역별 값, 쇼핑 할인 없음).
- [ ] **Step 4:** `npm test` → PASS. **Step 5:** commit `feat: card rule data`.

### Task 2: 실적·혜택 계산 엔진

**Files:**
- Create: `lib/engine/month.ts` (월 키, KST 경계), `lib/engine/compute.ts`
- Test: `lib/engine/compute.test.ts`

**Interfaces:**
- Consumes: Task 1 타입, `CARDS`.
- Produces:
  - `monthKey(iso: string): string` → `'2026-11'` (Asia/Seoul)
  - `type StartBalance = { performance: number; benefitUsed: Record<string, number> }`
  - `type MonthResult = { cardId; month; performance: number; target: number | null; remainingToTarget: number | null; eligibility: 'eligible' | 'ineligible' | 'unknown'; scope: 'recorded-only' | 'with-start'; benefits: { id; label; used: number; cap: number | null; remaining: number | null; applications: { paymentId: string; amount: number }[] }[] }`
  - `computeMonth(cardId: CardId, month: string, payments: Payment[], starts: Record<string /*month*/, StartBalance | undefined>): MonthResult`
  - `pendingQuestions(cardId: CardId, category: Category): Question[]`
  - `crossesTarget(before: MonthResult, after: MonthResult): boolean`

- [ ] **Step 1: Write failing tests** (spec 동작 확인 기준 그대로):
  - `youthCuKbPay`: 전월 실적 20만 원인 상태, CU 5,000원 `answers.kbPay=true` → convenience `applications[0].amount === 1000`, `remaining === 1000`.
  - `talktalkStarbucksEasyPay`: 전월 30만, 스타벅스 간편결제 10,000원 → 스타벅스 혜택 used 5000, 간편결제 used 1000, `performance === 0`.
  - `crossesTargetOnSave`: 실적 29만→31만 결제 추가 시 `crossesTarget === true`.
  - `canceledExcluded`: `canceled: true` 결제는 performance·benefits 모두 0.
  - `unknownCategoryNoBenefit`, `capsAtRemainingLimit`, `usesSeoulMonthBoundary` (`2026-11-30T14:30:00Z` → `'2026-11'`), `prevMonthEditChangesEligibility`, `noPrevMonthIsUnknown` (전월 기록·시작값 없으면 `eligibility === 'unknown'`), `tossCashbackNoCap` (1,000원 → 3원, 333원 → 0원).
- [ ] **Step 2:** `npx vitest run lib/engine` → FAIL.
- [ ] **Step 3:** 구현. 순서: 해당 월 결제를 `paidAt` 순 정렬 → 취소 제외 → 혜택마다 자격·조건·`requires` 답변 확인 → 할인액 = `min(floor(amount*rate) 또는 fixed, 개별 남은 한도, 통합 남은 한도)` → `excludesFromPerformance`면 실적에서 제외. 전월 자격은 `computeMonth(prevMonth)`의 performance로 tier 결정.
- [ ] **Step 4:** PASS. **Step 5:** commit `feat: performance/benefit engine`.

### Task 3: Supabase 스키마와 로그인

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`, `app/login/page.tsx`, `lib/data/payments.ts`, `.env.example`

**Interfaces:**
- Produces:
  - 테이블 `user_cards(user_id, card_id, settings jsonb)`, `payments(id uuid, user_id, card_id, amount int, merchant text, category text, paid_at timestamptz, canceled bool, answers jsonb, created_at)`, `month_starts(user_id, card_id, month text, performance int, benefit_used jsonb)`. 모든 테이블 RLS `user_id = auth.uid()`.
  - `listPayments(range: { from: string; to: string }): Promise<Payment[]>`, `savePayment(p: Omit<Payment,'id'> & { id?: string }): Promise<Payment>`, `listStarts(): Promise<Record<CardId, Record<string, StartBalance>>>`, `saveStart(...)`
- 로그인: 이메일 매직링크(비밀번호 없음).

- [ ] **Step 1:** (사용자) Supabase 프로젝트 생성, URL·anon key를 `.env.local`에.
- [ ] **Step 2:** 마이그레이션 적용 (`supabase db push` 또는 SQL 에디터).
- [ ] **Step 3:** 로그인 페이지, 미로그인 시 `/login` 리다이렉트.
- [ ] **Step 4: 확인** 두 계정으로 로그인해 A의 결제가 B에게 안 보이는지 확인.
- [ ] **Step 5:** commit `feat: supabase schema and auth`.

### Task 4: 결제 입력 화면

**Files:**
- Create: `app/(app)/new/page.tsx`, `components/PaymentForm.tsx`, `lib/merchants.ts`
- Test: `lib/merchants.test.ts`

**Interfaces:**
- Consumes: `pendingQuestions`, `computeMonth`, `crossesTarget`, `savePayment`.
- Produces: `guessCategory(merchant: string): Category` (예: 'CU'·'GS25' → convenience, '스타벅스' → starbucks, 모르면 `'unknown'`).

- [ ] **Step 1: test** `guessCategory('CU 강남점') === 'convenience'`, `guessCategory('동네식당') === 'unknown'`.
- [ ] **Step 2:** 폼: 카드·금액·가맹점(필수), 시각(기본 현재), 분류(추정값, 변경 가능), 필요할 때만 `pendingQuestions` 질문 표시.
- [ ] **Step 3:** 저장 후 `crossesTarget`이면 "목표 달성" 안내, 아니면 이번 결제의 할인액·남은 금액 표시.
- [ ] **Step 4:** 기존 결제 수정·취소 버튼(같은 폼).
- [ ] **Step 5:** commit.

### Task 5: 카드별 실적·혜택 화면과 월중 시작

**Files:**
- Create: `app/(app)/page.tsx`(카드 목록), `app/(app)/cards/[id]/page.tsx`, `components/BenefitRow.tsx`, `app/(app)/cards/[id]/start/page.tsx`, `app/(app)/settings/page.tsx`

- [ ] **Step 1:** 홈: 카드마다 이번 달 실적 / 목표 / 남은 금액 막대, 자격(달성·미달·미확인), 집계 범위 문구.
- [ ] **Step 2:** 카드 상세: 혜택 영역별 사용액·남은 한도(캐시백은 예상 누계), 펼치면 적용된 결제 목록.
- [ ] **Step 3:** 월중 시작 입력(선택): 이번 달 인정 실적, 혜택별 사용액, 전월 실적.
- [ ] **Step 4:** 설정: 보유 카드 선택, 토스 혜택 유형(기본 ‘어디서나’).
- [ ] **Step 5:** 휴대폰 폭(375px)과 데스크톱에서 화면 확인. commit.

### Task 6: 배포와 기기 간 확인

- [ ] **Step 1:** (사용자) GitHub에 올리고 Vercel에서 import, 환경변수 2개 등록, Supabase Auth의 Redirect URL에 Vercel 주소 추가.
- [ ] **Step 2: 확인** 휴대폰에서 실제 결제 한 건 저장 → 데스크톱에서 같은 실적·혜택이 보이는지.
