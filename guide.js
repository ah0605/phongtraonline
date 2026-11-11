// Hướng dẫn chơi: tự hiện ở lần truy cập đầu tiên (trước màn hình vào phòng), mở lại bằng nút 📖 ở màn hình vào phòng hoặc trong phòng.
(function () {
  const KEY = 'sg_guide_v1';
  const price = (typeof SHOP !== 'undefined' && SHOP.dedPrice ? SHOP.dedPrice : 20000).toLocaleString('vi-VN') + 'đ';
  const STEPS = [
    {
      ic: '🏮', t: 'Chào mừng đến S.Glow',
      p: ['Phòng trà online dùng chung: mọi người đang online cùng thấy nhau đi lại, ngồi bàn, trò chuyện và nghe nhạc live đồng bộ cùng một lúc.',
        'Phòng chứa tối đa 50 khách. Bạn có thể vào bằng tên khách ngay, hoặc đăng ký tài khoản để lưu điểm, nhiệm vụ và cấp độ.']
    },
    {
      ic: '🚶', t: 'Di chuyển và xoay camera',
      p: ['Máy tính: bấm vào sàn để nhân vật tự đi tới, hoặc dùng phím WASD / mũi tên. Kéo chuột để xoay, cuộn chuột để zoom.',
        'Điện thoại: chạm sàn để đi, giữ ngón tay ở nửa trái màn hình để hiện joystick, kéo nửa phải để xoay, chụm hai ngón để zoom.',
        'Nhấn Enter để chat với mọi người trong phòng.']
    },
    {
      ic: '☕', t: 'Ngồi, gọi nước, nhấp trà',
      p: ['Bấm 🪑 Ngồi / Đứng khi đứng gần một ghế để ngồi xuống thưởng thức chương trình.',
        'Bấm vào nhân viên ở quầy hoặc nút 📋 Gọi nước để chọn đồ uống, sau đó bấm ☕ Nhấp trà (hoặc phím E) để nhấp một ngụm.',
        'Dùng các nút 👋 Vẫy tay, 🥂 Nâng ly, ❤️ để chào hỏi. Lên cấp sẽ mở thêm nhiều biểu cảm mới.']
    },
    {
      ic: '🎤', t: 'Nghe nhạc và tương tác sân khấu',
      p: ['Ca sĩ biểu diễn theo 🗓 Lịch diễn, mọi người nghe cùng một bài cùng một lúc. Bấm 👏 Vỗ tay hoặc 💐 Tặng hoa để cổ vũ.',
        '🎶 Xin bài & bình chọn: chọn bài bạn muốn nghe, bài được nhiều người chọn sẽ được chèn vào sau bài đang hát.',
        '💌 Tặng bài hát (' + price + '/bài): chọn bài có sẵn hoặc đặt bài trước ít nhất 2 ngày, kèm lời nhắn cho người thân. Khi bài phát, tên người nhận và lời nhắn hiện trên màn LED và được MC đọc lên.']
    },
    {
      ic: '⭐', t: 'Điểm, nhiệm vụ và cấp độ',
      p: ['Làm 📜 Nhiệm vụ và 📅 Điểm danh mỗi ngày để nhận điểm Thư Thái. Nhấp trà, gọi nước và cổ vũ ca sĩ cũng có điểm nhưng giới hạn mỗi ngày, nên lên cấp là hành trình dài, hãy ghé đều mỗi ngày.',
        'Lên cấp ⭐ để mở biểu cảm, quà, vật phẩm và ✨ Kỹ năng mới (chuông gió, mưa hoa, pháo hoa sân khấu...). Kỹ năng tạo hiệu ứng cho cả phòng và có thời gian hồi. Xem thứ hạng ở 🏆 Xếp hạng.',
        'Hãy đăng ký tài khoản để điểm và nhiệm vụ không bị mất khi đổi máy.']
    },
    {
      ic: '🎨', t: 'Kết bạn và cá nhân hóa',
      p: ['👥 Bạn bè: kết bạn và gửi quà cho nhau. 🎨 Cá nhân hóa và 🛍 Cửa hàng giúp nhân vật của bạn nổi bật hơn.',
        '🌧 Bật mưa và 🎚 Âm thanh giúp bạn chỉnh không khí phòng theo ý thích. 💝 Ủng hộ để góp phần duy trì phòng trà.',
        'Lưu ý: không hoạt động 15 phút bạn sẽ được mời ra để nhường chỗ cho người khác. Chúc bạn có những phút giây thư thái!']
    }
  ];
  let i = 0;
  let root = null;
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) {
      e.className = cls;
    }
    if (txt != null) {
      e.textContent = txt;
    }
    return e;
  };
  const seen = () => {
    try {
      localStorage.setItem(KEY, '1');
    }
    catch (err) {
      // trình duyệt chặn lưu trữ thì lần sau sẽ hiện lại, không sao
    }
  };
  function close() {
    if (!root) {
      return;
    }
    root.remove();
    root = null;
    document.removeEventListener('keydown', onKey);
    seen();
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      close();
    }
    else if (e.key === 'ArrowRight') {
      go(1);
    }
    else if (e.key === 'ArrowLeft') {
      go(-1);
    }
  }
  function go(d) {
    const n = i + d;
    if (n < 0) {
      return;
    }
    if (n >= STEPS.length) {
      return close();
    }
    i = n;
    render();
  }
  function render() {
    const s = STEPS[i];
    const box = root.querySelector('.gbox');
    box.textContent = '';
    const dots = el('div', 'gdots');
    STEPS.forEach((x, k) => {
      const d = el('i', k === i ? 'on' : '');
      d.addEventListener('click', () => {
        i = k;
        render();
      });
      dots.appendChild(d);
    });
    const body = el('div', 'gbody');
    s.p.forEach(t => body.appendChild(el('p', '', t)));
    const nav = el('div', 'gnav');
    const prev = el('button', '', '‹ Trước');
    prev.disabled = i === 0;
    prev.addEventListener('click', () => go(-1));
    const next = el('button', 'gnext', i === STEPS.length - 1 ? 'Bắt đầu chơi' : 'Tiếp ›');
    next.addEventListener('click', () => go(1));
    nav.append(prev, next);
    const skip = el('button', 'gskip', 'Bỏ qua');
    skip.addEventListener('click', close);
    box.append(
      el('div', 'gic', s.ic),
      el('h2', '', s.t),
      el('div', 'gcount', 'Bước ' + (i + 1) + '/' + STEPS.length),
      body, dots, nav, skip
    );
  }
  function open() {
    if (root) {
      return;
    }
    i = 0;
    root = el('div', '');
    root.id = 'guide';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Hướng dẫn chơi');
    root.appendChild(el('div', 'gbox'));
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey);
    render();
  }
  window.openGuide = open;
  const gb = document.getElementById('gdb');
  if (gb) {
    gb.addEventListener('click', open);
  }
  let first = true;
  try {
    first = !localStorage.getItem(KEY);
  }
  catch (err) {
    first = true;
  }
  if (first) {
    open();
  }
})();
