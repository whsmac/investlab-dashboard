# INVESTLAB GitHub Pages + Supabase 운영 전환 계획 (2026-11-12)

## 확정 운영 원칙
- 웹 호스팅: GitHub Pages. 소스/PR/검증: GitHub 및 GitHub Actions.
- 인증 및 데이터: Supabase. 최초 1명, 향후 최대 6명.
- Vercel은 새 배포 경로에서 제외한다. 기존 Vercel 프로젝트를 즉시 삭제하거나 프로덕션에 영향 주는 조작은 하지 않는다.
- PR #24~#26은 변경하지 않는다. PR #27, #33, #34는 Draft 유지. PR merge 금지.
- 운영 GitHub Pages와 운영 Supabase는 변경하지 않는다. TEST Supabase는 읽기 검증부터 진행하며 쓰기/스키마 변경은 별도 승인 필요.

## 현재 확인된 사실
- 기존 공개 사이트: https://whsmac.github.io/investlab-dashboard/
- PR #33 개발 브랜치: feature/shared-data-import-preflight-20261108
- PR #33 브랜치에는 정적 HTML과 .github/workflows/validate-dashboard.yml이 존재한다.
- TEST Supabase 프로젝트 URL은 shared-data.html에서 허용 목록으로 제한된다.
- TEST 데이터 확인 기준: 기업 6, 주가 관측값 4,938, 분기 재무 0 (변동 가능).
- 개발 브랜치에서 GitHub Pages의 별도 URL이 자동 생성되는 것은 아니다. Pages 설정과 배포 경로를 확인해야 한다.

## 운영 사이트를 건드리지 않는 Pilot 배포 설계
1. GitHub Pages의 현재 source (branch/folder 또는 Actions)와 사용자 정의 도메인 여부를 먼저 확인한다.
2. 운영 사이트와 독립적인 별도 TEST Pages 저장소를 사용하는 방안을 우선 검토한다. 예: 별도 공개 저장소의 GitHub Pages. 실제 저장소 생성·공개 배포는 별도 승인 후 진행한다.
3. TEST Pages에는 개발 브랜치에서 검증된 정적 파일만 배포한다. 개인 키, service_role, sb_secret, 비밀번호, 포트폴리오 실데이터를 포함하지 않는다.
4. TEST Pages URL에서 shared-data.html을 열어 TEST Supabase의 공개용 anon/publishable 키와 본인 계정으로 로그인하여 RLS와 정확한 건수를 확인한다.
5. Supabase Auth의 Site URL/Redirect URLs와 CORS·CSP 등 브라우저 접속 조건을 점검한다. 필요시 TEST 프로젝트에서만 설정 변경을 별도 승인받는다.
6. 성공 후 승인된 변경만 운영 Pages에 반영한다.

## 최대 6명 사용 시 고려사항
- Supabase Auth로 개인별 로그인, public 테이블은 사용자 소유권 기반 RLS를 적용한다.
- 기업 주가/재무 관측값 등 공유 가능한 데이터와 개인별 계좌·원장·시나리오를 분리한다.
- 브라우저 localStorage에 남아 있는 시나리오는 동기화 완료 전까지 삭제하지 않는다.
- GitHub Pages는 정적 호스팅이므로 서버 비밀키를 보관할 수 없다. 관리자 작업/수집은 권한이 분리된 GitHub Actions 또는 Supabase 서버 기능에서 수행한다.
- 무료 플랜 사용량, 인증 이메일 제한, Actions 실행량, Pages 공개 범위를 운영 중 점검한다.

## 다음 실행 작업
- Pages 설정과 운영 배포 경로의 실제 상태를 검증한다.
- 운영 Pages에 영향을 주지 않는 TEST 배포 저장소/워크플로를 검토하고 별도 승인 후 개설한다.
- 실제 TEST URL이 생긴 다음 브라우저 인증·조회 검증을 진행한다.
