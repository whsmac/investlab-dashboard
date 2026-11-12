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
