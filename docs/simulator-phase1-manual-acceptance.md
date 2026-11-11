# 가상 매매 시뮬레이터 1단계 실사용 검증

> 상태: Draft PR #34. 운영 대시보드·운영 Supabase·실제 보유 데이터에 쓰지 않는 별도 테스트입니다.

## 접근 경로

- GitHub 개발 브랜치: `feature/simulator-shared-symbols-20261111`
- 화면 파일: `virtual-trade-simulator.html`
- 기존 Vercel `investlab-phase1-preview` 배포에는 이 화면이 포함되지 않습니다. 기존 미리보기 URL을 사용하지 마세요.
- 별도 미리보기 배포가 준비되기 전에는 저장소를 로컬에 내려받아 정적 HTTP 서버로 실행하세요. 브라우저의 `file://` 직접 열기는 모듈 로딩 제약이 있습니다.

```sh
git fetch origin feature/simulator-shared-symbols-20261111
git switch feature/simulator-shared-symbols-20261111
python3 -m http.server 8765
```

브라우저에서 `http://localhost:8765/virtual-trade-simulator.html`을 엽니다. **실제 보유종목을 불러오려면 동일 출처(origin)의 localStorage에 기존 대시보드 데이터가 있어야 합니다.** 다른 주소·포트에서 사용하던 데이터는 자동 공유되지 않습니다. 이 경우 화면의 수동 입력 기능을 사용하거나 테스트용 브라우저 데이터만 별도로 준비하세요. 운영 데이터를 임의로 복사하거나 변경하지 마세요.

## 확인할 흐름

1. 보유종목과 현금을 불러오고 수량·평균단가가 원본과 같은지 확인합니다. 현재가가 없는 종목은 최종 가정주가를 직접 입력합니다.
2. 보유·관심·거래이력 종목 선택 목록을 확인합니다.
3. TSLA 10주, 현금 100달러의 **독립 테스트 예시**에서 TSLA 2주를 200달러에 매도하고 SOXL 10주를 30달러에 매수합니다. TSLA 최종가 150달러, SOXL 최종가 40달러를 입력합니다.
4. 가상 결과: TSLA 8주, SOXL 10주, 현금 200달러, 평가총액 1,800달러. 계속 보유 시 1,600달러 대비 +200달러입니다(수수료 0 가정).
5. SOXL 최종가가 비어 있으면 성공 메시지나 이전 계산 결과가 남지 않는지 확인합니다.
6. 보유수량보다 많이 매도하면 오류를 표시하고 이전 성공 결과를 지우는지 확인합니다.
7. 테스트 후 원본 보유종목·관심종목과 현금 데이터가 바뀌지 않았는지 확인합니다.

## 자동 검증과 범위

`node tests/simulator-browser-smoke.mjs`는 Playwright Chromium 설치가 필요합니다. GitHub Actions의 **Simulator unit tests** 워크플로는 모듈 테스트와 브라우저 검증을 수행합니다. 공유 데이터·SEC 업로드·기존 대시보드의 전체 테스트 통과를 의미하지 않습니다.

### 안전 제한

- 실제 주문, 원본 보유종목 수정, Supabase DB 쓰기 없음.
- PR 병합, 운영 배포, 운영 Supabase 설정 변경 금지.
- 수동 테스트용 예시는 실제 투자정보가 아닙니다.
