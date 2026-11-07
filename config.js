// Cấu hình chung – sửa tên thương hiệu, tỷ giá tại đây
window.SITE = {
  brand: "Sakura Estate Japan",   // TODO: đổi thành tên thương hiệu của bạn
  areas: ["Tokyo", "Osaka", "Fukuoka"], // khu vực chính
  contactEmail: "you@example.com",
  // Tỷ giá so với 1 JPY (cập nhật thủ công hoặc qua API)
  rates: { JPY: 1, USD: 1 / 150, VND: 170 },
  symbols: { JPY: "¥", USD: "$", VND: "₫" }
};
