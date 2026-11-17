# 카드 실적

결제를 기록하고 카드별 실적과 혜택을 휴대폰과 데스크톱에서 함께 보는 개인용 앱입니다.
안드로이드 앱을 설치하면 카드 결제 알림을 읽어 결제를 자동으로 기록합니다.

- 웹: Next.js(App Router) + Tailwind, Vercel 배포 — https://card-performance.vercel.app
- 데이터와 로그인: Supabase (사용자별 RLS)
- 안드로이드: 웹앱을 띄우는 Kotlin 껍데기 앱 + 카드 알림 읽기

## 주요 기능

| 탭 | 기능 |
|---|---|
| 달력 | 일·주·월·연 단위 지출과 받은 혜택, 날짜별 결제 목록, 혜택 종료·실적 부족 알림 |
| 내역 | 결제 목록과 검색, 분류별 통계, 월 예산 대비 지출, 엑셀 내보내기 |
| 카드 | 카드별 이번 달 실적·목표·혜택 한도, 가맹점·분류 검색으로 가장 이득인 카드 추천, 반복 결제 관리 |
| 마이 | 내 카드 고르기와 카드 끝자리, 알림 자동 기록 연결, 화면 모드(기기·라이트·다크), 월 예산, 카드 추가 요청 |

- 결제 알림 공유: 휴대폰에서 알림 문구를 공유하면 금액·가맹점·시각·카드가 채워진 기록 화면이 열립니다.
- 알림 자동 기록: 안드로이드 앱이 허용된 카드 앱의 결제 알림만 서버로 보내고, 서버가 기록·취소·보관함 중 하나로 처리합니다. 확인이 필요한 결제(KB Pay 여부 등)와 카드를 모르는 알림은 달력 위 "자동 기록 확인"에 모입니다.
- 앱 잠금: 앱을 열 때와 앱을 나가거나 화면을 끈 뒤 돌아올 때 폰의 지문·PIN으로 잠금을 풉니다.

## 구조

```
app/                  화면 (탭: (tabs)/, 결제 기록: new/, 자동 기록 확인: review/, 알림 수신 API: api/ingest/)
components/           화면 조각 (달력, 카드 그림, 추천 검색 등)
lib/cards/            카드별 혜택 규칙 — 카드를 추가할 때 여기에 넣습니다
lib/engine/           실적·혜택 계산, 추천, 혜택 검색, 예측
lib/data/             Supabase 읽기·쓰기
lib/parse.ts          결제 알림 문구 해석
lib/ingest.ts         알림 한 건을 기록/취소/보관함/무시 중 무엇으로 할지 결정
supabase/migrations/  DB 스키마 (번호 순서대로 실행)
android/              안드로이드 앱 (WebView + 알림 읽기 + 앱 잠금)
docs/                 요구사항과 구현 계획
```

## 로컬 실행

```bash
npm install
```

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase URL과 publishable key를 채운 뒤:

```bash
npm run dev
```

테스트와 검사:

```bash
npm test
```

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

개발 서버가 켜진 상태에서 `npm run build`를 돌리면 `.next`가 덮여 개발 화면이 깨집니다. 빌드는 서버를 끄고 하세요.

## Supabase 준비

1. SQL Editor에서 `supabase/migrations/`의 파일을 번호 순서대로 실행합니다 (0001 → 0006).
2. Authentication → Sign In / Providers → Email: "Allow new users to sign up" 켜기, "Confirm email" 끄기.
3. Project Settings → API에서 URL과 publishable key를 복사합니다. service_role key와 DB 비밀번호는 앱에 쓰지 않습니다.

알림 수신 API는 publishable key만으로 동작합니다. 기기 토큰으로 사용자를 찾는 `security definer` 함수(`ingest_context`, `ingest_save`)만 호출하고, 토큰은 DB에 sha256 해시로만 저장됩니다.

## Vercel 배포

1. Vercel에서 Add New → Project → 이 GitHub 저장소를 Import.
2. Environment Variables에 두 값을 넣습니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy. 이후 `main`에 push하면 자동으로 배포됩니다.

안드로이드 앱은 화면을 배포된 사이트에서 그대로 가져오므로, 화면 변경은 배포만 하면 앱에도 반영됩니다.

## 안드로이드 앱

### 빌드

JDK 17과 Android SDK(platform 35, build-tools 35)가 필요합니다. Homebrew 기준:

```bash
brew install openjdk@17 gradle && brew install --cask android-commandlinetools
```

```bash
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

`android/local.properties`에 `sdk.dir=/opt/homebrew/share/android-commandlinetools`를 적고:

```bash
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew testDebugUnitTest assembleDebug
```

결과물은 `android/app/build/outputs/apk/debug/app-debug.apk`입니다. debug 키(`~/.android/debug.keystore`)로 서명되므로, 이 파일이 바뀌면 기존 앱 위에 업데이트 설치가 되지 않습니다.

### 설치

- GitHub Releases(`android-v…` 태그)에서 APK를 받아 설치하거나, USB 디버깅을 켠 폰을 연결해 `adb install -r`로 설치합니다.
- Play 프로텍트가 막으면 "자세히 → 무시하고 설치"를 누르거나 잠시 검사를 끄고 설치합니다.
- 설치 후 앱에서 로그인하고 마이 탭 "알림 자동 기록"에서 이 폰 연결 → 알림 접근 허용 → 배터리 설정(제한 없음) 순서로 켭니다.

### 알림 읽기 규칙

- `NoticeFilter.kt`의 `DEFAULT_ALLOWED`에 있는 앱(KB Pay, KB 스타뱅킹, KB 리브, 토스, 토스뱅크, 삼성·구글 메시지)의 알림만 읽습니다. 다른 앱의 알림 내용은 저장하거나 보내지 않습니다.
- 금액(`…원`)과 승인·결제·사용·취소 중 하나가 있는 알림만 서버로 보냅니다.
- 알림마다 고정 키를 만들어 재시도에도 그대로 보내고, 서버는 그 키로 영구히 중복을 막습니다.
- 카드는 알림의 카드 이름으로 먼저 정하고, 없으면 마이 탭에 저장된 카드 끝자리로 정합니다. 둘 다 없으면 "자동 기록 확인"에 보관합니다.

## 카드 추가

마이 탭의 카드 추가 요청은 Supabase Table Editor의 `card_requests`에서 봅니다. 혜택 규칙을 확인해 `lib/cards/`에 카드 파일을 추가하고 `lib/cards/index.ts`에 등록한 뒤, `components/ui.tsx`의 `CARD_COLORS`에 카드 색을 넣고 배포합니다.
