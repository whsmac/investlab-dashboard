# PR #34 미리보기 배포 검증 기록 (2026-11-12)

## 현재 확인
- 브랜치 baffb21d: GitHub Actions 두 워크플로 모두 성공.
- Vercel preview 프로젝트 investlab-phase1-preview: 기존 Git 배포 dpl_95LWJcQhuqb4DQiYqhKMmNSKannr 는 ERROR, errorCode=git_info_fail.
- 실패한 배포는 이전 커밋 b4e9d7d6 기준이며 최신 커밋 배포가 아님.
- 재배포 요청은 429 rate_limited (GitHub API rate limit exceeded)로 거부됨. 빌드 자체의 실패로 해석하지 않는다.

## 재개 조건과 순서
1. Vercel-GitHub 연동 권한 및 API 요청 제한 상태 확인.
2. 동일한 preview 프로젝트에 최신 PR HEAD SHA를 지정해 배포. production 배포/프로모션 금지.
3. READY 상태 확인 후 /virtual-trade-simulator.html 및 정적 자산 접근 확인.
4. 브라우저에서 정상 환율, 8초 응답 제한, 차단된 네트워크, 이전 결과 제거, 양도세 자동 환산을 수동 검수.
5. 확인된 URL과 실제 배포 SHA를 함께 기록.

## 변경 금지
Draft PR 병합, 운영 대시보드 및 Supabase 변경, 실거래, 포트폴리오 원본 쓰기 금지.

## 최신 SHA 재배포 확인 (2026-11-12)
- GitHub Actions: 커밋 `96bfd074` 기준 두 워크플로 모두 성공.
- Vercel 전용 preview 프로젝트 `investlab-phase1-preview`에 `96bfd074b8e1552a498a2b8506544d82fae6e7d7`을 명시하여 Git 배포 요청.
- 새 배포 ID: `dpl_JCvLfsMgauVDJrTeuN51D6DsdXRY`.
- 배포 요청 자체는 접수되었지만 상태는 `ERROR`, `errorCode=git_info_fail`. READY URL 없음.
- 이전의 429 API 제한과 별개로, Git 소스 조회/연동 문제는 지속됨. 원인 확정 전 임의로 빌드 오류로 분류하거나 운영 환경 설정을 변경하지 않는다.
- 안전한 대안: GitHub-Vercel 연동 권한을 확인한 후 preview 재배포하거나, 별도 검증된 정적 소스 업로드 방식으로 preview 전용 배포를 구성한다. 운영 프로젝트·Supabase·PR 병합은 변경하지 않는다.
