# ADR 0004: 교체 가능한 백엔드 포트와 어댑터

- 상태: 승인
- 날짜: 2026-07-24

## 배경

현재 Supabase는 빠른 제품 검증에 적합하지만 사용자와 데이터가 증가하면 Spring
서버와 별도 운영 PostgreSQL로 이전할 계획이다. React 화면과 도메인 로직이
Supabase SDK, RPC 이름, Realtime 채널에 직접 결합되면 전환 비용과 장애 위험이 커진다.

## 결정

클라이언트는 `src/backend/index.js`가 제공하는 백엔드 계약에만 의존한다.
Supabase SDK와 RPC는 `services/` 및 `backend/adapters/supabase/` 안에 격리한다.
훅과 화면은 테이블 이름, SQL 함수 이름, Realtime 구현을 알지 못한다.

백엔드 계약 버전은 `BACKEND_CONTRACT_VERSION`으로 관리한다. 향후 Spring
어댑터는 같은 메서드, DTO, 오류 코드를 구현하고 `VITE_BACKEND_PROVIDER` 조립점에서
선택한다. 기능별 전환을 해야 할 때도 화면을 수정하지 않고 조립 설정만 변경한다.

## 데이터 호환 규칙

- PostgreSQL UUID 기본키는 이관 후에도 그대로 유지한다.
- `created_at`, `updated_at`은 UTC ISO-8601 의미를 유지한다.
- 공개 DTO는 현재 클라이언트 계약을 유지하며 DB 테이블 구조를 직접 노출하지 않는다.
- 방 코드와 구성원 세션 토큰의 의미를 유지하되 토큰 원문은 서버 DB에 저장하지 않는다.
- 상태값은 문자열 열거형으로 명시하고 의미 변경 시 계약 버전을 올린다.
- 외부 장소의 `place_id`는 공급자 식별자와 함께 보존한다.
- 파일은 DB 행과 객체 저장소 키의 연결을 유지한 채 별도 이전한다.

## 결과

현재 구현에는 얇은 조립 계층이 하나 추가된다. 대신 Spring 전환 시 React 훅과 화면,
룰렛 계산 로직을 유지할 수 있고 Supabase와 Spring을 같은 계약 테스트로 비교할 수 있다.
새 백엔드 기능은 반드시 포트에 먼저 정의하고 공급자별 어댑터로 구현해야 한다.
