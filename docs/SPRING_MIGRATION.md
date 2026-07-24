# Spring 서버 전환 계획

## 목표 구성

```text
React
  └─ backend 포트
       ├─ 현재: Supabase 어댑터
       └─ 전환: Spring REST + WebSocket 어댑터
                         └─ PostgreSQL + 객체 저장소
```

## Spring API 경계

- `/api/v1/teams`, `/menus`, `/menu-types`: 팀과 메뉴 관리
- `/api/v1/exclusions`: 날짜별 제외 메뉴
- `/api/v1/rooms`: 방 생성·조회·참여·재입장
- `/api/v1/rooms/{code}/members|candidates|votes|spin`: 점심방 명령
- `/ws/rooms/{code}` 또는 SSE: 방 변경·채팅·룰렛 동기화
- `/api/v1/places`: Places 프록시와 사진 메타데이터

명령 요청에는 재시도 시 중복 생성을 막는 idempotency key를 지원한다. 오류 응답은
`code`, `message`, `fieldErrors`, `traceId` 형식으로 통일하고 클라이언트가 판단하는
오류는 안정된 `code`를 사용한다.

## 단계별 전환

1. 현재 Supabase 어댑터의 계약 테스트와 대표 응답 fixture를 만든다.
2. Spring에서 같은 계약의 읽기 API를 구현하고 운영 DB의 복제본으로 검증한다.
3. PostgreSQL 스키마를 `pg_dump`/복원 또는 ETL로 이전하고 행 수·PK·FK·합계를 대조한다.
4. 짧은 이중 쓰기 또는 쓰기 중지 시간을 정하고 변경분을 마지막으로 동기화한다.
5. 읽기 트래픽 일부를 Spring으로 보내 결과를 비교한다.
6. 쓰기와 실시간 연결을 Spring으로 전환한다.
7. 검증 기간 동안 Supabase DB를 읽기 전용으로 보관한 뒤 폐기한다.

## 필수 이관 검증

- 테이블별 전체 행 수와 활성 행 수
- UUID, 방 코드, 외부 place ID의 동일성
- FK 누락과 고아 행 0건
- 시간대와 날짜별 제외 목록의 동일성
- 방 상태·당첨 메뉴·구성원 수 표본 비교
- 객체 저장소 파일 수, 크기, checksum과 공개 URL 갱신
- RLS가 담당하던 권한을 Spring 인증·인가 테스트로 대체

## 금지 사항

- React 화면에서 공급자별 조건문 사용
- Spring DTO에 Supabase RPC 이름 노출
- 새 시스템에서 기존 UUID 재발급
- 검증 없이 운영 DB를 한 번에 교체
- 데이터 이관 완료 전에 Supabase 원본 삭제
