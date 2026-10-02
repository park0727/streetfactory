// 주문 화면 설치(홈 화면 추가)용 서비스 워커. 캐시는 하지 않는다 (재고·가격은 항상 최신이어야 함).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
