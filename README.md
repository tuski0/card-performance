# 카드 실적

결제할 때마다 기록하고, 카드별 실적과 혜택을 휴대폰과 데스크톱에서 함께 보는 웹앱입니다.
Next.js(App Router) + Supabase(로그인·DB) + Tailwind, Vercel 배포를 전제로 합니다.

- 요구사항: [docs/designs/card-performance.md](docs/designs/card-performance.md)
- 카드 혜택 규칙: `lib/cards/` (카드를 추가할 때 여기에 규칙을 넣습니다)
- 실적·혜택 계산: `lib/engine/`

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # Supabase URL과 publishable key를 채운다
npm run dev
```

테스트와 검사:

```bash
npm test
npm run lint
npx tsc --noEmit
```

개발 서버가 켜진 상태에서 `npm run build`를 돌리면 `.next`가 덮여 개발 화면이 깨집니다. 빌드는 서버를 끄고 하세요.

## Supabase 준비

1. SQL Editor에서 `supabase/migrations/`의 파일을 번호 순서대로 실행합니다 (0001 → 0004).
2. Authentication → Sign In / Providers → Email: "Allow new users to sign up" 켜기, "Confirm email" 끄기.
3. Project Settings → API에서 URL과 publishable key를 복사합니다. service_role key와 DB 비밀번호는 앱에 쓰지 않습니다.

## Vercel 배포

1. Vercel에서 Add New → Project → 이 GitHub 저장소를 Import.
2. Environment Variables에 두 값을 넣습니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy. 프레임워크와 빌드 명령은 자동으로 잡힙니다.
4. 배포 주소를 휴대폰 Chrome으로 열고 메뉴 → "홈 화면에 추가"로 설치하면, 결제 알림을 공유할 때 공유 목록에 "카드 실적"이 나타납니다.

## 카드 추가 요청 처리

마이 탭에서 들어온 요청은 Supabase Table Editor의 `card_requests`에서 봅니다. 혜택 규칙을 확인해 `lib/cards/`에 카드 파일을 추가하고 `lib/cards/index.ts`에 등록한 뒤 배포합니다.
