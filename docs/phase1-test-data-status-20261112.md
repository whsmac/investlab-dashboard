# INVESTLAB 1차 Pilot — Supabase TEST 데이터 확인 (2026-11-12)

사용자가 Supabase TEST 프로젝트 `investlab-ledger-test`의 Table Editor 및 SQL Editor에서 직접 조회한 결과. 이 확인 과정에서는 DB 변경 없음. 대상 프로젝트 ref는 `gopofxyezhwpfbxebcrxd`.

## 실제 적재
- `app_private.data_owners`: 1건
- `public.import_batches`: 1건, ID 1, dataset_type `market_price`, status `committed`, row_count 4,938, accepted_count 4,938
- `public.market_price_observations`: 4,938건
- `public.quarterly_financial_observations`: **0건**, company_count **0**

| ticker | price_count | first_date | last_date |
|---|---:|---|---|
| AMZN | 967 | 2023-01-03 | 2026-11-06 |
| GOOGL | 967 | 2023-01-03 | 2026-11-06 |
| META | 967 | 2023-01-03 | 2026-11-06 |
| MSFT | 967 | 2023-01-03 | 2026-11-06 |
| SPCX | 103 | 2026-06-12 | 2026-11-06 |
| TSLA | 967 | 2023-01-03 | 2026-11-06 |
| 합계 | 4938 | | |

## 1차 개발 적용 방침
1. 이미 저장된 주가 4,938건은 중복 업로드하지 않는다. 건수와 기간은 확인했으나 원본 시세, 중간 날짜 결측, 이상치의 검증은 아직 완료되지 않았다.
2. TEST DB 분기 매출액/CAPEX는 0건이다. **미수집을 0 USD로 표시하지 않는다.** 기존 파일 기반 분기 데이터가 있으면 DB 데이터와 출처를 구분한다.
3. 분기 CSV 계약: `ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url`. 출처 및 CAPEX 정의를 확인하기 전 DB에 적재하지 않는다.
4. 1차 Pilot은 기존 기능 검증을 우선하고, 재무자료 대량 확보·자동수집은 후속 단계로 분리한다.
5. 권한/RPC/원자적 롤백 검증은 사용자 사전 승인 후 TEST에서만 진행. 운영 Supabase와 실제 원장은 변경하지 않고 PR은 Draft로 유지한다.

## 다음 점검
- [x] 6개 기업 주가 관측 건수 및 기간 확인
- [x] 가져오기 이력 4,938건 committed 확인
- [x] 분기 재무자료 0건 확인
- [ ] 공유 조회 화면에서 분기자료 없음 표시 검증
- [ ] 분기 CSV 출처·CAPEX 정의 오프라인 검증
- [ ] TEST에서 소유자/비소유자 권한·실패 롤백 검증 (별도 승인)
