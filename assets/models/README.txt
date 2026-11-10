Đặt file mô hình nhân vật vào thư mục này:

  nam_tuxedo.glb   nhân vật nam (bắt buộc nếu muốn dùng mô hình thật cho nam)
  nu_dress.glb     nhân vật nữ  (bắt buộc nếu muốn dùng mô hình thật cho nữ)
  ca_si_nam.glb    (tùy chọn) ca sĩ nam trên sân khấu
  ca_si_nu.glb     (tùy chọn) ca sĩ nữ trên sân khấu

Yêu cầu: mặt nhìn về +Z, cao khoảng 1.6-2.0 đơn vị (hoặc chỉnh `scale` trong MODEL_CFG ở app.js),
nên dưới khoảng 30.000 tam giác và dưới vài MB mỗi file để phòng 50 người vẫn chạy mượt trên điện thoại.
Animation (nếu có): đặt tên clip chứa Idle, Walk, Sit, Wave, Clap, Drink (hoặc Sip/Cheer), Sing.
Thiếu file thì game tự dùng nhân vật dựng bằng khối hình học.
