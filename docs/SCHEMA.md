# 데이터 모델

Postgres (Supabase). Drizzle 스키마는 `src/db/schema.ts` 가 원본이며 이 문서는 설명용이다.

## 테이블

### profiles — 사용자
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | `auth.users.id` 와 동일 |
| email | text | |
| name | text | 표시명 |
| role | enum admin/staff | |
| can_parts | bool | 부품·재고·판매·거래처 모듈 |
| can_repair | bool | 정비 모듈 (2차) |
| must_change_password | bool | 임시 비밀번호 상태 |
| is_active | bool | 비활성 시 로그인 차단 |
| created_at | timestamptz | |

### categories — 부품 카테고리
id serial, name unique, sort_order.

### suppliers — 해외 공급사
id, name, country(ISO 2자리 또는 자유 텍스트), contact, memo, is_active.

### parts — 부품 마스터 (SSOT)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigserial PK | 내부 키 |
| code | text unique | 부품코드. 생성 후 불변 |
| name | text | 부품명 |
| category_id | fk categories | |
| spec | text | 규격 / 호환기종 |
| manufacturer | text | 제조사 |
| country | text | 주요 수입국 |
| supplier_id | fk suppliers null | 기본 공급사 (입고 시 자동 연동) |
| standard_cost | numeric(14,0) | 표준수입원가 ₩ (참고값) |
| retail_price | numeric(14,0) | 권장소비자가 ₩ |
| avg_cost | numeric(14,2) | 이동평균 원가. 입고 시 갱신 |
| safety_stock | int | 안전재고 기준 |
| status | enum active/paused/discontinued | 운영상태 |
| memo | text | |
| created_at, updated_at | | |

### partners — 국내 거래처
| 컬럼 | 타입 |
|---|---|
| id | bigserial PK |
| code | text unique (P-0001) |
| name | text |
| type | enum dealer / service_center / direct_store / online_mall / other |
| contact_name, phone, email, address, memo | text |
| is_active | bool |
| created_at | |

### sales_orders — 판매 전표 헤더
| 컬럼 | 설명 |
|---|---|
| id | bigserial |
| doc_no | SLS-YYYY-NNNNN unique |
| doc_date | date 출고일 |
| partner_id | fk partners |
| channel | text 판매채널 |
| source | enum sale / repair (2차) |
| repair_order_id | bigint null (2차) |
| memo | |
| created_by | fk profiles |
| created_at | |

### sales_lines — 판매 라인
| 컬럼 | 설명 |
|---|---|
| id | bigserial |
| order_id | fk sales_orders on delete cascade |
| line_no | int |
| part_id | fk parts |
| qty | int > 0 |
| unit_price | numeric(14,0) 스냅샷 |
| unit_cost | numeric(14,2) 스냅샷 (판매 시점 avg_cost) |

파생값: 매출 = qty×unit_price, 이익 = qty×(unit_price−unit_cost).

### inbound_orders — 입고 전표 헤더
| 컬럼 | 설명 |
|---|---|
| id | bigserial |
| doc_no | INB-YYYY-NNNNN unique |
| doc_date | date 통관/입고일 |
| supplier_id | fk suppliers |
| country | text |
| currency | char(3) USD/JPY/EUR/CNY/KRW … |
| exchange_rate | numeric(14,4) 원/외화 |
| duty_amount | numeric(14,0) 관세 ₩ |
| extra_cost | numeric(14,0) 기타 부대비용 ₩ (운송, 창고 등) |
| shipping_method | text 항공/해상/특송 |
| customs_status | enum pending / cleared |
| memo, created_by, created_at | |

### inbound_lines — 입고 라인
| 컬럼 | 설명 |
|---|---|
| id | bigserial |
| order_id | fk inbound_orders cascade |
| line_no | int |
| part_id | fk parts |
| qty | int > 0 |
| unit_price_fx | numeric(14,4) 외화 단가 |
| unit_price_krw | numeric(14,2) 원화 단가 = fx × 환율 |
| allocated_cost | numeric(14,2) 배분된 부대비용 (라인 합계) |
| landed_unit_cost | numeric(14,2) 개당 실질원가 |

### stock_movements — 재고 이동 (재고의 유일한 원천)
| 컬럼 | 설명 |
|---|---|
| id | bigserial |
| part_id | fk parts |
| type | enum opening / inbound / sale / adjustment |
| qty | int, 부호 포함 (입고 +, 판매 −, 조정 ±) |
| unit_cost | numeric(14,2) 그 시점 원가 |
| sales_line_id | fk null |
| inbound_line_id | fk null |
| occurred_at | date |
| memo | text (실사 사유 등) |
| created_by, created_at | |

### doc_sequences — 채번
`(prefix text, year int, last_no int)` PK (prefix, year).

## 뷰 / 함수

- `v_stock`: part_id, qty(현재재고), inbound_qty, sold_qty, opening_qty.
- `v_inventory`: parts ⋈ v_stock, 재고상태(ok / low / out), 평가액(qty × avg_cost).
- `v_partner_stats`: 거래처별 출고건수, 누적 거래금액, 최근 거래일.
- `fn_next_doc_no(prefix, year)`: 채번. `UPDATE doc_sequences … RETURNING`.
- `fn_post_inbound(order_id)`: 라인별 배분·실질원가 계산 → movements 생성 → parts.avg_cost 갱신. 단일 트랜잭션.
- `fn_post_sale(order_id)`: 라인별 unit_cost 스냅샷 → movements 생성.

## 인덱스
- sales_orders(doc_date), sales_orders(partner_id, doc_date)
- sales_lines(part_id), inbound_lines(part_id)
- stock_movements(part_id), stock_movements(occurred_at)
- parts(code), parts(name), parts(category_id, status)

## RLS
Drizzle 는 서버에서 서비스 역할 연결로 접근하므로 RLS 는 켜되 anon/authenticated 에게는 아무 권한도 주지 않는다.
권한 검사는 앱 서버(Server Action) 에서 profiles 를 읽어 수행한다.
