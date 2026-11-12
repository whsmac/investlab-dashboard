# INVESTLAB TEST GitHub Pages 게시 절차

목적: 기존 운영 주소 `https://whsmac.github.io/investlab-dashboard/`와 운영 Supabase를 건드리지 않고 TEST 사이트를 별도 게시한다.

## 준비된 자동화
- 개발 브랜치: `feature/shared-data-import-preflight-20261108` (PR #33 Draft 유지)
- `scripts/build-github-pages-test.py`: 독립 TEST 정적 사이트 빌드
- `tests/github-pages-test-bundle.py`: 파일/상대 경로/기본 비밀키 파일 누락·포함 검사
- `.github/workflows/package-test-pages.yml`: 수동 실행 시 `investlab-test-pages` 아티팩트 생성. **배포하지 않음**
- 기존 `validate-dashboard.yml`: PR 개발 브랜치에서 자동 검증

## 사용자에게 필요한 1회 조치
GitHub 계정 `whsmac`에서 **별도의 Public 저장소** `investlab-test-pages`를 만듭니다. README 포함 여부는 상관없습니다. GitHub Pages 무료 사용을 위해 Public을 권장하며, 저장소에는 테스트용 정적 파일만 공개합니다. 이 저장소 생성은 현재 연결된 GitHub 도구에서 지원하지 않으므로 자동 수행할 수 없습니다.

**주의:** GitHub Pages는 정적 파일을 공개합니다. TEST 프로젝트의 로그인 비밀번호, 실제 포트폴리오, 비밀키, Supabase service_role/secret key를 절대 게시하지 마세요. 브라우저에 들어가는 공개용 publishable/anon 키만 사용하고 RLS를 반드시 적용합니다.

## 게시 전 수동 단계
1. 원본 저장소의 Actions에서 `Package isolated TEST Pages preview` 워크플로를 찾아 `Run workflow`를 누르고 PR #33 개발 브랜치를 선택합니다.
2. 성공한 실행의 Artifacts에서 `investlab-test-pages` ZIP을 다운로드해 압축을 풉니다.
3. **별도 저장소** `investlab-test-pages`의 루트에 ZIP 내부의 `index.html`, `shared-data.html`, `src/` 등 모든 파일을 업로드합니다. ZIP 파일 자체를 업로드하지 않습니다.
4. TEST 저장소 Settings → Pages → Build and deployment에서 `Deploy from a branch`, branch `main`, folder `/(root)`를 선택해 저장합니다.
5. 게시가 완료되면 예상 주소는 `https://whsmac.github.io/investlab-test-pages/`입니다. **실제 배포 성공과 주소는 GitHub Pages 화면에서 확인해야 합니다.**

## 접속 검증
- `/shared-data.html`에서 TEST Supabase URL `https://gopofxyezhwpfbxebcrxd.supabase.co`만 사용합니다.
- 공개용 키로 연결 후 TEST 계정 로그인, 기업 6개·주가 4,938건·분기 재무 0건(사전 확인 기준) 확인
- 새로고침·로그아웃·읽기 오류 시 상태 표시 확인
- 실제 CSV import commit은 수행하지 않음
- TEST Supabase Auth URL 허용 목록 변경이 필요하면 별도 승인 후 TEST 프로젝트에서만 수행

## 향후 개선
최초 수동 게시 검증 후에만 별도 TEST 저장소로 자동 배포하는 GitHub Actions 워크플로를 설계한다. 저장소 쓰기 권한/토큰은 최소 권한으로 설정하고, 기존 운영 Pages 배포를 절대 덮어쓰지 않는다.
