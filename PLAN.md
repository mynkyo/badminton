# Website Cho Thuê Sân Cầu Lông — Kế hoạch thực hiện

## Mô tả

Website tĩnh gồm 3 trang riêng biệt. Khách xem lịch qua `index.html`, quản lý truy cập qua `manager.html` sau khi đăng nhập qua `login.html`. Chuẩn bị sẵn cấu trúc Firebase Auth cho tương lai.

**Thông số mặc định (có thể chỉnh trong `config.js`):**
- Tên sân: **Sân Cầu Lông Thành Công**
- Số sân: **3 sân** (Sân 1, Sân 2, Sân 3)
- Khung giờ: **5:00 – 22:00**, mỗi slot **1 tiếng**
- Giá: **80.000đ/h** (thường), **120.000đ/h** (cao điểm 17:00–20:00)

---

## Cấu trúc file

```
d:\Git\badminton\
├── index.html          ← Màn khách (Guest View)
├── login.html          ← Trang đăng nhập
├── manager.html        ← Màn quản lý (Admin View)
├── assets/
│   ├── logo.png
│   └── hero-bg.jpg
└── PLAN.md             ← File này
```

---

## Trang 1: `index.html` — Màn Khách

### Header
- Logo + tên sân + menu điều hướng
- Nút liên hệ nổi bật

### Bảng Lịch Sân (Core Feature)
- Chọn ngày (date-picker, mặc định hôm nay)
- Bảng khung giờ × số sân (3 sân × 5:00–22:00, slot 1h)
  - 🟢 Trống — click để xem popup liên hệ
  - 🔴 Đã đặt — hiển thị tên khách (ẩn SĐT)
- Responsive: scroll ngang trên mobile

### Popup Đặt Sân (khi click slot trống)
- Hiện thông tin: Sân, Ngày, Giờ
- Form: Họ tên, SĐT, Ghi chú
- Nút "Gửi yêu cầu" → tạm thời alert xác nhận, sau này ghi Firebase

### Footer
- Thông tin liên hệ: SĐT, Zalo, địa chỉ
- Google Maps embed (placeholder)

---

## Trang 2: `login.html` — Đăng Nhập Quản Lý

### UI
- Màn hình login tập trung, nền mờ / glassmorphism
- Logo + tiêu đề "Quản lý sân"
- Form: Username + Password
- Nút **"Đăng nhập"** — bấm không cần nhập vẫn vào được (bypass tạm thời)
- Chuẩn bị sẵn vị trí nút "Đăng nhập bằng Google" (disabled, kích hoạt sau)

### Logic hiện tại (tạm thời)
```js
// Click Đăng nhập → redirect thẳng manager.html
sessionStorage.setItem('isLoggedIn', 'true')
window.location.href = 'manager.html'
```

### Chuẩn bị cho Firebase Auth (tương lai)
```js
// TODO: Firebase Google Sign-in
// signInWithPopup(auth, googleProvider) → check role === 'admin'

// TODO: Email/Password Auth
// createUserWithEmailAndPassword() / signInWithEmailAndPassword()
// Lưu thông tin user vào Firestore (roles, profile)
```

---

## Trang 3: `manager.html` — Màn Quản Lý

### Guard (kiểm tra đăng nhập)
```js
if (!sessionStorage.getItem('isLoggedIn')) {
  window.location.href = 'login.html'
}
```

### Header
- Logo + tên sân
- "Xin chào, Admin" + nút Đăng xuất

### Dashboard (tóm tắt hôm nay)
- Số slot đã đặt / tổng slot
- Doanh thu ước tính hôm nay
- Số lịch gần nhất

### Bảng Quản lý Lịch
- Chọn ngày → hiển thị bảng (giống guest nhưng có action)
- **Thêm**: Click slot trống → form popup (tên KH, SĐT, ghi chú, trạng thái)
- **Sửa**: Click slot đã đặt → edit popup
- **Xóa**: Nút xóa trong popup → SweetAlert2 xác nhận

### Dữ liệu
- Tạm thời lưu trong `localStorage`
- Chuẩn bị sẵn hàm `saveBooking()` / `getBookings()` để sau swap sang Firebase

---

## Tech Stack CDN

```html
<!-- Tailwind CSS v3 -->
<script src="https://cdn.tailwindcss.com"></script>
<!-- FontAwesome 6 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<!-- Day.js -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<!-- SweetAlert2 -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<!-- Google Fonts: Inter -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## Luồng điều hướng

```
index.html (khách)
     │
     └── [Footer link ẩn] → login.html
                                │
                         [Đăng nhập] ── bypass (không cần nhập)
                                │
                           manager.html
                                │
                         [Đăng xuất] → login.html
```

---

## Kế hoạch thực thi

- [x] Xuất PLAN.md
- [ ] Generate logo và hero image
- [ ] Tạo `index.html` — layout khách hoàn chỉnh
- [ ] Tạo `login.html` — form đăng nhập bypass
- [ ] Tạo `manager.html` — dashboard + CRUD lịch
- [ ] Test luồng điều hướng + responsive
- [ ] Polish UI animations

---

## Roadmap tương lai (Firebase Integration)

1. **Firebase Auth**: Google Sign-in + Email/Password
2. **Firestore**: Lưu bookings, users, roles
3. **Role-based access**: admin → manager.html, user → xem lịch + đặt online
4. **Realtime updates**: Lịch cập nhật live khi admin thay đổi
5. **Thông báo**: Zalo OA / SMS khi có đặt lịch mới
