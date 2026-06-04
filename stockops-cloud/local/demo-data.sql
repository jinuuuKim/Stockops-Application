-- StockOps local demo data.
-- Safe to run repeatedly against the local PostgreSQL container.

INSERT INTO categories (name, code, parent_id, level, sort_order, active)
VALUES
  ('식품', 'FOOD', NULL, 1, 10, TRUE),
  ('의약품', 'PHARMA', NULL, 1, 20, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (name, code, parent_id, level, sort_order, active)
SELECT '냉장식품', 'FOOD_CHILLED', id, 2, 11, TRUE FROM categories WHERE code = 'FOOD'
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (name, code, parent_id, level, sort_order, active)
SELECT '냉동식품', 'FOOD_FROZEN', id, 2, 12, TRUE FROM categories WHERE code = 'FOOD'
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (name, code, parent_id, level, sort_order, active)
SELECT '백신/시약', 'PHARMA_COLD', id, 2, 21, TRUE FROM categories WHERE code = 'PHARMA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO centers (code, name, address, phone, status)
VALUES
  ('SEL-CC-01', '서울 콜드체인 센터', '서울특별시 송파구 물류단지로 21', '02-555-0101', 'ACTIVE'),
  ('BSN-DRY-01', '부산 상온 배송 센터', '부산광역시 강서구 물류산단2로 8', '051-555-0202', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses (center_id, code, name, address, phone, status)
SELECT c.id, 'SEL-FRZ-A', '서울 냉동창고 A동', '서울특별시 송파구 물류단지로 21 A동', '02-555-0111', 'ACTIVE'
FROM centers c WHERE c.code = 'SEL-CC-01'
ON CONFLICT (center_id, code) DO NOTHING;

INSERT INTO warehouses (center_id, code, name, address, phone, status)
SELECT c.id, 'SEL-CHL-B', '서울 냉장창고 B동', '서울특별시 송파구 물류단지로 21 B동', '02-555-0112', 'ACTIVE'
FROM centers c WHERE c.code = 'SEL-CC-01'
ON CONFLICT (center_id, code) DO NOTHING;

INSERT INTO warehouses (center_id, code, name, address, phone, status)
SELECT c.id, 'BSN-DRY-A', '부산 상온창고 A동', '부산광역시 강서구 물류산단2로 8', '051-555-0211', 'ACTIVE'
FROM centers c WHERE c.code = 'BSN-DRY-01'
ON CONFLICT (center_id, code) DO NOTHING;

INSERT INTO locations (code, name, type, zone, shelf, level, warehouse_id)
VALUES
  ('SEL-FRZ-A-01-01', '냉동 A동 1존 1랙', 'STORAGE', 'FRZ-A1', 'R01', 'L01', (SELECT id FROM warehouses WHERE code = 'SEL-FRZ-A')),
  ('SEL-FRZ-A-01-02', '냉동 A동 1존 2랙', 'STORAGE', 'FRZ-A1', 'R02', 'L01', (SELECT id FROM warehouses WHERE code = 'SEL-FRZ-A')),
  ('SEL-CHL-B-02-01', '냉장 B동 2존 1랙', 'STORAGE', 'CHL-B2', 'R01', 'L02', (SELECT id FROM warehouses WHERE code = 'SEL-CHL-B')),
  ('BSN-DRY-A-01-01', '상온 A동 피킹 1랙', 'PICKING', 'DRY-A1', 'P01', 'L01', (SELECT id FROM warehouses WHERE code = 'BSN-DRY-A'))
ON CONFLICT (code) DO NOTHING;

INSERT INTO reason_codes (code, name, description, category)
VALUES
  ('CYCLE_GAIN', '실사 수량 증가', '재고 실사 결과 수량 증가', 'ADJUSTMENT'),
  ('DAMAGE_LOSS', '파손 폐기', '검수 중 파손/폐기 처리', 'ADJUSTMENT')
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (barcode, name, description, category, unit, expiry_managed, default_price, safety_stock_quantity, deleted, category_id)
VALUES
  ('8801007000011', '프리미엄 우유 1L', '냉장 보관 유제품', '냉장식품', 'EA', TRUE, 3200, 120, FALSE, (SELECT id FROM categories WHERE code = 'FOOD_CHILLED')),
  ('8801007000028', '그릭 요거트 500g', '냉장 보관 발효유', '냉장식품', 'EA', TRUE, 5800, 80, FALSE, (SELECT id FROM categories WHERE code = 'FOOD_CHILLED')),
  ('8801007000035', '냉동 닭가슴살 1kg', '급식/편의점 납품 냉동 상품', '냉동식품', 'BOX', TRUE, 14500, 60, FALSE, (SELECT id FROM categories WHERE code = 'FOOD_FROZEN')),
  ('8801007000042', 'mRNA 백신 운송키트', '초저온 콜드체인 관리 대상', '백신/시약', 'KIT', TRUE, 82000, 25, FALSE, (SELECT id FROM categories WHERE code = 'PHARMA_COLD')),
  ('8801007000059', '일회용 보냉팩', '피킹/출고 보조 자재', '운영자재', 'EA', FALSE, 450, 500, FALSE, NULL)
ON CONFLICT (barcode, deleted) DO NOTHING;

INSERT INTO lots (lot_number, product_id, expiry_date, received_date, quantity, status)
SELECT 'MILK-202605-A', id, CURRENT_DATE + 9, CURRENT_DATE - 2, 240, 'ACTIVE' FROM products WHERE barcode = '8801007000011' AND deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM lots WHERE lot_number = 'MILK-202605-A');

INSERT INTO lots (lot_number, product_id, expiry_date, received_date, quantity, status)
SELECT 'YOG-202605-B', id, CURRENT_DATE + 14, CURRENT_DATE - 1, 160, 'ACTIVE' FROM products WHERE barcode = '8801007000028' AND deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM lots WHERE lot_number = 'YOG-202605-B');

INSERT INTO lots (lot_number, product_id, expiry_date, received_date, quantity, status)
SELECT 'CHK-202607-F', id, CURRENT_DATE + 52, CURRENT_DATE - 4, 95, 'ACTIVE' FROM products WHERE barcode = '8801007000035' AND deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM lots WHERE lot_number = 'CHK-202607-F');

INSERT INTO lots (lot_number, product_id, expiry_date, received_date, quantity, status)
SELECT 'VAC-202606-C', id, CURRENT_DATE + 28, CURRENT_DATE - 1, 36, 'ACTIVE' FROM products WHERE barcode = '8801007000042' AND deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM lots WHERE lot_number = 'VAC-202606-C');

INSERT INTO lots (lot_number, product_id, expiry_date, received_date, quantity, status)
SELECT 'ICEPACK-STD', id, NULL, CURRENT_DATE - 7, 1200, 'ACTIVE' FROM products WHERE barcode = '8801007000059' AND deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM lots WHERE lot_number = 'ICEPACK-STD');

INSERT INTO inventory (product_id, location_id, lot_id, quantity, reserved_quantity, status)
VALUES
  ((SELECT id FROM products WHERE barcode = '8801007000011' AND deleted = FALSE), (SELECT id FROM locations WHERE code = 'SEL-CHL-B-02-01'), (SELECT id FROM lots WHERE lot_number = 'MILK-202605-A' LIMIT 1), 188, 24, 'ACTIVE'),
  ((SELECT id FROM products WHERE barcode = '8801007000028' AND deleted = FALSE), (SELECT id FROM locations WHERE code = 'SEL-CHL-B-02-01'), (SELECT id FROM lots WHERE lot_number = 'YOG-202605-B' LIMIT 1), 126, 12, 'ACTIVE'),
  ((SELECT id FROM products WHERE barcode = '8801007000035' AND deleted = FALSE), (SELECT id FROM locations WHERE code = 'SEL-FRZ-A-01-01'), (SELECT id FROM lots WHERE lot_number = 'CHK-202607-F' LIMIT 1), 82, 18, 'ACTIVE'),
  ((SELECT id FROM products WHERE barcode = '8801007000042' AND deleted = FALSE), (SELECT id FROM locations WHERE code = 'SEL-FRZ-A-01-02'), (SELECT id FROM lots WHERE lot_number = 'VAC-202606-C' LIMIT 1), 30, 4, 'ACTIVE'),
  ((SELECT id FROM products WHERE barcode = '8801007000059' AND deleted = FALSE), (SELECT id FROM locations WHERE code = 'BSN-DRY-A-01-01'), (SELECT id FROM lots WHERE lot_number = 'ICEPACK-STD' LIMIT 1), 940, 120, 'ACTIVE')
ON CONFLICT (product_id, location_id, lot_id) DO NOTHING;

INSERT INTO inbounds (inbound_date, supplier, status, total_quantity, created_by)
SELECT CURRENT_DATE - 2, '한강유업', 'CONFIRMED', 400, id FROM users WHERE email = 'admin@stockops.com'
  AND NOT EXISTS (SELECT 1 FROM inbounds WHERE supplier = '한강유업' AND inbound_date = CURRENT_DATE - 2);

INSERT INTO inbound_items (inbound_id, product_id, lot_number, expiry_date, quantity, location_id)
SELECT i.id, p.id, 'MILK-202605-A', CURRENT_DATE + 9, 240, l.id
FROM inbounds i, products p, locations l
WHERE i.supplier = '한강유업' AND p.barcode = '8801007000011' AND p.deleted = FALSE AND l.code = 'SEL-CHL-B-02-01'
  AND NOT EXISTS (SELECT 1 FROM inbound_items WHERE lot_number = 'MILK-202605-A');

INSERT INTO inbound_items (inbound_id, product_id, lot_number, expiry_date, quantity, location_id)
SELECT i.id, p.id, 'YOG-202605-B', CURRENT_DATE + 14, 160, l.id
FROM inbounds i, products p, locations l
WHERE i.supplier = '한강유업' AND p.barcode = '8801007000028' AND p.deleted = FALSE AND l.code = 'SEL-CHL-B-02-01'
  AND NOT EXISTS (SELECT 1 FROM inbound_items WHERE lot_number = 'YOG-202605-B');

INSERT INTO outbounds (outbound_date, customer, status, total_quantity, created_by)
SELECT CURRENT_DATE, '강남 메디컬센터', 'CONFIRMED', 28, id FROM users WHERE email = 'admin@stockops.com'
  AND NOT EXISTS (SELECT 1 FROM outbounds WHERE customer = '강남 메디컬센터' AND outbound_date = CURRENT_DATE);

INSERT INTO outbound_items (outbound_id, product_id, lot_id, quantity)
SELECT o.id, p.id, lt.id, 4
FROM outbounds o, products p, lots lt
WHERE o.customer = '강남 메디컬센터' AND p.barcode = '8801007000042' AND p.deleted = FALSE AND lt.lot_number = 'VAC-202606-C'
  AND NOT EXISTS (SELECT 1 FROM outbound_items WHERE outbound_id = o.id AND lot_id = lt.id);

INSERT INTO outbound_items (outbound_id, product_id, lot_id, quantity)
SELECT o.id, p.id, lt.id, 24
FROM outbounds o, products p, lots lt
WHERE o.customer = '강남 메디컬센터' AND p.barcode = '8801007000011' AND p.deleted = FALSE AND lt.lot_number = 'MILK-202605-A'
  AND NOT EXISTS (SELECT 1 FROM outbound_items WHERE outbound_id = o.id AND lot_id = lt.id);

INSERT INTO purchase_orders (po_number, requesting_center_id, target_warehouse_id, supplier_name, supplier_code, status, requested_by, requested_at, total_requested_amount, total_accepted_amount, notes)
SELECT 'PO-DEMO-202605-001', c.id, w.id, '바이오콜드랩', 'BIOCOLD', 'REQUESTED', u.id, CURRENT_TIMESTAMP, 2870000, 0, '백신 운송키트 안전재고 보충'
FROM centers c, warehouses w, users u
WHERE c.code = 'SEL-CC-01' AND w.code = 'SEL-FRZ-A' AND u.email = 'admin@stockops.com'
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO purchase_order_items (purchase_order_id, product_id, requested_quantity, accepted_quantity, cancelled_quantity, unit_price, total_price, note)
SELECT po.id, p.id, 35, 0, 0, 82000, 2870000, '초저온 박스 동봉 요청'
FROM purchase_orders po, products p
WHERE po.po_number = 'PO-DEMO-202605-001' AND p.barcode = '8801007000042' AND p.deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM purchase_order_items WHERE purchase_order_id = po.id AND product_id = p.id);

INSERT INTO demand_forecasts (product_id, forecast_date, predicted_quantity, confidence_lower, confidence_upper, model_version)
SELECT id, CURRENT_DATE + 1, 42.000, 35.000, 51.000, 'demo-stat-v1' FROM products WHERE barcode = '8801007000011' AND deleted = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM demand_forecasts
    WHERE product_id = products.id AND forecast_date = CURRENT_DATE + 1
  );

INSERT INTO demand_forecasts (product_id, forecast_date, predicted_quantity, confidence_lower, confidence_upper, model_version)
SELECT id, CURRENT_DATE + 1, 7.000, 4.000, 11.000, 'demo-stat-v1' FROM products WHERE barcode = '8801007000042' AND deleted = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM demand_forecasts
    WHERE product_id = products.id AND forecast_date = CURRENT_DATE + 1
  );

INSERT INTO expiry_alerts (lot_id, product_id, days_until_expiry, alert_level, expiry_date, quantity, is_acknowledged)
SELECT lt.id, p.id, 9, 'WARNING', CURRENT_DATE + 9, 188, FALSE
FROM lots lt, products p
WHERE lt.lot_number = 'MILK-202605-A' AND p.barcode = '8801007000011' AND p.deleted = FALSE
  AND NOT EXISTS (SELECT 1 FROM expiry_alerts WHERE lot_id = lt.id);

INSERT INTO sensor_devices (name, location, sensor_type, external_sensor_id, mqtt_topic, source_channel, unit, calibration, noise_sigma, deleted, active)
VALUES
  ('A동 냉장 온도 센서', '서울 냉장창고 B동 / CHL-B2', 'TEMPERATURE', 'TEMP_A01', 'sensimul/sites/SEOUL_COLD_CHAIN_01/sensors/TEMP_A01', 'temperature_c', 'celsius', NULL, 0.12, FALSE, TRUE),
  ('A동 냉장 습도 센서', '서울 냉장창고 B동 / CHL-B2', 'HUMIDITY', 'HUM_A01', 'sensimul/sites/SEOUL_COLD_CHAIN_01/sensors/HUM_A01', 'humidity_pct', 'percent', NULL, 0.30, FALSE, TRUE),
  ('A동 미세먼지 센서', '서울 냉장창고 B동 / 입출고 도크', 'AIR_QUALITY', 'PM25_A01', 'sensimul/sites/SEOUL_COLD_CHAIN_01/sensors/PM25_A01', 'pm25_ug_m3', 'ug/m3', NULL, 0.80, FALSE, TRUE),
  ('A동 출입문 센서', '서울 냉장창고 B동 / 도크 게이트', 'DOOR', 'DOOR_A01', 'sensimul/sites/SEOUL_COLD_CHAIN_01/sensors/DOOR_A01', 'door_open', NULL, NULL, 0, FALSE, TRUE),
  ('A동 작업자 감지 센서', '서울 냉장창고 B동 / 피킹 존', 'MOTION', 'MOTION_A01', 'sensimul/sites/SEOUL_COLD_CHAIN_01/sensors/MOTION_A01', 'presence_detected', NULL, NULL, 0, FALSE, TRUE)
ON CONFLICT (external_sensor_id, deleted) DO NOTHING;

INSERT INTO environment_controllers (name, external_controller_id, controller_type, target_axis, status, output_level, deleted, active, mqtt_topic)
VALUES
  ('A동 냉각기', 'COOL_A01', 'COOLING', 'temperature', 'READY', 0, FALSE, TRUE, 'sensimul/sites/SEOUL_COLD_CHAIN_01/controllers/COOL_A01'),
  ('A동 제습기', 'DEHUM_A01', 'DEHUMIDIFYING', 'humidity', 'READY', 0, FALSE, TRUE, 'sensimul/sites/SEOUL_COLD_CHAIN_01/controllers/DEHUM_A01'),
  ('A동 공기청정기', 'PURIFIER_A01', 'AIR_PURIFIER', 'air_quality', 'READY', 0, FALSE, TRUE, 'sensimul/sites/SEOUL_COLD_CHAIN_01/controllers/PURIFIER_A01')
ON CONFLICT (external_controller_id, deleted) DO NOTHING;

INSERT INTO environment_alerts (sensor_device_id, alert_type, severity, message, acknowledged, created_at)
SELECT id, 'HUMIDITY_LOW', 'WARNING', '냉장 B동 습도가 권장 범위보다 낮습니다. 제습기 설정을 확인하세요.', FALSE, CURRENT_TIMESTAMP
FROM sensor_devices
WHERE external_sensor_id = 'HUM_A01' AND deleted = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM environment_alerts
    WHERE sensor_device_id = sensor_devices.id AND alert_type = 'HUMIDITY_LOW'
  );
