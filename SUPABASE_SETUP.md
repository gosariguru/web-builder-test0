# Supabase 연결 준비

## 현재 연결 상태 (2026-10-30)

- 프로젝트 URL: `https://xbgjdyqjadwtneoowssm.supabase.co`
- 앱 URL: `https://web-builder-test0-16ye9i931-ej-adab.vercel.app/`
- 제공받은 publishable key를 `index.html`의 공개 상수에 연결함.
- 인증 설정 API 200 응답 확인: 이메일 가입 허용, 이메일 확인 활성화.
- `public.todos` API는 PGRST205 응답: SQL 마이그레이션 실행 필요.
- 프런트엔드는 Supabase JS v2의 실제 Auth/DB API로 전환 완료. 기존 로컬 계정/해시 저장 코드는 제거.
- 기존 브라우저 데이터는 읽거나 삭제하거나 자동 전송하지 않음. 기존 임시 계정은 Supabase에서 새로 가입해야 함.
- SDK 세션 토큰만 SDK가 관리하며, 앱이 비밀번호를 별도 저장하지 않음.
- `node tests/supabase-app.cjs`로 모의 SDK 기반 동작 테스트 통과. 실제 두 사용자 RLS 테스트는 아직 수행하지 않음.
- 실제 계정 생성, 인증 이메일 발송, DB SQL 실행은 아직 하지 않음.

### 남은 대시보드 작업

1. [SQL Editor](https://supabase.com/dashboard/project/xbgjdyqjadwtneoowssm/sql/new)에서 마이그레이션 SQL 실행.
2. Authentication → URL Configuration의 Site URL과 Redirect URLs에 위 앱 URL 등록.
3. 수정된 HTML을 배포한 뒤 두 테스트 계정으로 아래 RLS 검증 절차 수행.
4. SQL 실행에는 프로젝트 대시보드 권한이 필요함. 공개 키로 테이블을 만들 수 없으며,
   이를 위해 service_role나 DB 비밀번호를 프런트엔드에 추가하면 안 됨.

## 현재 구조

- `index.html`: CSS, 화면, JavaScript가 포함된 정적 앱.
- `github-upload/index.html`: GitHub 저장소 작업 사본. 연결 준비 단계에서는 변경하지 않음.
- 전환 전 임시 계정/할 일은 브라우저에 저장했으나 현재 코드는 이 데이터를 사용하지 않음.
- 별도 서버, 빌드 도구, 환경변수 로더는 없음. `.env` 파일만 추가해도 브라우저에서 읽히지 않음.

## 필요한 실제 설정값

| 설정 이름 | 값의 출처 | 용도 |
| --- | --- | --- |
| SUPABASE_URL | 프로젝트의 Connect 또는 API 설정에 표시되는 Project URL | Supabase API 주소 |
| SUPABASE_PUBLISHABLE_KEY | API Keys의 publishable key (기존 프로젝트는 anon key 가능) | 브라우저용 공개 API 키 |
| APP_URL | 실제 앱을 여는 전체 URL | Site URL, 가입 확인 후 복귀 주소 |

현재 단일 HTML 구조를 유지하면 위 값은 HTML의 공개 설정 상수로 연결한다.
향후 빌드 도구를 도입하는 경우 빌드 시 공개 환경변수로 주입할 수 있다.
어느 방식이든 브라우저용 키는 공개되며 접근 제어는 RLS가 담당한다.
`service_role`, `sb_secret_...`, DB 비밀번호는 브라우저 코드나 GitHub에 넣지 않는다.
제공받은 실제 공개 설정값을 코드에 입력했다.

## 대시보드 설정 순서

1. Supabase 프로젝트 생성 또는 기존 프로젝트 선택.
2. Authentication에서 이메일/비밀번호 가입 활성화. 이메일 확인은 활성화하는 구성을 권장.
3. Authentication URL Configuration에서 실제 배포 주소를 Site URL에 설정하고,
   가입 확인 후 돌아올 정확한 주소를 Redirect URLs에 등록.
   로컬 개발 주소가 필요하면 실제 사용하는 localhost 주소를 별도로 등록.
   GitHub의 코드 보기 주소는 앱 배포 주소가 아니다. GitHub Pages 등을 이용한다면 해당 실제 주소를 제공.
4. SQL Editor에서 `supabase/migrations/202610300001_create_todos.sql` 실행.
   신규 테이블용 마이그레이션이므로 기존 `public.todos`가 있으면 먼저 구조를 검토.
5. 프로젝트 URL, publishable key, APP_URL을 앱 설정에 연결한 뒤 실제 테스트.

## 구현할 인증과 저장 흐름

- Supabase JS v2의 `auth.signUp`으로 가입. `options.data.username`에 표시용 닉네임 전달.
- 이메일 확인이 켜져 있으면 확인 메일 안내 후 확인 완료 뒤 로그인.
- `auth.signInWithPassword`로 로그인, `auth.signOut`으로 로그아웃.
- SDK 세션 유지/자동 갱신 및 `onAuthStateChange`에 따라 화면과 목록 전환.
- 사용자명은 `user.user_metadata.username`으로 표시. 권한 판정에는 사용하지 않음.
- 로그인 사용자만 `public.todos` 조회/추가/수정/삭제. INSERT에는 `user_id`를 보내지 않고 DB 기본값 `auth.uid()` 사용.
- SDK가 로그인 유지를 위해 브라우저에 세션 토큰을 보관할 수 있으나,
  앱은 비밀번호나 직접 만든 비밀번호 해시를 저장하지 않음.
- 기존 브라우저 임시 계정은 실제 계정으로 자동 전환할 수 없음. 새로 가입해야 함.
- 기존 로컬 할 일은 자동 삭제/업로드하지 않음. 이전할 경우 로그인 후 명시적으로 가져오는 별도 절차 필요.

## 연결 후 검증

실제 연결 전에는 SQL 실행 또는 인증/RLS 통과를 확인했다고 보고하지 않는다.

1. 사용자 A/B를 각각 가입시키고 이메일 확인, 로그인/로그아웃, 새로고침 유지 확인.
2. A가 생성한 할 일이 A에게만 표시되는지 확인.
3. B의 JWT와 공개 키로 A 행 ID를 직접 조회/수정/삭제해도 접근할 수 없는지 확인.
4. INSERT의 소유자는 auth.uid()로 자동 지정되고 다른 user_id 지정/변경은 거절되는지 확인.
5. 비로그인 요청에서 todos 접근 불가 확인.
6. 네트워크 오류 시 성공한 것처럼 목록이 바뀌지 않는지, 세션 만료/사용자 전환 중 이전 목록이 노출되지 않는지 확인.

## 공식 문서

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/initializing
