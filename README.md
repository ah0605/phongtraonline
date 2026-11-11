# Phòng Trà Online (chi phí 0đ, chỉ trả tiền domain)

Không gian chung 3D (Three.js): mọi người online thấy nhau đi lại, ngồi bàn, gọi nước, nhấp trà, chat, vỗ tay/tặng hoa lên sân khấu.
Admin thêm nhạc cho ca sĩ, mọi người nghe đồng bộ cùng lúc.

## Điều khiển
- Máy tính: chạm/bấm sàn để đi, WASD hoặc phím mũi tên (đi theo hướng camera), kéo chuột để xoay, cuộn để zoom, Enter để chat, E hoặc bấm vào nhân vật để nhấp trà.
- Điện thoại: giữ ngón tay ở nửa trái màn hình để hiện joystick, kéo ở nửa phải để xoay, hai ngón để zoom, chạm sàn để đi.

## Nhân vật
- Khách chọn **Nam (mặc vest)** hoặc **Nữ (mặc váy)** và màu trang phục khi vào phòng.
- Ca sĩ do admin chọn khi thêm bài: **Ca sĩ nam (vest)** hoặc **Ca sĩ nữ (áo dài)**. Admin đổi lại bằng nút ⚥ cạnh bài trong Lịch diễn. Ca sĩ trên sân khấu đổi theo bài đang phát.
- Nếu bạn đã dán rules cũ vào Firebase, hãy dán lại `database.rules.json` (có thêm trường màu `c`).

## Phòng mới (rộng, 15 bàn)
- 50 chỗ ngồi quay mặt về sân khấu (20 chỗ trên sofa nhung đôi sát sân khấu, 30 chỗ trên ghế tựa có nơ lụa phía sau lưng, mỗi cặp có một bàn nhỏ để ly) cùng 6 ghế cao ở quầy lễ tân & nước. Có sân khấu với đàn piano và nghệ sĩ piano, đèn chùm pha lê, cửa sổ nhìn ra phố đêm, tường ốp và cây cảnh.
- Quầy lễ tân & nước ở sát tường trái có 2 nhân viên (pha chế và lễ tân), máy pha cà phê, bình nước chanh, bộ ấm trà, tủ bánh, kệ chai và bảng thực đơn. Chạm vào nhân viên để mở menu gọi nước. Nhân viên vẫy tay chào khi bạn vào.
- Khách đi theo đường vòng, không đi xuyên qua bàn ghế, quầy hay cây (thuật toán tìm đường A*). Người khác đi trên máy bạn cũng theo đúng cách đó.
- Vào phòng có nhạc piano nhẹ nhàng. Tiếng mưa mặc định tắt, bấm nút 🌧 để bật (cửa sổ cũng hiện mưa). Khi admin phát bài của ca sĩ thì ca sĩ lên sân khấu, nghệ sĩ piano nghỉ.
- Máy tính có bóng đổ mềm. Điện thoại tự tắt bóng đổ để chạy mượt.
- Nếu bạn đã dán rules cũ vào Firebase, hãy dán lại `database.rules.json` (kích thước phòng đã tăng).

## Dáng nhân vật (kiểu hoạt hình mềm)
- Tỷ lệ chibi: đầu to gấp rưỡi so với trước, thân nhỏ lại 20% (đầu chiếm khoảng 2/5 chiều cao). Mắt rất to đặt thấp trên mặt, có lòng trắng, tròng nâu hai lớp, đồng tử và hai điểm sáng, mi mắt; nữ có lông mi, má hồng, môi có sắc.
- Tay chân là các khối thon bo tròn hai đầu (không còn hình trụ cứng), có khớp vai, khớp gối, bàn tay có ngón cái, giày có đế (giày da cho nam, giày búp bê có quai cho nữ, giày thêu đỏ cho áo dài).
- Váy nữ có nếp gấp mềm quanh gấu và lớp váy lót ren, cổ ren, nơ eo phía sau. Vest nam có cổ sơ mi, khuy vàng, khăn cài túi. Áo dài có nút cài vàng và vòng tay vàng.
- Vật liệu nhân vật có thêm ánh sáng nền nhẹ để vùng tối không bị đen, nhìn mềm hơn.

## Chữ tiếng Việt
- Giao diện dùng phông Segoe UI / Roboto / Arial (không chân) và Times New Roman cho tiêu đề; đều có đủ dấu tiếng Việt xếp chồng (ầ, ấ, ễ, ặ…). Trước đây dùng Georgia nên một số máy hiển thị sai dấu.
- Tên trên đầu nhân vật tự co theo khoảng cách camera để không chồng lên nhau, và ẩn khi ở quá xa.

## Nhân vật dạng mô hình 3D (.glb) - chibi cao cấp
Game đã có sẵn bộ nạp mô hình `.glb`. Chỉ cần bỏ file vào `assets/models/` là nhân vật chuyển từ khối hình học sang mô hình thật, không cần sửa code:
- `nam_tuxedo.glb` (nam), `nu_dress.glb` (nữ); tùy chọn `ca_si_nam.glb`, `ca_si_nu.glb` cho ca sĩ trên sân khấu (thiếu thì dùng mô hình nam/nữ thường).
- Quy ước: mặt nhìn về +Z, cao khoảng 1.6-2.0 đơn vị (khác thì chỉnh `scale` trong `MODEL_CFG` đầu khối "NHÂN VẬT 3D DẠNG MÔ HÌNH .GLB" trong `app.js`), chân tự được đặt xuống sàn.
- Animation: đặt tên clip có chứa `Idle`, `Walk`, `Sit`, `Wave`, `Clap`, `Drink`/`Sip`/`Cheer`, `Sing`. Game tự chọn clip theo hành động (đứng, đi, ngồi, vẫy tay, vỗ tay, nhấp trà) và chuyển mượt 0,25 giây. Thiếu clip thì dùng chuyển động đơn giản thay thế.
- Chất liệu tự chỉnh: độ nhám 0,4-0,6 (da 0,55, tóc 0,45) để không bóng như nhựa, kim loại tối đa 0,15, bật đổ bóng và bắt bóng.
- Ánh sáng dành cho nhân vật: đèn định hướng góc cao làm nổi nếp tóc và trang phục, đèn viền vàng ấm phía sau sân khấu tạo vệt sáng quanh tóc.
- Thiếu file hoặc tải lỗi: tự dùng nhân vật khối hình học như cũ (xem log trình duyệt). Nhân viên quầy và nghệ sĩ piano vẫn dùng nhân vật khối hình học.
- Chạy được bằng `<script>` thường (đã nạp GLTFLoader và SkeletonUtils bản three r128 từ jsDelivr), không cần Vite/Webpack. Nếu dự án bạn dùng bundler có thể đổi sang `import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'`.
- Hiệu năng: mỗi người là một bản sao có khung xương; mô hình nên dưới ~15.000 tam giác, texture tối đa 1024px, file vài MB để phòng 50 người vẫn mượt trên điện thoại.
- Nguồn mô hình: tự làm bằng Blender hoặc VRoid Studio (miễn phí), hoặc tìm mô hình có giấy phép cho dùng thương mại. Luôn kiểm tra giấy phép từng file trước khi đưa lên web công khai.

## Tóc nhân vật (phong cách hoạt hình theo ảnh mẫu)
- Tóc dùng vật liệu **cel shading**: mảng màu phẳng chia 4 bậc sáng tối, có **viền đen đậm** quanh tóc (và viền nâu quanh khuôn mặt) như hình vẽ tay. Mép tóc, chân tóc và gấu tóc được tô viền đen.
- **Nữ:** đỉnh đầu tròn bóng có **điểm sáng elip** màu xám (một lớn, một chấm nhỏ), mái vuốt ngang trán thành các lọn nhọn, hai lọn dài rủ hai bên má ngọn nhọn, tóc dài phía sau ngọn chia ba lọn nhọn và hơi hất ra ngoài, lớp tóc sau sẫm hơn lớp trước.
- **Nam:** tóc dựng gai nhọn ở đỉnh đầu, mái lởm chởm thành các lọn nhọn trước trán, lọn tóc hất ra ở thái dương và sau tai, lộ tai.
- 7 kiểu (nam rẽ ngôi/gai, cắt ngắn, vuốt ngược; nữ tóc dài, ngang vai, búi cao cài trâm, đuôi ngựa). Kiểu và màu chọn theo tên khách.

## Sân khấu
- Khung sân khấu mạ vàng: hai cột có rãnh, mũ cột, dầm mái kem viền vàng có huy hiệu tia nắng, diềm rèm nhung đỏ có tua vàng. Bục gỗ bóng có vòng huy hiệu vàng, thành bục bọc nhung họa tiết thoi vàng, bậc thang trải thảm đỏ, dải đèn LED viền bục và hàng đèn chân sân khấu.
- Rèm nhung xếp nếp hai bên, buộc dây vàng có tua. Rèm phông phía sau và một màn LED lớn viền vàng với màu và hạt sáng chuyển động chậm.
- Giàn đèn truss: 7 đèn moving head phía sau và 6 đèn PAR phía trước, chùm sáng quét và đổi màu liên tục; hai đèn rọi màu hồng và xanh hai bên.
- Dàn loa PA hai bên, 4 loa monitor, bộ trống, đàn guitar trên giá, amply, micro trên chân, đàn piano cánh với nghệ sĩ piano, hai bình hoa lớn trước sân khấu.

## Không gian kín 3 chiều
- Phòng được bao kín bốn phía: tường trước có cửa chính hai cánh và biển "XIN CHÀO", cửa sổ nhìn ra phố đêm, trần gỗ ô hộc có xà ngang mạ vàng. Đèn thả và đèn chùm treo từ trần.
- Camera luôn giữ khoảng cách tối thiểu khoảng 6 mét với nhân vật để không che tầm nhìn. Khi nhìn từ sau lưng, camera được lùi ra ngoài cửa chính (tường trước tự ẩn đi, bên ngoài có vỉa hè, đèn đường và bầu trời đêm) nên thấy trọn cả phòng. Khi đứng sát tường bên hoặc tường sau, camera nâng cao lên thay vì áp sát nhân vật.
- Kéo chuột (hoặc một ngón tay ở nửa phải màn hình) để xoay và nghiêng, cuộn chuột hoặc chụm hai ngón để zoom (gần nhất 4 mét, xa nhất 24 mét). Nghiêng thấp để nhìn ngang tầm mắt, nghiêng cao để nhìn tổng thể từ trên xuống.

## Ánh sáng
- Đèn thả trên từng bàn có chao men xanh viền đồng, lòng chao sáng, bóng đèn tự phát sáng và dây điện đen. Ánh đèn tạo quầng sáng nhiều lớp và vệt sáng ấm trên mặt bàn lẫn sàn nhà.
- Đèn chùm pha lê có 2 tầng tay đèn cong đỡ các bóng nến, chuỗi hạt và giọt pha lê lấp lánh nhấp nháy.
- Đèn tường kiểu cổ điển có chao thủy tinh mờ, rọi một vệt sáng lên và xuống tường. Kệ sau quầy có dải đèn LED vàng ấm, trên quầy có đèn bàn chao xanh.
- Sân khấu có giàn đèn với các đèn rọi phát chùm sáng xuống sân khấu, hàng đèn chân sân khấu có chóa. Nến trên bàn có ngọn thon, chập chờn.

## Cây cảnh
- Mỗi loài vẽ riêng: cọ nhiều thân với tàu lá xẻ lá chét, đa búp đỏ lá bầu dục lớn trên cành, monstera lá tim xẻ thùy trên cuống cong, lưỡi hổ lá dài có sọc. Lá có gân giữa, gân phụ, màu đậm nhạt từ gốc đến ngọn, mép lá cong và đầu lá rủ.
- Dây trầu bà rủ từ kệ sau quầy, hoa trên bàn có cánh và nhụy. Chậu đất nung có viền, đĩa lót và rêu.

## Không gian & âm thanh
- Phòng trà có tường ốp gỗ và giấy dán tường, thảm, rèm nhung sân khấu, đèn thả trên từng bàn, nến và hoa trên bàn phủ khăn, quầy bar, cây cảnh, tranh treo tường. Ghế có tựa lưng, khách ngồi gập gối tự nhiên, tay đặt lên bàn.
- Ly nước được đặt thật trên bàn trước chỗ ngồi (trà hoa cúc, oolong, cà phê dùng tách; mocktail dùng ly cao). Nước trong ly vơi dần khi bạn nhấp, trà nóng có khói bốc lên. Người khác cũng thấy ly của bạn và thấy bạn nhấc tay nhấp trà.
- Tiếng vỗ tay là đám đông vỗ từng cái riêng lẻ (đập lòng bàn tay, trộn trái phải, vang trong phòng, dâng lên rồi tắt dần; càng đông người càng dày). Đã bỏ tiếng đĩa than lách tách. Mỗi hành động có tiếng riêng: cụng ly (kèm tia sáng trên bàn), vỗ tay (đông người thì tiếng vỗ to hơn), tặng hoa, vẫy tay, thả tim, nhấp trà, chuông khi gọi nước, tiếng kéo ghế khi ngồi, bước chân khi đi, tin nhắn đến, có người vào phòng, hoàn thành nhiệm vụ, và tiếng vỗ tay khi đổi bài. Người khác làm cũng nghe nhưng nhỏ hơn.

## Nhiệm vụ
- Hằng ngày (5 nhiệm vụ, xong cả 5 được thưởng thêm) và 1 nhiệm vụ tuần. Xem ở nút 📜 Nhiệm vụ. Tiến độ lưu trên máy người chơi.

## Kiến trúc miễn phí
- **Web tĩnh**: Cloudflare Pages (hoặc GitHub Pages) - băng thông không giới hạn, không cần thẻ.
- **Realtime**: Firebase Realtime Database gói Spark (miễn phí, không cần thẻ).
- **Đăng nhập**: Firebase Auth (khách ẩn danh + admin bằng email/mật khẩu).
- **Nhạc**: để file mp3 trong thư mục `music/` cùng repo (hoặc dán link mp3 trực tiếp).

## Cài đặt (làm 1 lần)
1. Vào https://console.firebase.google.com > Add project (tắt Analytics cũng được).
2. **Build > Realtime Database > Create database**, chọn khu vực **Singapore (asia-southeast1)**, bắt đầu ở chế độ Locked.
3. Tab **Rules**: dán toàn bộ nội dung `database.rules.json` rồi Publish.
4. **Build > Authentication > Sign-in method**: bật **Anonymous** và **Email/Password**.
5. Tab **Users**: Add user (email + mật khẩu của admin). Copy **User UID** của tài khoản này.
6. Quay lại Realtime Database > Data: tạo nút `admins` > con có key là UID đó, giá trị `true`.
7. **Project settings > Your apps > Web (</>)**: lấy `firebaseConfig`, dán vào `firebase-config.js`.
8. Chạy thử trong WebStorm: chuột phải `index.html` > Open in > Browser.

## Đưa lên mạng
1. Đẩy thư mục này lên một repo GitHub.
2. Cloudflare Pages > Create project > Connect to Git > chọn repo (Framework: None, build command để trống, output directory: `/`).
3. Gắn domain: Pages > Custom domains.
4. Firebase > Authentication > Settings > **Authorized domains**: thêm domain của bạn.

## Thêm nhạc (admin)
1. Chép file mp3 vào `music/` (ví dụ `music/mua-chieu.mp3`), commit và push, chờ Cloudflare deploy xong.
2. Mở web > Lịch diễn > Đăng nhập admin > điền tên bài, ca sĩ, đường dẫn `music/mua-chieu.mp3` > Thêm.
3. Bấm vào bài để phát. Hết bài sẽ tự chuyển bài kế tiếp.
Chỉ dùng nhạc bạn có quyền phát (nhạc của chính ca sĩ, nhạc đã được cấp phép).

## Giới hạn khách vào phòng
- Phòng nhận tối đa **50 khách cùng lúc** (hằng số `MAX` đầu file `app.js`). Firebase Spark cho 100 kết nối, mình chừa 50 cho admin, kết nối nối lại và người mở nhiều tab (mỗi khách có thể mở nhiều tab). Đổi `MAX` nếu muốn, nhưng không nên vượt 100.
- Khách chỉ chiếm chỗ khi bấm "Bước vào phòng trà". Phòng đầy sẽ hiện thông báo và nút Thử lại; admin luôn vào được.
- Khách không thao tác 15 phút (`IDLE`) tự được mời ra để nhường chỗ.
- Giới hạn này kiểm tra ở trình duyệt nên người rành kỹ thuật có thể vượt qua; mức chặn cứng thật sự vẫn là 100 kết nối của Firebase.

## Giới hạn gói miễn phí cần biết
- Firebase Spark: tối đa **100 người kết nối cùng lúc**, 10 GB tải xuống/tháng, 1 GB lưu trữ.
  Trò chơi chỉ gửi vị trí khi người chơi bấm di chuyển nên tiết kiệm băng thông; với vài chục người online đều đặn vẫn có thể gần ngưỡng 10 GB/tháng.
- Cloudflare Pages: mỗi file tối đa 25 MB (mp3 nên nén dưới ~10 MB).
- Thư viện Three.js tải từ cdnjs (miễn phí). Cảnh 3D chạy tốt trên máy trung bình; nếu điện thoại yếu, giảm `setPixelRatio` trong `app.js`.
- Người chơi gian lận điểm Thư Thái: điểm tính ở máy khách, chỉ phù hợp bảng xếp hạng vui.

## Tài khoản người chơi, nhiệm vụ & lên cấp
- Màn hình vào phòng có 3 tab: **Khách** (như cũ), **Đăng nhập**, **Đăng ký** bằng tên đăng nhập (không dấu) hoặc email + mật khẩu (≥ 6 ký tự). Tên đăng nhập được đổi thành `tên@phongtra.app` nên không cần email thật.
- Tài khoản lưu tên, giới tính, màu, điểm Thư Thái và tiến độ nhiệm vụ lên Firebase (`users/<uid>`), đăng nhập ở máy khác vẫn còn. Đăng ký mới giữ lại tiến độ đang có trên máy. Đăng xuất ở bảng 📜 Nhiệm vụ.
- Cấp độ: lên Cấp N+1 khi đủ 50·N·(N+1) điểm (Cấp 2 = 100, Cấp 3 = 300, Cấp 4 = 600, Cấp 5 = 1000...; mỗi cấp cần nhiều hơn cấp trước 100 điểm), có thông báo khi lên cấp; thanh trên cùng hiện `⭐ Cấp · 🍃 điểm/mốc kế · danh hiệu`.
- Cần: Firebase > Authentication bật **Email/Password** (đã bật cho admin), và dán lại `database.rules.json` (có thêm nhánh `users`, trường `ck` cho điểm danh).
- Ánh sáng đã chuyển sang nắng ấm chiều tà (trời vàng cam, cửa sổ nắng, đèn nắng xiên).

## Điểm danh 7 ngày
- Nút **📅 Điểm danh** trên thanh nút (có chấm đỏ khi hôm nay chưa nhận). Vào phòng lần đầu trong ngày, bảng điểm danh tự mở sau vài giây.
- Bảng 7 ô, thưởng tăng dần: 10 · 15 · 20 · 25 · 30 · 40 · **100 (rương lớn, ngày 7)**. Nhận xong ngày 7 thì quay về Ngày 1. Sửa mảng `CK` trong `app.js`.
- Bỏ lỡ một ngày thì chuỗi quay về Ngày 1. Điểm danh không còn tự cộng điểm khi vào phòng, người chơi phải bấm **Nhận quà**.
- Tài khoản đã đăng ký: tiến độ lưu ở `users/<uid>/ck`. Khách: chỉ lưu trên máy (xóa dữ liệu trình duyệt sẽ mất). Ngày tính theo giờ máy người chơi nên chỉ phù hợp game vui.

## Cơ chế lên cấp
- Thanh kinh nghiệm dưới điểm Thư Thái, nút ⭐ **Cấp & quà** xem danh sách quà và tiến độ.
- Lên cấp có màn hình chúc mừng, pháo giấy và âm thanh; liệt kê quà vừa mở.
- Quà: Cấp 2 biển tên hiện số cấp trên đầu; Cấp 3/5/8/12 mở biểu cảm 😍 🎉 🌸 👑 trên thanh nút; Cấp 5/10/15 thưởng thêm +10% / +20% / +30% mọi điểm nhận được.
- Sửa bảng quà ở mảng `REW` và hàm `lvBonus` trong `app.js`.

## Chỉnh ánh sáng
- Trong `app.js`, tìm khối `const LIGHT = {...}`: `glow` và `beam` là độ đục của quầng sáng, vệt sáng và chùm đèn sân khấu (1 = rất chói, 0.55 = mặc định hiện tại), `amb`, `hemi`, `key`, `spot`... là độ mạnh từng đèn.
- Trong `index.html`, khối `#warm` là lớp lọc màu ấm phủ lên cảnh 3D. Muốn bớt ám cam thì đổi các màu `rgb(...)` gần về `rgb(255, 255, 255)`; muốn xóa hẳn thì xóa dòng `<div id="warm"></div>`.

## Tóc nhân vật
- Tóc phía sau ôm theo hình đầu, thu dần vào gáy rồi rủ xuống, gấu nằm ngang đều quanh lưng đầu (hàm `shellHem` trong `app.js`), có một hàng lọn nhọn đều nhau cùng kiểu mái trước. Tóc luôn cách da đầu một khe nhỏ đều (0.015) nên không bị chui vào đầu.
- Muốn tóc sau trơn không lọn: trong `buildHair` đặt `BACK_TIPS = false`. Muốn tóc dài ngắn hơn: giảm số `.3` ở dòng `fArgs`.

## Tư thế ngồi
- Người ngồi dịch lên trước `SIT_FWD` (0.16) so với tâm ghế để lưng, đầu và tóc không chạm tựa ghế, cẳng chân thõng khỏi mép ghế. Đùi nằm ngang, mặt dưới đùi chạm mặt ghế (tính theo bề dày đùi từng kiểu trang phục).
- Váy xòe được dựng sẵn thêm hai bản "buông" (hàm `sitSkirt`): bản cho ghế tựa/sofa và bản cho ghế cao. Khi ngồi, tà váy phủ lên đùi, nằm trên mặt ghế, phần thừa rủ xuống hai bên và trước đầu gối, nên không đâm vào đệm ghế.
- Tay tự đặt lên đùi (góc tính theo độ dài tay và bề dày đùi). Ngồi ghế cao ở quầy bar thì tay vẫn đặt lên mặt quầy.

## Phong cách Luxury (navy, đen, vàng gold, nâu gỗ)
- Tường bọc nhung navy họa tiết kim cương, ốp chân tường gỗ óc chó, phào chỉ vàng gold. Sàn gỗ óc chó tối, bóng. Trần đen với ô hộc navy viền vàng.
- Đồ nội thất: ghế khung vàng gold, đệm nhung navy; sofa navy, đen than, da bò; bàn phụ mặt navy viền vàng; quầy bar mặt đá đen; rèm cửa và rèm sân khấu nhung navy; thảm navy viền vàng; phông LED xanh navy với hạt sáng vàng.
- Ánh sáng ấm kiểu đèn vàng, đèn sân khấu xen kẽ vàng gold và xanh hoàng gia. Chỉnh độ sáng trong khối `LIGHT` ở `app.js`; chỉnh lớp lọc màu ở khối `#warm` trong `index.html`.
- Giao diện (nút, bảng, thông báo) cũng đổi sang navy với viền và nút nhấn màu vàng gold.

## Kết bạn làm quen
- Nút **👥 Bạn bè** có 3 tab: **💛 Bạn bè** (xem ai đang online 🟢, bấm để đi tới chỗ bạn, 🗑 hủy kết bạn), **💌 Lời mời** (✅ chấp nhận / ✖ từ chối) và **✨ Làm quen** (người đang trong phòng, gần bạn nhất ở trên, bấm ➕ để gửi lời mời).
- Bấm vào nhân vật của người khác trong phòng để mở hồ sơ: **👋 Chào làm quen** (vẫy tay + chào trong khung chat), **🚶 Đến gần**, **➕ Kết bạn**.
- Có lời mời mới sẽ hiện thông báo và chấm đỏ 🔴 trên nút; bạn bè vào phòng cũng có thông báo, tên bạn bè trên đầu nhân vật có thêm 💛.
- Chỉ **tài khoản đã đăng ký** mới kết bạn được (khách ẩn danh mỗi lần vào có thể đổi uid nên không lưu bạn).
- Dữ liệu: `friends/<uid>/<uid bạn>` và `friendReq/<uid nhận>/<uid gửi>`; người chơi có thêm trường `r` (1 = đã đăng ký). **Bắt buộc dán lại `database.rules.json`** vào Firebase > Realtime Database > Rules rồi Publish.

## Cá nhân hóa theo cấp (nút 🎨 Cá nhân hóa)
- **Màu tên**: Ngọc bích (Cấp 4), Hồng sen (7), Vàng kim (10), Tím hoàng gia (14).
- **Huy hiệu cạnh tên**: 🍃 (Cấp 2), 🌸 (5), ⭐ (8), 👑 (12), 🌟 (16).
- **Hiệu ứng khi biểu cảm**: ✨ lấp lánh (Cấp 6), 🌸 cánh hoa (9), 💫 sao băng (13). Mọi người trong phòng đều thấy.
- **Sofa VIP** (20 chỗ sát sân khấu) chỉ dành cho Cấp 5 trở lên (admin vào được).
- Lựa chọn lưu ở trường `z` ("màu.huyHiệu.hiệuỨng"), đồng bộ lên tài khoản. Sửa bảng ở các mảng `ZN`, `ZB`, `ZE`, `REW` trong `app.js`.

## Tặng quà cho bạn bè
- Bấm 🎁 cạnh bạn trong tab Bạn bè (hoặc trong hồ sơ nhân vật). Quà: 🌹 Hoa hồng (Cấp 1, bạn nhận +5), 🍵 Tách trà (Cấp 2, +8), 🍰 Bánh ngọt (Cấp 4, +12), 💎 Kim cương (Cấp 8, +25). Người tặng nhận +2 🍃 mỗi quà.
- Tối đa **5 quà/ngày** (`GF_DAY`), chỉ tặng được cho bạn bè. Bạn đang offline vẫn nhận được, quà tự cộng điểm khi họ vào phòng.
- Mỗi lần tặng có một dòng thông báo trong khung chat chung. Sửa bảng quà ở mảng `GF`.
- Giới hạn 5 quà/ngày kiểm tra ở máy người chơi nên chỉ phù hợp game vui.
- **Dán lại `database.rules.json`** (có thêm nhánh `gifts` và trường `z`).

## Cửa hàng vật phẩm & ủng hộ (kiếm tiền)
- Nút **🛍 Cửa hàng**: 8 vật phẩm thẩm mỹ bán bằng tiền (màu tên Xanh dạ quang / Đỏ ruby / Cầu vồng, huy hiệu 🦋 🐉, hiệu ứng bướm / trái tim / ngọn lửa). Chỉ là đồ trang trí, không ảnh hưởng điểm hay cấp. Mua xong dùng ở 🎨 Cá nhân hóa.
- Nút **💝 Ủng hộ**: chọn mức 10k / 20k / 50k / 100k hoặc nhập số khác; người ủng hộ nhận huy hiệu 🏅 Mạnh thường quân và được ghi tên trong **Bảng tri ân**.
- Cần tài khoản đã đăng ký (khách không mua / ủng hộ được).

### Cách thanh toán (không cần máy chủ, không phát sinh phí Firebase)
1. Người chơi bấm Mua / Ủng hộ, game tạo **đơn** có mã (ví dụ `PTK7M2QA`) và hiện **mã QR VietQR** đã điền sẵn số tiền + nội dung chuyển khoản.
2. Người chơi chuyển khoản. Admin thấy nút **🧾 Đơn hàng** (chấm đỏ khi có đơn chờ), đối chiếu số tiền và mã trong app ngân hàng rồi bấm ✅ để xác nhận. Vật phẩm tự mở và người chơi nhận thông báo.
3. Chỉ admin ghi được quyền sở hữu (`owned/<uid>`), người chơi không tự mở khóa được bằng cách sửa code trên máy.

### Cài đặt
- Điền thông tin nhận tiền vào **`shop-config.js`** (`bank`, `acc`, `name`; mã ngân hàng tra tại vietqr.io). Chỉnh giá ở `prices`, xóa dòng nào để ngừng bán món đó.
- **Dán lại `database.rules.json`** (có thêm nhánh `orders`, `owned`, `donors`).
- Khi lượng đơn nhiều, có thể nâng cấp xác nhận tự động bằng webhook của SePay / PayOS (cần Cloud Functions, gói Firebase Blaze).

### Lưu ý
- Nhạc phát trong game phải có bản quyền khi đã thu tiền. Việc bán hàng online thường cần đăng ký kinh doanh và kê khai thuế; hãy hỏi người có chuyên môn.
- Hãy ghi rõ cho người chơi chính sách hoàn tiền (vật phẩm số thường không hoàn).
- Màu tên / huy hiệu / hiệu ứng người khác nhìn thấy dựa vào trường `z` do máy người chơi gửi, nên người rành kỹ thuật có thể tự hiển thị vật phẩm chưa mua cho người khác thấy. Đây chỉ là hiển thị, không ảnh hưởng doanh thu của bạn nhiều.

## Trần doanh thu theo năm (tự tạm nghỉ, năm sau tự mở lại)
- `yearCap` trong `shop-config.js` (mặc định **900 triệu đồng/năm dương lịch**, tính theo giờ Việt Nam). Mỗi lần admin bấm ✅ xác nhận đơn, số tiền được cộng vào `revenue/<năm>`.
- Khi tổng đạt trần, game tự ghi `shop/closedUntil` = 00:00 ngày 1/1 năm sau. Cửa hàng và ủng hộ hiện thông báo "tạm nghỉ", không tạo được đơn mới (chặn cả ở rules Firebase, không chỉ ở giao diện). Đến 1/1 tự mở lại, không cần làm gì.
- Bảng 🧾 Đơn hàng của admin hiện doanh thu năm nay so với trần (vàng khi đạt 90%), có nút 🔒 Tạm nghỉ / 🔓 Mở lại thủ công.
- Giới hạn: chỉ tính các đơn đã xác nhận trong game. Tiền chuyển thẳng vào tài khoản ngoài game, và đơn đã tạo trước khi đóng nhưng xác nhận sau, vẫn có thể làm tổng vượt nhẹ 900 triệu (mức trần để chừa dư địa so với ngưỡng 1 tỷ). **Dán lại `database.rules.json`.**

## Giới hạn mỗi lần chuyển (10 triệu)
- `maxTx` trong `shop-config.js` (mặc định 10.000.000đ): game không tạo đơn lớn hơn mức này (giao diện và cả rules Firebase, nhánh `orders/.../a`). Giá vật phẩm và các mức ủng hộ đều nhỏ hơn nhiều.
- Game **không chặn được** việc người chơi tự sửa số tiền trong app ngân hàng. Nếu thực nhận khác số tiền của đơn, đừng bấm ✅ mà hoàn tiền lại. Hộp thoại xác nhận có nhắc điều này. **Dán lại `database.rules.json`.**

## Thanh toán payOS (thay cho QR VietQR + admin bấm ✅)
Mục "Cách thanh toán" và "Cài đặt" ở phần Cửa hàng phía trên là cách cũ. Bản hiện tại dùng **payOS + Cloudflare Worker** (thư mục `worker/`):
- Game gọi Worker `/create`, Worker kiểm đăng nhập, **tự tính số tiền** (giá vật phẩm nằm trong `PRICES` của Worker; ủng hộ phải trong khoảng `MIN_DONATE`–`MAX_TX`), kiểm trần năm rồi tạo link payOS với số tiền cố định. Người chơi không sửa được số tiền.
- Khi tiền về, payOS gọi `/webhook`. Worker kiểm chữ ký, kiểm đúng số tiền của đơn, rồi tự mở vật phẩm / ghi bảng tri ân, cộng `revenue/<năm>` và tự đóng cửa hàng khi chạm `YEAR_CAP`. Số tiền không khớp thì không mở vật phẩm (ghi vào `payorders/<mã>/bad` để bạn hoàn tiền).
- Vẫn còn nút ✅ của admin như phương án dự phòng khi webhook lỗi; nếu webhook đến sau đó thì Worker không cộng trùng doanh thu.

### Cài đặt (làm 1 lần)
1. Firebase > Project settings > **Service accounts** > Generate new private key (tải file JSON, giữ kín, không đưa lên GitHub).
2. Dán lại `database.rules.json` vào Realtime Database > Rules rồi Publish (đóng việc người chơi tự tạo đơn, thêm nhánh `payorders` chỉ Worker truy cập được).
3. Cài Wrangler rồi deploy Worker:
   ```
   cd worker
   npx wrangler login
   # sửa SITE_URL và ALLOWED_ORIGINS trong wrangler.toml thành địa chỉ web của bạn
   npx wrangler secret put PAYOS_CLIENT_ID
   npx wrangler secret put PAYOS_API_KEY
   npx wrangler secret put PAYOS_CHECKSUM_KEY
   npx wrangler secret put FIREBASE_SA      # dán toàn bộ nội dung file JSON ở bước 1
   npx wrangler deploy
   ```
   Lệnh cuối in ra địa chỉ dạng `https://phongtra-pay.<tên>.workers.dev`.
4. Dán địa chỉ đó vào `api` trong `shop-config.js`.
5. Trong payOS (kênh thanh toán), đặt **Webhook URL** = `https://phongtra-pay.<tên>.workers.dev/webhook` rồi bấm xác nhận/kiểm tra.
6. Thử bằng một đơn nhỏ (ví dụ ủng hộ 5.000đ) và xem vật phẩm/huy hiệu tự mở.

### Giới hạn cần biết
- Trần năm được chặn lúc **tạo đơn** (doanh thu đã nhận + số tiền đơn mới không được vượt trần) và đóng hẳn khi webhook làm tổng chạm trần. Các đơn đã tạo trước đó (link sống tối đa 15 phút) vẫn có thể thanh toán, nên tổng có thể vượt trần một chút.
- Hủy đơn trong game chỉ ẩn đơn; nếu người chơi vẫn trả tiền qua link cũ thì Worker vẫn mở vật phẩm cho họ.
- Giữ `PRICES` (Worker) khớp `prices` (shop-config.js), `YEAR_CAP`/`MAX_TX` khớp `yearCap`/`maxTx`.

## Xin bài & bình chọn (nút 🎶 Xin bài & bình chọn)
- Mỗi người một phiếu cho một bài trong danh sách phát đang nghe; bấm lại bài đó để rút phiếu, bấm bài khác để đổi phiếu. Chỉ tính phiếu của người đang ở cùng danh sách phát, phiếu quá 20 phút thì bỏ.
- **Mạnh thường quân** (có tên trong `donors`, tức đã ủng hộ qua payOS) được tính **phiếu x2**. Rules Firebase chỉ cho ghi `w = 2` khi `donors/<uid>` tồn tại, nên không tự nâng phiếu bằng cách sửa code trên máy.
- Trong **15 giây cuối** của bài đang phát, máy người chơi tự chốt bài nhiều phiếu nhất (không tính bài đang phát). Ai ghi trước thì thắng (`picks/<phòng>/<giờ hết bài>` chỉ ghi được một lần), cả phòng nhận thông báo "Bài kế tiếp do cả phòng chọn". Không có phiếu nào thì vòng phát chạy như cũ.
- Bài được chèn làm vòng phát tạm dừng trong lúc nó chạy rồi tiếp tục đúng chỗ (trường `cum` trong `picks`), nên bài vẫn chạy đồng bộ cho mọi người. Admin bấm phát bài thủ công vẫn được ưu tiên như trước.
- Người có phiếu thắng nhận **+5 🍃**. Sửa trong `watchReq` (`addScore(5)`), thời gian chốt ở `VOTE_CLOSE_MS`, hạn phiếu ở `VOTE_TTL`.
- Nút cũ "nhắn tên bài cho ca sĩ" vẫn còn ở cuối bảng bình chọn.
- Chốt bài chạy ở máy khách (không có máy chủ) nên người rành kỹ thuật có thể ghi một bài bất kỳ có trong `tracks`; chỉ phù hợp game vui. **Bắt buộc dán lại `database.rules.json`** (có thêm nhánh `requests` và `picks`).

## Lên cấp chậm vừa phải & Kỹ năng
- Điểm lặp lại (nhấp trà, gọi nước, vỗ tay/tặng hoa) giới hạn **60 điểm/ngày**, điểm nhận từ quà bạn bè giới hạn **50 điểm/ngày** (hằng số `CAP` trong `app.js`). Nhiệm vụ, điểm danh, bình chọn bài không tính vào mức này. Ước tính: Cấp 2 trong ngày đầu, Cấp 5 sau khoảng 1 tuần, Cấp 10 khoảng 1 tháng, Cấp 16 khoảng 3 tháng nếu chơi đều.
- Nút **✨ Kỹ năng** (mảng `SKL`): Chuông gió (Cấp 3), Mưa hoa (5), Pháo hoa sân khấu (8), Tỏa sáng (12), Thả đèn lồng (16). Kỹ năng chỉ tạo hiệu ứng, có thời gian hồi, không cho điểm. Ly trà đầy hơn: Cấp 4 uống 6 ngụm, Cấp 10 uống 7 ngụm.
- Điểm và mức giới hạn trong ngày nằm ở trình duyệt (và đồng bộ tài khoản qua trường `ms`), người biết sửa localStorage vẫn có thể gian lận. Muốn chặt hơn cần tính điểm ở server.

## Dịch vụ trả phí (💎 Dịch vụ VIP)
Giá nằm ở `SVC` trong `worker/payos-worker.js` (máy chủ quyết định giá thật) và `SHOP.svc` trong `shop-config.js` (chỉ để hiển thị), hai nơi phải khớp.
- **👑 Thẻ VIP** 49.000đ/30 ngày, cộng dồn khi gia hạn, tối đa còn 90 ngày. Lưu ở `vip/<uid>/e`. Quyền lợi: biển tên viền vàng, MC chào khi vào phòng, ngồi sofa sát sân khấu không cần Cấp 5, giá ưu đãi cho Loa và Bàn riêng.
- **📢 Loa phòng trà** 10.000đ (VIP 8.000đ), tối đa 80 ký tự. Worker ghi vào `annp/<uid>/<mã đơn>` chờ duyệt. Admin bấm **📢 Duyệt loa** để Duyệt, Sửa hoặc Từ chối. Khi duyệt, nội dung chuyển sang `ann/` và lần lượt hiện 25 giây trên màn LED, khung thông báo và khung chat khi có người trong phòng.
- **🍾 Bàn riêng** 15.000đ bàn thường, 25.000đ bàn sofa (VIP 10.000đ / 18.000đ), giữ 2 giờ. Worker kiểm tra bàn còn trống và giữ chỗ 12 phút trong lúc thanh toán (`tblhold`). Dữ liệu ở `tbl/t<số>`, chủ bàn mời tối đa 8 người. Việc chặn ghế chỉ làm ở giao diện, người sửa mã trình duyệt vẫn có thể ngồi.
- Hoàn tiền (loa bị từ chối, bàn trùng) làm thủ công qua payOS. Admin xem và hủy bàn, xem danh sách VIP trong **📢 Duyệt loa**.
- Khi nâng cấp cần: dán lại `database.rules.json`, deploy lại worker, đưa `app.js`, `index.html`, `guide.js`, `shop-config.js` lên hosting.
