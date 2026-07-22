# 양재 점심 돌림판

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
```

브라우저용 publishable key만 사용하세요. secret / service role key는 넣지 마세요.

3. Supabase SQL 실행 (순서 중요)

1. `supabase/migrations/20260722000000_create_lunch_wheel_schema.sql`
2. `supabase/seed.sql`

Supabase Dashboard SQL Editor에서 위 순서로 실행하거나, Supabase CLI로 마이그레이션/시드를 적용합니다.

4. 개발 서버

```bash
npm run dev
```

## Vercel 환경변수

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 publishable key |

## 임시 RLS 정책 (보안 한계)

현재는 로그인 기능이 없어 `anon` 역할에 조회/수정 정책을 열어 둔 **임시 정책**입니다.

- 누구나 publishable key로 메뉴·제외 상태를 읽고 쓸 수 있습니다.
- Auth 도입 시 `*_anon_*` 정책을 제거하고 `authenticated` + 팀 멤버십 기반 정책으로 교체하세요.
- SQL 주석과 정책 이름에 `anon` / `authenticated` 구분용 이름이 정리되어 있습니다.

## 스크립트

```bash
npm run lint
npm run build
npm run preview
```
