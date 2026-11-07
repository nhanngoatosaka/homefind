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
:root{
  --bg:#FAF7F1;         /* nền trắng ấm */
  --bg-soft:#F3ECDD;    /* nền khối phụ, xám be nhạt */
  --card:#FFFDF8;       /* nền thẻ */
  --ink:#22304A;        /* chàm đậm — tiêu đề, chữ chính */
  --muted:#5A6070;      /* chữ phụ */
  --faint:#8F93A3;      /* chữ mờ, ghi chú nhỏ */
  --line:#E4DCCB;       /* đường kẻ mảnh */
  --accent:#2E4057;     /* chàm — khối đậm, nút phụ */
  --accent-ink:#22304A;
  --accent-soft:#E7EAF0;
  --amber:#C97E2C;      /* vàng hổ phách — điểm nhấn */
  --amber-ink:#9A5C13;  /* hổ phách đậm cho chữ giá/nhãn trên nền sáng */
  --amber-soft:#F8ECD6;
  --cta:#A5661F;        /* nền nút chính */
  --cta-ink:#FFFFFF;
}
- Dải màu cho phép: nền ấm #FAF7F2–#F3EDE3; chàm #22304A, #2E4057, điểm sâu nhất
  #1B2436; hổ phách từ #C97E2C đến #DFA243.
- Footer: nền gradient dọc duy nhất trên trang, từ #2E4057 xuống #1B2436,
  chữ sáng #E9E6DA.
- Chế độ tối (nếu làm): nền chàm đêm #161C28 / #1D2536, thẻ #212B3F, chữ #ECE8DC,
  hổ phách sáng #DFA243, nút chính nền #DFA243 chữ #1B2436.
- Font: tiêu đề dùng serif thanh mảnh "Shippori Mincho B1", dự phòng "Noto Serif"
  (họ Cormorant chấp nhận được nếu không tải được hai font trên); nội dung dùng
  sans gọn "Be Vietnam Pro", dự phòng system-ui. Không dùng font nào khác.

CẤU TRÚC TRANG CHỦ — GIỮ ĐÚNG THỨ TỰ NÀY
1. Header tối giản, dính trên cùng: logo BIG不動産 + menu (Căn nổi bật, Danh sách
   nhà, Bài chia sẻ, Hướng dẫn, Liên hệ) + nút liên hệ viền hổ phách.
2. Hero: nhãn kicker tiếng Nhật/địa danh màu hổ phách, tiêu đề serif lớn, đoạn mở
   đầu ngắn, 2 nút (nút chính hổ phách, nút phụ viền chàm), hàng số liệu ngắn.
3. Dải ảnh thương hiệu hoàng hôn ngay dưới hero: một ảnh ngang lớn (ảnh
   Kiyomizu-dera lúc hoàng hôn là ảnh mẫu) kèm chú thích tiếng Nhật dạng
   "清水寺 — Kyoto, lúc hoàng hôn".
4. Căn nổi bật: nền be nhạt; bên trái là thư viện ảnh (ảnh lớn + hàng ảnh nhỏ,
   bấm ảnh nhỏ để đổi ảnh lớn, ảnh đang chọn có viền hổ phách); bên phải là nhãn
   trạng thái, tên căn, địa chỉ, giá lớn màu hổ phách, bảng thông số, đoạn ghi
   chú và nút đặt lịch xem nhà.
5. Lưới portfolio các căn: nút lọc dạng viên tròn — Tất cả / Nhà bán /
   Thuê · Osaka / Thuê · Kyoto (nút đang chọn nền chàm, chữ sáng). Lọc phải chạy
   thật, lưới tự rút lại đúng nhóm; nhóm trống thì hiện dòng "Chưa có căn nào
   trong mục này."
6. Mục bài chia sẻ, tip, hướng dẫn: lưới bài viết gồm ảnh, nhãn chuyên mục,
   tiêu đề serif, tóm tắt; bấm "Đọc bài" thì nội dung đầy đủ mở rộng ngay tại
   chỗ (không chuyển trang) và nút đổi thành "Thu gọn".
7. Quy trình mua nhà 4 bước: 4 cột, mỗi bước có gạch trên màu hổ phách, số bước
   và mô tả ngắn — 01 Tư vấn & xem nhà; 02 Thẩm định vay sơ bộ; 03 Đặt mua &
   hợp đồng; 04 Quyết toán & nhận nhà.
8. Khối liên hệ: nền be nhạt; bên trái là 4 kênh Form trên web / Zalo / LINE /
   WhatsApp; bên phải là form (họ tên, liên lạc, kênh mong muốn, căn quan tâm,
   nội dung). Gửi form KHÔNG gửi dữ liệu đi đâu: form soạn sẵn một đoạn nội dung
   liên hệ, hiển thị trong khung viền đứt nét màu hổ phách kèm nút "Sao chép
   nội dung" để khách tự dán vào kênh đã chọn.
9. Footer chàm đậm (gradient #2E4057 → #1B2436): logo, menu, dòng mô tả ngắn.

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
