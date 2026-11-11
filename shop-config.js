const SHOP = {
  // Địa chỉ Cloudflare Worker sau khi deploy (ví dụ: https://phongtra-pay.ten-ban.workers.dev). Để trống thì game chỉ hiện "chưa cấu hình".
  api: 'https://phongtra-pay.phongtra.workers.dev',
  yearCap: 900000000,
  donateAmounts: [10000, 20000, 50000, 100000],
  minDonate: 5000,
  maxTx: 10000000,
  dedPrice: 20000,   // phí tặng một bài hát (phải khớp DD_PRICE trong worker/payos-worker.js)
  dedMinDays: 2,
  // Dịch vụ VIP (phải khớp SVC trong worker/payos-worker.js, máy chủ mới là nơi quyết định giá thật)
  svc: {
    vip: 49000, vipDays: 30,
    ann: 10000, annVip: 8000,
    tblChair: 15000, tblSofa: 25000, tblChairVip: 10000, tblSofaVip: 18000, tblHours: 2
  },     // bài chưa có trong danh sách phải đặt trước ít nhất bấy nhiêu ngày
  prices: {
    nc_neon: 19000,
    nc_ruby: 19000,
    nc_rainbow: 39000,
    bd_bfly: 19000,
    bd_dragon: 39000,
    ea_bfly: 29000,
    ea_heart: 29000,
    ea_fire: 39000
  }
};
