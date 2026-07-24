# 시스템 구조

## 전체 구성

```text
React/Vite 클라이언트
├─ Supabase JS → 메뉴, 종류, 제외 목록, 점심방, 활동 기록
├─ Open-Meteo → 팀 메뉴 가중치에 사용하는 날씨
├─ localStorage → 최근 결과와 사용자 가중치 설정
└─ /api/places/* → 서버에서 Google Places 호출
                   └─ Supabase Storage → 팀 메뉴 사진 캐시
```

Vite 앱은 `lunch-wheel/`, Vercel 서버 함수는 `lunch-wheel/api/`, Supabase의
추가 전용 마이그레이션은 `lunch-wheel/supabase/migrations/`에 둔다.

## 애플리케이션 계층

- `src/backend/`: 백엔드 포트, 구현체 선택과 공급자별 실시간 어댑터
- `src/components/`: 화면과 사용자 상호작용
- `src/components/ui/`: shadcn/ui에서 생성한 공통 UI 프리미티브
- `src/hooks/`: 메뉴·날씨·주변 식당·점심방 상태 조정
- `src/services/`: Supabase와 HTTP 접근
- `src/utils/`: 룰렛·가중치·날짜·공유·점심방 순수 로직
- `src/constants/`: 공통 설정과 아이콘 연결

컴포넌트와 훅에서 Supabase를 직접 호출하지 않는다. 훅은 `src/backend/index.js`의
조립된 포트에만 의존한다. 현재 `services/`와 `backend/adapters/supabase/`가
Supabase 구현체이며 향후 같은 계약의 Spring 어댑터로 교체한다. 데이터 접근은
어댑터, 여러 컴포넌트에 걸친 상태와 부수효과는 훅, 결정적인 계산은 유틸리티에 둔다.

## UI 컴포넌트 계층

버튼, 입력, 선택 상자, 체크박스와 스위치는 shadcn/ui CLI로 생성한
`src/components/ui/` 컴포넌트를 사용한다. 이 계층은 외부 패키지의 블랙박스가 아니라
저장소가 소유하는 소스이며, `components.json`이 생성 기준과 경로를 기록한다.

제품 화면은 공통 프리미티브를 가져와 조합한다. 색상과 상태 표현은 shadcn/ui의
Stone + Orange 의미 토큰을 사용하며 구체적인 사용 규칙은 `DESIGN.md`를 따른다.
새 기본 컨트롤을 화면 안에서 직접 구현하지 않는다. 제품 고유 UI가 필요하면 먼저
shadcn/ui 프리미티브의 조합으로 만들고, 여러 화면에서 반복될 때 공통 컴포넌트로 올린다.

첫 화면은 팀과 메뉴·날씨 성향처럼 핵심 흐름에 필요한 데이터만 기다린다. 제외 목록과
Google 장소 링크·사진은 같은 시점에 요청하되 초기 렌더링을 막지 않고 도착하는 대로
합친다. 후순위 데이터 실패는 메뉴 자체를 숨기지 않으며 해당 부가 정보만 생략한다.

백엔드 전환 규칙과 데이터 이관 절차는 `docs/SPRING_MIGRATION.md`, 결정 배경은
`docs/decisions/0004-backend-ports-and-adapters.md`에 기록한다.

일반·내 주변·점심방 결과는 브라우저에서 1080×1350 PNG로 생성한다.
지원되는 모바일에서는 Web Share API로 전달하고, 그 외에는 같은 이미지를 내려받는다.

## 결정 모드

### 팀

Supabase 메뉴와 종류를 사용한다. 오늘 제외 항목을 제거하고 날씨 가중치를 적용한다.
최근 결과 조정을 켜면 날씨 계산 후 현재 모드의 최근 3개 메뉴에 `0.55배`를 적용한다.

### 내 주변

브라우저 좌표를 사용하며 사용자가 불러오기 또는 새로고침을 눌렀을 때만 Places를
호출한다. 결과는 30분 캐시하고 별점 필터는 로컬에서 수행한다.

Google이 반환하는 `primaryType`과 `types` 원본은 열린 문자열로 보존한다.
`src/constants/placeCategories.js`는 2026-07-20 기준 Google Places Table A의
식음료 타입 166개 스냅샷과 앱 카테고리 매핑을 관리한다. 앱 카테고리는
한식·중식·일식·양식·아시아 음식·세계 음식·간편식·카페/디저트·주점·기타의
안정적인 10개 값이다. 알려지지 않은 외부 타입은 실패시키지 않고 `기타`로 분류한다.
구체적인 `types`가 있으면 일반적인 `restaurant` 기본 타입보다 우선한다.

음식 카테고리와 날씨 프로필은 독립된 축이다. `food_category`는 검색·필터·표시만
담당하고 `weather_profile.weight_config`만 확률 계산에 참여한다. 양재역 주변의 기존
`t_menu_type` 데이터는 additive migration으로 `t_weather_profile`에 같은 ID로
백필하며 호환 기간에는 동기화한다. 내 주변 식당은 Google 타입으로 음식 카테고리만
정하고 날씨 프로필은 중립으로 둔다. 결정 배경은
`docs/decisions/0005-separate-food-category-and-weather-profile.md`에 기록한다.

### 점심방

Supabase에 방, 구성원, 후보, 선호, 준비 상태, 활동과 공유 룰렛 상태를 저장한다.
클라이언트는 변경을 구독해 같은 당첨 메뉴와 애니메이션 시점을 표시한다.
로그인 전에는 현재 브라우저에 최근 방 세션을 최대 10개 저장한다. 서버에는 토큰
해시만 있으며 재입장 RPC가 방 코드·구성원 ID·토큰을 검증한 뒤 기존 구성원 상태를
복원한다. 브라우저 저장소 삭제나 다른 기기에서는 복구되지 않는다.
방 채팅은 별도 메시지 테이블에 저장하며 테이블 직접 접근을 차단한다. 방 코드,
구성원 ID와 세션 토큰을 검증하는 RPC만 최근 100개 조회와 전송을 허용한다.
방 삭제 시 메시지도 함께 삭제되며 방 변경 broadcast로 새 메시지를 갱신한다.

## 보안과 개인정보

- Google Places 인증 정보는 서버 환경변수에만 둔다.
- 브라우저에서 안전한 Supabase 설정만 `VITE_` 접두사를 사용한다.
- 현재 익명 RLS는 임시이며 `1.0.0` 전에 인증과 구성원 정책으로 교체한다.
- 문서화된 기능이 요구하지 않는 한 정확한 좌표를 저장하지 않는다.
- 최근 결과는 메뉴 ID·이름·모드·시간만 포함해 브라우저에 최대 10개 보관한다.
- 감사 기록에는 비밀값이나 불필요한 개인정보를 남기지 않는다.

## 비용 통제

- 내 주변 Places 호출에는 명시적인 사용자 행동이 필요하다.
- 결과를 캐시하며 룰렛 실행은 Places 호출을 만들지 않는다.
- 내 주변 검색에서는 사진 필드를 요청하지 않는다.
- 팀 메뉴 사진은 Supabase Storage에 저장하고 주기적으로 갱신한다.

## 검증 명령

- 정적 검사: `npm run lint`
- 프로덕션 빌드: `npm run build`
- 브라우저 흐름: `npm run test:e2e`
