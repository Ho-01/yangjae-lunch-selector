# 식사가챠

식사가챠는 팀 메뉴, 내 주변 식당, 함께 고르는 점심방을 룰렛으로 결정합니다.
최근 결과는 현재 브라우저에 최대 10개만 저장되며 `최근 메뉴 덜 나오게`를
켜면 활성 모드의 최근 3개 메뉴 가중치가 0.55배로 조정됩니다. 기록은 최근
결과 패널에서 언제든 전체 삭제할 수 있으며 서버로 전송되지 않습니다.

양재역 날씨를 반영한 점심 메뉴 돌림판입니다. 메뉴와 오늘 제외 상태는 Supabase PostgreSQL에 저장됩니다.

## 로컬 실행

1. 의존성 설치

```bash
npm install
```

2. 환경변수 설정

`.env.example`을 참고해 `.env.local`을 만듭니다.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# 서버 전용 — VITE_ 붙이지 마세요. 로컬 Vite 개발 미들웨어 / Vercel API에서 사용
GOOGLE_PLACES_API_KEY=
```

브라우저용 publishable key만 `VITE_`로 두세요. Google Places 키와 secret / service role key는 프론트에 넣지 마세요.

3. Supabase SQL 실행 (순서 중요)

1. `supabase/migrations/20260722000000_create_lunch_wheel_schema.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/20260722150000_create_menu_place_link.sql`  
   (이미 1·2를 적용한 프로젝트는 **3만** 실행하면 됩니다.)
4. `supabase/migrations/20260722160000_menu_place_photos_storage.sql`  
   (팀 메뉴 Google 사진 Storage 캐시 버킷)

Supabase Dashboard SQL Editor에서 위 순서로 실행하거나, Supabase CLI로 마이그레이션/시드를 적용합니다.

### `t_menu_place_link`

메뉴당 지도/장소 링크를 여러 개 둘 수 있는 테이블입니다. Google Places 연동 시 `place_id`, 별점, 사진 메타를 캐시합니다. API 키는 DB가 아니라 서버 env에 둡니다.

팀 메뉴 사진은 연결 시 Supabase Storage에 저장하고, `fetched_at` 기준 **7일**마다 백그라운드에서 별점·사진을 갱신합니다. 평소 접속 시 Google Photo API는 호출하지 않습니다. 내 주변 모드는 사진을 받지 않습니다.

4. 개발 서버

```bash
npm run dev
```

## Vercel 환경변수

| Name | Value | 비고 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 프론트 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 publishable key | 프론트 |
| `GOOGLE_PLACES_API_KEY` | Google Places API 키 | **서버 전용** (`VITE_` 없음) |

Places 키는 Vercel Environment Variables에만 넣고, Production / Preview에 적용한 뒤 Redeploy 하세요.

## 내 주변 모드와 Places 비용

- **팀 메뉴**: Supabase 메뉴 + 팀 좌표 날씨 (기존)
- **내 주변**: 브라우저 GPS + Nearby Search + 해당 좌표 날씨

비용 절감 원칙:

1. Places는 **「주변 식당 불러오기」/「강제 새로고침」** 할 때만 호출
2. 결과는 브라우저에 **30분 캐시** (반경·대략 좌표 기준)
3. 돌림판을 돌려도 Places를 다시 부르지 않음 (날씨만 갱신, Open-Meteo는 무료)
4. 주변 검색 시 **사진 필드를 요청하지 않음** (사진 media 호출 없음)
5. 별점 필터는 API 재호출 없이 **클라이언트에서 적용**
6. 결과 상한 15곳

Google Cloud 콘솔에서 일일 할당량/예산 알림을 켜 두는 것을 권장합니다.

현재는 로그인 기능이 없어 `anon` 역할에 조회/수정 정책을 열어 둔 **임시 정책**입니다.

- 누구나 publishable key로 메뉴·제외 상태를 읽고 쓸 수 있습니다.
- Auth 도입 시 `*_anon_*` 정책을 제거하고 `authenticated` + 팀 멤버십 기반 정책으로 교체하세요.
- SQL 주석과 정책 이름에 `anon` / `authenticated` 구분용 이름이 정리되어 있습니다.

## 스크립트

```bash
npm run lint
npm run build
npm run preview
npm run test:e2e
```

첫 E2E 실행 전 Playwright Chromium을 설치합니다.

```bash
npx playwright install chromium
```

대화형 테스트와 HTML 리포트는 각각 `npm run test:e2e:ui`,
`npm run test:e2e:report`로 실행합니다. 제품 범위와 작업 우선순위는
저장소 루트의 `docs/PRODUCT.md`, `ROADMAP.md`를 참고하세요.
