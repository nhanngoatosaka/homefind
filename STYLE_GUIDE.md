# Hướng dẫn style web cho Antigravity — BIG不動産

Đây là chuẩn style bắt buộc cho web bất động sản BIG不動産. Antigravity phải áp nguyên xi chuẩn này khi dựng web thật trên Cloudflare Pages với dữ liệu lấy từ `properties.json` — không tự đổi màu, không tự thêm font, không tự sắp xếp lại bố cục.

Hãy lưu tài liệu này trong repo của website với tên `STYLE_GUIDE.md`, đặt cùng cấp với `properties.json`. Mọi lần build, sửa giao diện hoặc thêm tính năng sau này đều phải mở file này ra đối chiếu trước khi viết code.

## Cách dùng tài liệu này

- Cần giao việc ngay: sao chép toàn bộ khối ở **Mục 1** và dán cho Antigravity. Khối đó đã chứa đủ mọi quy tắc bắt buộc và tự đứng được một mình, không cần gửi kèm phần còn lại.
- Các mục 2–8 là bản tra cứu chi tiết: bảng màu đầy đủ, cấu trúc từng khối, đặc tả component, ánh xạ dữ liệu, dữ kiện mẫu và checklist nghiệm thu. Khi có điểm nào chưa rõ, tra ở đây trước khi hỏi lại chủ web.
- Nếu một yêu cầu mới mâu thuẫn với tài liệu này, Antigravity phải dừng và báo chủ web quyết định — không tự ý sửa chuẩn.

## 1. Khối hướng dẫn dán thẳng cho Antigravity

Sao chép từ dòng `--- BẮT ĐẦU ---` đến dòng `--- KẾT THÚC ---`, giữ nguyên cả hai dòng đánh dấu đó khi dán.

```text
--- BẮT ĐẦU ---
VAI TRÒ VÀ NHIỆM VỤ
Bạn đang dựng website thật cho BIG不動産 (bất động sản tại Osaka/Kansai, Nhật Bản)
theo đúng trang mẫu đã được chủ web duyệt. Đây là chuẩn style BẮT BUỘC, không phải
gợi ý. Hãy lưu toàn bộ hướng dẫn này vào repo dưới tên STYLE_GUIDE.md và áp dụng
cho mọi lần build sau.
- Công nghệ: trang tĩnh trên Cloudflare Pages, dữ liệu nhà và bài viết đọc từ
  properties.json. Không hard-code thông tin từng căn vào HTML; mọi căn đều render
  từ dữ liệu.
- Ngôn ngữ giao diện chính: tiếng Việt. Điểm xuyết nhãn tiếng Nhật ở kicker,
  nhãn loại giao dịch và tên căn (ví dụ: 物件一覧, 売買, 賃貸).
- Phong cách tổng thể: Japandi tối giản kiểu portfolio — hiện đại, đơn giản,
  không sến. Ảnh nhà là nhân vật chính; chữ và màu chỉ làm nền cho ảnh.

DESIGN TOKENS — DÙNG ĐÚNG CÁC BIẾN NÀY, KHÔNG TỰ CHẾ MÃ MÀU MỚI
(Phong cách Modern Japandi & Kiến trúc Nhật Bản: Gỗ sồi ấm + Xám than đá phiến + Nền trắng ngà)
:root{
  --bg:#F7F5F0;         /* trắng ngà đá vôi (Limestone Off-White) */
  --bg-soft:#ECE8E1;    /* xám cát bê tông sáng (Light Sand / Concrete) */
  --card:#FCFAF7;       /* nền thẻ trắng kem sạch sẽ */
  --ink:#25292E;        /* xám than chì đậm (Deep Slate Charcoal) — tiêu đề, chữ chính */
  --muted:#596068;      /* chữ phụ xám trung tính */
  --faint:#8A9098;      /* chữ mờ, ghi chú nhỏ */
  --line:#DFDAD1;       /* đường kẻ vữa mảnh tinh tế */
  --accent:#383F47;     /* xám than kiến trúc — khối đậm, nút phụ */
  --accent-ink:#25292E;
  --accent-soft:#EAE6DF;
  --amber:#B87B41;      /* nâu gỗ sồi mật ong (Warm Honey Oak) — điểm nhấn chính */
  --amber-ink:#8F5724;  /* nâu gỗ đậm cho chữ giá/nhãn trên nền sáng */
  --amber-soft:#F6EDE2; /* nền gỗ sồi nhạt */
  --amber-line:#E8D3BC; /* viền gỗ nhạt */
  --cta:#A36427;        /* nền nút chính — Nâu gỗ ấm tự nhiên */
  --cta-ink:#FFFFFF;
}
- Dải màu cho phép: nền gỗ mộc Wabi-Sabi #F4EFEB–#EAE3D9; xám than chì #25292E, #383F47, điểm sâu nhất
  #1A1D20; nâu gỗ sồi từ #B87B41 đến #A36427 / #8F5724.
- Header & Footer: đóng khung kiến trúc xám than chì sẫm (rgba(30, 34, 40, 0.96) và gradient
  #323840 xuống #1A1D20), chữ sáng #ECE8DF, logo trắng ngà.
- Nền trang (body): màu gỗ mộc ấm #F4EFEB kết hợp lớp hạt thô Wabi-sabi vi mô (subtle noise).
- Font: tiêu đề dùng serif thanh mảnh "Shippori Mincho B1", dự phòng "Noto Serif"
  (họ Cormorant chấp nhận được nếu không tải được hai font trên); nội dung dùng
  sans gọn "Be Vietnam Pro", dự phòng system-ui. Không dùng font nào khác.

CẤU TRÚC TRANG CHỦ — CHUẨN GỌN GÀNG 4 BƯỚC PHỄU
1. Header xám than kiến trúc dính trên cùng: logo BIG不動産 trắng ngà + menu tinh gọn
   (Danh sách nhà, Tính tiền nhà, Cẩm nang & Quy trình, Liên hệ) + nút liên hệ viền gỗ sồi.
2. Hero: nhãn kicker tiếng Nhật/địa danh màu gỗ sồi, tiêu đề serif lớn, đoạn mở
   đầu ngắn, 2 nút CTA.
3. Lưới portfolio các căn: nút lọc dạng viên tròn + bộ lọc nâng cao (ngân sách, diện tích,
   layout, sắp xếp), hiển thị 3 căn đại diện kèm nút "Xem toàn bộ danh sách nhà →".
4. Bảng tính tiền trả góp mua nhà & So sánh tiền thuê (Chuẩn công thức Keisan.site):
   tính gốc/lãi, kỳ Bonus, 2 giai đoạn lãi suất và đối chiếu trực tiếp tiền thuê hiện tại.
5. Dải ảnh thương hiệu hoàng hôn: ảnh ngang lớn (Kiyomizu-dera lúc hoàng hôn) làm dải nghỉ
   mắt kiến trúc trước khi bước vào khu tri thức.
6. Cẩm nang & Quy trình sở hữu nhà (Gom chung Hướng dẫn + Bài chia sẻ làm một khối #guide):
   - Phần 1: Quy trình 4 bước tổng quan + Nút mở Cẩm nang VIP 7 giai đoạn & Checklist (mã 2720).
   - Đường phân cách mảnh.
   - Phần 2: Thư viện bài viết & kinh nghiệm thực chiến (3 bài nổi bật + nút xem tất cả + CTA).
7. Khối liên hệ hành động thật & Form dự phòng: các kênh gọi/chat Zalo/LINE/WhatsApp + form soạn sẵn.
8. Footer xám than kiến trúc: logo, menu, thông tin công ty, pháp lý và chính sách bảo mật.

THẺ NHÀ — COMPONENT BẮT BUỘC
- Ảnh lớn ở trên, chiếm vai chính của thẻ; tỉ lệ ảnh đồng nhất trong toàn lưới.
- Hàng nhãn nhỏ phía trên tên: loại giao dịch + tiếng Nhật (Bán · 売買 /
  Cho thuê · 賃貸) và khu vực.
- Tên căn bằng font serif; dưới tên là địa chỉ / ga gần nhất, chữ phụ.
- Giá màu hổ phách (--amber-ink trên nền sáng), font serif; kèm đơn vị rõ ràng
  (万円 với nhà bán, ¥/tháng với nhà thuê) và 1 thông số đi kèm như LDK · diện tích.
- Dưới giá chỉ 2–3 thông số chính dạng một dòng chữ phụ ngăn bởi dấu "·"
  (ví dụ: renovation, phí quản lý, quỹ sửa chữa). KHÔNG nhồi bảng thông số đầy
  đủ lên thẻ.
- Nút "Xem chi tiết →" dạng chữ có gạch chân hổ phách; bấm vào mở HỘP THOẠI
  (dialog) chứa toàn bộ thông số của căn: tên, địa chỉ, giá, diện tích, bố cục,
  ga + phút đi bộ, phí quản lý, quỹ sửa chữa, năm xây, ghi chú renovation,
  nút đóng và nút liên hệ.
- Thẻ không viền nặng, không đổ bóng dày, bo góc nhỏ (khoảng 6px) hoặc không bo.
  Khoảng trắng rộng giữa các thẻ.

ÁNH XẠ DỮ LIỆU properties.json → GIAO DIỆN
Mỗi căn là một object với các trường sau (thiếu trường nào thì để trống, KHÔNG
bịa số liệu):
  id            mã căn duy nhất, dùng cho link và form liên hệ
  name_jp       tên căn tiếng Nhật (ví dụ: ツダフラット 207号室)
  name_vi       tên căn tiếng Việt (nếu có)
  price         giá dạng số + đơn vị hiển thị (万円 cho bán, ¥/tháng cho thuê)
  price_label   chuỗi giá hiển thị
  type          "buy" (bán) hoặc "rent" (thuê)
  area          khu vực: "Osaka", "Kyoto"... — dùng cho nhãn thẻ và nút lọc
  address       địa chỉ hiển thị
  size_m2       diện tích (㎡)
  layout        bố cục phòng (ví dụ: 1LDK)
  station       ga gần nhất + phút đi bộ (ví dụ: 放出 — đi bộ 7 phút)
  management_fee  phí quản lý / tháng (¥)
  repair_fund     quỹ sửa chữa / tháng (¥)
  year_built      năm xây
  renovation      ghi chú renovation (ví dụ: Full renovation 9/2026)
  images          mảng đường dẫn ảnh của căn, ảnh đầu tiên là ảnh chính
  status          "available" (đang mở bán/cho thuê) hoặc "sold" (đã bán/đã thuê)
  featured        true nếu là căn nổi bật ở mục 4; chỉ đúng 1 căn tại một thời điểm
- Căn có status "sold": hạ khỏi lưới portfolio, hoặc giữ lại nhưng phải gắn nhãn
  "Đã bán" / "Đã thuê" rõ ràng và không còn nút đặt lịch xem nhà.
- Căn featured render vào khối Căn nổi bật VÀ vẫn xuất hiện trong lưới như các
  căn khác.
- Bài viết là một mảng riêng, mỗi bài gồm: id, category (nhãn chuyên mục, có
  tiếng Nhật), title, summary (tóm tắt 1–2 câu), body (nội dung đầy đủ, cho phép
  đoạn văn, chữ đậm và danh sách), date (ngày đăng), image.

ĐIỀU CẤM — GIỮ STYLE
- Chỉ một cặp màu nhấn: chàm + hổ phách theo tokens ở trên. Cấm màu neon, cấm
  thêm màu thứ ba làm màu nhấn, cấm tự đổi mã màu "cho tươi hơn".
- Cấm gradient lòe loẹt ở bất cứ đâu ngoài gradient chàm của footer (và lớp phủ
  chàm mờ trên chú thích ảnh thương hiệu).
- Cấm banner nhấp nháy, chữ chạy, hiệu ứng động ồn ào, pop-up quảng cáo.
- Cấm font trang trí, font viết tay, font hiển thị lạ ngoài hai họ font đã chốt.
- Cấm viền nặng, đổ bóng dày, bo góc lớn kiểu thẻ ứng dụng di động.
- Ảnh minh họa dùng trong trang mẫu PHẢI được thay bằng ảnh thật của từng căn
  (từ Maisoku hoặc ảnh chụp thực tế) khi chạy web thật; không để ảnh minh họa
  lẫn vào dữ liệu căn thật mà không ghi chú.
- Mobile: không tràn ngang trong bất kỳ trường hợp nào; ảnh responsive, lưới
  tự xếp thành 1 cột; chữ không nhỏ dưới 13px.

TIÊU CHÍ NGHIỆM THU — TỰ KIỂM TRA TỪNG Ô TRƯỚC KHI BÁO XONG
[ ] Toàn bộ mã màu trên trang nằm trong bảng tokens; tìm trong CSS không còn
    mã màu nào ngoài danh sách cho phép.
[ ] Font tiêu đề là serif (Shippori Mincho B1 / Noto Serif), font nội dung là
    sans (Be Vietnam Pro); không font lạ.
[ ] Thứ tự 9 khối của trang chủ đúng như trên, không khối nào bị đảo hoặc thiếu.
[ ] Giá trên mọi thẻ và ở căn nổi bật đều màu hổ phách; hổ phách không xuất
    hiện ở diện tích lớn (không nền hổ phách, không khối chữ hổ phách dài).
[ ] Nút lọc chạy đúng cả 4 nhóm; hộp thoại chi tiết mở/đóng được và đủ trường.
[ ] Form liên hệ soạn được nội dung và nút sao chép hoạt động; form không gửi
    dữ liệu tới máy chủ nào.
[ ] Căn status "sold" đã hạ khỏi lưới hoặc gắn nhãn đúng quy tắc.
[ ] Mở trên mobile không tràn ngang; ảnh không vỡ, không méo tỉ lệ.
[ ] Dữ liệu hiển thị khớp properties.json — không hard-code, không số liệu bịa.
Nếu có điểm nào không làm đúng chuẩn được (thiếu dữ liệu, xung đột kỹ thuật),
phải BÁO LẠI cho chủ web kèm lý do trước khi tự thay đổi cách làm.
--- KẾT THÚC ---
```
