# 릴리스 절차

유의적 버전과 Conventional Commits를 사용한다.

## 버전 정책

- 패치 (`0.1.1`): 호환되는 버그 수정과 작은 UX 개선
- 마이너 (`0.2.0`): 1.0 이전의 사용자 기능 추가
- 메이저 (`1.0.0`): 보안·데이터·운영 기준을 갖춘 정식 버전

## 준비

1. `CHANGELOG.md`의 `미출시` 항목을 날짜가 있는 버전으로 이동한다.
2. `lunch-wheel/package.json`과 잠금 파일의 버전을 갱신한다.
3. 설치와 환경변수 문서를 확인한다.
4. `lunch-wheel/`에서 `npm run lint`, `npm run build`, `npm run test:e2e`를 실행한다.
5. 마이그레이션, 비밀값, API 비용 변경을 별도로 검토한다.

## DB 마이그레이션 배포

`main`에 `lunch-wheel/supabase/migrations/` 변경이 들어오면
`.github/workflows/deploy-supabase.yml`이 프로덕션에 적용한다. 필요한 GitHub
Actions 비밀값은 `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_PROJECT_ID`다.

정상 릴리스에서는 SQL Editor에 직접 붙여넣지 않는다. 긴급 수동 적용 시 다음 자동
배포 전에 `supabase_migrations.schema_migrations` 기록을 일치시킨다. 과거에
SQL Editor로 적용했던 점심방 마이그레이션 기록은 2026-07-24에 복구를 완료했으며,
이후에는 일회성 repair 옵션 없이 자동 배포만 사용한다.

## 게시

```bash
git add .
git commit -m "chore(release): 0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push origin main
git push origin v0.2.0
```

필수 검사가 모두 통과하고 릴리스 내용을 승인한 뒤 태그와 GitHub Release를 만든다.

## 긴급 수정과 되돌리기

- 긴급 수정은 현재 `main`에서 시작하고 가능하면 회귀 테스트와 변경 기록을 추가한다.
- 프론트엔드는 마지막 정상 Vercel 배포를 다시 배포한다.
- DB는 배포된 파일을 고치지 말고 앞으로 적용되는 수정 마이그레이션을 추가한다.
- 장기 규칙이 바뀐 장애는 `docs/decisions/`에 결정 기록을 남긴다.
