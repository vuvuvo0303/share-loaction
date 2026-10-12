# Ở đây — Firebase Spark / Netlify Free

Chỉ React + TypeScript + Tailwind + Ant Design + Firebase Auth + Realtime Database. Không Cloud Functions, Admin SDK, service account hay backend riêng. Giữ Firebase Spark và Netlify Free; không cần nâng Blaze hoặc liên kết thẻ. Hạn mức Free/Spark vẫn áp dụng, khi hết hạn mức dịch vụ có thể bị giới hạn.

## Thiết lập admin một lần trong Firebase Console

1. Authentication > Sign-in method: bật Email/Password.
2. Authentication > Users > Add user:
   - Email: admin@accounts.share-location.invalid
   - Password: 123456 (mật khẩu khởi tạo theo yêu cầu; nên đổi trước khi phát hành công khai).
   - Copy UID Firebase tạo ra. Dùng UID thật, không nhập chữ admin thay cho UID.
3. Realtime Database > Rules: thay toàn bộ bằng database.rules.json rồi Publish.
4. Realtime Database > Data: tạo node access nếu chưa có; trong access tạo node có tên là UID admin vừa copy. Node access/UID_ADMIN có đúng nội dung:

```json
{
  "role": "admin",
  "blocked": false,
  "kickedAt": 0
}
```

admin-access.json chứa đúng ba trường này. Nếu import JSON, chọn đúng node access/UID_ADMIN; không import đè root database. Không cần tạo profiles bằng tay; web tạo profile ở lần đăng nhập đầu.

5. Mở web: đăng nhập admin / 123456. Không cần script seed, claim admin hay Cloud Functions. Role được đọc từ access/UID_ADMIN và bảo vệ bởi Rules. Trình duyệt không tự cấp admin dựa theo tên/mật khẩu.

Console links:
- Users: https://console.firebase.google.com/project/share-location-ecfea/authentication/users
- Rules: https://console.firebase.google.com/project/share-location-ecfea/database/share-location-ecfea-default-rtdb/rules
- Data: https://console.firebase.google.com/project/share-location-ecfea/database/share-location-ecfea-default-rtdb/data

## Tạo user

Trong web admin > Quản trị > Thêm user từ Console:
1. Nhập tên tài khoản để lấy email nội bộ, ví dụ linh01@accounts.share-location.invalid.
2. Mở Firebase Authentication > Users > Add user, nhập email đó và mật khẩu. Tạo user trong Console cần quyền quản lý Firebase project, không chỉ role admin của app.
3. Copy UID, dán vào form cùng tên hiển thị rồi bấm Cấp quyền user.
4. Người đó đăng nhập bằng linh01 và mật khẩu vừa tạo. Tên tài khoản dùng chữ không dấu/số/dấu chấm/gạch dưới/gạch ngang, 3–32 ký tự, không phân biệt hoa/thường.

User tự signup bằng API cũng không có quyền ứng dụng nếu chưa có access/UID do admin cấp. Không có signup hoặc chọn role trên màn hình login.

## Quyền và giới hạn

- User chỉ xem tọa độ admin và của chính mình. Không đọc được vị trí/profile/presence user khác bằng SDK/REST nếu đã publish Rules mới.
- Admin xem mọi vị trí và bảng người đã đăng nhập, truy cập gần nhất, online/offline. Không theo dõi khách chưa đăng nhập hay IP.
- Kick ghi kickedAt bằng timestamp Firebase server. Rules chặn token có auth_time cũ, nên refresh token không vượt qua được. User đăng nhập lại được; nếu trong cùng giây bị kick, đợi một giây.
- Block đặt blocked=true; Rules chặn dữ liệu ngay và UI đăng xuất. Tài khoản Firebase Auth vẫn tồn tại và có thể xác thực mật khẩu, nhưng không vào ứng dụng/đọc dữ liệu được cho tới Unblock. Muốn disable tài khoản Auth phải làm trong Console.
- Admin không kick/block chính mình hoặc admin khác; không tạo/thăng role admin qua web. Chỉ operator chỉnh role admin trong Firebase Console.
- Tắt GPS/đóng web vẫn giữ tọa độ cuối. Xóa vị trí của tôi mới xóa. Web không lấy GPS tiếp khi trình duyệt đóng.
- Trạng thái online dựa trên presence heartbeat 30 giây, không đồng nghĩa đang bật GPS. Thời gian truy cập ghi bằng serverTimestamp trong lần web xác thực quyền; không phải hệ thống audit chống giả mạo hành vi.
- blocked và role do admin quản lý. Không chuyển role sang custom claims: bản này không dùng claims/Admin SDK.
- kickedAt dùng mili giây trong bản Spark. Nếu có dữ liệu từ bản Functions cũ, đặt kickedAt=0 một lần cho các access cũ trong Console trước khi dùng.

## Chạy / deploy

```sh
npm install
npm run dev
npm test
npm run build
```

Deploy cả dist lên Netlify Free. Nếu từ Git, điền VITE_FIREBASE_* trên Netlify theo .env.local. Web config là công khai, không chứa private key. Không cần firebase deploy functions hoặc seed:admin nữa. firebase.json chỉ có Database Rules và emulator Auth/Database.

Rules phải publish mới có hiệu lực; build không tự thay cấu hình Firebase thật. Không import JSON role ở root làm mất dữ liệu khác. Tọa độ rooms ẩn danh cũ không được đọc qua Rules mới.

Nếu trước đây đã deploy Functions, xóa các Functions cũ trong Firebase Console khi chuyển sang bản Spark; việc chỉ xóa source local không xóa tài nguyên cloud. Bản được chuẩn bị ở đây chưa deploy Functions/nâng gói.

## Kiểm tra

npm test kiểm tra logic GPS và biểu thức quyền với dữ liệu giả lập, không ghi lên Firebase thật. Kiểm tra Firebase Rules Playground/emulator và hai user thật sau khi Publish: user A không đọc được user B; admin đọc cả hai; kick ép đăng nhập lại; block chặn dữ liệu; user không sửa được access/role; GPS cuối được giữ khi đóng trang.

## Deploy Vercel

Có thể giữ nguyên Firebase Spark và deploy frontend lên Vercel. Hobby dành cho dự án cá nhân, phi thương mại trong hạn mức miễn phí.

1. Đẩy source lên GitHub/GitLab/Bitbucket; không commit .env.local, node_modules hay dist.
2. Vercel > Add New > Project > import repository, chọn Framework Vite; Build Command npm run build; Output Directory dist. Chọn Node 22.x hoặc mới hơn tương thích Vite.
3. Trong Environment Variables, nhập các VITE_FIREBASE_* từ .env.local cho Production (và Preview nếu muốn thử bản preview). Không dùng service account/private key. Không bật VITE_USE_FIREBASE_EMULATORS trên bản deploy.
4. Deploy. vercel.json đã đặt cấu hình build, SPA fallback và Referrer-Policy cho bản đồ.
5. Firebase Authentication > Settings > Authorized domains: thêm domain cố định của site, ví dụ share-location.vercel.app (không có https:// hoặc dấu /). Firebase Rules/access/users giữ nguyên, không tạo lại database.
6. Mở URL Vercel, đăng nhập và cho phép GPS. Nếu đổi biến môi trường, Redeploy để Vite đóng gói giá trị mới.

Domain Vercel khác Netlify/localhost nên phải đăng nhập và cấp quyền vị trí một lần trên domain mới. Tọa độ và role vẫn theo UID tài khoản Firebase.

Tài liệu: https://vercel.com/docs/frameworks/frontend/vite và https://vercel.com/docs/plans/hobby

### Cấu hình Vercel đã nằm trong source

vercel.json đặt Vite, npm ci, npm run build, dist, SPA fallback và Referrer-Policy. package.json/.nvmrc chọn Node 22. .env.production đã chứa Firebase Web config công khai cho project hiện tại và được đưa lên Git cùng source. Có thể import repository và Deploy mà không nhập lại các biến này trên Vercel. Nếu trước đó đã đặt biến trên Vercel, chúng ưu tiên hơn .env.production; sửa/xóa biến cũ nếu trỏ sang project khác.

.env.local vẫn chỉ ở máy dev; .vercel/ được ignore. Không thêm private key/service account vào .env.production. Sau khi có domain, vẫn cần thêm domain vào Firebase Authorized domains qua Console.
