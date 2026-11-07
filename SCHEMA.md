# Hợp đồng dữ kiện chuẩn — BIG不動産 (homefind)

Tài liệu này quy định hợp đồng dữ kiện bắt buộc cho toàn bộ dự án `homefind` (trang công khai `index.html` / `app.js` và trang quản trị `admin.html` / `admin.js`). Mọi thay đổi dữ kiện đều phải đối chiếu vào `SCHEMA.md` này cùng với `STYLE_GUIDE.md` trước khi viết code.

---

## 1. Nguồn dữ kiện duy nhất & Quy tắc lưu trữ

1. **File dữ kiện duy nhất**: `data/properties.json`
   - Không tạo bản sao `properties.json` ở thư mục gốc hay bất kỳ file dữ kiện thứ hai nào.
   - Loader của `app.js` và `admin.js` chỉ đọc và xuất bản đúng file `data/properties.json` này (kèm tham số chống cache `?v=`).
2. **Quy tắc Bản nháp (Draft) vs Đã duyệt (Approved)**:
   - **Bản nháp (`draft`)**: Chỉ được lưu trong `localStorage` của trình duyệt khi người dùng đang nhập dở trên trang Admin. Bản nháp tuyệt đối **không** được lọt vào file `data/properties.json`.
   - **File xuất bản (`data/properties.json`)**: Chỉ chứa các căn **ĐÃ DUYỆT** (đã vượt qua kiểm tra bắt buộc, xác nhận cờ lệch giá nếu có, và được bấm Duyệt).
3. **Cấu trúc tổng thể của `data/properties.json`**:
   ```json
   {
     "properties": [ ... ],
     "articles": [ ... ]
   }
   ```

---

## 2. Schema của mỗi căn BĐS (`properties[]`)

### 2.1. Các trường chuẩn trong hợp đồng

| Tên trường | Kiểu dữ liệu | Bắt buộc / Tùy chọn | Quy tắc & Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Bắt buộc** | Slug duy nhất của căn (ví dụ: `"komatsu-2-kodate"`). Không được trùng với căn khác. |
| `name_jp` | `string` | **Bắt buộc** | Tên căn tiếng Nhật (ví dụ: `"ツダフラット 207号室"`). |
| `name_vi` | `string` | Chuẩn (có thể `""`) | Tên căn tiếng Việt. |
| `price` | `int` (number) | **Bắt buộc** | Giá tính bằng JPY (`> 0`). |
| `price_label` | `string` | **Tự sinh từ `price`** | Nhãn giá hiển thị (ví dụ: `"3,480万円"` với `type="buy"`, `"¥37,000/tháng"` với `type="rent"`). Do Admin tự sinh từ `price` và `type`, không nhập tay, không nhờ Gemini sinh. |
| `type` | `"buy"` \| `"rent"` | **Bắt buộc** | `"buy"` (Nhà bán · 売買) hoặc `"rent"` (Cho thuê · 賃貸). |
| `area` | `string` | **Bắt buộc** | Khu vực chính, ví dụ `"Osaka"`, `"Kyoto"`. |
| `address` | `string` | Chuẩn (có thể `""`) | Địa chỉ hiển thị của căn. |
| `size_m2` | `number` | **Bắt buộc** | Diện tích sàn (`㎡`, `> 0`). |
| `land_m2` | `number` | Tùy chọn / Chuẩn | Diện tích đất (`㎡`, `0` nếu là căn hộ chung cư hoặc không có). |
| `balcony_m2` | `number` | Tùy chọn | Diện tích ban công (`㎡`). |
| `layout` | `string` | Chuẩn (có thể `""`) | Bố cục phòng, ví dụ `"3LDK"`, `"1K"`, `"1R"`. |
| `station` | `string` | **Bắt buộc** | Ga gần nhất kèm số phút đi bộ (ví dụ: `"JR学研都市線「放出」, đi bộ 7 phút"`). |
| `management_fee` | `int` (number) | Chuẩn (`0` nếu không có) | Phí quản lý mỗi tháng (JPY). |
| `repair_fund` | `int` (number) | Chuẩn (`0` nếu không có) | Quỹ sửa chữa mỗi tháng (JPY). |
| `year_built` | `int` (number) | Chuẩn (`0` nếu không rõ) | Năm xây dương lịch (đổi từ niên hiệu Nhật 昭和 / 平成 / 令和). |
| `structure` | `string` | Chuẩn (có thể `""`) | Kết cấu / loại hình sở hữu nếu có trong nguồn (ví dụ: `"Bê tông cốt thép (RC), 6 tầng"`). |
| `renovation` | `string` | Chuẩn (có thể `""`) | Ghi chú cải tạo hoặc điều kiện thuê nổi bật. |
| `images` | `string[]` | Chuẩn (`[]` nếu chưa có) | Mảng đường dẫn ảnh của căn; phần tử đầu tiên `images[0]` là ảnh chính. |
| `status` | `"available"` \| `"sold"` \| `"hidden"` | Chuẩn | Trạng thái hiển thị: `"available"` (Đang đăng), `"sold"` (Đã bán / Đã thuê), `"hidden"` (Ẩn khỏi trang công khai). |
| `featured` | `boolean` | Chuẩn | `true` nếu là căn nổi bật ở Khối 4. Chỉ đúng **một căn** là `true` tại một thời điểm. |
| `notes` | `string` | Chuẩn (có thể `""`) | Đoạn ghi chú / điểm mạnh của căn. |

### 2.2. Năm (05) trường tùy chọn mở rộng được phép

Ngoài các trường chuẩn ở mục 2.1, mỗi property **chỉ được phép** có thêm tối đa 5 trường tùy chọn sau (tuyệt đối không tự thêm trường nào khác):

| Tên trường | Kiểu dữ liệu | Quy tắc & Mô tả |
| :--- | :--- | :--- |
| `source_url` | `string` | Link nguồn của căn (ví dụ link SUUMO). Dùng để đối chiếu và cảnh báo trùng nguồn. |
| `source_agency` | `string` | Công ty bất động sản đăng tin nguồn. |
| `imported_at` | `string` | Ngày lấy dữ kiện lần đầu, định dạng `YYYY-MM-DD`. |
| `last_verified_at` | `string` | Ngày kiểm tra / duyệt gần nhất, định dạng `YYYY-MM-DD` (tự động gán ngày hôm nay khi bấm Duyệt). |
| `image_rights` | `boolean` | Đã có quyền sử dụng ảnh thật của căn hay chưa (`true` / `false`). Nếu `false`, bản xem trước bắt buộc hiển thị ảnh minh họa kèm nhãn `"Ảnh minh họa — Chưa xác nhận quyền ảnh"`. |

> **Cấm tuyệt đối**: Không sử dụng lại các trường thuộc schema thế hệ cũ (`purpose`, `city`, `ward`, `yearBuilt`, `walkMin`, `mgmtFee`, `repairFund`, `annualRent`, `grossYield`, `netYield`, `seismic`, `tenure`, `title{ja,en,vi}`, `desc{ja,en,vi}`). Nếu phát sinh nhu cầu thêm trường mới ngoài danh sách trên, phải dừng lại và hỏi chủ repo.

---

## 3. Quy tắc kiểm tra tự động & Xử lý lỗi

1. **7 trường bắt buộc (`REQUIRED_PROPERTY_FIELDS`)**:
   - `id`, `name_jp`, `price`, `type`, `area`, `size_m2`, `station`.
   - Trên **Admin**: Thiếu hoặc rỗng bất kỳ trường nào trong 7 trường này thì báo đỏ ngay tại trường đó và khóa nút Duyệt / Xuất bản.
   - Trên **Trang công khai (`app.js`)**: Khi render lưới nhà, nếu có căn nào thiếu 1 trong 7 trường bắt buộc thì bỏ qua đúng căn đó kèm `console.warn` nêu rõ `id` và tên trường thiếu; các căn hợp lệ còn lại vẫn render bình thường.
2. **Cảnh báo trùng**:
   - So khớp `id` và `source_url` với danh sách căn hiện có trong `data/properties.json`. Nếu trùng thì hiển thị cảnh báo rõ ràng trên Admin.
3. **Cờ lệch giá (Price Cross-check)**:
   - Admin có ô nhập tùy chọn **"Giá đối chiếu (JPY)"** (không lưu vào JSON xuất bản, chỉ phục vụ kiểm soát). Nếu người dùng nhập giá đối chiếu khác với `price`, hệ thống bật cờ vàng cảnh báo lệch giá và bắt buộc người dùng tick xác nhận mới cho phép Duyệt.
4. **Bảo toàn dữ liệu gốc**:
   - Khi xuất bản `data/properties.json`, toàn bộ các căn đã duyệt trước đó và mảng `articles` phải được giữ nguyên vẹn.

---

## 4. Schema của bài chia sẻ (`articles[]`)

Mỗi phần tử trong mảng `articles` gồm các trường:
- `id` (`string`): Mã bài viết duy nhất.
- `category` (`string`): Nhãn chuyên mục kèm tiếng Nhật (ví dụ: `"Hướng dẫn · ローン"`).
- `title` (`string`): Tiêu đề bài viết.
- `summary` (`string`): Tóm tắt ngắn 1–2 câu.
- `body` (`string`): Nội dung đầy đủ (HTML hợp lệ gồm `<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`).
- `date` (`string`): Ngày đăng (`YYYY-MM-DD`).
- `image` (`string`): Đường dẫn ảnh đại diện bài viết.
