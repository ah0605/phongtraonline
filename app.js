(() => {
  const $ = id => document.getElementById(id);
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.database();
  const MAX = 50;
  const IDLE = 15 * 60 * 1000;
  let amAdmin = false;
  db.goOffline();
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const W = 1600;
  const H = 1000;
  const SPD = 150;
  const TOP = 260;
  const TABLES = [];
  const SEATS = [];
  const SOFAS = [];
  const CHAIRS = [];
  const FACE = Math.PI;
  [380, 620, 940, 1180, 1420].forEach((cx, gi) => {
    const t = TABLES.push({
      x: cx, y: 400, r: .6
    }) - 1;
    const OX = [-.34, -.14, .14, .34];
    let k = 0;
    [-55, 55].forEach(sx => {
      SOFAS.push({
        x: cx + sx, y: 400, g: gi
      });
      [-18, 18].forEach(d => SEATS.push({
        x: cx + sx + d, y: 400, t, face: FACE, sh: .58, ox: OX[k++], oz: .2
      }));
    });
  });
  [570, 720, 870].forEach(y => [440, 640, 910, 1110, 1310].forEach(cx => {
    const t = TABLES.push({
      x: cx, y, r: .42
    }) - 1;
    [-42, 42].forEach(d => {
      CHAIRS.push({ x: cx + d, y });
      SEATS.push({
        x: cx + d, y, t, face: FACE, sh: .47, ox: d < 0 ? -.2 : .2, oz: .1
      });
    });
  }));
  for (let i = 0; i < 6; i++) {
    SEATS.push({
      x: 184, y: 450 + 80 * i, stool: 1, face: -Math.PI / 2, sh: .75
    });
  }
  const PLANTS = [
    [430, 285], [1170, 285], [1565, 290], [42, 290], [42, 970], [1560, 975]
  ];
  const STANDS = [[592, 276], [1008, 276]];
  const OBS = [{
      x1: 40, y1: 350, x2: 175, y2: 905
    }];
  TABLES.forEach(t => OBS.push({
    x: t.x, y: t.y, r: t.r * 40 + 20
  }));
  SOFAS.forEach(f => OBS.push({
    x1: f.x - 40, y1: f.y - 24, x2: f.x + 40, y2: f.y + 28
  }));
  SEATS.forEach(s => OBS.push({
    x: s.x, y: s.y, r: s.stool ? 26 : 24
  }));
  PLANTS.forEach(p => OBS.push({
    x: p[0], y: p[1], r: 40
  }));
  STANDS.forEach(p => OBS.push({
    x: p[0], y: p[1], r: 34
  }));
  const CELL = 20;
  const GW = W / CELL;
  const GH = H / CELL;
  const solid = (px, py) => {
    if (px < 24 || px > W - 24 || py < TOP || py > H - 14) {
      return true;
    }
    for (let i = 0; i < OBS.length; i++) {
      const o = OBS[i];
      if (o.r) {
        if (Math.hypot(px - o.x, py - o.y) < o.r) {
          return true;
        }
      }
      else if (px > o.x1 && px < o.x2 && py > o.y1 && py < o.y2) {
        return true;
      }
    }
    return false;
  };
  const GRID = new Uint8Array(GW * GH);
  for (let cy = 0; cy < GH; cy++) {
    for (let cx = 0; cx < GW; cx++) {
      GRID[cy * GW + cx] = solid(cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
    }
  }
  const seatAt = (x, y) => SEATS.find(s => Math.abs(s.x - x) < 4 && Math.abs(s.y - y) < 4);
  const nearSeat = (x, y) => {
    let b = null;
    let bd = 30;
    SEATS.forEach(s => {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) {
        bd = d;
        b = s;
      }
    });
    return b;
  };
  function nearestFree(x, y) {
    const cx = Math.min(GW - 1, Math.max(0, Math.floor(x / CELL)));
    const cy = Math.min(GH - 1, Math.max(0, Math.floor(y / CELL)));
    if (!GRID[cy * GW + cx]) {
      return [x, y];
    }
    let best = null;
    let bd = 1e9;
    for (let r = 1; r <= 12 && !best; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r
            || nx < 0
            || ny < 0
            || nx >= GW
            || ny >= GH
            || GRID[ny * GW + nx]) {
            continue;
          }
          const px = nx * CELL + CELL / 2;
          const py = ny * CELL + CELL / 2;
          const d = Math.hypot(px - x, py - y);
          if (d < bd) {
            bd = d;
            best = [px, py];
          }
        }
      }
    }
    return best || [x, y];
  }
  function findPath(sx, sy, gx, gy, az) {
    const inAz = (px, py) => az.some(a => Math.hypot(px - a.x, py - a.y) < 34);
    const free = (cx, cy) => cx >= 0
      && cy >= 0
      && cx < GW
      && cy < GH
      && (!GRID[cy * GW + cx] || inAz(cx * CELL + CELL / 2, cy * CELL + CELL / 2));
    const okp = (px, py) => free(Math.floor(px / CELL), Math.floor(py / CELL));
    const cl = (v, m) => Math.min(m - 1, Math.max(0, v));
    const s0 = cl(Math.floor(sy / CELL), GH) * GW + cl(Math.floor(sx / CELL), GW);
    const g0 = cl(Math.floor(gy / CELL), GH) * GW + cl(Math.floor(gx / CELL), GW);
    const N = GW * GH;
    const gs = new Float32Array(N).fill(1e9);
    const par = new Int32Array(N).fill(-1);
    const done = new Uint8Array(N);
    const heap = [];
    const push = (f, i) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) {
          break;
        }
        const t = heap[p];
        heap[p] = heap[k];
        heap[k] = t;
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const a = 2 * k + 1;
          const b = a + 1;
          let m = k;
          if (a < heap.length && heap[a][0] < heap[m][0]) {
            m = a;
          }
          if (b < heap.length && heap[b][0] < heap[m][0]) {
            m = b;
          }
          if (m === k) {
            break;
          }
          const t = heap[m];
          heap[m] = heap[k];
          heap[k] = t;
          k = m;
        }
      }
      return top;
    };
    const gx0 = g0 % GW;
    const gy0 = (g0 / GW) | 0;
    const hh = (x, y) => {
      const dx = Math.abs(x - gx0);
      const dy = Math.abs(y - gy0);
      return Math.max(dx, dy) + .414 * Math.min(dx, dy);
    };
    gs[s0] = 0;
    push(hh(s0 % GW, (s0 / GW) | 0), s0);
    let found = false;
    while (heap.length) {
      const i = pop()[1];
      if (done[i]) {
        continue;
      }
      done[i] = 1;
      if (i === g0) {
        found = true;
        break;
      }
      const cx = i % GW;
      const cy = (i / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) {
            continue;
          }
          const nx = cx + dx;
          const ny = cy + dy;
          if (!free(nx, ny)) {
            continue;
          }
          if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) {
            continue;
          }
          const ni = ny * GW + nx;
          const ng = gs[i] + (dx && dy ? 1.414 : 1);
          if (ng < gs[ni]) {
            gs[ni] = ng;
            par[ni] = i;
            push(ng + hh(nx, ny), ni);
          }
        }
      }
    }
    if (!found) {
      return [{ x: gx, y: gy }];
    }
    const cells = [];
    for (let i = g0; i !== -1; i = par[i]) {
      cells.push({ x: (i % GW) * CELL + CELL / 2, y: ((i / GW) | 0) * CELL + CELL / 2 });
    }
    cells.reverse();
    cells[0] = { x: sx, y: sy };
    cells[cells.length - 1] = { x: gx, y: gy };
    const los = (a, b) => {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.ceil(d / 8);
      for (let k = 1; k < n; k++) {
        if (!okp(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)) {
          return false;
        }
      }
      return true;
    };
    const out = [];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !los(cells[i], cells[j])) {
        j--;
      }
      out.push(cells[j]);
      i = j;
    }
    if (!out.length) {
      out.push({ x: gx, y: gy });
    }
    return out;
  }
  function setTarget(p, x, y, seat) {
    if (p.tx === x && p.ty === y && p.path && p.path.length) {
      return;
    }
    const az = [{ x: p.x, y: p.y }];
    let gx = x;
    let gy = y;
    if (seat) {
      az.push({ x, y });
    }
    else {
      const n = nearestFree(x, y);
      gx = n[0];
      gy = n[1];
    }
    p.path = findPath(p.x, p.y, gx, gy, az);
    p.tx = x;
    p.ty = y;
  }
  const DR = [
    ['🍵', 'Trà Hoa Cúc'], ['🫖', 'Trà Oolong'], ['☕', 'Cà Phê Moka'], ['🍹', 'Mocktail']
  ];
  const PAL_UI = {
    m: [0x222831, 0x2f4b7c, 0x5a3a2a, 0x4a5a3a, 0x6a2a3a, 0x555a60],
    f: [0xc0392b, 0x2e86c1, 0xd4a017, 0x8e44ad, 0x27ae60, 0xe67e9c]
  };
  const LV = [
    [1, 'Lữ khách'], [3, 'Khách quen'], [5, 'Tri âm'], [8, 'Nhã sĩ'], [12, 'Trà nhân'], [16, 'Trà tiên']
  ];
  const lvT = n => 50 * n * (n + 1);
  const lvl = s => {
    s = Math.max(0, s || 0);
    let n = Math.floor((Math.sqrt(1 + s * 4 / 50) - 1) / 2);
    while (lvT(n + 1) <= s) {
      n++;
    }
    while (n > 0 && lvT(n) > s) {
      n--;
    }
    return n + 1;
  };
  const lvn = s => LV.filter(l => lvl(s) >= l[0]).pop()[1];
  const lvNext = s => lvT(lvl(s));
  const lvPrev = s => lvT(lvl(s) - 1);
  const REW = [
    [2, '🏷 Biển tên hiện số cấp · 🍃 huy hiệu · 🍵 tặng trà cho bạn'],
    [3, '😍 Biểu cảm mới · 🎐 Kỹ năng Chuông gió'],
    [4, '🎨 Màu tên Ngọc bích · 🍰 tặng bánh cho bạn · ☕ Ly trà đầy hơn (6 ngụm)'],
    [5, '🎉 Biểu cảm mới · thưởng +10% điểm · 🛋 Sofa VIP sát sân khấu · 🌸 huy hiệu · 🌺 Kỹ năng Mưa hoa'],
    [6, '✨ Hiệu ứng lấp lánh khi biểu cảm'],
    [7, '🎨 Màu tên Hồng sen'],
    [8, '🌸 Biểu cảm mới · ⭐ huy hiệu · 💎 tặng kim cương cho bạn · 🎆 Kỹ năng Pháo hoa sân khấu'],
    [9, '🌸 Hiệu ứng cánh hoa khi biểu cảm'],
    [10, '✨ Thưởng +20% điểm · 🎨 Màu tên Vàng kim · ☕ Ly trà đầy hơn nữa (7 ngụm)'],
    [12, '👑 Biểu cảm vương giả · huy hiệu · 🌟 Kỹ năng Tỏa sáng'],
    [13, '💫 Hiệu ứng sao băng khi biểu cảm'],
    [14, '🎨 Màu tên Tím hoàng gia'],
    [15, '🌟 Thưởng +30% điểm'],
    [16, '🌟 Huy hiệu tối thượng · 🏮 Kỹ năng Thả đèn lồng']
  ];
  const ZN = [[1, 'Mặc định', ''], [4, 'Ngọc bích', '#7fe8d0'], [7, 'Hồng sen', '#ff9fc0'], [10, 'Vàng kim', '#ffd24a'], [14, 'Tím hoàng gia', '#c9a0ff'],
    [99, 'Xanh dạ quang', '#39ff88', 'nc_neon'], [99, 'Đỏ ruby', '#ff4d5e', 'nc_ruby'], [99, 'Cầu vồng', 'rainbow', 'nc_rainbow']];
  const ZB = [[1, 'Không', ''], [2, 'Lá trà', '🍃'], [5, 'Hoa', '🌸'], [8, 'Sao', '⭐'], [12, 'Vương miện', '👑'], [16, 'Tối thượng', '🌟'],
    [99, 'Bướm', '🦋', 'bd_bfly'], [99, 'Rồng', '🐉', 'bd_dragon'], [99, 'Mạnh thường quân', '🏅', 'bd_donor']];
  const ZE = [[1, 'Không', ''], [6, 'Lấp lánh', '✨'], [9, 'Cánh hoa', '🌸'], [13, 'Sao băng', '💫'],
    [99, 'Bướm bay', '🦋', 'ea_bfly'], [99, 'Trái tim', '💖', 'ea_heart'], [99, 'Ngọn lửa', '🔥', 'ea_fire']];
  const OWN = {};
  const zCan = o => o[0] <= lvl(score) || !!(o[3] && OWN[o[3]]);
  const zp = t => {
    const a = String(t || '').split('.').map(x => x | 0);
    return [Math.min(Math.max(a[0] || 0, 0), ZN.length - 1), Math.min(Math.max(a[1] || 0, 0), ZB.length - 1),
      Math.min(Math.max(a[2] || 0, 0), ZE.length - 1)];
  };
  const zClean = (t, sc) => {
    const L = lvl(sc);
    const a = zp(t);
    return [ZN, ZB, ZE].map((T, i) => (T[a[i]][0] <= L || (T[a[i]][3] && OWN[T[a[i]][3]]) ? a[i] : 0)).join('.');
  };
  const GF = [['🌹', 'Hoa hồng', 1, 5], ['🍵', 'Tách trà', 2, 8], ['🍰', 'Bánh ngọt', 4, 12], ['💎', 'Kim cương', 8, 25]];
  const GF_DAY = 5;

  const lvBonus = s => lvl(s) >= 15 ? .3 : lvl(s) >= 10 ? .2 : lvl(s) >= 5 ? .1 : 0;
  function levelUp(from, to) {
    const old = $('lvup');
    if (old) {
      old.remove();
    }
    const got = REW.filter(r => r[0] > from && r[0] <= to).map(r => '<p>🎁 ' + r[1] + '</p>').join('');
    const e = document.createElement('div');
    e.id = 'lvup';
    e.innerHTML = '<h1>⭐ LÊN CẤP ' + to + '</h1><p>' + lvn(score) + '</p>'
      + (got || '<p class="sm">Tiếp tục làm nhiệm vụ để mở quà mới!</p>') + '<p class="sm">(chạm để đóng)</p>';
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = ['#ffd27a', '#ff9a4a', '#f06a6a', '#7fe08a', '#7ab8ff'][i % 5];
      c.style.animationDelay = Math.random() * .8 + 's';
      e.appendChild(c);
    }
    e.onclick = () => e.remove();
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 4200);
  }
  const DEF = {
    bpm: 58, w: 'sine', d: 2.6, lp: 2200, prog: [
      [0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 'M']
    ], sc: [0, 2, 4, 7, 9, 12, 14, 16]
  };
  const AE = (() => {
    let c;
    let g = {};
    let nb;
    let art = null;
    let step = 0;
    let nextT = 0;
    const CH = {
      m: [0, 3, 7], M: [0, 4, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10]
    };
    const f = s => 130.81 * Math.pow(2, s / 12);
    const nz = (dur, fr, q, vol, dest, type, t0) => {
      const s = c.createBufferSource();
      s.buffer = nb;
      const b = c.createBiquadFilter();
      b.type = type || 'bandpass';
      b.frequency.value = fr;
      b.Q.value = q;
      const v = c.createGain();
      const t = t0 || c.currentTime;
      v.gain.setValueAtTime(vol, t);
      v.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(b);
      b.connect(v);
      v.connect(dest || g.fx);
      s.start(t, Math.random());
      s.stop(t + dur + .05);
    };
    const tone = (fr, t, dur, w, v, lp) => {
      const o = c.createOscillator();
      const fl = c.createBiquadFilter();
      const gn = c.createGain();
      o.type = w;
      o.frequency.value = fr;
      fl.type = 'lowpass';
      fl.frequency.value = lp;
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(v, t + .02);
      gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(fl);
      fl.connect(gn);
      gn.connect(g.pno || g.music);
      o.start(t);
      o.stop(t + dur + .1);
    };
    const tick = () => {
      if (!art || !c || c.state !== 'running') {
        return;
      }
      const dt = 60 / art.bpm / 2;
      while (nextT < c.currentTime + .5) {
        const ch = art.prog[Math.floor(step / 8) % 4];
        const tn = CH[ch[1]];
        if (step % 2 === 0) {
          tone(f(ch[0] + tn[(step / 2) % tn.length] + 12), nextT, art.d, art.w, .11, art.lp);
        }
        if (step % 8 === 0) {
          tone(f(ch[0] - 12), nextT, art.d * 1.6, 'sine', .2, 600);
        }
        if (Math.random() < .33) {
          tone(
            f(art.sc[Math.floor(Math.random() * art.sc.length)] + 12),
            nextT,
            art.d * 1.3,
            art.w,
            .08,
            art.lp
          );
        }
        nextT += dt;
        step++;
      }
    };
    return {
      init() {
        if (c) {
          c.resume();
          return;
        }
        c = new (window.AudioContext || window.webkitAudioContext)();
        const m = c.createGain();
        m.gain.value = .9;
        m.connect(c.destination);
        ['rain', 'vinyl', 'music', 'fx'].forEach(k => {
          g[k] = c.createGain();
          g[k].gain.value = k === 'fx' ? .9 : k === 'music' ? .6 : k === 'rain' ? 0 : .25;
          g[k].connect(m);
        });
        const dl = c.createDelay(1);
        dl.delayTime.value = .34;
        const fb = c.createGain();
        fb.gain.value = .32;
        const wet = c.createGain();
        wet.gain.value = .28;
        g.pno = c.createGain();
        g.pno.connect(g.music);
        g.wet = wet;
        g.music.connect(dl);
        dl.connect(fb);
        fb.connect(dl);
        dl.connect(wet);
        wet.connect(m);
        g.room = c.createGain();
        const rd2 = c.createDelay(.2);
        rd2.delayTime.value = .037;
        const rf = c.createGain();
        rf.gain.value = .45;
        const rl = c.createBiquadFilter();
        rl.type = 'lowpass';
        rl.frequency.value = 3200;
        const rw = c.createGain();
        rw.gain.value = .45;
        g.room.connect(rd2);
        rd2.connect(rl);
        rl.connect(rf);
        rf.connect(rd2);
        rl.connect(rw);
        rw.connect(m);
        nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          d[i] = Math.random() * 2 - 1;
        }
        const s = c.createBufferSource();
        s.buffer = nb;
        s.loop = true;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 900;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 7000;
        s.connect(hp);
        hp.connect(lp);
        lp.connect(g.rain);
        s.start();
        setInterval(tick, 200);
      },
      vol(k, v) {
        if (g[k]) {
          g[k].gain.value = v;
        }
      },
      setArtist(a) {
        art = a;
        step = 0;
        if (c) {
          nextT = c.currentTime + .15;
          const t = c.currentTime;
          // Có bài phát: tắt hẳn tiếng piano (cả nốt đã lên lịch và đuôi vang)
          [[g.pno, 1], [g.wet, .28]].forEach(x => {
            if (x[0]) {
              x[0].gain.cancelScheduledValues(t);
              x[0].gain.setValueAtTime(x[0].gain.value, t);
              x[0].gain.linearRampToValueAtTime(a ? x[1] : 0, t + (a ? .6 : .05));
            }
          });
        }
      },
      dv(v) {
        const n = c.createGain();
        n.gain.value = v;
        n.connect(g.fx);
        return n;
      },
      pn(fr, t, dur, vol, dest, type) {
        const o = c.createOscillator();
        const g2 = c.createGain();
        o.type = type || 'sine';
        o.frequency.value = fr;
        g2.gain.setValueAtTime(.0001, t);
        g2.gain.exponentialRampToValueAtTime(vol, t + .01);
        g2.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(g2);
        g2.connect(dest);
        o.start(t);
        o.stop(t + dur + .05);
      },
      sip(v) {
        if (!c) {
          return;
        }
        v = v == null ? 1 : v;
        const t = c.currentTime;
        const d = this.dv(v);
        nz(.35, 700, 2, .5, d, 'bandpass', t);
        const o = c.createOscillator();
        const vg = c.createGain();
        o.frequency.setValueAtTime(250, t);
        o.frequency.exponentialRampToValueAtTime(900, t + .12);
        vg.gain.setValueAtTime(.15, t);
        vg.gain.exponentialRampToValueAtTime(.001, t + .2);
        o.connect(vg);
        vg.connect(d);
        o.start(t);
        o.stop(t + .25);
      },
      clap(n, v, force) {
        // art === null nghĩa là đang có bài hát: chỉ vỗ tay lúc mở/kết thúc bài (force), người chơi bấm vỗ tay thì im
        if (!c || (!art && !force)) {
          return;
        }
        v = v == null ? 1 : v;
        const t = c.currentTime;
        const cnt = Math.min(130, 10 + (n || 1) * 4);
        const dur = 1.8 + Math.min(2.4, (n || 1) * .05);
        const bus = c.createGain();
        bus.gain.value = .5 * v;
        bus.connect(g.fx);
        bus.connect(g.room);
        for (let i = 0; i < cnt; i++) {
          const r = Math.random();
          const tt = t
            + (r < .15
              ? .4 * Math.random()
              : r < .85 ? .2 + (dur - .6) * Math.random() : dur - .4 + .4 * Math.random());
          let dest = bus;
          if (c.createStereoPanner) {
            const p = c.createStereoPanner();
            p.pan.value = Math.random() * 1.6 - .8;
            p.connect(bus);
            dest = p;
          }
          const lv = .35 + Math.random() * .65;
          const f0 = 900 + Math.random() * 1400;
          for (let k = 0; k < 3; k++) {
            nz(
              .012 + Math.random() * .02,
              f0 + k * 350,
              .7 + Math.random() * .8,
              lv * (k ? .6 : 1),
              dest,
              'bandpass',
              tt + k * (.004 + Math.random() * .006)
            );
          }
          this.pn(150 + Math.random() * 70, tt, .05, .22 * lv, dest);
        }
      },
      clink(v) {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.5 * (v == null ? 1 : v));
        [0, .14].forEach((o, k) => {
          [2349, 3136, 4699].forEach((f, i) => {
            const os = c.createOscillator();
            const g2 = c.createGain();
            os.frequency.value = f * (k ? 1.02 : 1);
            g2.gain.setValueAtTime(.0001, t + o);
            g2.gain.exponentialRampToValueAtTime(.35 / (i + 1), t + o + .005);
            g2.gain.exponentialRampToValueAtTime(.0001, t + o + .5 - i * .1);
            os.connect(g2);
            g2.connect(d);
            os.start(t + o);
            os.stop(t + o + .55);
          });
          nz(.02, 6000, 1, .4, d, 'highpass', t + o);
        });
      },
      wave(v) {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.5 * (v == null ? 1 : v));
        const s = c.createBufferSource();
        s.buffer = nb;
        const b = c.createBiquadFilter();
        b.type = 'bandpass';
        b.Q.value = 1.2;
        b.frequency.setValueAtTime(500, t);
        b.frequency.exponentialRampToValueAtTime(2200, t + .25);
        const gg = c.createGain();
        gg.gain.setValueAtTime(.0001, t);
        gg.gain.linearRampToValueAtTime(.4, t + .1);
        gg.gain.exponentialRampToValueAtTime(.0001, t + .3);
        s.connect(b);
        b.connect(gg);
        gg.connect(d);
        s.start(t, Math.random());
        s.stop(t + .35);
      },
      heart(v) {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.5 * (v == null ? 1 : v));
        this.pn(660, t, .18, .4, d);
        this.pn(990, t + .1, .3, .4, d);
      },
      flower(v) {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.5 * (v == null ? 1 : v));
        [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.pn(f, t + i * .07, .5, .3, d));
        this.clap(8, .6 * (v == null ? 1 : v));
      },
      bell() {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.7);
        this.pn(1320, t, 1.2, .4, d);
        this.pn(2640, t, .8, .15, d);
        this.pn(3960, t, .4, .06, d);
      },
      ping(v) {
        if (!c) {
          return;
        }
        this.pn(880, c.currentTime, .12, .12 * (v == null ? 1 : v), this.dv(1));
      },
      door() {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.5);
        this.pn(523, t, .25, .25, d);
        this.pn(659, t + .15, .4, .25, d);
      },
      seat() {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.8);
        nz(.12, 220, 1, .7, d, 'lowpass', t);
        this.pn(110, t, .12, .4, d);
      },
      step() {
        if (!c) {
          return;
        }
        nz(.05, 350, 1.5, .18, this.dv(.6), 'lowpass');
      },
      fanfare() {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        const d = this.dv(.6);
        [523, 659, 784, 1047].forEach((f, i) => this.pn(f, t + i * .11, .45, .3, d, 'triangle'));
      },
      welcome() {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        [
          [0,
          0],
          [4,
          .7],
          [7,
          1.4],
          [12,
          2.1],
          [11,
          3.2],
          [7,
          3.9],
          [9,
          4.6],
          [5,
          5.4],
          [4,
          6.6],
          [7,
          7.3],
          [2,
          8.2],
          [0,
          9.2]
        ].forEach(a => {
          tone(f(a[0] + 12), t + a[1], 2.8, 'sine', .15, 2400);
          tone(f(a[0] + 24), t + a[1], 1.4, 'triangle', .035, 3200);
        });
        tone(f(0), t, 7, 'sine', .08, 700);
        tone(f(7), t + 4, 6, 'sine', .07, 700);
        if (art) {
          nextT = t + 11;
        }
      },
      chime() {
        if (!c) {
          return;
        }
        const t = c.currentTime;
        [880, 1320, 1760].forEach((x, i) => {
          const o = c.createOscillator();
          const v = c.createGain();
          o.frequency.value = x;
          v.gain.setValueAtTime(.1, t + i * .08);
          v.gain.exponentialRampToValueAtTime(.001, t + i * .08 + .6);
          o.connect(v);
          v.connect(g.fx);
          o.start(t + i * .08);
          o.stop(t + i * .08 + .7);
        });
      }
    };
  })();
  let uid;
  let myRef;
  let off = 0;
  let isAdmin = false;
  let tracks = [];
  let now = null;
  // Danh sách phát theo chủ đề. Muốn thêm chủ đề mới, thêm một dòng [mã-không-dấu, 'tên hiển thị'].
  const THEMES = [
    ['chung', '🎵 Tất cả bài hát'],
    ['tru-tinh', '🌹 Trữ tình'],
    ['dan-ca', '🎶 Dân ca & hò'],
    ['nhac-tre', '🎸 Nhạc trẻ'],
    ['khong-loi', '🎹 Không lời thư giãn'],
    ['song-ca', '👫 Song ca']
  ];
  const themeOk = k => THEMES.some(t => t[0] === k);
  let room = themeOk(localStorage.tp_pl) ? localStorage.tp_pl : 'chung';
  const PR = {};
  let over = null;
  let overRef = null;
  let rank = [];
  let cur = '';
  let score = +localStorage.tp_score || 0;
  let lastAct = 0;
  let lastSip = 0;
  let lastMove = 0;
  let lastChat = 0;
  let lastStageScore = 0;
  let selG = localStorage.tp_g === 'f' ? 'f' : 'm';
  let selC = +localStorage.tp_c || 0;
  let st;
  const P = {};
  const fx = [];
  let chatReady = false;
  let nextStep = 0;
  let greetT = 0;
  let rainOn = false;
  const mixV = {
    rain: .35, vinyl: .25, music: .6
  };
  const me = {
    n: '', av: 'm', c: 0, x: 790, y: 975, tx: 790, ty: 975, path: [], d: -1, lv: 0, bub: null, z: '0.0.0'
  };
  const au = new Audio();
  au.volume = .6;
  const cv = $('cv');
  const drops = Array.from({ length: 40 }, () => ({
    x: Math.random() * 130, y: Math.random() * 130, v: 120 + Math.random() * 120
  }));
  const toast = t => {
    let e = $('toast');
    if (!e) {
      e = document.createElement('div');
      e.id = 'toast';
      document.body.appendChild(e);
    }
    e.textContent = t;
    e.hidden = false;
    clearTimeout(e._t);
    e._t = setTimeout(() => e.hidden = true, 2400);
  };
  const hud = () => {
    const pv = lvPrev(score);
    $('xpf').style.width = Math.round((score - pv) / (lvNext(score) - pv) * 100) + '%';
    document.querySelectorAll('[data-lv]').forEach(b => {
      b.hidden = lvl(score) < +b.dataset.lv;
    });
    $('score').textContent = '⭐ Cấp ' + lvl(score) + ' · 🍃 ' + score + '/' + lvNext(score) + ' điểm · ' + lvn(score);
  };
  const cnt = () => {
    const n = Math.max(Object.keys(PR).length, Object.keys(P).length + 1);
    $('cnt').textContent = '● ' + n + '/' + MAX + ' · 🎧 ' + (Object.keys(P).length + 1);
    $('cnt').style.color = n >= MAX ? '#ff9a7a' : n >= MAX * .85 ? '#f0c060' : '#7fe08a';
  };
  let acct = false;
  const FR = { list: {}, req: {}, sent: {}, ready: false, tab: 'f', pk: null, last: 0 };
  let mode = 'g';
  let sv;
  function saveAcct() {
    if (!acct || !uid) {
      return;
    }
    clearTimeout(sv);
    sv = setTimeout(() => db.ref('users/' + uid).update({
      n: me.n, g: me.av, c: me.c, s: score, ms: localStorage.tp_ms || null, ck: localStorage.tp_ck || null, z: localStorage.tp_z || null
    }), 2500);
  }
  // Giới hạn điểm mỗi ngày cho nguồn điểm lặp lại, để không ai lên cấp quá nhanh:
  //  act  = nhấp trà, gọi nước, vỗ tay/tặng hoa; gift = điểm nhận từ quà bạn bè.
  // Nhiệm vụ, điểm danh, bình chọn bài đã có giới hạn riêng nên không tính vào đây.
  const CAP = { act: 60, gift: 50 };
  const CAP_MSG = {
    act: '🍃 Hôm nay bạn đã nhận đủ điểm nhấp trà, gọi nước và cổ vũ. Làm nhiệm vụ, điểm danh hoặc quay lại ngày mai nhé!',
    gift: '🍃 Hôm nay bạn đã nhận đủ điểm từ quà bạn bè, quà vẫn là tấm lòng của họ.'
  };
  const budget = src => {
    const m = mst();
    return Math.max(0, CAP[src] - ((m.e && m.e[src]) || 0));
  };
  function addScore(n, fixed, src) {
    const l0 = lvl(score);
    n = fixed ? n : Math.max(1, Math.round(n * (1 + lvBonus(score))));
    if (src) {
      const m = mst();
      m.e = m.e || {};
      const left = Math.max(0, CAP[src] - (m.e[src] || 0));
      if (left <= 0) {
        if (!m.e['n' + src]) {
          m.e['n' + src] = 1;
          localStorage.tp_ms = JSON.stringify(m);
          toast(CAP_MSG[src]);
        }
        return 0;
      }
      n = Math.min(n, left);
      m.e[src] = (m.e[src] || 0) + n;
      localStorage.tp_ms = JSON.stringify(m);
    }
    score += n;
    localStorage.tp_score = score;
    hud();
    if (lvl(score) > l0) {
      levelUp(l0, lvl(score));
      AE.fanfare();
    }
    saveAcct();
    clearTimeout(st);
    st = setTimeout(() => {
      db.ref('scores/' + uid).set({ n: me.n, s: score });
      myRef.update({ s: score });
    }, 3000);
    return n;
  }
  $('nm').value = localStorage.tp_n || '';
  const swatch = () => {
    $('sw').innerHTML = '';
    PAL_UI[selG].forEach((c, i) => {
      const e = document.createElement('i');
      e.style.background = '#' + c.toString(16).padStart(6, '0');
      if (i === selC) {
        e.className = 'on';
      }
      e.onclick = () => {
        selC = i;
        swatch();
      };
      $('sw').appendChild(e);
    });
    $('gm').className = selG === 'm' ? 'on' : '';
    $('gf').className = selG === 'f' ? 'on' : '';
  };
  $('gm').onclick = () => {
    selG = 'm';
    swatch();
  };
  $('gf').onclick = () => {
    selG = 'f';
    swatch();
  };
  swatch();
  const setMode = m => {
    mode = m;
    $('acc').hidden = m === 'g';
    $('aerr').hidden = true;
    $('tg').className = m === 'g' ? 'on' : '';
    $('tl').className = m === 'l' ? 'on' : '';
    $('tr').className = m === 'r' ? 'on' : '';
    $('go').textContent = m === 'r' ? 'Đăng ký & vào phòng' : m === 'l' ? 'Đăng nhập & vào phòng' : 'Bước vào phòng trà';
  };
  $('tg').onclick = () => setMode('g');
  $('tl').onclick = () => setMode('l');
  $('tr').onclick = () => setMode('r');
  const acctErr = t => {
    $('aerr').hidden = false;
    $('aerr').textContent = t;
  };
  async function accountAuth() {
    const raw = $('un').value.trim();
    const pw = $('up').value;
    if (!raw.includes('@') && !/^[a-z0-9._-]{3,24}$/i.test(raw)) {
      acctErr('Tên đăng nhập 3-24 ký tự: chữ không dấu, số, . _ - (hoặc dùng email).');
      return null;
    }
    if (pw.length < 6) {
      acctErr('Mật khẩu cần ít nhất 6 ký tự.');
      return null;
    }
    const email = raw.includes('@') ? raw : raw.toLowerCase() + '@phongtra.app';
    try {
      const r = mode === 'r'
        ? await auth.createUserWithEmailAndPassword(email, pw)
        : await auth.signInWithEmailAndPassword(email, pw);
      return r.user;
    }
    catch (e) {
      const c = e.code || '';
      acctErr(c.includes('email-already') ? 'Tên đăng nhập này đã có người dùng.'
        : c.includes('weak-password') ? 'Mật khẩu quá yếu (cần ≥ 6 ký tự).'
        : c.includes('too-many') ? 'Thử quá nhiều lần, vui lòng đợi một lát.'
        : c.includes('operation-not-allowed') ? 'Chưa bật đăng nhập Email/Password trên Firebase.'
        : mode === 'l' ? 'Sai tên đăng nhập hoặc mật khẩu.' : 'Không đăng ký được, thử lại sau.');
      return null;
    }
  }
  function applyProfile(pf, typed) {
    const p = pf.val();
    if (p) {
      score = p.s || 0;
      localStorage.tp_score = score;
      localStorage.tp_ms = p.ms || '';
      localStorage.tp_ck = p.ck || '';
      localStorage.tp_z = p.z || '';
      if (!typed) {
        me.n = p.n || me.n;
      }
      if (mode !== 'r') {
        me.av = selG = p.g === 'f' ? 'f' : 'm';
        me.c = selC = +p.c || 0;
        localStorage.tp_g = selG;
        localStorage.tp_c = selC;
      }
    }
    hud();
    saveAcct();
  }
  function acctRow() {
    return acct
      ? '<div class="row"><button data-a="logout">🚪 Đăng xuất (' + esc(me.n) + ')</button></div>'
      : '<p class="sm">Đăng ký / đăng nhập ở màn hình vào phòng để lưu nhiệm vụ và lên cấp.</p>';
  }
  $('go').onclick = async () => {
    const typed = $('nm').value.trim();
    me.n = (typed || 'Lữ khách').slice(0, 16);
    me.av = selG;
    me.c = selC;
    localStorage.tp_n = me.n;
    localStorage.tp_g = selG;
    localStorage.tp_c = selC;
    AE.init();
    AE.setArtist(DEF);
    AE.welcome();
    try {
      db.goOnline();
      let u;
      if (mode === 'g') {
        u = await new Promise(r => {
          const f = auth.onAuthStateChanged(x => {
            f();
            r(x);
          });
        });
        if (!u) {
          u = (await auth.signInAnonymously()).user;
        }
      }
      else {
        u = await accountAuth();
        if (!u) {
          db.goOffline();
          return;
        }
      }
      uid = u.uid;
      acct = !u.isAnonymous && (mode !== 'g' || (u.email || '').endsWith('@phongtra.app'));
      const [pl, ad, pf] = await Promise.all([
        db.ref('players').once('value'),
        db.ref('admins/' + uid).once('value'),
        acct ? db.ref('users/' + uid).once('value') : Promise.resolve(null)
      ]);
      amAdmin = ad.val() === true;
      if (acct) {
        applyProfile(pf, typed);
      }
      if (pl.numChildren() >= MAX && !amAdmin) {
        db.goOffline();
        uid = null;
        $('full').hidden = false;
        $('full').textContent = 'Phòng trà đang đầy ('
          + MAX
          + '/'
          + MAX
          + ' khách). Vui lòng thử lại sau ít phút.';
        $('go').textContent = 'Thử lại';
        return;
      }
      $('full').hidden = true;
      start();
    }
    catch (e) {
      db.goOffline();
      alert('Không kết nối được máy chủ: ' + e.message);
    }
  };
  function syncPlayer(k, first) {
    const v = PR[k];
    if (!v) {
      rm(P[k]);
      delete P[k];
      cnt();
    }
    else if ((v.pl || 'chung') === room) {
      applyP(k, v, first || !P[k]);
    }
    else if (P[k]) {
      rm(P[k]);
      delete P[k];
      cnt();
    }
  }
  function applyP(k, v, first) {
    const p = P[k] || (P[k] = {
      x: v.x, y: v.y, la: 0
    });
    Object.assign(p, {
      n: v.n, av: v.av, c: v.c | 0, d: v.d == null ? -1 : v.d, s: v.s || 0, r: v.r ? 1 : 0, z: v.z || '', k
    });
    if (first || p.tx == null) {
      p.x = p.tx = v.x;
      p.y = p.ty = v.y;
      p.path = [];
    }
    else if (p.tx !== v.x || p.ty !== v.y) {
      setTarget(p, v.x, v.y, !!seatAt(v.x, v.y));
    }
    if (v.a && v.a.t !== p.la) {
      if (!first) {
        if (v.a.k !== '🍵') {
          bubble(p, v.a.k);
        }
        actAnim(p, v.a.k);
        aura(p);
        if (v.a.k === '🥂') {
          sparkTable(p);
        }
        if (SKL.some(s => s.id === v.a.k) && !(p.skT > performance.now() - 20000)) {
          p.skT = performance.now();
          skillFx(v.a.k, p);
        }
        if (v.a.s) {
          shoot(v.a.k, p.x, p.y);
        }
        snd(v.a.k, .45);
      }
      p.la = v.a.t;
    }
    cnt();
  }
  function start() {
    $('login').hidden = true;
    $('ui').hidden = false;
    hud();
    me.z = zClean(localStorage.tp_z, score);
    SH.zWait = acct;
    me.x = me.tx = 760 + Math.random() * 60;
    myRef = db.ref('players/' + uid);
    myRef.onDisconnect().remove();
    myRef.set({
      n: me.n, av: me.av, c: me.c, x: Math.round(me.x), y: me.y, d: -1, s: score, r: acct ? 1 : 0, z: me.z, pl: room
    })
      .then(() => db.ref('players').once('value'))
      .then(s => {
      if (s.numChildren() > MAX && !amAdmin) {
        myRef.remove().then(() => {
          alert('Phòng vừa đầy, bạn hãy thử lại sau ít phút.');
          location.reload();
        });
      }
    });
    let lastIn = Date.now();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => {
      lastIn = Date.now();
    }, { passive: true }));
    setInterval(() => {
      if (!amAdmin && Date.now() - lastIn > IDLE) {
        myRef.remove().then(() => {
          alert(
            'Bạn đã được mời ra khỏi phòng vì không hoạt động 15 phút, để nhường chỗ cho khách khác.'
          );
          location.reload();
        });
      }
    }, 30000);
    db.ref('.info/serverTimeOffset').on('value', s => off = s.val() || 0);
    db.ref('admins/' + uid).on('value', s => {
      isAdmin = s.val() === true;
      $('adm').textContent = isAdmin ? ' · 🎛 Admin' : '';
      $('ordb').hidden = !isAdmin;
      $('dedb').hidden = !isAdmin;
      if (isAdmin) {
        sAdminInit();
      }
    });
    const pr = db.ref('players');
    pr.on('child_added', s => {
      PR[s.key] = s.val();
      if (s.key !== uid) {
        syncPlayer(s.key, true);
        if (chatReady && P[s.key] && FR.list[s.key]) {
          toast('💛 Bạn bè ' + (s.val().n || '') + ' vừa vào phòng trà');
          fRefresh();
        }
      }
    });
    pr.on('child_changed', s => {
      PR[s.key] = s.val();
      if (s.key !== uid) {
        syncPlayer(s.key, false);
      }
    });
    pr.on('child_removed', s => {
      delete PR[s.key];
      syncPlayer(s.key, false);
    });
    db.ref('chat').orderByChild('t').startAt(Date.now() + off - CHAT_TTL).limitToLast(25)
      .on('child_added', s => addLog(s.val()));
    setInterval(pruneChat, 15000);
    db.ref('tracks').orderByChild('ord').on('value', s => {
      tracks = [];
      s.forEach(x => {
        tracks.push(Object.assign({ id: x.key }, x.val()));
      });
      recomputeNow();
      if (cur === 'lineup') {
        HD.lineup();
      }
    });
    watchOver();
    watchReq();
    db.ref('donors/' + uid).on('value', d => {
      isDonorMe = d.exists();
    });
    setInterval(recomputeNow, 500);
    db.ref('scores').orderByChild('s').limitToLast(10).on('value', s => {
      rank = [];
      s.forEach(x => {
        rank.unshift(x.val());
      });
    });
    chatPush({
      n: '', m: me.n + ' vào phòng trà 🏮', s: 1, u: uid, t: TS()
    });
    ckBadge();
    fInit();
    sInit();
    if (!ckInfo().claimed) {
      setTimeout(() => {
        if (!cur) {
          HD.checkin();
        }
      }, 3000);
    }
    setInterval(ckBadge, 60000);
    preloadModels();
    setTimeout(() => {
      chatReady = true;
    }, 2500);
    greetT = performance.now() + 600;
    setTimeout(() => toast('Lễ tân: Chào mừng quý khách đến phòng trà ☕'), 1500);
    AE.door();
    requestAnimationFrame(loop);
  }
  // Chat quá 5 phút thì xóa khỏi màn hình và khỏi Firebase
  const CHAT_TTL = 5 * 60 * 1000;
  const chatPush = o => db.ref('chat').push(Object.assign({ r: room }, o));
  function pruneChat() {
    const cut = Date.now() + off - CHAT_TTL;
    const l = $('log');
    [...l.children].forEach(d => {
      if (+d.dataset.t < cut) {
        l.removeChild(d);
      }
    });
    db.ref('chat').orderByChild('t').endAt(cut).limitToFirst(50).once('value').then(s => {
      s.forEach(x => {
        x.ref.remove().catch(() => {});
      });
    }).catch(() => {});
  }
  function addLog(m) {
    if ((m.r || 'chung') !== room) {
      return;
    }
    if (m.s && (!chatReady || m.u === uid)) {
      return;
    }
    if (chatReady) {
      if (m.s) {
        AE.door();
      }
      else if (m.n !== me.n) {
        AE.ping(.6);
      }
    }
    const d = document.createElement('div');
    if (m.s) {
      d.className = 'sys';
      d.textContent = m.m;
    }
    else {
      const b = document.createElement('b');
      b.textContent = m.n + ': ';
      d.appendChild(b);
      d.appendChild(document.createTextNode(m.m));
    }
    d.dataset.t = m.t || (Date.now() + off);
    const l = $('log');
    l.appendChild(d);
    while (l.children.length > 40) {
      l.removeChild(l.firstChild);
    }
    l.scrollTop = l.scrollHeight;
  }
  const INTRO_MS = 9000;
  // g: m nam, f nữ, d song ca nam-nữ, dm song ca nam-nam, df song ca nữ-nữ
  const isDuet = g => g === 'd' || g === 'dm' || g === 'df';
  const OUTRO_MS = 3000;
  const roomTracks = k => tracks.filter(t => (k === 'chung' || t.list === k) && +t.dur > 0);
  // Lịch phát tính từ giờ máy chủ nên ai cùng danh sách phát đều nghe cùng một bài, cùng một đoạn, không cần admin online
  function scheduled(k, sn) {
    const L = roomTracks(k);
    if (!L.length) {
      return null;
    }
    const slot = t => INTRO_MS + Math.round(t.dur * 1000) + OUTRO_MS;
    const total = L.reduce((a, t) => a + slot(t), 0);
    let m = Math.floor(sn) % total;
    for (const t of L) {
      const sl = slot(t);
      if (m < sl) {
        return { trackId: t.id, startedAt: Math.floor(sn) - m + INTRO_MS };
      }
      m -= sl;
    }
    return null;
  }
  // ===== XIN BÀI & BÌNH CHỌN =====
  // requests/<phòng>/<uid> = {k: mã bài, w: 1|2, t: giờ}; picks/<phòng>/<giờ hết slot> = bài được chèn vào sau bài hiện tại.
  // Bài được chèn làm lịch phát "dừng" trong lúc nó chạy (cum = tổng thời lượng các bài chèn) nên vòng phát cũ tiếp tục đúng chỗ.
  const VOTE_CLOSE_MS = 15000;
  const VOTE_TTL = 20 * 60e3;
  let reqs = {};
  let picks = [];
  let reqRef = null;
  let pickRef = null;
  let picksInit = false;
  const seenPick = {};
  let pickTry = 0;
  let nowSrc = 'sched';
  let isDonorMe = false;
  const slotOf = t => INTRO_MS + Math.round(t.dur * 1000) + OUTRO_MS;
  function scheduledP(k, sn) {
    let cum = 0;
    for (const p of picks) {
      if (sn >= p.at && sn < p.at + p.dur) {
        return { trackId: p.k, startedAt: p.at + INTRO_MS };
      }
      if (sn >= p.at + p.dur) {
        cum = p.cum;
      }
    }
    const r = scheduled(k, sn - cum);
    return r && { trackId: r.trackId, startedAt: r.startedAt + cum };
  }
  function lastClose() {
    return picks.reduce((a, p) => Math.max(a, p.ct || 0), 0);
  }
  // Phiếu còn hiệu lực: cùng phòng, người bỏ phiếu đang trong phòng, chưa bị vòng chọn trước "dùng", chưa quá 20 phút
  function liveVotes() {
    const sn = Date.now() + off;
    const lc = lastClose();
    const out = {};
    Object.keys(reqs).forEach(u => {
      const v = reqs[u];
      const pl = PR[u];
      if (!v || !pl || (pl.pl || 'chung') !== room || !(v.t > lc) || v.t < sn - VOTE_TTL) {
        return;
      }
      if (!roomTracks(room).some(t => t.id === v.k)) {
        return;
      }
      const o = out[v.k] || (out[v.k] = { s: 0, c: 0 });
      o.s += v.w === 2 ? 2 : 1;
      o.c++;
    });
    return out;
  }
  function topRequest() {
    const T = liveVotes();
    let best = null;
    roomTracks(room).forEach(t => {
      const o = T[t.id];
      if (o && !(now && now.trackId === t.id) && (!best || o.s > best.s)) {
        best = { k: t.id, s: o.s };
      }
    });
    return best;
  }
  function maybePick(sn) {
    if (!now || !uid || nowSrc !== 'sched') {
      return;
    }
    const tr = tracks.find(t => t.id === now.trackId);
    if (!tr) {
      return;
    }
    const end = now.startedAt + Math.round(tr.dur * 1000) + OUTRO_MS;
    if (sn < end - VOTE_CLOSE_MS || sn >= end - 2000 || pickTry === end || picks.some(p => p.at === end)) {
      return;
    }
    pickTry = end;
    const w = topRequest();
    if (!w) {
      return;
    }
    const nt = tracks.find(t => t.id === w.k);
    const prev = picks.filter(p => p.at < end).pop();
    const dur = slotOf(nt);
    // chờ ngẫu nhiên vài giây để không phải ai cũng ghi; ai ghi trước thì thắng (rules chỉ cho ghi một lần)
    setTimeout(() => {
      if (picks.some(p => p.at === end)) {
        return;
      }
      db.ref('picks/' + room + '/' + end).set({
        k: w.k, at: end, dur, cum: (prev ? prev.cum : 0) + dur, ct: TS()
      }).catch(() => {
        // đã có người ghi trước hoặc mất mạng: không sao
      });
    }, Math.random() * 3000);
  }
  function watchReq() {
    if (reqRef) {
      reqRef.off();
    }
    if (pickRef) {
      pickRef.off();
    }
    reqs = {};
    picks = [];
    picksInit = false;
    reqRef = db.ref('requests/' + room);
    reqRef.on('value', s => {
      reqs = s.val() || {};
      if (cur === 'vote') {
        HD.req();
      }
    });
    pickRef = db.ref('picks/' + room).orderByKey().limitToLast(3);
    pickRef.on('value', s => {
      const L = [];
      s.forEach(x => {
        L.push(x.val());
      });
      picks = L;
      L.forEach(p => {
        if (seenPick[room + p.at]) {
          return;
        }
        seenPick[room + p.at] = 1;
        const sn = Date.now() + off;
        if (picksInit && p.at > sn - 2000) {
          const t = tracks.find(x => x.id === p.k);
          if (t) {
            toast('🎶 Bài kế tiếp do cả phòng chọn: ' + t.title);
            const mine = reqs[uid];
            if (mine && mine.k === p.k && mine.t <= p.ct) {
              addScore(5);
              setTimeout(() => toast('🗳 Bài bạn bình chọn được phát! +5 🍃'), 2600);
            }
          }
        }
      });
      picksInit = true;
      recomputeNow();
      if (cur === 'vote') {
        HD.req();
      }
    });
  }
  // ===== KỸ NĂNG THEO CẤP =====
  // Kỹ năng chủ động chỉ tạo hiệu ứng cho cả phòng (không cho điểm), có thời gian hồi nên không làm lên cấp nhanh hơn.
  // Người khác thấy kỹ năng qua players/<uid>/a.k (chuỗi emoji) như các biểu cảm thường.
  const SKL = [
    { id: '🎐', lv: 3, name: 'Chuông gió', cd: 40, d: 'Tiếng chuông gió nhẹ và những đốm sáng bay quanh bạn.' },
    { id: '🌺', lv: 5, name: 'Mưa hoa', cd: 90, d: 'Cánh hoa rơi khắp phòng trà, mọi người đều thấy.' },
    { id: '🎆', lv: 8, name: 'Pháo hoa sân khấu', cd: 120, d: 'Pháo hoa nở rộ phía trên sân khấu.' },
    { id: '🌟', lv: 12, name: 'Tỏa sáng', cd: 150, d: 'Ánh sao bao quanh bạn trong vài giây, đi đâu cũng thấy.' },
    { id: '🏮', lv: 16, name: 'Thả đèn lồng', cd: 180, d: 'Đèn lồng bay lên từ khắp sàn phòng trà.' }
  ];
  const skUsed = {};
  try {
    Object.assign(skUsed, JSON.parse(localStorage.tp_sk || '{}'));
  }
  catch (e) {
    // dữ liệu hỏng thì coi như chưa dùng
  }
  const skLeft = s => Math.max(0, Math.ceil(((skUsed[s.id] || 0) + s.cd * 1000 - Date.now()) / 1000));
  const fxAdd = o => {
    if (fx.length < 160) {
      fx.push(o);
    }
  };
  function skillFx(k, p) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (k === '🎐') {
      for (let i = 0; i < 6; i++) {
        fxAdd({ e: i % 2 ? '✨' : '🎐', sx: p.x, sy: p.y, tx: p.x + rnd(-70, 70), ty: p.y + rnd(-70, 40), t: -i * .1 });
      }
    }
    else if (k === '🌺') {
      for (let i = 0; i < 26; i++) {
        const x = rnd(60, W - 60);
        const y = rnd(TOP, H - 60);
        fxAdd({ e: i % 3 ? '🌸' : '🌺', sx: x, sy: y, tx: x + rnd(-60, 60), ty: y + rnd(20, 80), t: -rnd(0, 1.2) });
      }
    }
    else if (k === '🎆') {
      for (let i = 0; i < 24; i++) {
        const an = i / 24 * Math.PI * 2;
        fxAdd({ e: i % 3 ? '✨' : '🎆', sx: 800, sy: 170, tx: 800 + Math.cos(an) * 300, ty: 170 + Math.sin(an) * 110, t: -.2 - (i % 4) * .08 });
      }
    }
    else if (k === '🌟') {
      let n = 0;
      const iv = setInterval(() => {
        if (++n > 12) {
          return clearInterval(iv);
        }
        for (let i = 0; i < 3; i++) {
          fxAdd({ e: i ? '✨' : '🌟', sx: p.x, sy: p.y, tx: p.x + rnd(-60, 60), ty: p.y + rnd(-60, 60), t: -i * .06 });
        }
      }, 600);
    }
    else if (k === '🏮') {
      for (let i = 0; i < 14; i++) {
        const x = rnd(80, W - 80);
        const y = rnd(TOP + 80, H - 60);
        fxAdd({ e: '🏮', sx: x, sy: y, tx: x + rnd(-40, 40), ty: y - rnd(120, 260), t: -rnd(0, 1.4) });
      }
    }
  }
  function useSkill(id) {
    const s = SKL.find(x => x.id === id);
    if (!s || lvl(score) < s.lv) {
      return;
    }
    if (skLeft(s)) {
      return toast('Kỹ năng đang hồi, còn ' + skLeft(s) + ' giây');
    }
    skUsed[s.id] = Date.now();
    localStorage.tp_sk = JSON.stringify(skUsed);
    myRef.update({ a: { k: s.id, s: 0, t: TS() } });
    bubble(me, s.id);
    skillFx(s.id, me);
    if (s.id === '🎆') {
      AE.fanfare();
    }
    else if (s.id === '🌺' || s.id === '🏮') {
      AE.bell();
    }
    else {
      AE.chime();
    }
    HD.skills();
  }
  // ===== TẶNG BÀI HÁT (💌) =====
  // dedics/<mã đơn> = {u, f: người tặng, to: người nhận, m: lời nhắn, k: mã bài | sn+day: bài đặt trước, p: giờ bắt đầu bài khi đã phát}
  // Chỉ worker (sau khi payOS báo tiền về) hoặc admin mới tạo được. Ai trong phòng cũng "giành" ghi p một lần khi bài bắt đầu.
  const DD = { all: {}, mode: 'list', k: '', to: '', m: '', sn: '', day: '', sent: false };
  let DED = null;
  let dedFor = 0;
  function dedLoad(n) {
    if (!n || dedFor === n.startedAt) {
      return;
    }
    dedFor = n.startedAt;
    const st = n.startedAt;
    db.ref('dedics').orderByChild('k').equalTo(n.trackId).once('value').then(s => {
      let done = null;
      let first = null;
      s.forEach(x => {
        const v = x.val();
        if (v.p === st) {
          done = v;
        }
        else if (!v.p && !first) {
          first = [x.key, v];
        }
      });
      if (done) {
        return dedStart(done, st);
      }
      if (!first || Date.now() + off > st + 30000) {
        return;
      }
      db.ref('dedics/' + first[0] + '/p').transaction(c => c == null ? st : undefined).then(r => {
        if (r.snapshot.val() === st) {
          dedStart(first[1], st);
        }
      }).catch(() => {});
    }).catch(() => {
      dedFor = 0;
    });
  }
  function dedStart(v, st) {
    if (!now || now.startedAt !== st) {
      return;
    }
    DED = { f: v.f, to: v.to, m: v.m, until: performance.now() + 45000 };
    const el = (tag, css, txt) => {
      const e = document.createElement(tag);
      e.style.cssText = css;
      e.textContent = txt;
      return e;
    };
    let c = $('ded');
    if (!c) {
      c = document.createElement('div');
      c.id = 'ded';
      c.style.cssText = 'position:fixed;top:170px;left:50%;transform:translateX(-50%);z-index:59;background:#2a0f2aee;'
        + 'border:1px solid #ff9ec4;border-radius:14px;padding:10px 18px;text-align:center;color:#ffd6e6;'
        + 'pointer-events:none;max-width:88vw;transition:opacity .8s';
      document.body.appendChild(c);
    }
    c.textContent = '';
    c.append(
      el('div', 'font-size:13px', '💌 Bài hát này được gửi tặng'),
      el('b', 'font-size:18px;color:#fff', 'Dành cho ' + v.to),
      el('div', 'font-style:italic;margin:4px 0', '“' + v.m + '”'),
      el('div', 'font-size:13px', '— Từ ' + v.f + ' —')
    );
    c.hidden = false;
    c.style.opacity = '1';
    clearTimeout(dedStart._t);
    dedStart._t = setTimeout(() => {
      c.style.opacity = '0';
    }, 22000);
    addLog({ m: '💌 ' + v.f + ' gửi tặng bài hát cho ' + v.to + ': ' + v.m, s: 1, t: Date.now() + off });
    AE.fanfare();
    try {
      const ss = window.speechSynthesis;
      if (ss && window.SpeechSynthesisUtterance && Date.now() + off < st + 5000) {
        setTimeout(() => {
          const u = new SpeechSynthesisUtterance('Ca khúc này được bạn ' + v.f + ' gửi tặng bạn ' + v.to + '.');
          u.lang = 'vi-VN';
          u.rate = .95;
          const vo = ss.getVoices().find(x => /^vi/i.test(x.lang));
          if (vo) {
            u.voice = vo;
          }
          ss.speak(u);
        }, 2600);
      }
    }
    catch (err) {
      // không đọc được giọng nói thì chỉ hiện chữ
    }
  }
  // Ước lượng giờ bài được phát lần tới trong phòng hiện tại (chưa tính phiếu chèn bài sắp tới)
  function dedNext(id) {
    const L = roomTracks(room);
    const i = L.findIndex(t => t.id === id);
    if (i < 0) {
      return 0;
    }
    const sn = Math.floor(Date.now() + off);
    const cum = picks.reduce((c, p) => sn >= p.at + p.dur ? p.cum : c, 0);
    const total = L.reduce((x, t) => x + slotOf(t), 0);
    const o = L.slice(0, i).reduce((x, t) => x + slotOf(t), 0);
    const s2 = sn - cum;
    let base = s2 - s2 % total + o;
    if (base < s2) {
      base += total;
    }
    return base + cum + INTRO_MS;
  }
  function recomputeNow() {
    const sn = Date.now() + off;
    let n = null;
    nowSrc = 'sched';
    if (over) {
      const t = tracks.find(x => x.id === over.trackId);
      if (t && sn < over.startedAt + Math.round((t.dur || 0) * 1000) + OUTRO_MS) {
        n = over;
        nowSrc = 'over';
      }
    }
    if (!n) {
      n = scheduledP(room, sn);
    }
    const ch = !n !== !now || (n && now && (n.trackId !== now.trackId || n.startedAt !== now.startedAt));
    now = n;
    if (ch) {
      syncAudio();
      dedLoad(n);
      if (cur === 'lineup') {
        HD.lineup();
      }
      if (cur === 'vote') {
        HD.req();
      }
    }
    maybePick(sn);
  }
  function watchOver() {
    if (overRef) {
      overRef.off();
    }
    over = null;
    overRef = db.ref('stage/' + room + '/now');
    overRef.on('value', s => {
      over = s.val();
      recomputeNow();
    });
  }
  let introFor = 0;
  let seekT = 0;
  function announce(tr) {
    let e = $('intro');
    if (!e) {
      e = document.createElement('div');
      e.id = 'intro';
      e.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:60;'
        + 'background:#0b1530ee;border:1px solid #c9a227;border-radius:14px;padding:10px 18px;'
        + 'text-align:center;color:#f0c060;pointer-events:none;max-width:90vw;transition:opacity .6s';
      document.body.appendChild(e);
    }
    e.textContent = '';
    const a = document.createElement('div');
    a.textContent = '🎤 Xin mời thưởng thức';
    const b = document.createElement('b');
    b.style.fontSize = '18px';
    b.textContent = '♪ ' + tr.title;
    const c2 = document.createElement('div');
    c2.textContent = isDuet(tr.g) ? 'Song ca: ' + tr.artist : 'Ca sĩ: ' + tr.artist;
    e.append(a, b, c2);
    e.style.opacity = '1';
    e.hidden = false;
    clearTimeout(announce._t);
    announce._t = setTimeout(() => {
      e.style.opacity = '0';
    }, INTRO_MS - 800);
    try {
      const ss = window.speechSynthesis;
      if (ss && window.SpeechSynthesisUtterance) {
        ss.cancel();
        const u = new SpeechSynthesisUtterance('Xin mời quý vị thưởng thức ca khúc ' + tr.title
          + (isDuet(tr.g) ? ', song ca ' : ', do ca sĩ ') + tr.artist + (isDuet(tr.g) ? '.' : ' trình bày.'));
        u.lang = 'vi-VN';
        u.rate = .95;
        const v = ss.getVoices().find(x => /^vi/i.test(x.lang));
        if (v) {
          u.voice = v;
        }
        setTimeout(() => ss.speak(u), 1800);
      }
    }
    catch (err) {
      // trình duyệt không hỗ trợ đọc giọng nói thì chỉ hiện chữ
    }
  }
  function syncAudio() {
    const tr = tracks.find(t => now && t.id === now.trackId);
    clearTimeout(seekT);
    if (!tr) {
      au.pause();
      au.removeAttribute('src');
      delete au.dataset.id;
      AE.setArtist(DEF);
      return;
    }
    AE.setArtist(null);
    const st = now.startedAt;
    if (au.dataset.id !== tr.id) {
      au.dataset.id = tr.id;
      au.src = tr.url;
    }
    if (Date.now() + off < st) {
      au.pause();
      if (introFor !== st) {
        introFor = st;
        AE.clap(Object.keys(P).length + 1, 1, true);
        announce(tr);
      }
    }
    const seek = () => {
      const o = (Date.now() + off - st) / 1000;
      if (o < 0) {
        seekT = setTimeout(seek, -o * 1000 + 20);
        return;
      }
      const d = au.duration || tr.dur || 0;
      if (d && o >= d) {
        return;
      }
      au.currentTime = Math.max(0, o);
      au.play().catch(() => toast('Chạm vào màn hình để bật nhạc'));
    };
    au.onended = () => {
      AE.clap(Object.keys(P).length + 1, 1, true);
    };
    if (au.readyState > 0) {
      seek();
    }
    else {
      au.onloadedmetadata = seek;
    }
  }
  function bubble(p, e) {
    p.bub = { e, u: performance.now() + 2500 };
  }
  function shoot(e, x, y) {
    for (let i = 0; i < 5; i++) {
      fx.push({
        e, sx: x, sy: y, tx: 800 + (Math.random() - .5) * 180, ty: 150, t: -i * .12
      });
    }
  }
  function goto(x, y) {
    x = Math.round(Math.max(30, Math.min(W - 30, x)));
    y = Math.round(Math.max(TOP, Math.min(H - 30, y)));
    setTarget(me, x, y, !!seatAt(x, y));
    const n = Date.now();
    if (n - lastMove < 400) {
      clearTimeout(goto._t);
      goto._t = setTimeout(() => goto(x, y), 420);
      return;
    }
    lastMove = n;
    myRef.update({ x: Math.round(me.tx), y: Math.round(me.ty) });
  }
  const seated = () => SEATS.some(s => Math.hypot(s.x - me.x, s.y - me.y) < 48);
  const taken = s => Object.values(P).some(p => Math.hypot(p.tx - s.x, p.ty - s.y) < 16);
  function snd(k, v) {
    const n = Object.keys(P).length + 1;
    if (k === '👋') {
      AE.wave(v);
    }
    else if (k === '❤️') {
      AE.heart(v);
    }
    else if (k === '🥂') {
      AE.clink(v);
    }
    else if (k === '☕' || k === '🍵') {
      AE.sip(v * .7);
    }
    else if (k === '👏') {
      AE.clap(n, v);
    }
    else if (k === '💐') {
      AE.flower(v);
    }
  }
  function actAnim(p, k) {
    const n = performance.now();
    if (k === '👋') {
      p.waveT = n;
    }
    else if (k === '👏') {
      p.clapT = n;
    }
    else if (k === '🍵' || k === '🥂' || k === '☕') {
      p.sipT = n;
    }
  }
  function aura(p) {
    const e = ZE[zp(p === me ? me.z : p.z)[2]][2];
    for (let i = 0; e && i < 6; i++) {
      fx.push({
        e, sx: p.x, sy: p.y, tx: p.x + (Math.random() - .5) * 120, ty: p.y + (Math.random() - .5) * 120, t: -i * .08
      });
    }
  }
  function sparkTable(p) {
    let b = TABLES[0];
    TABLES.forEach(t => {
      if (Math.hypot(t.x - p.x, t.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y)) {
        b = t;
      }
    });
    b = [b.x, b.y];
    for (let i = 0; i < 4; i++) {
      fx.push({
        e: '✨', sx: b[0]
          + (Math.random() - .5) * 50, sy: b[1]
            + (Math.random() - .5) * 50, tx: b[0], ty: b[1], t: -i * .1
      });
    }
  }
  function doAct(k, stage) {
    if (Date.now() - lastAct < 1500) {
      return;
    }
    lastAct = Date.now();
    myRef.update({ a: {
        k, s: stage ? 1 : 0, t: TS()
      } });
    bubble(me, k);
    snd(k, 1);
    actAnim(me, k);
    aura(me);
    if (k === '🥂') {
      mission('cheers');
      sparkTable(me);
    }
    if (stage) {
      shoot(k, me.x, me.y);
      mission('stage');
      if (Date.now() - lastStageScore > 20000) {
        lastStageScore = Date.now();
        addScore(k === '💐' ? 3 : 1, false, 'act');
      }
    }
  }
  function sip() {
    if (me.d < 0) {
      return toast('Hãy gọi một món nước trước nhé 📋');
    }
    if (Date.now() - lastSip < 2500) {
      return;
    }
    lastSip = Date.now();
    me.lv -= lvl(score) >= 10 ? 15 : lvl(score) >= 4 ? 17 : 20;
    AE.sip();
    actAnim(me, '🍵');
    myRef.update({ a: {
        k: '🍵', s: 0, t: TS()
      } });
    const got = addScore(1, false, 'act');
    mission('sip');
    if (got) {
      toast('Thư Thái +' + got + ' 🍃');
    }
    if (me.lv <= 0) {
      me.d = -1;
      myRef.update({ d: -1 });
      toast('Ly đã cạn, gọi thêm nhé');
    }
  }
  function chat() {
    const m = $('ci').value.trim();
    $('ci').value = '';
    if (!m || Date.now() - lastChat < 1000) {
      return;
    }
    lastChat = Date.now();
    chatPush({
      n: me.n, m: m.slice(0, 140), t: TS()
    });
    mission('chat');
  }
  $('ci').onkeydown = e => {
    if (e.key === 'Enter') {
      chat();
    }
    if (e.key === 'Escape') {
      $('ci').blur();
    }
    e.stopPropagation();
  };
  addEventListener('keydown', e => {
    if (!uid || document.activeElement === $('ci') || !$('pn').hidden) {
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'enter') {
      $('ci').focus();
      e.preventDefault();
      return;
    }
    if (k === 'e') {
      return sip();
    }
    const v = {
      arrowup: [0,
      -1],
      w: [0,
      -1],
      arrowdown: [0,
      1],
      s: [0,
      1],
      arrowleft: [-1,
      0],
      a: [-1,
      0],
      arrowright: [1,
      0],
      d: [1,
      0]
    }[k];
    if (v) {
      e.preventDefault();
      moveDir(v[0], -v[1]);
    }
  });
  const ptr = new Map();
  let joy = null;
  let pinch = 0;
  const jy = $('joy');
  const kn = $('knob');
  cv.addEventListener('pointerdown', e => {
    if (!uid) {
      return;
    }
    cv.setPointerCapture(e.pointerId);
    const o = {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      t: performance.now(),
      mv: 0,
      j: e.pointerType === 'touch'
        && e.clientX < innerWidth * .45
        && !joy
    };
    if (o.j) {
      joy = o;
      jy.style.left = o.sx + 'px';
      jy.style.top = o.sy + 'px';
      kn.style.transform = '';
      jy.hidden = false;
    }
    ptr.set(e.pointerId, o);
  });
  cv.addEventListener('pointermove', e => {
    const o = ptr.get(e.pointerId);
    if (!o) {
      return;
    }
    const dx = e.clientX - o.x;
    const dy = e.clientY - o.y;
    o.x = e.clientX;
    o.y = e.clientY;
    o.mv += Math.abs(dx) + Math.abs(dy);
    if (ptr.size === 2) {
      const v = [...ptr.values()];
      const d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
      if (pinch) {
        camDist = clamp(camDist - (d - pinch) * .03, 4, 24);
      }
      pinch = d;
      return;
    }
    pinch = 0;
    if (o.j) {
      const vx = o.x - o.sx;
      const vy = o.y - o.sy;
      const l = Math.hypot(vx, vy);
      const k = l > 50 ? 50 / l : 1;
      kn.style.transform = `translate(${vx * k}px,${vy * k}px)`;
    }
    else {
      camYaw -= dx * .006;
      camPitch = clamp(camPitch + dy * .004, .25, 1.0);
    }
  });
  const pup = e => {
    const o = ptr.get(e.pointerId);
    if (!o) {
      return;
    }
    ptr.delete(e.pointerId);
    pinch = 0;
    if (o.j) {
      joy = null;
      jy.hidden = true;
    }
    if (o.mv < 12 && performance.now() - o.t < 450) {
      clickAt(e.clientX, e.clientY);
    }
  };
  cv.addEventListener('pointerup', pup);
  cv.addEventListener('pointercancel', pup);
  cv.addEventListener('wheel', e => {
    camDist = clamp(camDist + e.deltaY * .01, 4, 24);
    e.preventDefault();
  }, { passive: false });
  setInterval(() => {
    if (!joy || !uid) {
      return;
    }
    const vx = joy.x - joy.sx;
    const vy = joy.y - joy.sy;
    const l = Math.hypot(vx, vy);
    if (l > 14) {
      moveDir(vx / l, -vy / l);
    }
  }, 150);
  function panel(h, name) {
    cur = name;
    $('pn').innerHTML = '<div class="box">'
      + h
      + '<button data-a="close" class="cl">Đóng</button></div>';
    $('pn').hidden = false;
  }
  const HD = {
    sit: () => sitToggle(),
    theme(id) {
      const t = tracks.find(x => x.id === id);
      if (t) {
        const ks = THEMES.slice(1).map(x => x[0]);
        db.ref('tracks/' + id + '/list').set(ks[(ks.indexOf(t.list) + 1) % ks.length]);
      }
    },
    plist() {
      const num = k => Object.values(PR).filter(v => (v.pl || 'chung') === k).length;
      panel('<h3>🎧 Danh sách phát</h3><p class="sm">Chọn chủ đề nhạc. Những người cùng chọn một danh sách sẽ thấy nhau, '
        + 'trò chuyện và nghe chung. Nhạc tự phát, không cần chờ admin.</p>'
        + THEMES.map(x => '<div class="row"><button data-a="room" data-v="' + x[0] + '"'
          + (x[0] === room ? ' style="border-color:#7fe08a"' : '') + '>' + (x[0] === room ? '✔ ' : '') + x[1]
          + '<span class="sm"> · ' + roomTracks(x[0]).length + ' bài · ' + num(x[0]) + ' người</span></button></div>').join(''),
      'plist');
    },
    room(k) {
      if (!themeOk(k) || k === room) {
        return HD.close();
      }
      room = k;
      localStorage.tp_pl = k;
      myRef.update({ pl: k });
      $('log').textContent = '';
      Object.keys(P).forEach(x => {
        rm(P[x]);
        delete P[x];
      });
      Object.keys(PR).forEach(x => {
        if (x !== uid) {
          syncPlayer(x, true);
        }
      });
      cnt();
      watchOver();
      watchReq();
      now = null;
      recomputeNow();
      if (!now) {
        syncAudio();
      }
      HD.close();
      toast('🎧 Bạn đã vào danh sách phát: ' + THEMES.find(x => x[0] === k)[1]);
    },
    pwt(id) {
      const i = $(id);
      const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      const b = document.querySelector('[data-a="pwt"][data-v="' + id + '"]');
      if (b) {
        b.textContent = show ? '🙈' : '👁';
      }
    },
    close() {
      cur = '';
      $('pn').hidden = true;
    },
    emo: v => doAct(v, 0), stg: v => doAct(v, 1), sip,
    req() {
      const T = liveVotes();
      const mine = reqs[uid] && reqs[uid].t > lastClose() ? reqs[uid].k : '';
      const L = roomTracks(room).slice().sort((x, y) => ((T[y.id] || {}).s || 0) - ((T[x.id] || {}).s || 0));
      let h = '<h3>🎶 Xin bài & bình chọn</h3><p class="sm">Danh sách phát: <b>' + esc(THEMES.find(x => x[0] === room)[1])
        + '</b>. Chọn bài bạn muốn nghe tiếp theo. Bài nhiều phiếu nhất sẽ được chèn ngay sau bài đang phát '
        + '(phiếu chốt ở ' + (VOTE_CLOSE_MS / 1000) + ' giây cuối của bài). Mỗi người một phiếu, bấm lại để rút phiếu. '
        + (isDonorMe ? '🏅 Bạn là Mạnh thường quân nên phiếu của bạn tính <b>x2</b>.'
          : 'Ai đã ủng hộ qua 💝 được tính phiếu <b>x2</b>.') + '</p>';
      h += L.length ? L.map(t => {
        const o = T[t.id];
        const cur2 = now && now.trackId === t.id;
        return '<div class="row"><button data-a="vote" data-v="' + esc(t.id) + '"' + (cur2 ? ' disabled' : '') + '>'
          + (cur2 ? '▶ ' : mine === t.id ? '✔ ' : '🗳 ') + esc(t.title) + ' — ' + esc(t.artist)
          + '<span class="sm"> · ' + (o ? o.s + ' phiếu' : 'chưa có phiếu') + '</span></button></div>';
      }).join('') : '<p class="sm">Danh sách phát này chưa có bài.</p>';
      h += '<hr><div class="row"><button data-a="reqtext">✍ Nhắn tên bài khác cho ca sĩ</button></div>';
      panel(h, 'vote');
    },
    vote(id) {
      const t = tracks.find(x => x.id === id);
      if (!uid || !t) {
        return;
      }
      if (now && now.trackId === id) {
        return toast('Bài này đang phát rồi 🎵');
      }
      const ref = db.ref('requests/' + room + '/' + uid);
      if (reqs[uid] && reqs[uid].k === id && reqs[uid].t > lastClose()) {
        ref.remove();
        return toast('Đã rút phiếu');
      }
      ref.set({ k: id, w: isDonorMe ? 2 : 1, t: TS() }).then(
        () => toast('🗳 Đã bình chọn: ' + t.title + (isDonorMe ? ' (phiếu x2)' : ''))
      ).catch(
        () => toast('Chưa gửi được phiếu, thử lại nhé')
      );
    },
    reqtext() {
      const t = (prompt('Bạn muốn nghe bài gì?') || '').trim().slice(0, 100);
      if (t) {
        chatPush({
          n: '', m: '🎶 ' + me.n + ' yêu cầu: ' + t, s: 1, t: TS()
        });
        toast('Đã gửi yêu cầu cho ca sĩ');
      }
    },
    menu() {
      panel('<h3>📋 Menu gọi nước</h3>'
        + DR.map(
          (d, i) => `<div class="row"><button data-a="order" data-v="${i}">${d[0]} ${d[1]}</button></div>`
        ).join(
          ''
        ) +
        (me.d >= 0
          ? '<div class="row"><button data-a="refill">♨️ Châm thêm nước nóng</button></div>'
          : '') + '<p class="sm">Bạn cần ngồi vào ghế trước khi gọi.</p>', 'menu');
    },
    order(i) {
      if (!seated()) {
        return toast('Hãy chọn một chỗ ngồi trước nhé 🪑');
      }
      me.d = +i;
      me.lv = 100;
      myRef.update({ d: me.d });
      addScore(2, false, 'act');
      mission('order');
      AE.bell();
      HD.close();
      toast(DR[i][0] + ' ' + DR[i][1] + ' đã được mang tới bàn');
    },
    refill() {
      me.lv = 100;
      AE.sip();
      HD.close();
      toast('Đã châm thêm nước nóng ♨️');
    },
    lineup() {
      const shown = tracks.filter(t => room === 'chung' || t.list === room);
      let h = '<h3>🗓 Bảng lịch diễn</h3>'
        + '<p class="sm">Danh sách phát: <b>' + esc(THEMES.find(x => x[0] === room)[1])
        + '</b></p><div class="row"><button data-a="plist">🎧 Đổi danh sách phát</button></div>'
        + (shown.length
          ? shown.map(
            t => (`<div class="row"><button data-a="play" data-v="${esc(t.id)}" ${isAdmin ? '' : 'disabled'}>` +
              `${now && now.trackId === t.id ? '▶ ' : ''}${t.g === 'f' ? '👩‍🎤' : t.g === 'd' ? '👫' : t.g === 'dm' ? '👬' : t.g === 'df' ? '👭' : '🧑‍🎤'} ` +
              `${esc(t.title)} — ${esc(t.artist)}</button>` +
              `${isAdmin ? `<button data-a="flip" data-v="${esc(t.id)}" title="Đổi ca sĩ nam/nữ">⚥</button><button data-a="theme" data-v="${esc(t.id)}" title="Đổi chủ đề">🏷</button><button data-a="del" data-v="${esc(t.id)}">🗑</button>` : ''}</div>`)
          ).join(
            ''
          )
          : '<p class="sm">Chưa có bài nào. Đang phát nhạc nền mặc định.</p>');
      h += isAdmin
        ? ('<hr><h4>🎛 Admin: thêm bài</h4><input id="ti" placeholder="Tên bài hát">' +
          '<br><br><input id="ar" placeholder="Ca sĩ"><br><br><input id="ur" placeholder="Đường dẫn: ' +
          ('music/ten-file.mp3 hoặc link mp3"><br><br>' +
            '<select id="sg" style="width:100%;padding:8px;border-radius:8px;background:#2a170c;color:inherit">') +
          '<option value="m">Ca sĩ nam (mặc vest)</option><option value="f">' +
          'Ca sĩ nữ (mặc áo dài)</option><option value="d">Song ca nam + nữ</option>' +
          '<option value="dm">Song ca nam + nam</option><option value="df">Song ca nữ + nữ</option></select><br><br>' +
          '<select id="sl" style="width:100%;padding:8px;border-radius:8px;background:#2a170c;color:inherit">' +
          THEMES.slice(1).map(x => '<option value="' + x[0] + '">Chủ đề: ' + esc(x[1]) + '</option>').join('') +
          '</select><br><br><button data-a="add" style="width:100%">' +
          'Thêm vào lịch diễn</button><br><br><button data-a="alogout">' +
          'Đăng xuất admin</button>')
        : ('<p class="sm">Chỉ admin mới thêm và chuyển bài.</p>' +
          '<p class="sm">Tài khoản hiện tại: ' + esc((auth.currentUser && (auth.currentUser.email || 'ẩn danh')) || '') +
          '<br>UID: <b>' + esc(uid || '') + '</b><br>Nếu đây là tài khoản admin, hãy thêm UID này vào <code>admins</code> trên Firebase (giá trị <code>true</code>).</p>' +
          '<button data-a="alogin">' +
          'Đăng nhập admin</button>');
      panel(h, 'lineup');
    },
    play(id) {
      db.ref('stage/' + room + '/now').set({ trackId: id, startedAt: Date.now() + off + INTRO_MS }).catch(
        () => toast('Bạn không có quyền admin')
      );
    },
    del(id) {
      db.ref('tracks/' + id).remove();
    },
    flip(id) {
      const t = tracks.find(x => x.id === id);
      if (t) {
        db.ref('tracks/' + id + '/g').set({ m: 'f', f: 'd', d: 'dm', dm: 'df', df: 'm' }[t.g || 'm'] || 'm');
      }
    },
    add() {
      const title = $('ti').value.trim();
      const artist = $('ar').value.trim() || 'Ca sĩ';
      const url = $('ur').value.trim();
      if (!title || !url) {
        return toast('Nhập tên bài và đường dẫn');
      }
      const a = new Audio(url);
      const save = dur => db.ref('tracks').push({
        title: title.slice(0,
        80),
        artist: artist.slice(0,
        40),
        url,
        dur,
        g: $('sg').value,
        list: $('sl').value,
        ord: Date.now()
      }).then(() => toast('Đã thêm bài ✅'));
      a.onloadedmetadata = () => save(a.duration || 0).then(() => {
        if (!now) {
          db.ref('tracks').orderByChild('ord').limitToLast(1).once(
            'value',
            s => s.forEach(x => HD.play(x.key))
          );
        }
      });
      a.onerror = () => toast('Không đọc được file nhạc, kiểm tra lại đường dẫn');
    },
    alogin() {
      panel(('<h3>Đăng nhập admin</h3><input id="em" type="email" placeholder="Email">' +
        '<br><br><span class="pw"><input id="pw" type="password" placeholder="Mật khẩu">' +
        '<button type="button" class="eye" data-a="pwt" data-v="pw" title="Hiện / ẩn mật khẩu">👁</button></span>' +
        '<br><br><button data-a="dologin" style="width:100%">Đăng nhập</button>'), 'login');
    },
    dologin() {
      auth.signInWithEmailAndPassword($('em').value.trim(), $('pw').value).then(
        () => location.reload()
      ).catch(
        e => toast('Đăng nhập thất bại: ' + e.code)
      );
    },
    alogout() {
      myRef.remove();
      auth.signOut().then(() => location.reload());
    },
    mix() {
      panel('<h3>🎚 Bộ trộn âm thanh</h3>' + [[
          'rain', '🌧 Tiếng mưa (bật ở nút 🌧)', mixV.rain
        ], [
          'music', '🎼 Nhạc & piano', mixV.music
        ]].map(x => (`<label>${x[1]}<input type="range" min="0" max="1" step="0.05" value="${x[2]}" data-k="${x[0]}">` +
          `</label><br>`)).join(''), 'mix');
    },
    rank() {
      panel(
        '<h3>🏆 Top Thư Thái</h3>'
          + (rank.length
            ? rank.map(
              (r, i) => `<div class="row"><span>${i + 1}. ${esc(r.n)} — ${r.s} · ${lvn(r.s)}</span></div>`
            ).join(
              ''
            )
            : '<p class="sm">Chưa có dữ liệu</p>')
          + `<p class="sm">Cấp của bạn: ${lvn(score)} (${score} điểm)</p>`,
        'rank'
      );
    },
    levels() {
      const L = lvl(score);
      const pct = Math.round((score - lvPrev(score)) / (lvNext(score) - lvPrev(score)) * 100);
      panel(
        '<h3>⭐ Cấp ' + L + ' · ' + lvn(score) + '</h3>'
        + '<p class="sm">' + score + ' / ' + lvNext(score) + ' điểm để lên Cấp ' + (L + 1) + ' (' + pct + '%)'
        + (lvBonus(score) ? ' · thưởng điểm +' + Math.round(lvBonus(score) * 100) + '%' : '') + '</p>'
        + '<h4>🎁 Quà theo cấp</h4>'
        + REW.map(r => '<div class="row"><span>' + (L >= r[0] ? '✅' : '🔒') + ' Cấp ' + r[0] + ': ' + r[1] + '</span></div>').join('')
        + '<p class="sm">Mỗi cấp cần nhiều hơn cấp trước 100 điểm (Cấp 2 = 100, Cấp 3 = 300, Cấp 4 = 600...).</p>'
        + '<p class="sm">Điểm Thư Thái nhận từ điểm danh, nhiệm vụ, nhấp trà, tặng hoa cho ca sĩ.</p>'
        + '<p class="sm">🍃 Hôm nay còn ' + budget('act') + '/' + CAP.act + ' điểm nhấp trà, gọi nước, cổ vũ và ' + budget('gift') + '/' + CAP.gift
        + ' điểm từ quà bạn bè. Nhiệm vụ và điểm danh không nằm trong mức này, hãy làm đều mỗi ngày để lên cấp đều đặn.</p>',
        'levels'
      );
    },
    checkin: ckPanel,
    ckclaim: ckClaim,
    logout() {
      localStorage.removeItem('tp_score');
      localStorage.removeItem('tp_ms');
      localStorage.removeItem('tp_ck');
      localStorage.removeItem('tp_z');
      auth.signOut().then(() => location.reload());
    },
    quest() {
      const m = mst();
      panel('<h3>📜 Nhiệm vụ hôm nay</h3>' + MS.map(q => {
        const v = Math.min(m.p[q[0]] || 0, q[2]);
        return (`<div style="text-align:left;margin:8px 0">${m.ok[q[0]] ? '✅' : '⬜'} ${esc(q[1])} <span class="sm">` +
          `(${v}/${q[2]} · +${q[3]})</span><div style="height:6px;background:#0006;border-radius:3px">` +
          `<div style="height:6px;border-radius:3px;background:#e8b86a;width:${v / q[2] * 100}%">` +
          `</div></div></div>`);
      }).join('') +
        (`${acctRow()}<p class="sm">Xong cả 5 nhiệm vụ: +20 Thư Thái.</p><h3>🏅 Nhiệm vụ tuần</h3>` +
          `<div style="text-align:left">${m.wok ? '✅' : '⬜'} Nhấp trà 100 ngụm <span class="sm">` +
          `(${Math.min(m.wp || 0, 100)}/100 · +40)</span></div>`), 'quest');
    },
    rain() {
      rainOn = !rainOn;
      AE.vol('rain', rainOn ? mixV.rain : 0);
      winDirty = true;
      $('rainb').textContent = rainOn ? '🌧 Tắt mưa' : '🌧 Bật mưa';
      toast(rainOn ? 'Đã bật tiếng mưa 🌧' : 'Đã tắt tiếng mưa');
    },
    leave() {
      myRef.remove();
      location.reload();
    }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b && HD[b.dataset.a]) {
      HD[b.dataset.a](b.dataset.v);
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'ddk') {
      HD.ddk();
    }
  });
  document.addEventListener('input', e => {
    const k = e.target.dataset.k;
    if (k) {
      mixV[k] = +e.target.value;
      AE.vol(k, k === 'rain' && !rainOn ? 0 : mixV[k]);
      if (k === 'music') {
        au.volume = mixV[k];
      }
    }
  });
  function fName(k) {
    return (P[k] && P[k].n) || (FR.list[k] && FR.list[k].n) || (FR.req[k] && FR.req[k].n) || 'Người lạ';
  }
  function fBadge() {
    const b = $('frb');
    const n = Object.keys(FR.req).length;
    if (b) {
      b.textContent = '👥 Bạn bè' + (n ? ' 🔴' + n : '');
    }
  }
  function fRefresh() {
    fBadge();
    for (const k in P) {
      P[k]._k = null;
    }
    if (cur === 'friends') {
      HD.friends();
    }
    else if (cur === 'profile' && FR.pk) {
      HD.profile(FR.pk);
    }
  }
  function fInit() {
    if (!acct) {
      return;
    }
    db.ref('friends/' + uid).on('value', s => {
      FR.list = s.val() || {};
      fRefresh();
    });
    db.ref('gifts/' + uid).on('child_added', s => fGetGift(s.key, s.val()));
    db.ref('friendReq/' + uid).on('value', s => {
      const nv = s.val() || {};
      if (FR.ready) {
        for (const k in nv) {
          if (!FR.req[k]) {
            toast('💌 ' + nv[k].n + ' muốn kết bạn với bạn');
          }
        }
      }
      FR.req = nv;
      FR.ready = true;
      fRefresh();
    });
  }
  function fAdd(k) {
    if (!acct) {
      return toast('Hãy đăng ký / đăng nhập để kết bạn nhé 💌');
    }
    if (k === uid) {
      return;
    }
    if (FR.list[k]) {
      return toast('Hai bạn đã là bạn bè rồi 💛');
    }
    if (FR.req[k]) {
      return fAcc(k);
    }
    if (P[k] && !P[k].r) {
      return toast('Người này đang chơi với tư cách khách nên chưa kết bạn được');
    }
    if (Date.now() - FR.last < 2000) {
      return;
    }
    FR.last = Date.now();
    db.ref('friendReq/' + k + '/' + uid).set({
      n: me.n, g: me.av, c: me.c, s: score, t: TS()
    }).then(() => {
      FR.sent[k] = 1;
      toast('💌 Đã gửi lời mời kết bạn tới ' + fName(k));
      fRefresh();
    }).catch(() => toast('Không gửi được lời mời. Bạn đã dán lại database.rules.json chưa?'));
  }
  function fAcc(k) {
    const r = FR.req[k];
    if (!r) {
      return;
    }
    const u = {};
    u['friends/' + uid + '/' + k] = { n: r.n, t: TS() };
    u['friends/' + k + '/' + uid] = { n: me.n, t: TS() };
    u['friendReq/' + uid + '/' + k] = null;
    db.ref().update(u)
      .then(() => toast('🎉 Bạn và ' + r.n + ' đã là bạn bè'))
      .catch(() => toast('Không chấp nhận được, thử lại sau'));
  }
  Object.assign(HD, {
    fadd: k => fAdd(k),
    facc: k => fAcc(k),
    fdec(k) {
      db.ref('friendReq/' + uid + '/' + k).remove().then(() => toast('Đã từ chối lời mời'));
    },
    funf(k) {
      if (!confirm('Hủy kết bạn với ' + fName(k) + '?')) {
        return;
      }
      const u = {};
      u['friends/' + uid + '/' + k] = null;
      u['friends/' + k + '/' + uid] = null;
      db.ref().update(u).then(() => {
        delete FR.sent[k];
        toast('Đã hủy kết bạn');
      });
    },
    fgo(k) {
      const p = P[k];
      if (!p) {
        return toast('Bạn này đang không ở trong phòng');
      }
      goto(p.x + 40, p.y + 40);
      HD.close();
      toast('🚶 Đang đi tới chỗ ' + p.n);
    },
    fhi(k) {
      const p = P[k];
      if (!p) {
        return;
      }
      chatPush({
        n: '', m: '👋 ' + me.n + ' chào ' + p.n + ', mình làm quen nhé!', s: 1, u: uid, t: TS()
      });
      doAct('👋', 0);
      HD.close();
    },
    ftab(v) {
      HD.friends(v);
    },
    friends(tab) {
      if (!acct) {
        return panel('<h3>👥 Bạn bè</h3><p class="sm">Đăng ký hoặc đăng nhập ở màn hình vào phòng để kết bạn, '
          + 'làm quen và thấy bạn bè online nhé.</p>', 'friends');
      }
      if (tab === 'f' || tab === 'q' || tab === 's') {
        FR.tab = tab;
      }
      const nreq = Object.keys(FR.req).length;
      const tabs = '<div class="tabs">'
        + [['f', '💛 Bạn bè'], ['q', '💌 Lời mời' + (nreq ? ' (' + nreq + ')' : '')], ['s', '✨ Làm quen']]
          .map(t => '<button data-a="ftab" data-v="' + t[0] + '"' + (FR.tab === t[0] ? ' class="on"' : '') + '>'
            + t[1] + '</button>').join('')
        + '</div>';
      let body = '';
      if (FR.tab === 'f') {
        const ks = Object.keys(FR.list).sort((a, b) => (P[b] ? 1 : 0) - (P[a] ? 1 : 0)
          || String(fName(a)).localeCompare(fName(b)));
        body = ks.length
          ? ks.map(k => {
            const on = !!P[k];
            const lv = on ? ' · Cấp ' + lvl(P[k].s) : '';
            return '<div class="row"><button data-a="fgo" data-v="' + esc(k) + '"' + (on ? '' : ' disabled') + '>'
              + (on ? '🟢 ' : '⚪ ') + esc(fName(k)) + '<span class="sm">' + (on ? lv + ' · đang online, bấm để đến gần' : ' · ngoại tuyến') + '</span></button>'
              + '<button data-a="fgift" data-v="' + esc(k) + '" title="Tặng quà">🎁</button>'
              + '<button data-a="funf" data-v="' + esc(k) + '" title="Hủy kết bạn">🗑</button></div>';
          }).join('')
          + '<p class="sm">' + ks.length + ' bạn · ' + ks.filter(k => P[k]).length + ' đang online</p>'
          : '<p class="sm">Chưa có bạn bè. Sang tab ✨ Làm quen hoặc bấm vào một người trong phòng để kết bạn.</p>';
      }
      else if (FR.tab === 'q') {
        const ks = Object.keys(FR.req);
        body = ks.length
          ? ks.map(k => {
            const r = FR.req[k];
            return '<div class="row"><span style="flex:1;text-align:left">💌 ' + esc(r.n)
              + ' <span class="sm">Cấp ' + lvl(r.s) + '</span></span>'
              + '<button data-a="facc" data-v="' + esc(k) + '" title="Chấp nhận">✅</button>'
              + '<button data-a="fdec" data-v="' + esc(k) + '" title="Từ chối">✖</button></div>';
          }).join('')
          : '<p class="sm">Không có lời mời nào đang chờ.</p>';
      }
      else {
        const ks = Object.keys(P).filter(k => k !== uid && !FR.list[k])
          .sort((a, b) => Math.hypot(P[a].x - me.x, P[a].y - me.y) - Math.hypot(P[b].x - me.x, P[b].y - me.y));
        body = ks.length
          ? '<p class="sm">Những người đang trong phòng, gần bạn nhất ở trên cùng.</p>' + ks.map(k => {
            const p = P[k];
            const near = Math.hypot(p.x - me.x, p.y - me.y) < 250;
            const act = !p.r ? '<button disabled title="Khách chưa đăng ký">🚫</button>'
              : FR.req[k] ? '<button data-a="facc" data-v="' + esc(k) + '">✅ Nhận</button>'
              : FR.sent[k] ? '<button disabled>⏳</button>'
              : '<button data-a="fadd" data-v="' + esc(k) + '">➕ Kết bạn</button>';
            return '<div class="row"><button data-a="profile" data-v="' + esc(k) + '">' + (p.av === 'f' ? '🚺 ' : '🚹 ')
              + esc(p.n) + '<span class="sm"> · Cấp ' + lvl(p.s) + (near ? ' · ở gần bạn' : '') + (p.r ? '' : ' · khách')
              + '</span></button>' + act + '</div>';
          }).join('')
          : '<p class="sm">Hiện chưa có ai khác trong phòng. Quay lại sau nhé!</p>';
      }
      panel('<h3>👥 Bạn bè</h3>' + tabs + body, 'friends');
    },
    profile(k) {
      const p = P[k];
      if (!p) {
        return;
      }
      FR.pk = k;
      let act;
      if (!acct) {
        act = '<p class="sm">Đăng ký tài khoản để kết bạn với mọi người.</p>';
      }
      else if (FR.list[k]) {
        act = '<p>💛 Hai bạn là bạn bè</p><div class="row"><button data-a="fgift" data-v="' + esc(k) + '">🎁 Tặng quà</button>'
          + '<button data-a="funf" data-v="' + esc(k) + '">Hủy kết bạn</button></div>';
      }
      else if (FR.req[k]) {
        act = '<div class="row"><button data-a="facc" data-v="' + esc(k) + '">✅ Chấp nhận lời mời</button>'
          + '<button data-a="fdec" data-v="' + esc(k) + '">✖</button></div>';
      }
      else if (!p.r) {
        act = '<p class="sm">Người này đang chơi với tư cách khách nên chưa kết bạn được.</p>';
      }
      else if (FR.sent[k]) {
        act = '<p class="sm">⏳ Đã gửi lời mời, đang chờ ' + esc(p.n) + ' trả lời</p>';
      }
      else {
        act = '<div class="row"><button data-a="fadd" data-v="' + esc(k) + '">➕ Kết bạn</button></div>';
      }
      panel('<h3>' + (p.av === 'f' ? '🚺 ' : '🚹 ') + esc(p.n) + '</h3>'
        + '<p class="sm">Cấp ' + lvl(p.s) + ' · ' + lvn(p.s) + '</p>'
        + '<div class="row"><button data-a="fhi" data-v="' + esc(k) + '">👋 Chào làm quen</button>'
        + '<button data-a="fgo" data-v="' + esc(k) + '">🚶 Đến gần</button></div>' + act, 'profile');
    }
  });
  function fGetGift(key, g) {
    const ref = db.ref('gifts/' + uid + '/' + key);
    const it = g && GF[g.k];
    if (!it) {
      return ref.remove();
    }
    ref.transaction(c => (c === null ? undefined : null), (err, ok) => {
      if (err || !ok) {
        return;
      }
      const got = addScore(it[3], true, 'gift');
      AE.fanfare();
      toast('🎁 ' + (g.n || 'Bạn bè') + ' tặng bạn ' + it[0] + ' ' + it[1] + (got ? ' +' + got + ' 🍃' : ''));
      for (let i = 0; i < 5; i++) {
        fx.push({
          e: it[0], sx: me.x, sy: me.y, tx: me.x + (Math.random() - .5) * 90, ty: me.y + (Math.random() - .5) * 90, t: -i * .1
        });
      }
    });
  }
  const gdLoad = () => {
    try {
      const c = JSON.parse(localStorage.tp_gd);
      return c.d === dkey(new Date()) ? c : { d: c.d, n: 0 };
    }
    catch (e) {
      return { d: dkey(new Date()), n: 0 };
    }
  };
  Object.assign(HD, {
    fgift: k => HD.gift(k),
    gift(k) {
      if (!FR.list[k]) {
        return toast('Chỉ tặng quà được cho bạn bè 💛');
      }
      const L = lvl(score);
      const left = GF_DAY - (gdLoad().d === dkey(new Date()) ? gdLoad().n : 0);
      panel('<h3>🎁 Tặng quà cho ' + esc(fName(k)) + '</h3>'
        + '<p class="sm">Hôm nay còn ' + Math.max(0, left) + '/' + GF_DAY + ' quà. Bạn nhận +2 🍃 mỗi quà, bạn bè nhận điểm theo quà.</p>'
        + GF.map((g, i) => '<div class="row"><button data-a="gsend" data-v="' + esc(k) + ':' + i + '"'
          + (L < g[2] || left <= 0 ? ' disabled' : '') + '>' + g[0] + ' ' + g[1]
          + ' <span class="sm">· bạn nhận +' + g[3] + ' 🍃' + (L < g[2] ? ' · 🔒 Cấp ' + g[2] : '') + '</span></button></div>').join(''),
      'gift');
    },
    gsend(v) {
      const [k, i] = String(v).split(':');
      const g = GF[+i];
      if (!g || !FR.list[k]) {
        return;
      }
      if (lvl(score) < g[2]) {
        return toast('Cần Cấp ' + g[2] + ' để tặng ' + g[1]);
      }
      const d = gdLoad();
      if (d.n >= GF_DAY) {
        return toast('Hôm nay bạn đã tặng đủ ' + GF_DAY + ' quà rồi');
      }
      if (Date.now() - FR.last < 1200) {
        return;
      }
      FR.last = Date.now();
      db.ref('gifts/' + k).push({ f: uid, n: me.n, k: +i, t: TS() }).then(() => {
        d.d = dkey(new Date());
        d.n++;
        localStorage.tp_gd = JSON.stringify(d);
        addScore(2, true);
        toast('🎁 Đã tặng ' + g[0] + ' cho ' + fName(k));
        chatPush({
          n: '', m: '🎁 ' + me.n + ' tặng ' + fName(k) + ' ' + g[0] + ' ' + g[1], s: 1, u: uid, t: TS()
        });
        const p = P[k];
        for (let j = 0; p && j < 4; j++) {
          fx.push({
            e: g[0], sx: me.x, sy: me.y, tx: p.x, ty: p.y, t: -j * .12
          });
        }
        HD.gift(k);
      }).catch(() => toast('Không gửi được quà. Bạn đã dán lại database.rules.json chưa?'));
    },
    cos(v) {
      if (typeof v === 'string' && v.includes(':')) {
        const [t, i] = v.split(':');
        const a = zp(me.z);
        a[{ n: 0, b: 1, e: 2 }[t]] = +i;
        me.z = zClean(a.join('.'), score);
        localStorage.tp_z = me.z;
        if (myRef) {
          myRef.update({ z: me.z });
        }
        saveAcct();
        me._k = null;
      }
      const L = lvl(score);
      const z = zp(me.z);
      const sect = (title, T, t, f) => '<h4>' + title + '</h4><div class="tabs" style="flex-wrap:wrap">'
        + T.map((o, i) => '<button data-a="cos" data-v="' + t + ':' + i + '"' + (z[{ n: 0, b: 1, e: 2 }[t]] === i ? ' class="on"' : '')
          + (zCan(o) ? '' : ' disabled') + ' style="min-width:30%">' + (zCan(o) ? f(o) : o[3] ? '🔒 ' + o[1] + ' · cửa hàng' : '🔒 Cấp ' + o[0]) + '</button>').join('')
        + '</div>';
      const nc = ZN[z[0]][2] || '#ffd27a';
      panel('<h3>🎨 Cá nhân hóa</h3><p style="font-weight:700;' + (nc === 'rainbow' ? 'background:linear-gradient(90deg,#ff6b6b,#ffd24a,#7fe08a,#6bb8ff,#c9a0ff);-webkit-background-clip:text;background-clip:text;color:transparent' : 'color:' + nc) + '">'
        + esc((ZB[z[1]][2] ? ZB[z[1]][2] + ' ' : '') + me.n) + '</p>'
        + sect('Màu tên', ZN, 'n', o => o[1])
        + sect('Huy hiệu cạnh tên', ZB, 'b', o => (o[2] ? o[2] + ' ' : '') + o[1])
        + sect('Hiệu ứng khi biểu cảm', ZE, 'e', o => (o[2] ? o[2] + ' ' : '') + o[1])
        + '<p class="sm">🛋 Sofa VIP sát sân khấu: Cấp 5 trở lên. Lên cấp để mở thêm lựa chọn, mọi người đều thấy bạn đã chọn. Vật phẩm 🔒 "cửa hàng" mua ở nút 🛍 Cửa hàng.</p>', 'cos');
    }
  });
  const SH = { orders: {}, all: {}, donors: [], zWait: false, adm: false, ownReady: false, closed: 0, rev: 0 };
  const vnYear = () => new Date(Date.now() + 7 * 3600e3).getUTCFullYear();
  const yearEnd = y => Date.UTC(y + 1, 0, 1) - 7 * 3600e3;
  const isClosed = () => SH.closed > Date.now() + off;
  const closedMsg = () => isClosed()
    ? '<p style="color:#f0c060">🙏 Cửa hàng và ủng hộ đang tạm nghỉ, sẽ mở lại ngày 1/1/' + new Date(SH.closed + 7 * 3600e3).getUTCFullYear()
      + '. Cảm ơn mọi người đã đồng hành cùng phòng trà!</p>' : '';
  const money = n => Number(n).toLocaleString('vi-VN') + 'đ';
  const skuLabel = o => o.sku === 'donate' ? '💝 Ủng hộ' : o.sku === 'dd' ? '🎁 Tặng bài hát' : ((ITEMS.find(x => x[0] === o.sku) || [])[1] || o.sku);
  const ITEMS = [];
  [[ZN, '🎨 Màu tên'], [ZB, '🏷 Huy hiệu'], [ZE, '✨ Hiệu ứng']].forEach(g => g[0].forEach(o => {
    if (o[3]) {
      ITEMS.push([o[3], (o[2] && o[2] !== 'rainbow' && !o[2].startsWith('#') ? o[2] + ' ' : '') + o[1], g[1]]);
    }
  }));
  function zApply() {
    me.z = zClean(localStorage.tp_z, score);
    me._k = null;
    if (myRef) {
      myRef.update({ z: me.z });
    }
  }
  function sInit() {
    db.ref('shop/closedUntil').on('value', s => {
      SH.closed = s.val() || 0;
      if (cur === 'shop') {
        HD.shop();
      }
      else if (cur === 'donate') {
        HD.donate();
      }
    });
    db.ref('donors').orderByChild('a').limitToLast(10).on('value', s => {
      SH.donors = [];
      s.forEach(x => {
        SH.donors.unshift(x.val());
      });
      if (cur === 'donate') {
        HD.donate();
      }
    });
    if (!acct) {
      return;
    }
    db.ref('owned/' + uid).on('value', s => {
      const nv = s.val() || {};
      if (SH.ownReady) {
        for (const k in nv) {
          if (!OWN[k]) {
            const it = ITEMS.find(x => x[0] === k);
            toast(k === 'bd_donor' ? '🏅 Cảm ơn bạn đã ủng hộ! Huy hiệu Mạnh thường quân đã mở'
              : '🎉 Đã nhận vật phẩm: ' + (it ? it[1] : k) + ' (vào 🎨 Cá nhân hóa để dùng)');
            AE.fanfare();
          }
        }
      }
      Object.keys(OWN).forEach(k => delete OWN[k]);
      Object.assign(OWN, nv);
      SH.ownReady = true;
      zApply();
      if (cur === 'shop') {
        HD.shop();
      }
      else if (cur === 'cos') {
        HD.cos();
      }
    });
    db.ref('orders/' + uid).on('value', s => {
      SH.orders = s.val() || {};
      if (cur === 'shop') {
        HD.shop();
      }
    });
  }
  function sAdminInit() {
    if (SH.adm) {
      return;
    }
    SH.adm = true;
    db.ref('dedics').limitToLast(60).on('value', s => {
      DD.all = {};
      s.forEach(x => {
        DD.all[x.key] = x.val();
      });
      const n = Object.values(DD.all).filter(v => !v.k).length;
      $('dedb').textContent = '🎁 Lời tặng' + (n ? ' 🔴' + n : '');
      if (cur === 'dedadm') {
        HD.dedadm();
      }
    });
    db.ref('revenue/' + vnYear()).on('value', s => {
      SH.rev = s.val() || 0;
      if (cur === 'orders') {
        HD.orders();
      }
    });
    db.ref('orders').on('value', s => {
      SH.all = {};
      s.forEach(u => {
        u.forEach(o => {
          if (o.val().s === 0) {
            SH.all[u.key + ':' + o.key] = o.val();
          }
        });
      });
      const n = Object.keys(SH.all).length;
      $('ordb').textContent = '🧾 Đơn hàng' + (n ? ' 🔴' + n : '');
      if (cur === 'orders') {
        HD.orders();
      }
    });
  }
  const newCode = () => 'PT' + Array.from(crypto.getRandomValues(new Uint8Array(6)),
    b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  const nPending = () => Object.values(SH.orders).filter(o => o.s === 0).length;
  let ordBusy = false;
  async function mkOrder(sku, amount, extra) {
    if (isClosed()) {
      return toast('Cửa hàng và ủng hộ tạm nghỉ, sẽ mở lại đầu năm sau 🙏');
    }
    if (amount > SHOP.maxTx) {
      return toast('Mỗi lần tối đa ' + money(SHOP.maxTx) + ', hãy chọn số tiền nhỏ hơn');
    }
    if (!acct) {
      return toast('Hãy đăng ký / đăng nhập để mua hàng và ủng hộ nhé 💌');
    }
    if (!SHOP.api) {
      return toast('Chủ game chưa cấu hình thanh toán (shop-config.js)');
    }
    if (nPending() >= 5) {
      return toast('Bạn đang có 5 đơn chờ, hãy hoàn tất hoặc hủy bớt đơn');
    }
    if (ordBusy) {
      return;
    }
    ordBusy = true;
    toast('Đang tạo link thanh toán...');
    try {
      const r = await fetch(SHOP.api.replace(/\/$/, '') + '/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await auth.currentUser.getIdToken() },
        body: JSON.stringify(Object.assign({ sku, amount: Math.round(amount) }, extra || {}))
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) {
        return toast(j.error || 'Không tạo được đơn, thử lại sau nhé');
      }
      SH.orders[j.id] = SH.orders[j.id] || { sku, a: j.amount, c: j.code, n: me.n, s: 0, url: j.url };
      if (sku === 'dd') {
        DD.sent = true;
      }
      HD.pay(j.id);
    }
    catch (e) {
      toast('Mất kết nối tới máy chủ thanh toán, thử lại sau nhé');
    }
    finally {
      ordBusy = false;
    }
  }
  Object.assign(HD, {
    shop() {
      if (!acct) {
        return panel('<h3>🛍 Cửa hàng</h3><p class="sm">Đăng ký hoặc đăng nhập ở màn hình vào phòng để mua vật phẩm.</p>', 'shop');
      }
      const pend = Object.entries(SH.orders).filter(([, o]) => o.s === 0);
      let h = '<h3>🛍 Cửa hàng vật phẩm</h3><p class="sm">Chỉ là đồ trang trí, không ảnh hưởng điểm hay cấp. '
        + 'Thanh toán qua payOS (quét QR chuyển khoản), tự động mở vật phẩm sau vài giây.</p>' + closedMsg();
      if (pend.length) {
        h += '<h4>⏳ Đơn chờ thanh toán</h4>' + pend.map(([id, o]) => {
          const it = ITEMS.find(x => x[0] === o.sku);
          return '<div class="row"><button data-a="pay" data-v="' + esc(id) + '">' + esc(skuLabel(o))
            + ' <span class="sm">· ' + money(o.a) + ' · mã ' + esc(o.c) + '</span></button></div>';
        }).join('');
      }
      let last = '';
      h += ITEMS.filter(it => SHOP.prices[it[0]]).map(it => {
        const g = it[2] !== last ? '<h4>' + it[2] + '</h4>' : '';
        last = it[2];
        return g + '<div class="row"><button' + (OWN[it[0]] ? ' data-a="cos" disabled' : ' data-a="buy" data-v="' + it[0] + '"') + '>'
          + esc(it[1]) + '<span class="sm"> · ' + (OWN[it[0]] ? '✅ đã sở hữu' : money(SHOP.prices[it[0]])) + '</span></button></div>';
      }).join('');
      panel(h + '<div class="row"><button data-a="cos">🎨 Mở Cá nhân hóa để dùng</button></div>', 'shop');
    },
    buy(sku) {
      if (!SHOP.prices[sku] || OWN[sku]) {
        return;
      }
      const dup = Object.entries(SH.orders).find(([, o]) => o.s === 0 && o.sku === sku);
      if (dup) {
        return HD.pay(dup[0]);
      }
      mkOrder(sku, SHOP.prices[sku]);
    },
    donate(v) {
      if (!acct) {
        return panel('<h3>💝 Ủng hộ</h3><p class="sm">Đăng ký hoặc đăng nhập để ủng hộ và nhận huy hiệu 🏅 Mạnh thường quân.</p>', 'donate');
      }
      if (v === 'x') {
        const t = +String(prompt('Nhập số tiền ủng hộ (đồng, từ ' + SHOP.minDonate + ' đến ' + SHOP.maxTx + '):') || '').replace(/\D/g, '');
        return t >= SHOP.minDonate && t <= SHOP.maxTx ? mkOrder('donate', t) : toast('Số tiền không hợp lệ');
      }
      if (v) {
        return mkOrder('donate', +v);
      }
      panel('<h3>💝 Ủng hộ phòng trà</h3><p class="sm">Mọi đóng góp giúp mình duy trì máy chủ, nhạc và làm thêm tính năng. '
        + 'Ủng hộ xong bạn nhận huy hiệu 🏅 Mạnh thường quân và được ghi tên trong bảng tri ân.</p>' + closedMsg()
        + '<div class="tabs" style="flex-wrap:wrap">' + SHOP.donateAmounts.map(a => '<button data-a="donate" data-v="' + a
          + '" style="min-width:45%">' + money(a) + '</button>').join('')
        + '<button data-a="donate" data-v="x" style="min-width:45%">✍ Số khác</button></div>'
        + '<h4>🏅 Bảng tri ân</h4>' + (SH.donors.length ? SH.donors.map((d, i) => '<div class="row"><span>' + (i + 1) + '. '
          + esc(d.n) + '</span></div>').join('') : '<p class="sm">Hãy là người đầu tiên 💛</p>'), 'donate');
    },
    pay(id) {
      const o = SH.orders[id];
      if (!o) {
        return;
      }
      const it = ITEMS.find(x => x[0] === o.sku);
      const ok = typeof o.url === 'string' && /^https:\/\//.test(o.url);
      panel('<h3>' + (o.sku === 'donate' ? '💝 Ủng hộ ' : o.sku === 'dd' ? '' : '🛍 ') + esc(o.sku === 'donate' ? money(o.a) : skuLabel(o)) + '</h3>'
        + (ok ? '<p>Số tiền: <b>' + money(o.a) + '</b> <span class="sm">· mã ' + esc(o.c) + '</span></p>'
          + '<div class="row"><a href="' + esc(o.url) + '" target="_blank" rel="noopener" '
          + 'style="display:block;flex:1;text-align:center;padding:10px;border-radius:10px;background:#d4a640;color:#1a1f3a;font-weight:bold;text-decoration:none">'
          + '💳 Mở trang thanh toán payOS</a></div>'
          + '<p class="sm">Số tiền đã được cố định, bạn chỉ cần quét QR và chuyển <b>đúng số tiền</b> đó (tối đa ' + money(SHOP.maxTx) + '/lần). '
          + 'Chuyển xong, ' + (o.sku === 'dd' ? 'lời tặng tự được gửi lên lịch' : 'vật phẩm tự mở') + ' sau vài giây. Link hết hạn sau 15 phút; đơn chờ hiện trong 🛍 Cửa hàng.</p>'
          : '<p class="sm" style="color:#ff9a7a">Đơn này chưa có link thanh toán, hãy hủy và tạo lại.</p>')
        + (o.s === 0 ? '<div class="row"><button data-a="ocancel" data-v="' + esc(id) + '">🗑 Hủy đơn này</button></div>' : ''), 'pay');
    },
    ocancel(id) {
      db.ref('orders/' + uid + '/' + id).remove().then(() => {
        toast('Đã hủy đơn');
        HD.shop();
      });
    },
    orders() {
      if (!isAdmin) {
        return;
      }
      const ks = Object.keys(SH.all);
      panel('<h3>🧾 Đơn chờ thanh toán</h3>'
        + '<p style="color:' + (SH.rev >= SHOP.yearCap * .9 ? '#f0c060' : '#7fe08a') + '">Doanh thu ' + vnYear() + ': <b>' + money(SH.rev)
        + '</b> / trần ' + money(SHOP.yearCap) + (isClosed() ? ' · 🔒 đang tạm nghỉ' : '') + '</p>'
        + '<div class="row"><button data-a="otoggle">' + (isClosed() ? '🔓 Mở lại bán hàng ngay' : '🔒 Tạm nghỉ đến hết năm') + '</button></div>'
        + '<p class="sm">Đơn tự được xác nhận khi payOS báo tiền về, bạn không cần làm gì. Chỉ bấm ✅ khi webhook lỗi và bạn đã thấy ĐÚNG số tiền trong app ngân hàng.</p>'
        + (ks.length ? ks.map(k => {
          const o = SH.all[k];
          const it = ITEMS.find(x => x[0] === o.sku);
          return '<div class="row"><span style="flex:1;text-align:left">' + esc(skuLabel(o))
            + ' · <b>' + money(o.a) + '</b><br><span class="sm">' + esc(o.n) + ' · mã <b>' + esc(o.c) + '</b></span></span>'
            + '<button data-a="oconf" data-v="' + esc(k) + '">✅</button><button data-a="orej" data-v="' + esc(k) + '">✖</button></div>';
        }).join('') : '<p class="sm">Không có đơn nào đang chờ.</p>'), 'orders');
    },
    async oconf(k) {
      const o = SH.all[k];
      if (!isAdmin || !o) {
        return;
      }
      const [u, id] = k.split(':');
      if (!confirm('Xác nhận THỦ CÔNG đã nhận ĐÚNG ' + money(o.a) + ' (mã ' + o.c + ') từ ' + o.n + '?\n(Thường không cần: payOS tự xác nhận. Nếu thực nhận khác số này, đừng xác nhận; hãy hoàn tiền lại.)')) {
        return;
      }
      const up = {};
      up['orders/' + u + '/' + id + '/s'] = 1;
      if (o.sku === 'donate') {
        const prev = (await db.ref('donors/' + u).once('value')).val();
        up['donors/' + u] = { n: o.n, a: ((prev && prev.a) || 0) + o.a, t: TS() };
        up['owned/' + u + '/bd_donor'] = true;
      }
      else if (o.sku === 'dd') {
        if (!o.dd) {
          return toast('Đơn này thiếu nội dung lời tặng, hãy kiểm tra payorders trên Firebase');
        }
        const ex = (await db.ref('dedics/' + id).once('value')).exists();
        if (!ex) {
          up['dedics/' + id] = Object.assign({ u, f: o.n, t: TS() }, o.dd);
        }
      }
      else {
        up['owned/' + u + '/' + o.sku] = true;
      }
      db.ref().update(up).then(() => {
        toast('✅ Đã xác nhận đơn của ' + o.n);
        const y = vnYear();
        db.ref('revenue/' + y).transaction(v => (v || 0) + o.a, (err, ok, snap) => {
          if (!err && ok && snap.val() >= SHOP.yearCap) {
            db.ref('shop/closedUntil').set(yearEnd(y)).then(() => alert(
              'Doanh thu năm ' + y + ' đã đạt trần ' + money(SHOP.yearCap) + '. Cửa hàng và ủng hộ tự tạm nghỉ, '
              + 'sẽ tự mở lại ngày 1/1/' + (y + 1) + '.'));
          }
        });
      }).catch(e => toast('Lỗi: ' + e.code));
    },
    otoggle() {
      if (!isAdmin) {
        return;
      }
      if (isClosed()) {
        db.ref('shop/closedUntil').remove().then(() => toast('🔓 Đã mở lại bán hàng'));
      }
      else if (confirm('Tạm nghỉ cửa hàng và ủng hộ đến hết năm nay?')) {
        db.ref('shop/closedUntil').set(yearEnd(vnYear())).then(() => toast('🔒 Đã tạm nghỉ đến 1/1 năm sau'));
      }
    },
    orej(k) {
      const o = SH.all[k];
      if (!isAdmin || !o || !confirm('Xóa đơn của ' + o.n + ' (mã ' + o.c + ')?')) {
        return;
      }
      const [u, id] = k.split(':');
      db.ref('orders/' + u + '/' + id).remove();
    }
  });
  const ddDay = d => new Date(Date.now() + off + 7 * 3600e3 + d * 86400e3).toISOString().slice(0, 10);
  const ddHm = ms => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  function ddSave() {
    const g = id => $(id) ? $(id).value : null;
    DD.to = g('ddto') != null ? g('ddto') : DD.to;
    DD.m = g('ddm') != null ? g('ddm') : DD.m;
    DD.k = g('ddk') != null ? g('ddk') : DD.k;
    DD.sn = g('ddsn') != null ? g('ddsn') : DD.sn;
    DD.day = g('dday') != null ? g('dday') : DD.day;
  }
  Object.assign(HD, {
    skills() {
      const L = lvl(score);
      const row = s => {
        const left = skLeft(s);
        return '<div class="row" style="flex-wrap:wrap"><span style="flex:1;text-align:left">' + s.id + ' <b>' + s.name + '</b> <span class="sm">· Cấp ' + s.lv + '</span><br>'
          + '<span class="sm">' + s.d + ' Hồi ' + s.cd + ' giây.</span></span>'
          + (L < s.lv ? '<button disabled>🔒 Cấp ' + s.lv + '</button>'
            : '<button data-a="skill" data-v="' + s.id + '"' + (left ? ' disabled' : '') + '>' + (left ? left + 's' : 'Dùng') + '</button>') + '</div>';
      };
      panel('<h3>✨ Kỹ năng</h3><p class="sm">Lên cấp để mở kỹ năng mới. Kỹ năng chỉ tạo hiệu ứng cho cả phòng, không tăng điểm.</p>'
        + SKL.map(row).join('')
        + '<h4>☕ Ly trà đầy hơn (tự động)</h4><p class="sm">'
        + (L >= 10 ? '✅ Mỗi ly uống được 7 ngụm.' : L >= 4 ? '✅ Mỗi ly uống được 6 ngụm. Cấp 10: 7 ngụm.' : '🔒 Cấp 4: mỗi ly uống được 6 ngụm (hiện 5 ngụm).') + '</p>', 'skills');
    },
    skill(id) {
      useSkill(id);
    },
    guide() {
      if (window.openGuide) {
        window.openGuide();
      }
    },
    ded() {
      if (!acct) {
        return panel('<h3>💌 Tặng bài hát</h3><p class=\"sm\">Đăng ký hoặc đăng nhập ở màn hình vào phòng để tặng bài hát cho người thân nhé.</p>', 'ded');
      }
      const L = roomTracks(room);
      if (!DD.k || !L.some(t => t.id === DD.k)) {
        DD.k = L[0] ? L[0].id : '';
      }
      const inp = 'style=\"width:100%;padding:8px;border-radius:8px;background:#2a170c;color:inherit\"';
      let h = '<h3>💌 Tặng bài hát</h3><p class=\"sm\">Gửi một lời nhắn tới người thân, bạn bè. Khi bài hát được phát, tên người nhận và lời nhắn hiện '
        + 'trên màn hình LED, trong khung thông báo và được MC đọc lên. Phí <b>' + money(SHOP.dedPrice) + '</b>/bài, thanh toán qua payOS.</p>' + closedMsg()
        + '<div class=\"tabs\"><button data-a=\"ddmode\" data-v=\"list\"' + (DD.mode === 'list' ? ' class=\"on\"' : '') + '>🎵 Bài có sẵn</button>'
        + '<button data-a=\"ddmode\" data-v=\"order\"' + (DD.mode === 'order' ? ' class=\"on\"' : '') + '>🗓 Đặt bài trước</button></div>';
      if (DD.mode === 'list') {
        h += L.length
          ? '<select id=\"ddk\" ' + inp + '>' + L.map(t => '<option value=\"' + esc(t.id) + '\"' + (t.id === DD.k ? ' selected' : '') + '>'
            + esc(t.title) + ' — ' + esc(t.artist) + '</option>').join('') + '</select>'
            + '<p class=\"sm\" id=\"ddnx\"></p>'
          : '<p class=\"sm\">Danh sách phát này chưa có bài, hãy thử đặt bài trước.</p>';
      }
      else {
        h += '<p class=\"sm\">Bài chưa có trong danh sách cần đặt <b>trước ít nhất ' + SHOP.dedMinDays + ' ngày</b> để phòng trà kịp chuẩn bị bản nhạc. '
          + 'Nếu phòng trà không chuẩn bị được, đơn sẽ được hoàn tiền.</p>'
          + '<input id=\"ddsn\" maxlength=\"80\" placeholder=\"Tên bài hát\" value=\"' + esc(DD.sn) + '\"><br><br>'
          + '<label class=\"sm\">Phát vào ngày (từ ' + ddDay(SHOP.dedMinDays).split('-').reverse().join('/') + ')</label>'
          + '<input id=\"dday\" type=\"date\" min=\"' + ddDay(SHOP.dedMinDays) + '\" max=\"' + ddDay(90) + '\" value=\"' + esc(DD.day || ddDay(SHOP.dedMinDays)) + '\">';
      }
      h += '<br><br><input id=\"ddto\" maxlength=\"16\" placeholder=\"Tặng cho ai? (tối đa 16 ký tự)\" value=\"' + esc(DD.to) + '\"><br><br>'
        + '<textarea id=\"ddm\" maxlength=\"100\" rows=\"3\" placeholder=\"Lời nhắn (tối đa 100 ký tự)\" ' + inp + '>' + esc(DD.m) + '</textarea>'
        + '<p class=\"sm\">Người gửi hiện là <b>' + esc(me.n) + '</b>. Lời nhắn có nội dung xúc phạm sẽ bị xóa và hoàn tiền.</p>'
        + '<div class=\"row\"><button data-a=\"ddpay\" style=\"width:100%\">💳 Thanh toán ' + money(SHOP.dedPrice) + '</button></div>';
      panel(h, 'ded');
      HD.ddest();
    },
    ddest() {
      const e = $('ddnx');
      const k = $('ddk') && $('ddk').value;
      if (e && k) {
        const t = dedNext(k);
        e.textContent = t ? 'Dự kiến phát khoảng ' + ddHm(t - off) + ' (có thể lệch nếu có bài được bình chọn chen vào).' : '';
      }
    },
    ddk() {
      ddSave();
      HD.ddest();
    },
    ddmode(v) {
      ddSave();
      DD.mode = v === 'order' ? 'order' : 'list';
      HD.ded();
    },
    ddpay() {
      ddSave();
      const to = DD.to.trim();
      const m = DD.m.trim();
      if (!to || !m) {
        return toast('Hãy nhập tên người nhận và lời nhắn');
      }
      let x;
      if (DD.mode === 'list') {
        if (!DD.k || !roomTracks(room).some(t => t.id === DD.k)) {
          return toast('Hãy chọn một bài trong danh sách');
        }
        x = { k: DD.k, to, m };
      }
      else {
        if (!DD.sn.trim()) {
          return toast('Hãy nhập tên bài hát');
        }
        if (!DD.day || DD.day < ddDay(SHOP.dedMinDays)) {
          return toast('Bài đặt trước phải từ ngày ' + ddDay(SHOP.dedMinDays).split('-').reverse().join('/') + ' trở đi');
        }
        x = { sn: DD.sn.trim(), day: DD.day, to, m };
      }
      mkOrder('dd', SHOP.dedPrice, { dd: x }).then(() => {
        if (DD.sent) {
          DD.sent = false;
          DD.to = '';
          DD.m = '';
          DD.sn = '';
        }
      });
    },
    dedadm() {
      if (!isAdmin) {
        return;
      }
      const ids = Object.keys(DD.all).sort().reverse();
      const opts = tracks.filter(t => +t.dur > 0).map(t => '<option value=\"' + esc(t.id) + '\">' + esc(t.title) + ' — ' + esc(t.artist) + '</option>').join('');
      panel('<h3>🎁 Lời tặng bài hát</h3><p class=\"sm\">Lời tặng đã thanh toán. Bài đặt trước (🔴) cần bạn thêm nhạc vào lịch diễn rồi bấm \"Gắn bài\". '
        + 'Xóa lời nhắn không phù hợp và hoàn tiền cho người gửi.</p>'
        + (ids.length ? ids.map(id => {
          const v = DD.all[id];
          const tr = v.k && tracks.find(t => t.id === v.k);
          const head = '<b>' + esc(v.f) + '</b> → <b>' + esc(v.to) + '</b><br><span class=\"sm\">“' + esc(v.m) + '”</span><br>';
          const st = !v.k ? '🔴 Cần chuẩn bị: <b>' + esc(v.sn) + '</b> · phát ngày ' + esc(String(v.day).split('-').reverse().join('/'))
            : (tr ? esc(tr.title) : '(bài đã bị xóa)') + ' · ' + (v.p ? '✅ đã phát ' + ddHm(v.p - off) : '⏳ chờ phát');
          return '<div class=\"row\" style=\"flex-wrap:wrap\"><span style=\"flex:1;text-align:left;min-width:100%\">' + head + '<span class=\"sm\">' + st + '</span></span>'
            + (!v.k ? '<select id=\"dl_' + esc(id) + '\" style=\"flex:1;padding:6px;border-radius:8px;background:#2a170c;color:inherit\">' + opts + '</select>'
              + '<button data-a=\"dedlink\" data-v=\"' + esc(id) + '\">Gắn bài</button>' : '')
            + (v.p ? '<button data-a=\"dedreset\" data-v=\"' + esc(id) + '\" title=\"Cho phát lại ở lần sau\">↺ Phát lại</button>' : '')
            + '<button data-a=\"deddel\" data-v=\"' + esc(id) + '\">🗑</button></div>';
        }).join('') : '<p class=\"sm\">Chưa có lời tặng nào.</p>'), 'dedadm');
    },
    dedlink(id) {
      const s = $('dl_' + id);
      if (isAdmin && s && s.value) {
        db.ref('dedics/' + id + '/k').set(s.value).then(() => toast('Đã gắn bài, lời tặng sẽ hiện khi bài phát')).catch(() => toast('Lỗi, thử lại'));
      }
    },
    dedreset(id) {
      if (isAdmin) {
        db.ref('dedics/' + id + '/p').remove().then(() => toast('Lời tặng sẽ được phát lại ở lần sau'));
      }
    },
    deddel(id) {
      const v = DD.all[id];
      if (isAdmin && v && confirm('Xóa lời tặng của ' + v.f + ' gửi ' + v.to + '?')) {
        db.ref('dedics/' + id).remove();
      }
    }
  });
  const CK = [10, 15, 20, 25, 30, 40, 100];
  const dkey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function ckLoad() {
    try {
      const c = JSON.parse(localStorage.tp_ck);
      return { l: String(c.l || ''), s: +c.s || 0, t: +c.t || 0 };
    }
    catch (e) {
      return { l: '', s: 0, t: 0 };
    }
  }
  function ckInfo() {
    const c = ckLoad();
    const now = new Date();
    const today = dkey(now);
    const yest = dkey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const claimed = c.l === today;
    const streak = claimed || c.l === yest ? c.s : 0;
    const done = claimed ? (streak - 1) % 7 + 1 : streak % 7;
    return { c, today, claimed, streak, done, total: c.t };
  }
  function ckBadge() {
    const b = $('ckb');
    if (b) {
      b.textContent = ckInfo().claimed ? '📅 Điểm danh' : '📅 Điểm danh 🔴';
    }
  }
  function ckClaim() {
    const i = ckInfo();
    if (i.claimed) {
      return toast('Hôm nay bạn đã điểm danh rồi 🍃');
    }
    const idx = i.done;
    const gift = CK[idx];
    localStorage.tp_ck = JSON.stringify({ l: i.today, s: i.streak + 1, t: i.total + 1 });
    addScore(gift, true);
    AE.fanfare();
    toast('📅 Điểm danh ngày ' + (idx + 1) + ' +' + gift + ' 🍃' + (idx === 6 ? ' · Rương lớn!' : ''));
    ckBadge();
    saveAcct();
    HD.checkin();
  }
  function ckPanel() {
    const i = ckInfo();
    const tiles = CK.map((g, k) => {
      const st = k < i.done ? 'done' : (!i.claimed && k === i.done ? 'now' : 'lock');
      return '<div class="ckt ' + st + (k === 6 ? ' big' : '') + '"><b>Ngày ' + (k + 1) + '</b>'
        + '<span class="ic">' + (k === 6 ? '🎁' : '🍃') + '</span><em>+' + g + '</em>'
        + (st === 'done' ? '<u>✔</u>' : '') + '</div>';
    }).join('');
    panel('<h3>📅 Điểm danh hằng ngày</h3>'
      + '<p class="sm">🔥 Chuỗi hiện tại: <b>' + i.streak + '</b> ngày · Tổng: <b>' + i.total + '</b> ngày</p>'
      + '<div class="ckg">' + tiles + '</div>'
      + (i.claimed
        ? '<button class="ckbtn" disabled>✅ Đã nhận hôm nay · quay lại vào ngày mai</button>'
        : '<button class="ckbtn" data-a="ckclaim">🎁 Nhận quà ngày ' + (i.done + 1) + ' (+' + CK[i.done] + ')</button>')
      + '<p class="sm">Điểm danh liên tiếp 7 ngày để nhận rương lớn +' + CK[6]
      + '. Bỏ lỡ một ngày thì chuỗi quay về Ngày 1.</p>'
      + (acct ? '' : '<p class="sm">Bạn đang chơi Khách: tiến độ điểm danh chỉ lưu trên máy này. Đăng ký tài khoản để giữ lại.</p>'),
      'checkin');
  }
  const MS = [
    [
      'order',
      'Gọi 1 món nước',
      1,
      5
    ], [
      'sip',
      'Nhấp trà 10 ngụm',
      10,
      8
    ], [
      'stage',
      'Vỗ tay hoặc tặng hoa cho ca sĩ',
      1,
      5
    ], ['chat', 'Trò chuyện 3 câu', 3, 5], ['cheers', 'Cùng nâng ly 1 lần', 1, 4]
  ];
  function mst() {
    let m;
    try {
      m = JSON.parse(localStorage.tp_ms);
    }
    catch (e) {
    }
    m = m || {};
    const d = new Date().toDateString();
    const w = Math.floor(Date.now() / 6048e5);
    if (m.d !== d) {
      m.d = d;
      m.p = {};
      m.ok = {};
      m.e = {};
    }
    if (m.w !== w) {
      m.w = w;
      m.wp = 0;
      m.wok = 0;
    }
    return m;
  }
  function mission(k, n) {
    n = n || 1;
    const m = mst();
    m.p[k] = (m.p[k] || 0) + n;
    MS.forEach(q => {
      if (q[0] === k && !m.ok[k] && m.p[k] >= q[2]) {
        m.ok[k] = 1;
        addScore(q[3]);
        AE.fanfare();
        toast('✅ ' + q[1] + ' +' + q[3]);
        if (MS.every(z => m.ok[z[0]]) && !m.ok.all) {
          m.ok.all = 1;
          addScore(20);
          toast('🎉 Xong mọi nhiệm vụ hôm nay +20');
        }
      }
    });
    if (k === 'sip') {
      m.wp = (m.wp || 0) + n;
      if (!m.wok && m.wp >= 100) {
        m.wok = 1;
        addScore(40);
        toast('🏅 Xong nhiệm vụ tuần +40');
      }
    }
    localStorage.tp_ms = JSON.stringify(m);
    saveAcct();
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const X3 = x => (x - W / 2) / 40;
  const Z3 = y => (y - H / 2) / 40;
  const COARSE = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, COARSE ? 1.75 : 2));
  R.shadowMap.enabled = !COARSE;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  const scn = new THREE.Scene();
  scn.background = new THREE.Color(0x070b16);
  scn.fog = new THREE.Fog(0x0a0f1e, 40, 110);
  const cam = new THREE.PerspectiveCamera(58, 1, .1, 150);
  let camYaw = 0;
  let camPitch = .55;
  let camDist = 11;
  const tgt = new THREE.Vector3(0, 0, 10);
  const mat = (c, r, m) => new THREE.MeshStandardMaterial({
    color: c, roughness: .45 + (r == null ? .75 : r) * .55, metalness: (m || 0) * .35
  });
  const mk = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    scn.add(o);
    return o;
  };
  const cvs = (w, h) => {
    const e = document.createElement('canvas');
    e.width = w;
    e.height = h;
    return e;
  };
  const skyC = cvs(8, 256);
  const skx = skyC.getContext('2d');
  const skg = skx.createLinearGradient(0, 0, 0, 256);
  skg.addColorStop(0, '#16244a');
  skg.addColorStop(.6, '#0e1a38');
  skg.addColorStop(1, '#070d1c');
  skx.fillStyle = skg;
  skx.fillRect(0, 0, 8, 256);
  scn.background = new THREE.CanvasTexture(skyC);
  const LIGHT = {
    amb: .62, hemi: .56, sun: .4, key: .58, rim: 1.0, rimP: .5, spot: 1.3, side: .55, lamp: .55,
    glow: .55,
    beam: .55
  };
  scn.add(new THREE.AmbientLight(0xb9aa92, LIGHT.amb));
  scn.add(new THREE.HemisphereLight(0xffe9c4, 0x1a2547, LIGHT.hemi));
  const sunL = new THREE.DirectionalLight(0xffd08a, LIGHT.sun);
  sunL.position.set(-16, 7, 6);
  scn.add(sunL);
  const keyL = new THREE.DirectionalLight(0xffd496, 1.05);
  keyL.position.set(8, 20, 14);
  keyL.castShadow = true;
  keyL.shadow.mapSize.set(2048, 2048);
  Object.assign(keyL.shadow.camera, {
    left: -24, right: 24, top: 20, bottom: -20, near: 1, far: 60
  });
  keyL.shadow.bias = -.0006;
  scn.add(keyL);
  keyL.intensity = LIGHT.key;
  keyL.position.set(6, 22, 10);
  const rimL = new THREE.SpotLight(0xffc878, LIGHT.rim, 50, 1.05, .9);
  rimL.position.set(0, 6.8, -10.5);
  rimL.target.position.set(0, 1.3, 5);
  scn.add(rimL, rimL.target);
  const rimP = new THREE.PointLight(0xffc070, LIGHT.rimP, 24);
  rimP.position.set(0, 4.5, -8);
  scn.add(rimP);
  const spot = new THREE.SpotLight(0xffd890, LIGHT.spot, 40, .55, .9);
  spot.position.set(0, 11, -3);
  spot.target.position.set(0, .5, -9.3);
  scn.add(spot, spot.target);
  const txTex = (txt, w, h, font, col) => {
    const e = cvs(w, h);
    const x = e.getContext('2d');
    x.textAlign = 'center';
    x.font = font;
    x.fillStyle = col;
    x.fillText(txt, w / 2, h * .7);
    return new THREE.CanvasTexture(e);
  };
  const sprite = (tex, sx, sy) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false
    }));
    s.scale.set(sx, sy, 1);
    return s;
  };
  const STZ = -9.3;
  const sgc = cvs(512, 128);
  const singer = sprite(new THREE.CanvasTexture(sgc), 5, 1.25);
  singer.center.set(.5, 0);
  singer.position.set(0, 3.2, STZ);
  scn.add(singer);
  let sFig = null;
  let sFig2 = null;
  function drawSinger(tr) {
    const x = sgc.getContext('2d');
    x.clearRect(0, 0, 512, 128);
    x.textAlign = 'center';
    x.lineWidth = 6;
    x.strokeStyle = '#000';
    x.font = 'bold 42px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    x.fillStyle = '#f0c060';
    const a = tr ? tr.artist : 'Nhạc nền phòng trà';
    x.strokeText(a, 256, 52);
    x.fillText(a, 256, 52);
    x.font = '28px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    x.fillStyle = '#d9b98a';
    const b = '♪ ' + (tr ? tr.title : 'Piano nhẹ nhàng');
    x.strokeText(b, 256, 100);
    x.fillText(b, 256, 100);
    singer.material.map.needsUpdate = true;
  }
  const stc = cvs(64, 64);
  const stx = stc.getContext('2d');
  const sg = stx.createRadialGradient(32, 32, 2, 32, 32, 30);
  sg.addColorStop(0, 'rgba(255,255,255,.9)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  stx.fillStyle = sg;
  stx.fillRect(0, 0, 64, 64);
  const steamTex = new THREE.CanvasTexture(stc);
  const emo = new Map();
  const emojiTex = e => {
    if (!emo.has(e)) {
      const cn = cvs(128, 128);
      const x = cn.getContext('2d');
      x.textAlign = 'center';
      x.font = '96px serif';
      x.fillText(e, 64, 98);
      emo.set(e, new THREE.CanvasTexture(cn));
    }
    return emo.get(e);
  };
  const SLOT = [];
  const flames = [];
  const glows = [];
  const STAFF = [];
  const TW = [];
  const BEAMS = [];
  const UP_D = new THREE.Vector3(0, -1, 0);
  const ledC = cvs(256, 128);
  const ledX = ledC.getContext('2d');
  const ledTex = new THREE.CanvasTexture(ledC);
  let ledK = -1;
  function drawDed() {
    const wrap = (txt, w) => {
      let ln = '';
      const out = [];
      txt.split(' ').forEach(wd => {
        if (ln && ledX.measureText(ln + ' ' + wd).width > w) {
          out.push(ln);
          ln = wd;
        }
        else {
          ln = ln ? ln + ' ' + wd : wd;
        }
      });
      out.push(ln);
      return out.slice(0, 3);
    };
    ledX.fillStyle = 'rgba(20,6,26,.72)';
    ledX.fillRect(0, 0, 256, 128);
    ledX.textAlign = 'center';
    ledX.shadowColor = '#ff7aa8';
    ledX.shadowBlur = 6;
    ledX.fillStyle = '#ffb0cf';
    ledX.font = 'bold 12px sans-serif';
    ledX.fillText('💌 BÀI HÁT DÀNH TẶNG', 128, 20);
    ledX.fillStyle = '#fff2b0';
    ledX.font = 'bold 20px sans-serif';
    ledX.fillText(DED.to, 128, 46);
    ledX.fillStyle = '#ffffff';
    ledX.font = 'italic 13px sans-serif';
    wrap('“' + DED.m + '”', 230).forEach((s, i) => ledX.fillText(s, 128, 70 + i * 16));
    ledX.fillStyle = '#ffb0cf';
    ledX.font = '12px sans-serif';
    ledX.fillText('— Từ ' + DED.f + ' —', 128, 120);
    ledX.shadowBlur = 0;
    ledX.textAlign = 'start';
  }
  function drawLed(t) {
    const hb = 222 + 6 * Math.sin(t / 5000);
    const g = ledX.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'hsl(' + hb + ',70%,7%)');
    g.addColorStop(.55, 'hsl(' + hb + ',65%,14%)');
    g.addColorStop(1, 'hsl(' + (hb - 4) + ',70%,24%)');
    ledX.fillStyle = g;
    ledX.fillRect(0, 0, 256, 128);
    for (let k = 0; k < 18; k++) {
      const x = ((k * 53 + t * .01 * (1 + k % 3)) % 280) - 12;
      const y = (k * 37 + Math.sin(t / 2000 + k) * 14) % 128;
      ledX.globalAlpha = .28;
      ledX.fillStyle = 'hsl(' + (44 + k % 3 * 4) + ',85%,62%)';
      ledX.beginPath();
      ledX.arc(x, y, 5 + k % 4 * 3, 0, 7);
      ledX.fill();
    }
    ledX.globalAlpha = .22;
    ledX.strokeStyle = '#ffe0a0';
    ledX.lineWidth = 1;
    for (let i = -4; i < 12; i++) {
      ledX.beginPath();
      ledX.moveTo(i * 32, 0);
      ledX.lineTo(i * 32 + 64, 128);
      ledX.moveTo(i * 32 + 64, 0);
      ledX.lineTo(i * 32, 128);
      ledX.stroke();
    }
    ledX.globalAlpha = 1;
    if (DED) {
      if (performance.now() < DED.until) {
        drawDed();
      }
      else {
        DED = null;
      }
    }
    ledTex.needsUpdate = true;
  }
  let disc = null;
  let MOTES = null;
  let winDirty = true;
  let FG = null;
  const winC = cvs(128, 192);
  const winX = winC.getContext('2d');
  const winTex = new THREE.CanvasTexture(winC);
  const BOK = Array.from({ length: 22 }, () => ({
    x: Math.random() * 128, y: 40 + Math.random() * 150, r: 2 + Math.random() * 5, c: [
      '#ffd9a0',
      '#ffb070',
      '#9ecbff',
      '#fff2c0'
    ][Math.floor(Math.random() * 4)]
  }));
  const WD = Array.from({ length: 40 }, () => ({
    x: Math.random() * 128, y: Math.random() * 192, v: 160 + Math.random() * 140
  }));
  function drawWin(dt) {
    const g = winX.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#ffd59a');
    g.addColorStop(1, '#e8985a');
    winX.fillStyle = g;
    winX.fillRect(0, 0, 128, 192);
    BOK.forEach(b => {
      winX.globalAlpha = rainOn ? .35 : .6;
      winX.fillStyle = b.c;
      winX.beginPath();
      winX.arc(b.x, b.y, b.r, 0, 7);
      winX.fill();
    });
    winX.globalAlpha = 1;
    if (rainOn) {
      winX.strokeStyle = 'rgba(170,210,230,.75)';
      winX.lineWidth = 1.5;
      WD.forEach(d => {
        d.y += d.v * dt;
        if (d.y > 192) {
          d.y = -12;
          d.x = Math.random() * 128;
        }
        winX.beginPath();
        winX.moveTo(d.x, d.y);
        winX.lineTo(d.x - 2, d.y + 12);
        winX.stroke();
      });
    }
    winTex.needsUpdate = true;
  }
  const cyl = (rt, rb, h, col, x, y, z, par) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), mat(col));
    m.position.set(x, y, z);
    par.add(m);
    return m;
  };
  const bx = (w, h, d, col, x, y, z, par) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col));
    m.position.set(x, y, z);
    par.add(m);
    return m;
  };
  const sp3 = (r, col, x, y, z, par, sx, sy, sz) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(col));
    m.position.set(x, y, z);
    m.scale.set(sx || 1, sy || 1, sz || 1);
    par.add(m);
    return m;
  };
  const SK = 0xf0c8a0;
  const HAIRC = [0x15100a, 0x2a1a10, 0x4a2c18, 0x6b3a1e, 0x9a7a44];
  const DC = [0xd8b24a, 0x8a5a2a, 0x3b2415, 0xe0507a];
  const PAL = {
    m: [0x222831, 0x2f4b7c, 0x5a3a2a, 0x4a5a3a, 0x6a2a3a, 0x555a60],
    f: [0xc0392b, 0x2e86c1, 0xd4a017, 0x8e44ad, 0x27ae60, 0xe67e9c]
  };
  const SKS = [0xf3cfae, 0xe8b98f, 0xd9a37a];
  const EMV = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const VM = new THREE.MeshPhongMaterial({
    vertexColors: true, shininess: 8, specular: 0x1a1a1a, side: THREE.DoubleSide
  });
  const TOONG = new THREE.DataTexture(
    new Uint8Array([135, 180, 225, 255]),
    4,
    1,
    THREE.LuminanceFormat
  );
  TOONG.minFilter = TOONG.magFilter = THREE.NearestFilter;
  TOONG.generateMipmaps = false;
  TOONG.needsUpdate = true;
  const HMV = new THREE.MeshToonMaterial({
    vertexColors: true, gradientMap: TOONG, side: THREE.DoubleSide
  });
  const OLM = new THREE.MeshBasicMaterial({ color: 0x24150e, side: THREE.BackSide });
  const OLS = new THREE.MeshBasicMaterial({ color: 0xc88a68, side: THREE.BackSide });
  const HEADO = new THREE.SphereGeometry(.24, 28, 20);
  const PMV = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 6,
    specular: 0x15100c,
    emissive: 0x3a2214,
    side: THREE.DoubleSide
  });
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _v = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _c = new THREE.Color();
  const dk = (c, k) => (Math.floor((c >> 16 & 255) * k) << 16)
    | (Math.floor((c >> 8 & 255) * k) << 8)
    | Math.floor((c & 255) * k);
  function add(L, geo, col, x, y, z, sx, sy, sz, rx, ry, rz) {
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _m.compose(_v.set(x, y, z), _q, _s.set(sx || 1, sy || 1, sz || 1));
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(_m);
    const n = g.attributes.position.count;
    const cl = new Float32Array(n * 3);
    _c.setHex(col);
    for (let i = 0; i < n; i++) {
      cl[i * 3] = _c.r;
      cl[i * 3 + 1] = _c.g;
      cl[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    L.push(g);
    if (g !== geo) {
      geo.dispose();
    }
  }
  function merged(L, basic, soft, mtl) {
    let n = 0;
    L.forEach(g => {
      n += g.attributes.position.count;
    });
    const P = new Float32Array(n * 3);
    const N = new Float32Array(n * 3);
    const C = new Float32Array(n * 3);
    let o = 0;
    L.forEach(g => {
      P.set(g.attributes.position.array, o * 3);
      N.set(g.attributes.normal.array, o * 3);
      C.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
      g.dispose();
    });
    const G = new THREE.BufferGeometry();
    G.setAttribute('position', new THREE.BufferAttribute(P, 3));
    G.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    G.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const mm = new THREE.Mesh(G, mtl || (basic ? EMV : soft ? PMV : VM));
    mm.castShadow = mm.receiveShadow = !basic;
    return mm;
  }
  const hx2 = c => [
    (c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255
  ];
  const mx2 = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
  ];
  const unit3 = a => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [
      a[0] / l, a[1] / l, a[2] / l
    ];
  };
  const D2R = Math.PI / 180;
  const HEADY = 1.72;
  const HR = .262;
  const INK = [.04, .04, .045];
  const sph = (th, phi, rr) => {
    const r = rr || HR;
    return [
      r * Math.sin(th) * Math.sin(phi), HEADY
        + r * 1.04 * Math.cos(th), r * Math.sin(th) * Math.cos(phi) - .012
    ];
  };
  const finishG = (P, C, I) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
    g.setIndex(I);
    g.computeVertexNormals();
    return g.toNonIndexed();
  };
  const gridI = (nu, nv) => {
    const I = [];
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i;
        const b = a + 1;
        const c2 = a + nu + 1;
        const d = c2 + 1;
        I.push(a, b, c2, b, d, c2);
      }
    }
    return I;
  };
  const capR = (vol, th) => .252 + vol * (.025 + .02 * Math.sin(Math.min(th, 1.3)));
  function hairCap(col, front, side, back, vol, part) {
    const NA = 36;
    const NT = 14;
    const P = [];
    const C = [];
    const pw = Math.log((side - front) / (back - front)) / Math.log(.5);
    for (let i = 0; i <= NA; i++) {
      const phi = -Math.PI + i / NA * 2 * Math.PI;
      const f = (1 - Math.cos(phi)) / 2;
      const tmax = (front + (back - front) * Math.pow(f, pw)) * D2R;
      for (let j = 0; j <= NT; j++) {
        const u = j / NT;
        const th = u * tmax;
        P.push(...sph(th, phi, capR(vol, th)));
        let c = col;
        if (u > .88) {
          c = mx2(c, INK, Math.min(1, (u - .88) / .08));
        }
        if (part && Math.abs(phi - part) < .05 && th < 62 * D2R) {
          c = mx2(c, INK, .7);
        }
        C.push(c[0], c[1], c[2]);
      }
    }
    return finishG(P, C, gridI(NT, NA));
  }
  function hiPatch(HL, phi0, th0, dphi, dth, tilt, vol, col) {
    const nu = 8;
    const nv = 8;
    const P = [];
    const C = [];
    const cT = Math.cos(tilt);
    const sT = Math.sin(tilt);
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu * 2 - 1;
        const v = j / nv * 2 - 1;
        const a = u * Math.sqrt(1 - v * v / 2);
        const b = v * Math.sqrt(1 - u * u / 2);
        const a2 = a * cT - b * sT;
        const b2 = a * sT + b * cT;
        const th = th0 + b2 * dth;
        P.push(...sph(th, phi0 + a2 * dphi, capR(vol, th) + .006));
        C.push(col[0], col[1], col[2]);
      }
    }
    HL.push(finishG(P, C, gridI(nu, nv)));
  }
  function hairSheet(o, col) {
    const nu = o.nu || 16;
    const nv = 12;
    const k = .42;
    const P = [];
    const C = [];
    const cc = mx2(col, [0, 0, 0], o.dark || 0);
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const v = j / nv;
        const phi = o.phi + (u - .5) * 2 * o.span;
        let p;
        if (v <= k) {
          p = sph(
            (o.th0 + (o.th1 - o.th0) * v / k) * D2R,
            phi,
            HR + .018 + .012 * Math.sin(v / k * Math.PI)
          );
        }
        else {
          const w = (v - k) / (1 - k);
          const p1 = sph(o.th1 * D2R, phi, HR + .03);
          const sc = 1 - o.scal * (1 - Math.abs(Math.sin(u * Math.PI * o.locks)));
          const len = o.len * Math.max(.5, sc);
          const fl = o.flare * Math.pow(w, .7) + o.curl * Math.sin(w * Math.PI * .9);
          const wv = o.wave * Math.sin(w * Math.PI * 1.6 + o.ph + u * 6) * w;
          p = [
            p1[0]
              + Math.sin(phi) * fl
              + Math.cos(phi) * wv, p1[1] - len * w, p1[2] + Math.cos(phi) * fl - Math.sin(phi) * wv
          ];
        }
        P.push(p[0], p[1], p[2]);
        const edge = Math.max(0, 1 - Math.min(u, 1 - u) / .07);
        const bot = v > .9 ? (v - .9) / .1 : 0;
        const c = mx2(cc, INK, Math.min(1, Math.max(edge, bot) * .95));
        C.push(c[0], c[1], c[2]);
      }
    }
    return finishG(P, C, gridI(nu, nv));
  }
  function clump(len, w, col) {
    const pts = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector2(w * Math.pow(1 - t, .65) + .001, t * len));
    }
    const g = new THREE.LatheGeometry(pts, 8);
    const P = g.attributes.position;
    const C = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      C[i * 3] = col[0];
      C[i * 3 + 1] = col[1];
      C[i * 3 + 2] = col[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    return g.toNonIndexed();
  }
  function orientG(g, dir, p, flat) {
    const y = unit3(dir);
    const nn = unit3([
      p[0], 0, p[2] + .012
    ]);
    const x = unit3([
      y[1] * nn[2] - y[2] * nn[1], y[2] * nn[0] - y[0] * nn[2], y[0] * nn[1] - y[1] * nn[0]
    ]);
    const z = [
      x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]
    ];
    _m.set(
      x[0],
      y[0],
      z[0] * flat,
      p[0],
      x[1],
      y[1],
      z[1] * flat,
      p[1],
      x[2],
      y[2],
      z[2] * flat,
      p[2],
      0,
      0,
      0,
      1
    );
    g.applyMatrix4(_m);
    return g;
  }
  function tailMesh(tie, len, wave, a0, b0, sv, col) {
    const nt = 14;
    const nr = 10;
    const P = [];
    const C = [];
    for (let j = 0; j <= nt; j++) {
      const t = j / nt;
      const cx = tie[0] + Math.sin(t * 4 + sv) * wave * t;
      const cy = tie[1] - len * t;
      const cz = tie[2] - .03 * Math.sin(t * Math.PI) - .05 * t;
      const k = (1 - Math.pow(t, 6)) * (1 - .45 * Math.pow(t, 1.4)) * (1
        + .25 * Math.sin(t * Math.PI));
      for (let i = 0; i <= nr; i++) {
        const a = i / nr * Math.PI * 2;
        P.push(cx + a0 * k * Math.cos(a), cy, cz + b0 * k * Math.sin(a));
        const c = mx2(col, INK, Math.max(0, 1 - Math.abs(Math.cos(a))) * .0 + Math.pow(t, 5) * .6);
        C.push(c[0], c[1], c[2]);
      }
    }
    return finishG(P, C, gridI(nr, nt));
  }
  function hairStrip(pts, w0, col) {
    const n = pts.length;
    const P = [];
    const C = [];
    const I = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const p = pts[i];
      const q = pts[Math.min(n - 1, i + 1)];
      const o = pts[Math.max(0, i - 1)];
      const T = unit3([
        q[0] - o[0], q[1] - o[1], q[2] - o[2]
      ]);
      const N = [
        p[0], 0, p[2] + .012
      ];
      const S = unit3([
        T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]
      ]);
      const w = w0 * (1 - .85 * Math.pow(t, 1.6)) / 2;
      P.push(
        p[0] - S[0] * w,
        p[1] - S[1] * w,
        p[2] - S[2] * w,
        p[0] + S[0] * w,
        p[1] + S[1] * w,
        p[2] + S[2] * w
      );
      const c = mx2(col, INK, Math.pow(t, 3) * .5);
      C.push(c[0], c[1], c[2], c[0], c[1], c[2]);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    return finishG(P, C, I);
  }
  function pathOver(phi0, s0, s1, wave, ph, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const s = s0 + (s1 - s0) * i / (n - 1);
      const th = Math.abs(s);
      const phi = s < 0 ? phi0 : phi0 + Math.PI;
      const p = sph(th, phi);
      const w = wave * Math.sin(i / n * Math.PI * 2 + ph);
      pts.push([
        p[0] + Math.cos(phi0) * w, p[1] + .004, p[2] - Math.sin(phi0) * w
      ]);
    }
    return pts;
  }
  const sstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const headR = y => .24 * Math.sqrt(Math.max(0, 1 - Math.pow((y - HEADY) / .2496, 2)));
  function shellHem(front, side, back, vol, drop, flare, phi) {
    const pw = Math.log((side - front) / (back - front)) / Math.log(.5);
    const f = (1 - Math.cos(phi)) / 2;
    const th1 = (front + (back - front) * Math.pow(f, pw)) * D2R;
    const p1 = sph(th1, phi, capR(vol, th1));
    const thB = back * D2R;
    const yBack = sph(thB, Math.PI, capR(vol, thB))[1] - drop;
    const e = sstep(.45, .8, f);
    const yHem = (p1[1] - drop * f * f) * (1 - e) + yBack * e;
    const rA = Math.hypot(p1[0], p1[2] + .012);
    const hug = Math.max(headR(yHem) + .035, .115);
    const rH = Math.max(rA * (1 - e) + Math.min(rA, hug) * e, headR(yHem) + .015) + flare;
    return {
      th1, p1, rA, rH, hem: [rH * Math.sin(phi), yHem, rH * Math.cos(phi) - .012]
    };
  }
  function hairShell(col, front, side, back, vol, drop, flare) {
    const NA = 40;
    const NT = 16;
    const ND = 6;
    const P = [];
    const C = [];
    for (let i = 0; i <= NA; i++) {
      const phi = -Math.PI + i / NA * 2 * Math.PI;
      const sh = shellHem(front, side, back, vol, drop, flare, phi);
      for (let j = 0; j <= NT + ND; j++) {
        let p;
        if (j <= NT) {
          const th = j / NT * sh.th1;
          p = sph(th, phi, capR(vol, th));
        }
        else {
          const w = (j - NT) / ND;
          const y = sh.p1[1] + (sh.hem[1] - sh.p1[1]) * w;
          const r = Math.max(sh.rA + (sh.rH - sh.rA) * w, headR(y) + .015);
          p = [
            r * Math.sin(phi), y, r * Math.cos(phi) - .012
          ];
        }
        P.push(p[0], p[1], p[2]);
        C.push(col[0], col[1], col[2]);
      }
    }
    return finishG(P, C, gridI(NT + ND, NA));
  }
  function buildHair(H, style, fem, hc, seed, ao, HL) {
    const base = hx2(hc);
    const top = mx2(base, [1, 1, 1], .1);
    const hiC = [.62, .62, .64];
    const topHex = (Math.round(top[0] * 255) << 16)
      | (Math.round(top[1] * 255) << 8)
      | Math.round(top[2] * 255);
    const blk = (x, y, z, sx, sy, sz) => add(
      H,
      new THREE.SphereGeometry(1, 20, 14),
      topHex,
      x,
      y,
      z,
      sx,
      sy,
      sz
    );
    const hl = vol => {
      if (HL) {
        hiPatch(HL, .5, 34 * D2R, .34, .11, -.5, vol, hiC);
        hiPatch(HL, Math.PI + .6, 36 * D2R, .3, .1, .5, vol, hiC);
      }
    };
    let sd = (seed | 0) % 2147483646 + 1;
    const rnd = (p, q) => p + (q - p) * ((sd = sd * 16807 % 2147483647) / 2147483647);
    const lock = (len, w, th, phi, dir, flat) => H.push(
      orientG(clump(len, w, top), dir, sph(th * D2R, phi), flat)
    );
    const bangs = (n, sweep, len, w, th) => {
      for (let k = 0; k < n; k++) {
        const e = k - (n - 1) / 2;
        lock(rnd(.9, 1.1) * len, w + rnd(0, .012), th + rnd(-2, 2), e * .24 + rnd(-.03, .03), [
          sweep * .7 + e * .08, -1, .3
        ], .7);
      }
    };
    const BACK_TIPS = true;
    const hemTips = (shellArgs, span, len, w) => {
      if (!BACK_TIPS) {
        return;
      }
      const hb = shellHem(...shellArgs, Math.PI).hem;
      const n = Math.max(5, Math.round(2 * span * Math.hypot(hb[0], hb[2] + .012) / w) + 1);
      for (let k = 0; k < n; k++) {
        const phi = Math.PI + (k / (n - 1) - .5) * 2 * span;
        const h = shellHem(...shellArgs, phi).hem;
        H.push(orientG(clump(len, w, top), [
          Math.sin(phi) * .1, -1, Math.cos(phi) * .1
        ], [
          h[0], h[1] + len * .35, h[2]
        ], .7));
      }
    };
    if (!fem) {
      H.push(hairShell(top, 54, 76, 98, .09, .04, 0));
      hemTips([54, 76, 98, .09, .04, 0], 1.0, .06, .05);
      hl(.09);
      bangs(7, .6, .13, .075, 43);
      [
        [
          16, .3, .1, .07, [.4, .5, -.2]
        ], [
          22, 2.4, .09, .07, [-.4, .5, -.3]
        ], [
          30, -1.9, .09, .07, [.3, .4, -.3]
        ]
      ].forEach(q => {
        const p = sph(q[0] * D2R, q[1]);
        H.push(orientG(clump(q[2], q[3], top), [
          q[4][0], 1, q[4][2]
        ], p, .8));
      });
      [-1, 1].forEach(sd2 => lock(.11, .06, 62, sd2 * 1.15, [
        sd2 * .2, -1, .1
      ], .7));
      return;
    }
    const long = style === 'long';
    const bob = style === 'bob';
    const fArgs = [54, 82, long ? 112 : 104, .1, long ? .3 : bob ? .17 : .02, long ? .03 : .02];
    H.push(hairShell(top, ...fArgs));
    hemTips(fArgs, 1.05, long ? .1 : bob ? .08 : .055, long ? .06 : .055);
    hl(.1);
    if (style === 'updo') {
      blk(0, 1.97, -.19, .14, .12, .13);
    }
    else if (style === 'pony') {
      blk(0, 1.58, -.3, .08, .2, .08);
    }
    bangs(8, style === 'bob' || style === 'long' ? .35 : 0, .14, .08, 43);
    [-1, 1].forEach(sd2 => {
      lock(.24, .075, 60, sd2 * 1.2, [
        sd2 * .15, -1, .15
      ], .7);
      lock(.2, .06, 70, sd2 * 1.5, [
        sd2 * .2, -1, 0
      ], .7);
    });
  }
  function buildHairOld(H, style, fem, hc, seed, ao, HL) {
    let sd = (seed | 0) % 2147483646 + 1;
    const hr = () => (sd = sd * 16807 % 2147483647) / 2147483647;
    const R = (a, b) => a + (b - a) * hr();
    const base = hx2(hc);
    const top = mx2(base, [1, 1, 1], .1);
    const back = mx2(base, [0, 0, 0], .1);
    const hiC = [.62, .62, .64];
    const lock = (len, w, th, phi, dir, flat) => H.push(
      orientG(clump(len, w, top), dir, sph(th * D2R, phi), flat)
    );
    const spike = (th, phi, len, w, sw) => {
      const p = sph(th * D2R, phi);
      const n = unit3([
        p[0], p[1] - HEADY, p[2] + .012
      ]);
      H.push(orientG(clump(len, w, top), [
        n[0] + sw[0], n[1] + sw[1], n[2] + sw[2]
      ], p, .8));
    };
    const bangs = (n, sweep, len, w) => {
      for (let k = 0; k < n; k++) {
        const e = k - (n - 1) / 2;
        lock(R(.9, 1.1) * len, w + R(0, .012), R(44, 48), e * .21 + R(-.03, .03), [
          sweep * .6 + e * .07, -1, .3
        ], .7);
      }
    };
    const sheet = (o, c) => H.push(hairSheet(Object.assign({
      ph: hr() * 6, scal: .25, locks: 3, curl: 0
    }, o), c));
    const hl = (vol, both) => {
      if (!HL) {
        return;
      }
      hiPatch(HL, .5, 34 * D2R, .34, .11, -.5, vol, hiC);
      hiPatch(HL, .95, 49 * D2R, .075, .05, 0, vol, hiC);
      if (both) {
        hiPatch(HL, Math.PI + .6, 36 * D2R, .3, .1, .5, vol, hiC);
      }
    };
    if (!fem) {
      const slick = style === 'slick';
      const crop = style === 'crop';
      const vol = crop ? .03 : slick ? .06 : .09;
      H.push(
        hairCap(
          top,
          slick ? 54 : crop ? 56 : 52,
          slick ? 74 : 76,
          slick ? 96 : crop ? 92 : 98,
          vol,
          slick ? 0 : .35
        )
      );
      if (slick) {
        for (let k = 0; k < 7; k++) {
          H.push(
            hairStrip(
              pathOver(
                -.85 + 1.7 * k / 6 + R(-.04, .04),
                -54 * D2R,
                R(92, 104) * D2R,
                R(.01, .02),
                hr() * 6,
                14
              ),
              .09,
              top
            )
          );
        }
        hl(vol, true);
      }
      else if (crop) {
        for (let k = 0; k < 6; k++) {
          spike(R(20, 44), k * 1.05 + R(-.2, .2), R(.07, .1), .07, [0, .1, -.15]);
        }
        bangs(5, 0, .06, .06);
      }
      else {
        [
          [
            16, .2, .19, .085, [.3, .25, -.2]
          ], [
            22, 2.2, .17, .08, [-.3, .2, -.3]
          ], [
            28, -1.8, .16, .08, [.2, .3, -.3]
          ], [
            34, 1.0, .15, .075, [.5, .1, .1]
          ], [
            30, -.6, .14, .075, [-.5, .1, .1]
          ], [
            40, 3.0, .15, .08, [0, .2, -.5]
          ], [
            24, -2.9, .13, .07, [-.2, .2, -.4]
          ]
        ].forEach(a => spike(a[0], a[1], a[2], a[3], a[4]));
        bangs(6, .6, .095, .066);
      }
      [-1, 1].forEach(s => {
        lock(.12, .06, 66, s * 1.25, [
          s * .9, -.5, .1
        ], .7);
        lock(.12, .055, 84, s * 1.8, [
          s * .8, -.6, -.2
        ], .7);
      });
      for (let k = 0; k < 3; k++) {
        lock(.09, .06, 100, Math.PI + (k - 1) * .45, [0, -1, -.3], .7);
      }
      return;
    }
    const cap = (backA, vol) => H.push(hairCap(top, 50, 78, backA, vol, 0));
    const swoop = () => {
      lock(.13, .12, 46, -.4, [1.1, -1, .35], .5);
      lock(.1, .085, 46, .3, [-.5, -1, .35], .5);
      lock(.085, .06, 46, -.05, [.3, -1, .3], .6);
      lock(.08, .06, 46, .75, [-.9, -1, .3], .6);
    };
    if (style === 'updo') {
      cap(94, .1);
      hl(.1, true);
      const bun = [0, 1.95, -.2];
      const sg = new THREE.SphereGeometry(.13, 20, 14);
      const PP = sg.attributes.position;
      const CC = new Float32Array(PP.count * 3);
      for (let i = 0; i < PP.count; i++) {
        CC[i * 3] = top[0];
        CC[i * 3 + 1] = top[1];
        CC[i * 3 + 2] = top[2];
      }
      sg.setAttribute('color', new THREE.BufferAttribute(CC, 3));
      const bg = sg.toNonIndexed();
      _m.makeScale(1.05, .92, .98);
      _m.setPosition(bun[0], bun[1], bun[2]);
      bg.applyMatrix4(_m);
      H.push(bg);
      for (let q = 0; q < 3; q++) {
        const pts = [];
        for (let i = 0; i < 14; i++) {
          const ang = i / 13 * 1.7 * Math.PI + q * 2.1;
          const rad = .12 * (1 - .45 * i / 13);
          pts.push([
            bun[0] + Math.cos(ang) * rad, bun[1] + Math.sin(ang) * rad * .9, bun[2] - .1
          ]);
        }
        H.push(hairStrip(pts, .04, back));
      }
      add(
        H,
        new THREE.CylinderGeometry(.008, .008, .24, 6),
        0xf0c060,
        bun[0] + .02,
        bun[1],
        bun[2] - .13,
        1,
        1,
        1,
        0,
        0,
        1.2
      );
      add(
        H,
        new THREE.SphereGeometry(.022, 8, 6),
        0xf0c060,
        bun[0] + .13,
        bun[1] + .05,
        bun[2] - .13
      );
      [-1, 1].forEach(s => sheet({
        phi: s * 1.3, span: .2, th0: 40, th1: 88, len: .3, wave: .02, flare: .04, scal: .8, locks: 1
      }, back));
      swoop();
      return bun;
    }
    if (style === 'pony') {
      cap(100, .1);
      hl(.1, true);
      const tie = [0, 1.66, -.285];
      H.push(tailMesh(tie, .34, .03, .06, .045, hr() * 6, back));
      add(
        H,
        new THREE.TorusGeometry(.055, .02, 8, 16),
        0xc0392b,
        tie[0],
        tie[1],
        tie[2] - .01,
        1,
        1,
        1,
        Math.PI / 2,
        0,
        0
      );
      [-1, 1].forEach(s => sheet({
        phi: s * 1.3,
        span: .18,
        th0: 40,
        th1: 88,
        len: .17,
        wave: .012,
        flare: .035,
        scal: .8,
        locks: 1
      }, back));
      swoop();
      return tie;
    }
    const long = style === 'long';
    cap(long ? 112 : 104, .11);
    hl(.11, true);
    sheet({
      phi: Math.PI,
      span: 1.25,
      th0: 24,
      th1: long ? 104 : 100,
      len: long ? .46 : .17,
      wave: long ? .025 : .01,
      flare: long ? .045 : .03,
      curl: long ? .045 : -.03,
      locks: long ? 3 : 4,
      scal: .7,
      nu: 22
    }, back);
    [-1, 1].forEach(s => sheet({
      phi: s * 1.3,
      span: .22,
      th0: 38,
      th1: 88,
      len: long ? .36 : .17,
      wave: long ? .02 : .01,
      flare: .04,
      scal: .8,
      locks: 1,
      dark: .1
    }, mx2(base, [0, 0, 0], .05)));
    swoop();
  }
  function outlineMesh(geo, t) {
    const g = geo.clone();
    const P = g.attributes.position;
    const N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      P.setXYZ(i, P.getX(i) + N.getX(i) * t, P.getY(i) + N.getY(i) * t, P.getZ(i) + N.getZ(i) * t);
    }
    return new THREE.Mesh(g, OLM);
  }
  const capG = (r0, r1, h, n) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const b = i / 6 * Math.PI / 2;
      pts.push(new THREE.Vector2(r1 * Math.sin(b), -h / 2 - r1 * Math.cos(b)));
    }
    for (let i = 0; i <= 6; i++) {
      const a = i / 6 * Math.PI / 2;
      pts.push(new THREE.Vector2(r0 * Math.cos(a), h / 2 + r0 * Math.sin(a)));
    }
    return new THREE.LatheGeometry(pts, n || 20);
  };
  function waveG(pts, folds, amp, yTop, yBot, n) {
    const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), n || 44);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i);
      const y = P.getY(i);
      const z = P.getZ(i);
      const w = Math.max(0, Math.min(1, (yTop - y) / (yTop - yBot)));
      const k = 1 + amp * Math.sin(Math.atan2(z, x) * folds) * w;
      P.setXYZ(i, x * k, y, z * k);
    }
    g.computeVertexNormals();
    return g;
  }
  function scaleHead(H, s, dy) {
    const M = new THREE.Matrix4().makeTranslation(0, 1.72 + dy, 0).multiply(
      new THREE.Matrix4().makeScale(s, s, s)
    ).multiply(
      new THREE.Matrix4().makeTranslation(0, -1.72, 0)
    );
    H.forEach(g => g.applyMatrix4(M));
  }
  const SIT_FWD = .16;
  function sitSkirt(g, stool, layer) {
    const P = g.attributes.position;
    const WAIST = 1;
    const lapY = .85 + .06 + .014 - .008 * layer;
    const seatY = .85 - .06 + .017 - .008 * layer;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i);
      const y = P.getY(i);
      const z = P.getZ(i);
      const d = Math.max(0, WAIST - y);
      const back = Math.max(0, -Math.cos(Math.atan2(x, z)));
      const rk = stool ? 1 : 1.1 - .5 * back;
      const k = 1 + (rk - 1) * Math.min(1, d / .3);
      const x2 = x * k;
      const z2 = z * k;
      const yFree = WAIST - d * .55;
      const lapK = (1 - sstep(.15, .25, Math.abs(x2))) * sstep(-.1, 0, z2) * (1 - sstep(.46, .58, z2));
      const seatK = stool
        ? 1 - sstep(.26, .32, Math.hypot(x2, z2))
        : (1 - sstep(.36, .42, Math.abs(x2))) * sstep(-.64, -.56, z2) * (1 - sstep(.2, .26, z2));
      const yS = yFree + seatK * Math.max(0, seatY - yFree);
      const yL = yFree + lapK * Math.max(0, lapY - yFree);
      P.setXYZ(i, x2, Math.max(yS, yL), z2);
    }
    g.computeVertexNormals();
    return g;
  }
  function person(g, col, singer, hairI, skinI, hairS, seed) {
    const f = new THREE.Group();
    const hc = HAIRC[hairI || 0];
    const sk = SKS[skinI || 0];
    const fem = g === 'f';
    const ao = fem && singer;
    const GOLDC = 0xd4a84a;
    const GL = (pts, n) => new THREE.LatheGeometry(
      pts.map(p => new THREE.Vector2(p[0], p[1])),
      n || 32
    );
    const GS = (r, a, b) => new THREE.SphereGeometry(r, a || 18, b || 14);
    const GC = (a, b, h) => new THREE.CylinderGeometry(a, b, h, 16);
    const GB = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const GT = (a, b, arc) => new THREE.TorusGeometry(a, b, 8, 20, arc);
    const H = [];
    const T = [];
    const SKT = [];
    const SKC = [];
    const SKD = [];
    let thR = .1;
    let handR = .05;
    const LT = [];
    const LS = [];
    const RT = [];
    const RS = [];
    const AL = [];
    const AR = [];
    const both = (A, B, fn) => {
      fn(A);
      fn(B);
    };
    const legs = fn => {
      fn(LT, LS);
      fn(RT, RS);
    };
    const skD = dk(sk, .86);
    const PI2 = Math.PI * 2;
    add(H, GS(.24, 30, 22), sk, 0, 1.72, 0, 1, 1.04, 1);
    add(H, GC(.06, .07, .14), sk, 0, 1.5, 0);
    [-1, 1].forEach(s => {
      const ex = s * .1;
      add(H, GS(.045, 12, 10), sk, s * .235, 1.72, 0, .6, 1, 1);
      add(H, GS(.025, 10, 8), skD, s * .24, 1.72, .005, .5, 1, 1);
      add(H, GS(.068, 18, 14), 0xffffff, ex, 1.73, .195, 1, 1.2, .5);
      add(H, GS(.05, 18, 14), 0x1c1618, ex, 1.727, .215, 1, 1.22, .5);
      add(H, GS(.034, 14, 10), 0x3a3234, ex, 1.725, .224, 1, 1.2, .5);
      add(H, GS(.022, 12, 8), 0x0d0806, ex, 1.725, .231, 1, 1.2, .5);
      add(H, GS(.019, 10, 8), 0xffffff, ex + .02, 1.75, .238);
      add(H, GS(.01, 8, 6), 0xffffff, ex - .014, 1.705, .238);
      add(H, GT(.066, .007, Math.PI), fem ? 0x140c08 : dk(hc, .8), ex, 1.745, .217, 1, .4, 1);
      if (fem) {
        add(H, GB(.036, .007, .007), 0x140c08, s * .16, 1.755, .205, 1, 1, 1, 0, 0, s * -.55);
        add(H, GB(.032, .007, .007), 0x140c08, s * .166, 1.74, .203, 1, 1, 1, 0, 0, s * -.15);
      }
      add(H, GB(.075, .013, .01), hc, ex, 1.812, .21, 1, 1, 1, 0, 0, -s * .12);
      add(H, GS(.07, 12, 8), fem ? 0xff9a8c : 0xf4a088, s * .15, 1.65, .165, 1, .72, .4);
    });
    add(H, GS(.014, 10, 8), skD, 0, 1.675, .24);
    add(
      H,
      GT(.026, .006, Math.PI),
      fem ? 0xd9535f : 0xc0504d,
      0,
      1.642,
      .231,
      1,
      1,
      1,
      0,
      0,
      Math.PI
    );
    if (fem) {
      add(H, GS(.018, 10, 8), 0xd9535f, 0, 1.63, .232, 1.6, .6, .5);
    }
    const HH = [];
    const HL = [];
    buildHair(
      HH,
      hairS || (ao ? 'updo' : fem ? 'long' : singer ? 'slick' : 'side'),
      fem,
      hc,
      seed == null ? (hairI || 0) * 97 + (skinI || 0) * 31 + 7 : seed,
      ao,
      HL
    );
    scaleHead(H, 1.55, -.2);
    scaleHead(HH, 1.55, -.2);
    scaleHead(HL, 1.55, -.2);
    const armG = (L, r0, r1, c, cuffC, hand) => {
      handR = hand;
      add(L, capG(r0, r1, .4), c, 0, -(.2 + r0), 0);
      add(L, GS(r0 + .006, 14, 10), c, 0, 0, 0);
      if (cuffC != null) {
        add(L, GT(r1 + .004, .012, PI2), cuffC, 0, -.5, 0, 1, 1, 1, Math.PI / 2, 0, 0);
      }
      add(L, GS(hand, 14, 10), sk, 0, -.6, 0, 1, 1.15, .9);
      add(L, GS(hand * .38, 8, 6), sk, hand * .62, -.58, hand * .5);
    };
    const legM = (A, B, c, c2, r0, r1, r2, shoeC, mj) => {
      thR = r0;
      add(A, capG(r0, r1, .2), c, 0, -(.1 + r0), 0);
      add(A, GS(r1 + .004, 12, 10), c, 0, -.4, 0);
      add(B, capG(r1, r2, .24), c2, 0, -(.12 + r1), 0);
      add(B, GS(.09, 16, 12), shoeC, 0, -.385, .065, 1, .65, 1.8);
      add(B, GB(.17, .025, .3), mj ? dk(shoeC, .6) : 0x2a1a10, 0, -.435, .065);
      if (mj) {
        add(B, GB(.14, .02, .02), shoeC, 0, -.345, .0);
      }
      else {
        add(B, GT(r2 + .004, .012, PI2), dk(c2, .75), 0, -.34, 0, 1, 1, 1, Math.PI / 2, 0, 0);
      }
    };
    let lx;
    let ax;
    let ay = 1.38;
    if (!fem) {
      lx = .11;
      ax = .29;
      add(T, waveG([
        [0,
        .64],
        [.2,
        .64],
        [.23,
        .75],
        [.21,
        .9],
        [.24,
        1.12],
        [.25,
        1.28],
        [.2,
        1.42],
        [.1,
        1.48],
        [0,
        1.49]
      ], 10, .012, .9, .6, 40), col, 0, 0, 0, 1, 1, .62);
      add(T, GB(.14, .52, .02), 0xf4f4f4, 0, 1.18, .152);
      [-1, 1].forEach(s => {
        add(T, GB(.07, .045, .025), 0xffffff, s * .045, 1.44, .15, 1, 1, 1, 0, 0, -s * .5);
        add(T, GB(.07, .36, .02), dk(col, .6), s * .1, 1.22, .16, 1, 1, 1, 0, 0, -s * .28);
        add(T, GS(.085, 14, 10), col, s * .26, 1.38, 0);
      });
      [1.0, 1.1].forEach(y => add(T, GS(.016, 8, 6), GOLDC, 0, y, .168));
      add(T, GB(.05, .05, .012), 0xffffff, -.15, 1.22, .163, 1, 1, 1, 0, 0, .25);
      if (singer) {
        add(T, GB(.2, .4, .02), 0x7a1f2a, 0, 1.04, .158);
        add(T, GB(.13, .05, .03), 0x111111, 0, 1.43, .168);
      }
      else {
        add(
          T,
          new THREE.ConeGeometry(.032, .3, 4),
          0x2b4a86,
          0,
          1.16,
          .164,
          1,
          1,
          .5,
          Math.PI,
          0,
          0
        );
      }
      legs((A, B) => legM(A, B, col, dk(col, .92), .1, .085, .062, 0x1a1a1a, false));
      both(AL, AR, L => armG(L, .08, .058, col, 0xf4f4f4, .062));
    }
    else if (ao) {
      lx = .09;
      ax = .2;
      ay = 1.36;
      add(T, GL([
        [0,
        .84],
        [.19,
        .84],
        [.16,
        .95],
        [.145,
        1.05],
        [.16,
        1.18],
        [.19,
        1.3],
        [.16,
        1.42],
        [.07,
        1.46],
        [0,
        1.47]
      ]), col, 0, 0, 0, 1, 1, .75);
      add(T, GC(.065, .07, .06), col, 0, 1.46, 0);
      [1.38, 1.29, 1.2].forEach(y => add(T, GS(.014, 8, 6), GOLDC, .105, y, .1));
      [[.12, .05], [-.12, -.05]].forEach(a => {
        add(T, GB(.3, .74, .02), col, 0, .48, a[0], 1, 1, 1, a[1], 0, 0);
        add(T, GB(.012, .7, .022), GOLDC, 0, .48, a[0] * 1.09, 1, 1, 1, a[1], 0, 0);
        add(T, GB(.31, .025, .024), GOLDC, 0, .12, a[0] * 1.03, 1, 1, 1, a[1], 0, 0);
      });
      legs((A, B) => legM(A, B, 0xf6f0e6, 0xf6f0e6, .105, .1, .11, 0xb5121b, true));
      both(AL, AR, L => {
        armG(L, .07, .052, col, null, .052);
        add(L, GT(.056, .01, PI2), GOLDC, 0, -.5, 0, 1, 1, 1, Math.PI / 2, 0, 0);
      });
    }
    else {
      lx = .08;
      ax = .2;
      ay = 1.36;
      add(T, GL([
        [0, .98], [.13, .98], [.16, 1.1], [.19, 1.25], [.17, 1.38], [.12, 1.45], [0, 1.46]
      ]), col, 0, 0, 0, 1, 1, .8);
      const skirt = (pts, folds, amp, yTop, yBot, c, layer) => {
        const g1 = waveG(pts, folds, amp, yTop, yBot);
        const g2 = sitSkirt(g1.clone(), false, layer);
        const g3 = sitSkirt(g1.clone(), true, layer);
        add(SKT, g1, c, 0, 0, 0);
        add(SKC, g2, c, 0, 0, 0);
        add(SKD, g3, c, 0, 0, 0);
      };
      skirt([
        [0, 1], [.15, .99], [.22, .9], [.31, .7], [.4, .5], [.46, .4], [0, .4]
      ], 14, .04, 1, .4, col, 0);
      skirt([
        [0, .9], [.3, .6], [.44, .36], [.49, .3], [0, .3]
      ], 18, .03, .9, .3, 0xfff1e4, 1);
      add(T, GT(.15, .022, PI2), dk(col, .7), 0, 1.0, 0, 1, 1, 1, Math.PI / 2, 0, 0);
      add(T, GT(.12, .026, PI2), 0xffffff, 0, 1.43, 0, 1, .8, 1, Math.PI / 2, 0, 0);
      [-1, 1].forEach(
        q => add(T, GS(.05, 12, 8), 0xffffff, q * .075, 1.42, .1, 1.3, .55, .8, 0, 0, q * .25)
      );
      const bw = dk(col, .8);
      add(T, GS(.035, 8, 6), bw, 0, 1.0, -.2);
      [-1, 1].forEach(q => {
        add(T, GS(.07, 10, 8), bw, q * .08, 1.0, -.2, 1.3, .8, .4, 0, 0, q * -.3);
        add(T, GB(.04, .2, .01), bw, q * .03, .88, -.205, 1, 1, 1, 0, 0, q * -.2);
      });
      [-1, 1].forEach(s => add(T, GS(.095, 14, 10), col, s * .2, 1.36, 0));
      legs((A, B) => {
        legM(A, B, sk, sk, .06, .052, .04, 0x4a2e22, true);
        add(B, GC(.05, .046, .13), 0xffffff, 0, -.3, 0);
        add(B, GT(.05, .007, PI2), 0x6b4a3a, 0, -.26, 0, 1, 1, 1, Math.PI / 2, 0, 0);
      });
      both(AL, AR, L => armG(L, .056, .042, sk, null, .048));
    }
    if (singer) {
      add(AR, GC(.022, .022, .2), 0x222222, 0, -.72, 0);
      add(AR, GS(.05), 0x999999, 0, -.85, 0);
    }
    const SB = .8;
    const SBm = new THREE.Matrix4().makeScale(SB, SB, SB);
    [T, SKT, SKC, SKD, LT, LS, RT, RS, AL, AR].forEach(L => L.forEach(g2 => g2.applyMatrix4(SBm)));
    const NECK = 1.2;
    const hd = new THREE.Group();
    hd.position.set(0, NECK, 0);
    f.add(hd);
    const toHead = m => {
      m.position.y -= NECK;
      hd.add(m);
      return m;
    };
    toHead(merged(H, 0, 1));
    f.add(merged(T, 0, 1));
    const SK = SKT.length ? [SKT, SKC, SKD].map((L, i) => {
      const m = merged(L, 0, 1);
      m.visible = i === 0;
      f.add(m);
      return m;
    }) : null;
    const hm = merged(HH, 0, 0, HMV);
    toHead(hm);
    toHead(outlineMesh(hm.geometry, .008));
    if (HL.length) {
      toHead(merged(HL, 1));
    }
    const hs = new THREE.Mesh(HEADO, OLS);
    hs.scale.set(1.6, 1.66, 1.6);
    hs.position.set(0, 1.52, 0);
    toHead(hs);
    const LIDM = LIDMS[sk] || (LIDMS[sk] = new THREE.MeshPhongMaterial({
      color: sk, shininess: 12, specular: 0x2a2a2a, emissive: 0x20130c
    }));
    const LD = [-1, 1].map(s => {
      const m = new THREE.Mesh(LIDG, LIDM);
      m.visible = false;
      m.position.set(s * .155, LID_Y, .31);
      hd.add(m);
      return m;
    });
    const mkP = (x, y, L) => {
      const p = new THREE.Group();
      p.position.set(x, y, 0);
      p.add(merged(L, 0, 1));
      f.add(p);
      return p;
    };
    const kn = (Pv, L) => {
      const k = new THREE.Group();
      k.position.y = -.4 * SB;
      k.add(merged(L, 0, 1));
      Pv.add(k);
      return k;
    };
    const Lg = mkP(-lx * SB, .85 * SB, LT);
    const Rg = mkP(lx * SB, .85 * SB, RT);
    const Lk = kn(Lg, LS);
    const Rk = kn(Rg, RS);
    const Al = mkP(-ax * SB, ay * SB, AL);
    const Ar = mkP(ax * SB, ay * SB, AR);
    if (singer) {
      Ar.rotation.x = -1.9;
    }
    const hipY = .85 * SB;
    const armL = .6 * SB;
    const lapTop = hipY + thR * SB + (SK ? .011 : 0) + handR * SB * 1.1;
    const sitZ = Math.max(-.5, Math.min(.5, -Math.asin(Math.max(-1, Math.min(1, (ax * SB - (lx * SB + .03)) / armL)))));
    const sitX = Math.acos(Math.max(.3, Math.min(1, (ay * SB - lapTop) / (armL * Math.cos(sitZ)))));
    return {
      g: f, L: Lg, R: Rg, LK: Lk, RK: Rk, AL: Al, AR: Ar, HD: hd, LD, SK, thR: thR * SB, sitX, sitZ
    };
  }
  const LIDG = new THREE.SphereGeometry(1, 12, 8);
  const LIDMS = {};
  const LID_Y = .3355;
  const LID_RX = .118;
  const LID_RY = .13;
  const LID_RZ = .1;
  function lifeFig(fg, t, ph, wk, seated, arms) {
    const s = t / 1000 + ph;
    const walk = wk > .02;
    const hy = Math.sin(s * .5) * .14 * (1 - wk) + Math.sin(s * 1.3 + 2) * .04;
    fg.HD.rotation.set(
      Math.sin(t / 55) * .03 * wk + Math.sin(s * .7 + 1) * .03 * (1 - wk),
      hy,
      Math.sin(t / 110) * .035 * wk + Math.sin(s * .9) * .035 * (1 - wk)
    );
    const bp = (t / 1000 + ph * 3.7) % 4.3;
    const b = bp < .16
      ? Math.sin(bp / .16 * Math.PI)
      : (bp > 2.1 && bp < 2.24 ? Math.sin((bp - 2.1) / .14 * Math.PI) : 0);
    fg.LD.forEach(m => {
      m.visible = b > .06;
      if (m.visible) {
        m.position.y = LID_Y + LID_RY * (1 - b);
        m.scale.set(LID_RX, LID_RY * b, LID_RZ);
      }
    });
    fg.g.rotation.order = 'YXZ';
    fg.g.rotation.x = seated ? 0 : .07 * wk + Math.sin(s * 1.5) * .004;
    fg.g.rotation.z = seated
      ? Math.sin(s * .6) * .015
      : Math.sin(t / 110) * .035 * wk + Math.sin(s * .8) * .012 * (1 - wk);
    if (!arms) {
      return;
    }
    const br = Math.sin(s * 2.1) * .015;
    const rel = seated ? (fg.relSit == null ? .05 : fg.relSit) : .09 + .03 * wk;
    fg.AL.rotation.z = -rel - br;
    fg.AR.rotation.z = rel + br;
    if (!seated && !walk) {
      fg.AL.rotation.x += Math.sin(s * .9) * .03 - .04;
      fg.AR.rotation.x += Math.sin(s * .9 + 1.5) * .03 - .04;
      fg.L.rotation.z = -.025;
      fg.R.rotation.z = .025;
    }
    else {
      fg.L.rotation.z = fg.R.rotation.z = 0;
    }
  }
  const USE_GLB = true;
  const MODEL_CFG = {
    m: { path: 'assets/models/nam_tuxedo.glb', scale: 1.2 },
    f: { path: 'assets/models/nu_dress.glb', scale: 1.2 },
    sm: { path: 'assets/models/ca_si_nam.glb', scale: 1.2 },
    sf: { path: 'assets/models/ca_si_nu.glb', scale: 1.2 }
  };
  const GLB = {};
  const GLB_PROMISES = new Map();
  const CLIP_RX = {
    idle: /idle|stand|wait|breath/i,
    walk: /walk|run|move/i,
    wave: /wave|hello|greet/i,
    sit: /sit|seat/i,
    clap: /clap|applau/i,
    sip: /drink|sip|cheer|toast|cup/i,
    sing: /sing|mic|perform|talk/i
  };
  function loadGLTF(path) {
    if (!GLB_PROMISES.has(path)) {
      GLB_PROMISES.set(path, new Promise(res => {
        if (!THREE.GLTFLoader) {
          console.warn('Chưa nạp GLTFLoader, dùng nhân vật khối hình học.');
          res(null);
          return;
        }
        new THREE.GLTFLoader().load(path, g => res(g), () => {
        }, () => {
          console.warn('Không tải được mô hình', path, '- dùng nhân vật khối hình học.');
          res(null);
        });
      }));
    }
    return GLB_PROMISES.get(path);
  }
  function tuneModel(root) {
    root.traverse(ch => {
      if (!ch.isMesh) {
        return;
      }
      ch.castShadow = ch.receiveShadow = true;
      ch.frustumCulled = false;
      (Array.isArray(ch.material) ? ch.material : [ch.material]).forEach(m => {
        if (!m) {
          return;
        }
        const nm = (m.name || '').toLowerCase();
        if (m.roughness !== undefined) {
          const r = /hair|toc|tóc/.test(nm)
            ? .45
            : /skin|face|da|body/.test(nm) ? .55 : m.roughness;
          m.roughness = Math.min(.6, Math.max(.4, r));
        }
        if (m.metalness !== undefined) {
          m.metalness = Math.min(m.metalness, .15);
        }
        ['map', 'emissiveMap'].forEach(k => {
          if (m[k]) {
            m[k].encoding = THREE.LinearEncoding;
            m[k].needsUpdate = true;
          }
        });
        if (m.map) {
          m.map.anisotropy = 4;
        }
        m.needsUpdate = true;
      });
    });
  }
  async function loadCharacterModel(modelPath, position = [0, 0, 0], scale = 1.2, parent = null) {
    const gltf = await loadGLTF(modelPath);
    if (!gltf) {
      return null;
    }
    if (!gltf._tuned) {
      tuneModel(gltf.scene);
      gltf._tuned = true;
    }
    const root = THREE.SkeletonUtils.clone(gltf.scene);
    root.scale.setScalar(scale);
    const box = new THREE.Box3().setFromObject(root);
    const height = box.max.y - box.min.y;
    root.position.set(position[0], position[1] - box.min.y, position[2]);
    const anims = gltf.animations || [];
    const mixer = anims.length ? new THREE.AnimationMixer(root) : null;
    const actions = {};
    anims.forEach(clip => {
      for (const k in CLIP_RX) {
        if (!actions[k] && CLIP_RX[k].test(clip.name || '')) {
          actions[k] = mixer.clipAction(clip);
        }
      }
    });
    if (!actions.idle && anims.length === 1) {
      actions.idle = mixer.clipAction(anims[0]);
    }
    if (parent) {
      parent.add(root);
    }
    return {
      root, mixer, actions, height
    };
  }
  async function preloadModels() {
    if (!USE_GLB) {
      return;
    }
    for (const k in MODEL_CFG) {
      const g = await loadGLTF(MODEL_CFG[k].path);
      if (g) {
        GLB[k] = g;
      }
    }
  }
  async function attachGLB(p, o) {
    const kind = p.av === 'f' ? 'f' : 'm';
    if (o.glbTried || !GLB[kind]) {
      return;
    }
    o.glbTried = true;
    const inst = await loadCharacterModel(MODEL_CFG[kind].path, [0, 0, 0], MODEL_CFG[kind].scale);
    if (!inst || !o.g.parent) {
      return;
    }
    const holder = new THREE.Group();
    holder.add(inst.root);
    holder.rotation.y = o.body.rotation.y;
    holder.position.copy(o.body.position);
    o.g.remove(o.body);
    o.body.traverse(c => {
      if (c.isMesh
        && (c.material === VM
          || c.material === PMV
          || c.material === HMV
          || c.material === OLM
          || c.material === EMV)) {
        c.geometry.dispose();
      }
    });
    o.g.add(holder);
    o.body = holder;
    o.fig = null;
    o.glb = {
      mixer: inst.mixer,
      actions: inst.actions,
      h: inst.height,
      cur: null,
      curA: null,
      root: inst.root
    };
    if (inst.actions.idle) {
      inst.actions.idle.play();
      o.glb.cur = 'idle';
      o.glb.curA = inst.actions.idle;
    }
  }
  function glbAnimate(o, p, t, dt, seated) {
    const g = o.glb;
    const A = g.actions;
    let want = null;
    if (p.waveT && t - p.waveT < 1800 && A.wave) {
      want = 'wave';
    }
    else if (p.clapT && t - p.clapT < 1500 && A.clap) {
      want = 'clap';
    }
    else if (p.sipT && t - p.sipT < 1100 && A.sip) {
      want = 'sip';
    }
    else if (seated && A.sit) {
      want = 'sit';
    }
    else if (p.mv && A.walk) {
      want = 'walk';
    }
    else if (A.idle) {
      want = 'idle';
    }
    if (want !== g.cur) {
      const next = want ? A[want] : null;
      if (next) {
        next.reset().fadeIn(.25).play();
      }
      if (g.curA && g.curA !== next) {
        g.curA.fadeOut(.25);
      }
      g.cur = want;
      g.curA = next;
    }
    if (g.mixer) {
      g.mixer.update(dt);
    }
    const hop = (p.waveT && t - p.waveT < 1800 && !A.wave)
      || (p.clapT && t - p.clapT < 1500 && !A.clap);
    g.root.position.y = (g.base0 === undefined ? (g.base0 = g.root.position.y) : g.base0)
      + (hop ? Math.abs(Math.sin(t / 90)) * .06 : 0);
    g.root.rotation.z = (!A.walk && p.mv) ? Math.sin(t / 110) * .05 : 0;
  }
  async function singerGLB(sf, fem) {
    const k1 = fem ? 'sf' : 'sm';
    const k2 = fem ? 'f' : 'm';
    const kind = GLB[k1] ? k1 : GLB[k2] ? k2 : null;
    if (!kind) {
      return;
    }
    const inst = await loadCharacterModel(MODEL_CFG[kind].path, [0, 0, 0], MODEL_CFG[kind].scale);
    if (!inst || (sf !== sFig && sf !== sFig2)) {
      return;
    }
    while (sf.g.children.length) {
      const c = sf.g.children[0];
      sf.g.remove(c);
      c.traverse(x => {
        if (x.isMesh
          && (x.material === VM
            || x.material === PMV
            || x.material === HMV
            || x.material === OLM
            || x.material === EMV)) {
          x.geometry.dispose();
        }
      });
    }
    sf.g.add(inst.root);
    sf.glb = { mixer: inst.mixer, actions: inst.actions };
    const a = inst.actions.sing || inst.actions.idle;
    if (a) {
      a.play();
    }
  }
  function obj(p) {
    if (p._o) {
      return p._o;
    }
    const g = new THREE.Group();
    const fem = p.av === 'f';
    const col = PAL[fem ? 'f' : 'm'][(p.c | 0) % 6];
    const hsh = [...(p.n || '')].reduce((a2, ch) => a2 + ch.charCodeAt(0), 0);
    const fig = person(
      fem ? 'f' : 'm',
      col,
      false,
      [0, 0, 0, 1, 1, 2, 3][hsh % 7],
      hsh % 3,
      fem ? (hsh % 2 ? 'bob' : 'long') : (hsh % 3 === 0 ? 'crop' : 'side'),
      hsh + 17
    );
    const body = fig.g;
    const sh = new THREE.Mesh(new THREE.CircleGeometry(.5, 16), new THREE.MeshBasicMaterial({
      color: 0, transparent: true, opacity: .35
    }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = .02;
    const cn = cvs(256, 96);
    const lb = sprite(new THREE.CanvasTexture(cn), 2.4, .9);
    lb.center.set(.5, 0);
    lb.position.y = 2.15;
    const bb = sprite(null, 1.1, 1.1);
    bb.visible = false;
    const cup = cyl(.06, .05, .11, 0xd8b24a, .3, 1.0, .32, body);
    cup.visible = false;
    const st = [0, 1].map(() => {
      const s = sprite(steamTex, .45, .45);
      s.material.opacity = 0;
      body.add(s);
      return s;
    });
    g.add(sh, body, lb, bb);
    scn.add(g);
    return (p._o = {
      g, body, fig, cn, lb, bb, st, cup, h: 0
    });
  }
  function label(p, isMe) {
    const o = obj(p);
    const sc = isMe ? score : p.s;
    const lv = (lvl(sc) > 1 ? 'Cấp ' + lvl(sc) + ' · ' : '') + lvn(sc);
    const fr = !isMe && p.k && FR.list[p.k] ? '💛 ' : '';
    const z = zp(isMe ? me.z : p.z);
    const nm = (!isMe || zCan(ZB[z[1]]) ? ZB[z[1]][2] : '') + fr + p.n;
    const col = (!isMe || zCan(ZN[z[0]])) && ZN[z[0]][2] ? ZN[z[0]][2] : (isMe ? '#ffd27a' : '#f3e3c3');
    const key = nm + '|' + lv + '|' + col;
    if (p._k === key) {
      return;
    }
    p._k = key;
    const x = o.cn.getContext('2d');
    x.clearRect(0, 0, 256, 96);
    x.textAlign = 'center';
    x.lineWidth = 5;
    x.strokeStyle = '#000';
    let fs = 30;
    do {
      x.font = 'bold ' + fs + 'px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      fs -= 2;
    } while (x.measureText(nm).width > 244 && fs > 14);
    if (col === 'rainbow') {
      const gr = x.createLinearGradient(20, 0, 236, 0);
      ['#ff6b6b', '#ffd24a', '#7fe08a', '#6bb8ff', '#c9a0ff'].forEach((c, i) => gr.addColorStop(i / 4, c));
      x.fillStyle = gr;
    }
    else {
      x.fillStyle = col;
    }
    x.strokeText(nm, 128, 42);
    x.fillText(nm, 128, 42);
    x.font = '22px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    x.fillStyle = '#c9a56a';
    x.strokeText(lv, 128, 78);
    x.fillText(lv, 128, 78);
    o.lb.material.map.needsUpdate = true;
  }
  function rm(p) {
    if (p && p._o) {
      scn.remove(p._o.g);
      if (p._o.glb && p._o.glb.mixer) {
        p._o.glb.mixer.stopAllAction();
      }
      p._o.g.traverse(o => {
        if (o.isMesh
          && (o.material === VM
            || o.material === PMV
            || o.material === HMV
            || o.material === OLM
            || o.material === EMV)) {
          o.geometry.dispose();
        }
      });
    }
  }
  function buildDecor() {
    const D = [];
    let sd = 11;
    const rnd = () => {
      sd = (sd * 9301 + 49297) % 233280;
      return sd / 233280;
    };
    const gs = (r, a, b) => new THREE.SphereGeometry(r, a || 14, b || 10);
    const gc = (a, b, h, n) => new THREE.CylinderGeometry(a, b, h, n || 16);
    const gb = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const gl = (pts, n) => new THREE.LatheGeometry(
      pts.map(p => new THREE.Vector2(p[0], p[1])),
      n || 28
    );
    const gt = (a, b, arc) => new THREE.TorusGeometry(a, b, 8, 28, arc);
    const lam = m => new THREE.MeshLambertMaterial(m);
    const PI = Math.PI;
    const tx = (w, h, fn, rx, ry) => {
      const cn = cvs(w, h);
      fn(cn.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(cn);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx || 1, ry || 1);
      t.anisotropy = 4;
      return t;
    };
    const glow = (x, y, z, s, col, o) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: steamTex,
        color: col,
        transparent: true,
        opacity: o * LIGHT.glow,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      sp.scale.set(s, s, 1);
      sp.position.set(x, y, z);
      scn.add(sp);
      return sp;
    };
    const E = [];
    const poolC = cvs(128, 128);
    const pcx = poolC.getContext('2d');
    const pg2 = pcx.createRadialGradient(64, 64, 0, 64, 64, 64);
    pg2.addColorStop(0, 'rgba(255,255,255,.9)');
    pg2.addColorStop(.45, 'rgba(255,255,255,.35)');
    pg2.addColorStop(1, 'rgba(255,255,255,0)');
    pcx.fillStyle = pg2;
    pcx.fillRect(0, 0, 128, 128);
    const poolTex = new THREE.CanvasTexture(poolC);
    const pool = (x, y, z, w, h, col, o, rx, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
        map: poolTex,
        color: col,
        transparent: true,
        opacity: o * LIGHT.glow,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      m.position.set(x, y, z);
      m.rotation.set(rx || 0, ry || 0, 0);
      scn.add(m);
      return m;
    };
    const halo = (x, y, z, s, col, o) => {
      glow(x, y, z, s * .3, 0xffd8a0, Math.min(.7, o * 1.1));
      glow(x, y, z, s * 2.2, col, o * .3);
      return glow(x, y, z, s, col, o);
    };
    const stc2 = cvs(64, 64);
    const sx2 = stc2.getContext('2d');
    sx2.fillStyle = '#fff';
    sx2.beginPath();
    sx2.moveTo(32, 0);
    sx2.lineTo(36, 28);
    sx2.lineTo(64, 32);
    sx2.lineTo(36, 36);
    sx2.lineTo(32, 64);
    sx2.lineTo(28, 36);
    sx2.lineTo(0, 32);
    sx2.lineTo(28, 28);
    sx2.closePath();
    sx2.fill();
    const starTex = new THREE.CanvasTexture(stc2);
    const spark = (x, y, z) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: starTex,
        color: 0xdff2ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      s.position.set(x, y, z);
      scn.add(s);
      TW.push(s);
    };
    const pendant = (X, Z) => {
      add(D, gc(.008, .008, 3.2, 6), 0x111111, X, 6.4, Z);
      add(D, gc(.03, .03, .16, 10), 0xb08d2a, X, 5.1, Z);
      add(D, gc(.1, .1, .04, 12), 0xb08d2a, X, 8.02, Z);
      add(D, gl([
        [0,
        .3],
        [.05,
        .3],
        [.12,
        .28],
        [.25,
        .2],
        [.38,
        .08],
        [.47,
        0],
        [.455,
        -.012],
        [.37,
        .066],
        [.24,
        .18],
        [.11,
        .26],
        [0,
        .275]
      ], 32), 0x1f5a3a, X, 4.95, Z);
      add(D, gt(.465, .012, PI * 2), 0xd4af37, X, 4.95, Z, 1, 1, 1, PI / 2, 0, 0);
      add(E, gl([
        [0, .27], [.11, .25], [.24, .17], [.36, .06], [.44, -.004], [0, -.004]
      ], 28), 0xffe6b0, X, 4.95, Z);
      add(E, gs(.075, 12, 10), 0xfff1c8, X, 4.82, Z, 1, 1.25, 1);
      add(E, gt(.03, .005, PI * 1.6), 0xffffff, X, 4.84, Z);
      halo(X, 4.8, Z, 3.0, 0xffc070, .30);
      pool(X, .813, Z, 2.2, 2.2, 0xffc880, .30, -PI / 2);
      pool(X, .025, Z, 5.2, 5.2, 0xffb060, .09, -PI / 2);
    };
    const hx = c => [
      (c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255
    ];
    const mixc = (a, b, t) => [
      a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
    ];
    const unit = a => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [
        a[0] / l, a[1] / l, a[2] / l
      ];
    };
    const PROF = {
      ovate: u => Math.pow(Math.sin(PI * Math.pow(u, .75)), .8),
      obov: u => Math.pow(Math.sin(PI * Math.pow(u, 1.35)), .75),
      lance: u => Math.pow(Math.sin(PI * u), .7) * (1 - .35 * u),
      heart: u => Math.pow(Math.sin(PI * Math.pow(u, .6)), .75),
      sword: u => u < .1
        ? .55 + u * 4.5
        : Math.pow(Math.max(0, 1 - Math.pow((u - .1) / .9, 2.4)), .55)
    };
    const leafGeo = (kind, Lx, Wd, nu, nv, c1, c2, bend, fold) => {
      const P = [];
      const C = [];
      const I = [];
      const A = hx(c1);
      const B = hx(c2);
      const M = hx(0xd8e89a);
      const Yw = hx(0xcfd860);
      for (let i = 0; i <= nu; i++) {
        for (let j = 0; j <= nv; j++) {
          const u = i / nu;
          const v = -1 + 2 * j / nv;
          const t = Math.abs(v);
          const w = PROF[kind](u) * Wd / 2;
          const nt = kind === 'heart'
            ? .5 * Math.pow(Math.max(0, Math.sin(u * PI * 5 + (v < 0 ? 1.3 : 0) + .5)), 5) * t
            : 0;
          const z = v * w * (1 - nt);
          const x = u * Lx;
          const y = Math.abs(z) * fold - bend * u * u * Lx;
          P.push(x, y, z);
          let c = mixc(A, B, (1 - t) * .6 + u * .25);
          if (t < .12) {
            c = mixc(c, M, .55 * (1 - t / .12));
          }
          else {
            c = mixc(c, A, .35 * Math.pow(Math.abs(Math.sin(u * PI * 9 + t * 3.5)), 10));
          }
          if (kind === 'sword') {
            if (Math.sin(u * PI * 14 + t * 2) > .25) {
              c = mixc(c, A, .45);
            }
            if (t > .82) {
              c = mixc(c, Yw, .75);
            }
          }
          C.push(c[0], c[1], c[2]);
        }
      }
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const a = i * (nv + 1) + j;
          const b = a + 1;
          const c2 = a + nv + 1;
          const d = c2 + 1;
          I.push(a, b, c2, b, d, c2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
      g.setIndex(I);
      g.computeVertexNormals();
      return g;
    };
    const addL = (L, g, dir, p, s, keep) => {
      const x = unit(dir);
      const z = unit([
        -x[2], 0, x[0]
      ]);
      const y = [
        -z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1]
      ];
      _m.set(
        x[0] * s,
        y[0] * s,
        z[0] * s,
        p[0],
        x[1] * s,
        y[1] * s,
        z[1] * s,
        p[1],
        x[2] * s,
        y[2] * s,
        z[2] * s,
        p[2],
        0,
        0,
        0,
        1
      );
      const q = g.index ? g.toNonIndexed() : g;
      q.applyMatrix4(_m);
      if (!keep) {
        g.dispose();
      }
      L.push(q);
    };
    const bez = (a, b, c, t) => [0, 1, 2].map(
      k => (1 - t) * (1 - t) * a[k] + 2 * (1 - t) * t * b[k] + t * t * c[k]
    );
    const tan = (a, b, c, t) => unit(
      [0, 1, 2].map(k => 2 * (1 - t) * (b[k] - a[k]) + 2 * t * (c[k] - b[k]))
    );
    const tube = (L, a, b, c, r, col, seg) => {
      const V = q => new THREE.Vector3(q[0], q[1], q[2]);
      add(
        L,
        new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(V(a), V(b), V(c)),
          seg || 6,
          r,
          5,
          false
        ),
        col,
        0,
        0,
        0
      );
    };
    const pot = (px, pz) => {
      add(D, gl([
        [0, 0], [.3, 0], [.38, .55], [.42, .6], [.39, .64], [0, .62]
      ], 24), 0xb5683a, px, 0, pz);
      add(D, gt(.41, .03, PI * 2), 0xa65a30, px, .6, pz, 1, 1, 1, PI / 2, 0, 0);
      add(D, gc(.4, .42, .04, 24), 0x9a5530, px, .02, pz);
      add(D, gc(.37, .37, .03, 16), 0x3a2a1a, px, .62, pz);
      add(D, gs(.3, 12, 8), 0x3f6b2f, px, .64, pz, 1, .18, 1);
    };
    const monstera = (px, pz) => {
      pot(px, pz);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * PI * 2;
        const r0 = .25 + rnd() * .5;
        const h0 = .95 + rnd() * .9;
        const p0 = [
          px + Math.cos(a) * .05, .62, pz + Math.sin(a) * .05
        ];
        const p2 = [
          px + Math.cos(a) * r0, h0, pz + Math.sin(a) * r0
        ];
        const p1 = [
          px + Math.cos(a) * r0 * .3, h0 * .75, pz + Math.sin(a) * r0 * .3
        ];
        tube(D, p0, p1, p2, .012, 0x5a8a3a, 6);
        addL(D, leafGeo('heart', .7, .68, 14, 8, 0x1d5a2c, 0x3f9a45, .5, .14), [
          Math.cos(a), .12 + rnd() * .2, Math.sin(a)
        ], p2, .75 + rnd() * .5);
      }
    };
    const ficus = (px, pz) => {
      pot(px, pz);
      tube(D, [px, .6, pz], [
        px + .06, 1.3, pz + .02
      ], [
        px - .03, 2.1, pz
      ], .06, 0x6a4a2a, 8);
      for (let b = 0; b < 7; b++) {
        const a = b * 2.4 + rnd();
        const hy = 1.0 + b * .2;
        const br = .35 + rnd() * .3;
        const e = [
          px + Math.cos(a) * br, hy + .35 + rnd() * .2, pz + Math.sin(a) * br
        ];
        tube(D, [px, hy, pz], [
          px + Math.cos(a) * br * .5, hy + .1, pz + Math.sin(a) * br * .5
        ], e, .018, 0x6a4a2a, 4);
        for (let q = 0; q < 4; q++) {
          const a2 = a + (q - 1.5) * .8 + rnd() * .4;
          addL(D, leafGeo('obov', .52, .36, 10, 6, 0x225a2e, 0x4c9a4c, .5, .22), [
            Math.cos(a2), .25 + rnd() * .35, Math.sin(a2)
          ], [
            e[0] - Math.cos(a) * .08 * q, e[1] - .04 * q, e[2] - Math.sin(a) * .08 * q
          ], .85 + rnd() * .35);
        }
      }
      for (let q = 0; q < 6; q++) {
        const a = rnd() * PI * 2;
        addL(D, leafGeo('obov', .55, .38, 10, 6, 0x225a2e, 0x4c9a4c, .4, .22), [
          Math.cos(a), .4 + rnd() * .3, Math.sin(a)
        ], [
          px + Math.cos(a) * .05, 1.9 + rnd() * .3, pz + Math.sin(a) * .05
        ], 1);
      }
    };
    const palm = (px, pz) => {
      pot(px, pz);
      const lf = leafGeo('lance', 1, .2, 3, 2, 0x2f7a3a, 0x58b052, .2, .1);
      for (let c = 0; c < 4; c++) {
        const ca = c * 1.6 + rnd();
        const cr = .1 + rnd() * .12;
        const cx = px + Math.cos(ca) * cr;
        const cz = pz + Math.sin(ca) * cr;
        const ch = 1.9 + rnd() * .9;
        tube(D, [cx, .6, cz], [
          cx + Math.cos(ca) * .05, ch * .55, cz + Math.sin(ca) * .05
        ], [
          cx + Math.cos(ca) * .1, ch, cz + Math.sin(ca) * .1
        ], .03, 0x7a8a3a, 8);
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * PI * 2 + c;
          const o = [
            Math.cos(a), 0, Math.sin(a)
          ];
          const top = [
            cx + Math.cos(ca) * .1, ch, cz + Math.sin(ca) * .1
          ];
          const p1 = [
            top[0] + o[0] * .7, top[1] + .85, top[2] + o[2] * .7
          ];
          const p2 = [
            top[0] + o[0] * 1.5, top[1] - .15, top[2] + o[2] * 1.5
          ];
          tube(D, top, p1, p2, .012, 0x5a7a2a, 8);
          for (let n = 1; n <= 14; n++) {
            const t = n / 14 * .95 + .05;
            const p = bez(top, p1, p2, t);
            const T = tan(top, p1, p2, t);
            const S = unit([
              -T[2], 0, T[0]
            ]);
            const len = .42 * (1 - .55 * Math.abs(t - .55));
            [-1, 1].forEach(sg => addL(D, lf, [
              S[0] * sg * .85
                + T[0] * .55, S[1] * sg * .85 + T[1] * .55 - .35, S[2] * sg * .85 + T[2] * .55
            ], p, len, true));
          }
        }
      }
      lf.dispose();
    };
    const snake = (px, pz) => {
      pot(px, pz);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * PI * 2;
        const r0 = .05 + rnd() * .22;
        addL(D, leafGeo(
          'sword',
          .7 + rnd() * .7,
          .15,
          12,
          4,
          0x1f5a30,
          0x4f9a50,
          .1 + rnd() * .15,
          .35
        ), [
          Math.cos(a) * .22, 1, Math.sin(a) * .22
        ], [
          px + Math.cos(a) * r0, .62, pz + Math.sin(a) * r0
        ], 1);
      }
    };
    [-2, 0, 2, 4, 6, 8].forEach((z0, k) => {
      const x0 = -19.5;
      const len = 1.2 + rnd() * .8;
      const n = Math.round(len / .13);
      const a0 = [x0, 3.6, z0];
      const a1 = [
        x0 + .05, 3.6 - len * .5, z0 + .05
      ];
      const a2 = [
        x0, 3.6 - len, z0 - .03
      ];
      tube(D, a0, a1, a2, .008, 0x4a7a3a, 8);
      for (let i = 1; i <= n; i++) {
        const a = i * 1.9 + k;
        addL(D, leafGeo(
          'heart',
          .13,
          .12,
          4,
          2,
          0x3a8a3a,
          rnd() < .4 ? 0xb5d86a : 0x6acd5a,
          .6,
          .1
        ), [
          Math.cos(a) * .6 + .5, -.35, Math.sin(a)
        ], bez(a0, a1, a2, i / n), 1);
      }
    });
    const flower = (x, y, z, col) => {
      tube(D, [
        x, y - .22, z
      ], [
        x + .01, y - .1, z
      ], [x, y, z], .006, 0x3d6a3a, 3);
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * PI * 2;
        addL(D, leafGeo('ovate', .075, .06, 3, 2, col, col, .1, .3), [
          Math.cos(a), .35, Math.sin(a)
        ], [x, y, z], 1);
      }
      add(D, gs(.02, 8, 6), 0xffd54f, x, y + .01, z);
    };
    const flr = tx(512, 512, x => {
      for (let r = 0; r < 16; r++) {
        for (let c = -1; c < 4; c++) {
          x.fillStyle = 'hsl('
            + (22 + Math.random() * 7)
            + ',38%,'
            + (11 + Math.random() * 8)
            + '%)';
          x.fillRect(c * 128 + (r % 2) * 64, r * 32, 126, 30);
        }
      }
    }, 10, 6);
    const fl = mk(
      new THREE.PlaneGeometry(40, 25),
      new THREE.MeshStandardMaterial({ map: flr, roughness: .6, metalness: .02 }),
      0,
      0,
      0
    );
    fl.rotation.x = -PI / 2;
    fl.castShadow = false;
    const wallT = rx => tx(512, 512, x => {
      x.fillStyle = '#0e1d3a';
      x.fillRect(0, 0, 512, 512);
      x.fillStyle = '#152a52';
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 5; j++) {
          const cx = i * 64 + (j % 2) * 32 + 32;
          const cy = j * 72 + 36;
          x.beginPath();
          x.moveTo(cx, cy - 26);
          x.lineTo(cx + 18, cy);
          x.lineTo(cx, cy + 26);
          x.lineTo(cx - 18, cy);
          x.fill();
        }
      }
      x.fillStyle = '#8f7a3a';
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 5; j++) {
          x.beginPath();
          x.arc(i * 64 + (j % 2) * 32 + 32, j * 72 + 36, 2.2, 0, 7);
          x.fill();
        }
      }
      x.fillStyle = '#1b1109';
      x.fillRect(0, 380, 512, 132);
      x.strokeStyle = '#b08d2a';
      x.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        x.strokeRect(i * 128 + 10, 396, 108, 100);
      }
      x.fillStyle = '#d4af37';
      x.fillRect(0, 372, 512, 8);
      x.fillStyle = '#7a5f1c';
      x.fillRect(0, 366, 512, 3);
    }, rx, 1);
    const wl = (w, px, pz, ry, rx) => {
      const m = mk(
        new THREE.PlaneGeometry(w, 8),
        new THREE.MeshStandardMaterial({ map: wallT(rx), roughness: .8 }),
        px,
        4,
        pz
      );
      m.rotation.y = ry;
      m.castShadow = false;
      return m;
    };
    wl(40, 0, -12.5, 0, 8);
    wl(25, -20, 0, PI / 2, 5);
    wl(25, 20, 0, -PI / 2, 5);
    FG = new THREE.Group();
    scn.add(FG);
    FG.add(wl(40, 0, 12.5, PI, 8));
    const C = [];
    const F = [];
    add(D, gb(40, .35, .4), 0xb08d2a, 0, 7.8, -12.3);
    add(D, gb(.4, .35, 25), 0xb08d2a, -19.8, 7.8, 0);
    add(D, gb(.4, .35, 25), 0xb08d2a, 19.8, 7.8, 0);
    add(D, gb(40, .4, .12), 0x3a2414, 0, .2, -12.44);
    add(D, gb(.12, .4, 25), 0x3a2414, -19.94, .2, 0);
    add(D, gb(.12, .4, 25), 0x3a2414, 19.94, .2, 0);
    const pil = (x, z, ry, LL) => {
      const L = LL || D;
      add(L, gb(.5, 7.2, .4), 0x10182e, x, 3.8, z, 1, 1, 1, 0, ry, 0);
      add(L, gb(.7, .3, .55), 0xb08d2a, x, .35, z, 1, 1, 1, 0, ry, 0);
      add(L, gb(.7, .3, .55), 0xb08d2a, x, 7.3, z, 1, 1, 1, 0, ry, 0);
    };
    [-18, -12.5, 12.5, 18].forEach(x => pil(x, -12.25, 0));
    [-11, -5, 1, 7, 12].forEach(z => {
      pil(-19.75, z, PI / 2);
      pil(19.75, z, PI / 2);
    });
    [-18, -13, -5.5, 5.5, 13, 18].forEach(x => pil(x, 12.25, 0, F));
    add(F, gb(40, .35, .4), 0xb08d2a, 0, 7.8, 12.3);
    add(F, gb(40, .4, .12), 0x3a2414, 0, .2, 12.44);
    const ceilT = tx(256, 256, (x, w, h) => {
      x.fillStyle = '#05070d';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#0c1630';
      x.fillRect(14, 14, w - 28, h - 28);
      x.strokeStyle = '#c9a227';
      x.lineWidth = 3;
      x.strokeRect(14, 14, w - 28, h - 28);
      x.strokeStyle = '#03050a';
      x.lineWidth = 6;
      x.strokeRect(0, 0, w, h);
    }, 8, 5);
    const ceil = mk(
      new THREE.PlaneGeometry(40, 25),
      new THREE.MeshStandardMaterial({ map: ceilT, roughness: .85 }),
      0,
      8.05,
      0
    );
    ceil.rotation.x = PI / 2;
    ceil.castShadow = false;
    for (let x = -18; x <= 18; x += 6) {
      add(C, gb(.5, .4, 25), 0x0b0c12, x, 7.85, 0);
      add(C, gb(.56, .06, 25), 0xd4af37, x, 7.64, 0);
    }
    [-8, 0, 8].forEach(z => {
      add(C, gb(40, .4, .5), 0x0b0c12, 0, 7.85, z);
      add(C, gb(40, .06, .56), 0xd4af37, 0, 7.64, z);
    });
    add(F, gb(3.4, .25, .3), 0xb08d2a, 0, 4.1, 12.38);
    [-1.6, 1.6].forEach(x => add(F, gb(.25, 4.1, .3), 0xb08d2a, x, 2.05, 12.38));
    [-1, 1].forEach(sd => {
      add(F, gb(1.4, 3.8, .08), 0x5a3a1c, sd * .72, 1.95, 12.42);
      add(F, gb(1.0, 1.6, .02), 0x3a2414, sd * .72, 2.9, 12.37);
      add(F, gb(1.0, 1.4, .02), 0x3a2414, sd * .72, 1.1, 12.37);
      add(F, gc(.02, .02, .5, 8), 0xd4af37, sd * .12, 1.9, 12.33);
    });
    const tr2 = new THREE.Mesh(
      new THREE.PlaneGeometry(3, .7),
      new THREE.MeshBasicMaterial({ map: winTex })
    );
    tr2.position.set(0, 4.5, 12.36);
    tr2.rotation.y = PI;
    FG.add(tr2);
    const wsign = tx(512, 128, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.font = 'bold 60px "Times New Roman", Times, serif';
      x.textAlign = 'center';
      x.shadowColor = '#ffb040';
      x.shadowBlur = 22;
      x.fillStyle = '#ffe3a0';
      x.fillText('XIN CHÀO', w / 2, 82);
    });
    const wm2 = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1.25),
      new THREE.MeshBasicMaterial({ map: wsign, transparent: true })
    );
    wm2.position.set(0, 5.4, 12.3);
    wm2.rotation.y = PI;
    FG.add(wm2);
    const rug = tx(1024, 282, (x, w, h) => {
      x.fillStyle = '#0c1c3e';
      x.fillRect(0, 0, w, h);
      x.strokeStyle = '#d4af37';
      x.lineWidth = 8;
      x.strokeRect(14, 14, w - 28, h - 28);
      x.lineWidth = 3;
      x.strokeRect(34, 34, w - 68, h - 68);
      x.fillStyle = '#17336a';
      const rows = 4;
      const gy0 = 44;
      const s = (h - 2 * gy0) / rows;
      const cols = Math.floor((w - 2 * gy0) / s);
      const gx0 = (w - cols * s) / 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = gx0 + (i + .5) * s;
          const cy = gy0 + (j + .5) * s;
          x.beginPath();
          x.moveTo(cx, cy - s / 2 + 3);
          x.lineTo(cx + s / 2 - 3, cy);
          x.lineTo(cx, cy + s / 2 - 3);
          x.lineTo(cx - s / 2 + 3, cy);
          x.closePath();
          x.fill();
        }
      }
    });
    const rg = mk(new THREE.PlaneGeometry(16, 4.4), lam({ map: rug }), 0, .015, 4.2);
    rg.rotation.set(-PI / 2, 0, PI / 2);
    rg.castShadow = false;
    const mat2 = tx(256, 128, (x, w, h) => {
      x.fillStyle = '#0a1530';
      x.fillRect(0, 0, w, h);
      x.strokeStyle = '#d4af37';
      x.lineWidth = 6;
      x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = '#f0c060';
      x.font = 'bold 34px "Times New Roman", Times, serif';
      x.textAlign = 'center';
      x.fillText('WELCOME', w / 2, 78);
    });
    const wm = mk(new THREE.PlaneGeometry(3.2, 1.6), lam({ map: mat2 }), 0, .03, 11.6);
    wm.rotation.x = -PI / 2;
    wm.castShadow = false;
    const vel = tx(128, 256, (x, w, h) => {
      for (let i = 0; i < 16; i++) {
        x.fillStyle = i % 2 ? '#17305c' : '#10244a';
        x.fillRect(i * 8, 0, 8, h);
      }
    });
    const win = (x, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, 3.9, z);
      g.rotation.y = ry;
      scn.add(g);
      const gm = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 4.6),
        new THREE.MeshBasicMaterial({ map: winTex })
      );
      gm.position.z = .03;
      g.add(gm);
      const fm = mat(0xb08d2a, .6);
      [
        [3.2,
        .2,
        0,
        2.4],
        [3.2,
        .2,
        0,
        -2.4],
        [.2,
        4.9,
        1.5,
        0],
        [.2,
        4.9,
        -1.5,
        0],
        [.08,
        4.6,
        0,
        0],
        [2.8,
        .08,
        0,
        .3]
      ].forEach(a => {
        const b = new THREE.Mesh(gb(a[0], a[1], .18), fm);
        b.position.set(a[2], a[3], .08);
        g.add(b);
      });
      [-1, 1].forEach(s => {
        const c = new THREE.Mesh(gb(.8, 5.1, .3), lam({ map: vel }));
        c.position.set(s * 1.95, .05, .25);
        g.add(c);
      });
      return g;
    };
    [-9, 9, -15.6, 15.6].forEach(x => FG.add(win(x, 12.4, PI)));
    win(-15.6, -12.4, 0);
    win(15.6, -12.4, 0);
    [-8, -2, 4, 10].forEach(z => win(19.9, z, -PI / 2));
    win(-19.9, -8, PI / 2);
    const art = sd2 => tx(128, 96, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, ['#e0b860', '#6f8fc4', '#c99a5a'][sd2 % 3]);
      g.addColorStop(1, '#0b1630');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#0a1226';
      x.beginPath();
      x.moveTo(0, h);
      x.lineTo(30 + sd2 * 9 % 40, 40);
      x.lineTo(80, h);
      x.fill();
      x.beginPath();
      x.moveTo(50, h);
      x.lineTo(95 + sd2 * 5 % 20, 30);
      x.lineTo(128, h);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.4)';
      x.beginPath();
      x.arc(100, 24, 9, 0, 7);
      x.fill();
    });
    const frame = (x, y, z, ry, s2) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      scn.add(g);
      g.add(new THREE.Mesh(gb(1.9, 1.5, .08), mat(0xb08d2a, .4, .3)));
      const pc = new THREE.Mesh(
        new THREE.PlaneGeometry(1.65, 1.25),
        new THREE.MeshBasicMaterial({ map: art(s2) })
      );
      pc.position.z = .05;
      g.add(pc);
    };
    frame(-10.8, 4.4, -12.4, 0, 0);
    frame(-13, 4.4, -12.4, 0, 1);
    frame(19.9, 4.4, -5, -PI / 2, 2);
    frame(19.9, 4.4, 1, -PI / 2, 1);
    frame(19.9, 4.4, 7, -PI / 2, 0);
    [-6, 0, 6, 11].forEach(z => [-1, 1].forEach(s => {
      if (s < 0 && z > -1 && z < 9) {
        return;
      }
      const wx = s * 19.9;
      const lx = s * 19.5;
      const ry = s > 0 ? -PI / 2 : PI / 2;
      add(D, gc(.12, .12, .03, 16), 0xb08d2a, wx - s * .02, 3.2, z, 1, 1, 1, 0, 0, PI / 2);
      add(D, gb(.06, .5, .02), 0xb08d2a, wx - s * .015, 3.2, z);
      tube(D, [wx, 3.2, z], [
        s * 19.7, 3.05, z
      ], [lx, 3.2, z], .018, 0xb08d2a, 5);
      add(D, gc(.07, .05, .05, 12), 0xb08d2a, lx, 3.22, z);
      add(E, gl([
        [.06, 0], [.1, .12], [.11, .24], [.08, .36], [.05, .4], [0, .4]
      ], 18), 0xffe6b8, lx, 3.24, z);
      add(E, gs(.05, 8, 6), 0xffffff, lx, 3.38, z, 1, 1.3, 1);
      halo(lx, 3.45, z, 1.8, 0xffb060, .45);
      pool(wx - s * .03, 4.4, z, 1.8, 3.0, 0xffb060, .22, 0, ry);
      pool(wx - s * .03, 2.4, z, 1.8, 2.2, 0xffb060, .16, 0, ry);
    }));
    const GOLD = 0xd4af37;
    const CREAM = 0x10182e;
    const VELR = 0x14305a;
    const STEEL = 0x8a8f96;
    add(D, gb(18, .5, 6), 0x2a170c, 0, .25, STZ);
    const stf = tx(1024, 338, (x, w, h) => {
      for (let r = 0; r < 8; r++) {
        x.fillStyle = 'hsl(20,38%,' + (11 + Math.random() * 7) + '%)';
        x.fillRect(0, r * 42.25, w, 40);
      }
      const cx = w / 2;
      const cy = h / 2 + 12;
      x.strokeStyle = '#d4a84a';
      x.lineWidth = 6;
      x.beginPath();
      x.arc(cx, cy, 134, 0, 7);
      x.stroke();
      x.lineWidth = 2.5;
      x.beginPath();
      x.arc(cx, cy, 120, 0, 7);
      x.stroke();
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * PI * 2;
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
        x.lineTo(cx + Math.cos(a) * 134, cy + Math.sin(a) * 134);
        x.stroke();
      }
    });
    const sfl = mk(new THREE.PlaneGeometry(17.6, 5.8), new THREE.MeshStandardMaterial({
      map: stf, roughness: .55, metalness: .02
    }), 0, .505, STZ);
    sfl.rotation.x = -PI / 2;
    sfl.castShadow = false;
    [STZ - 2.92, STZ + 2.92].forEach(z => add(D, gb(17.9, .02, .06), GOLD, 0, .512, z));
    add(D, gc(1.55, 1.6, .08, 48), 0x2a170c, 0, .54, STZ + .2);
    add(D, gt(1.58, .03, PI * 2), GOLD, 0, .585, STZ + .2, 1, 1, 1, PI / 2, 0, 0);
    [-8.92, 8.92].forEach(x => add(D, gb(.06, .02, 5.9), GOLD, x, .512, STZ));
    for (let i = 0; i < 9; i++) {
      const x = -8 + i * 2;
      add(D, gb(1.76, .4, .06), VELR, x, .25, -6.31);
      add(D, gb(.2, .2, .03), GOLD, x, .25, -6.27, 1, 1, 1, 0, 0, PI / 4);
    }
    add(D, gb(18.2, .1, .16), GOLD, 0, .52, -6.28);
    add(D, gb(18.3, .08, .18), GOLD, 0, .04, -6.3);
    [[4.4, .17, .5, -5.85], [4.0, .34, .5, -6.1]].forEach(s2 => {
      add(D, gb(s2[0], s2[1], s2[2]), 0x2a170c, 0, s2[1] / 2, s2[3]);
      add(D, gb(s2[0] * .6, .012, s2[2]), VELR, 0, s2[1] + .006, s2[3]);
      add(D, gb(s2[0], .02, .03), GOLD, 0, s2[1] + .01, s2[3] + .25);
    });
    add(E, gb(18, .03, .03), 0xffd49a, 0, .53, -6.2);
    pool(0, .02, -5.0, 19, 3.6, 0xffb060, .14, -PI / 2);
    for (let i = 0; i < 18; i++) {
      const fx2 = -8.5 + i;
      add(D, gb(.2, .1, .22), 0x1a1a1a, fx2, .57, -6.0);
      add(E, gs(.06, 10, 8), 0xffe6b0, fx2, .61, -6.03, 1, .8, 1);
    }
    [-6, -3, 0, 3, 6].forEach(x => {
      halo(x, .85, -6.0, 3, 0xffc880, .3);
      pool(x, .515, STZ + .8, 5, 4, 0xffc880, .13, -PI / 2);
    });
    pool(0, .516, STZ, 5.5, 4.4, 0xfff0d0, .22, -PI / 2);
    [-1, 1].forEach(sd => {
      const cx = sd * 9.7;
      const cz = -6.1;
      add(D, gc(.38, .4, 7.0, 24), CREAM, cx, 3.95, cz);
      for (let k = 0; k < 14; k++) {
        const a = k / 14 * PI * 2;
        add(
          D,
          gc(.028, .028, 6.6, 6),
          0xc9a227,
          cx + Math.cos(a) * .385,
          3.95,
          cz + Math.sin(a) * .385
        );
      }
      add(D, gc(.52, .58, .3, 24), GOLD, cx, .15, cz);
      add(D, gc(.46, .5, .2, 24), CREAM, cx, .4, cz);
      add(D, gc(.56, .42, .34, 24), GOLD, cx, 7.55, cz);
      add(D, gt(.43, .04, PI * 2), GOLD, cx, 7.3, cz, 1, 1, 1, PI / 2, 0, 0);
      add(D, gt(.43, .04, PI * 2), GOLD, cx, .62, cz, 1, 1, 1, PI / 2, 0, 0);
    });
    add(D, gb(21.8, .85, .8), CREAM, 0, 7.5, -6.2);
    add(D, gb(21.9, .1, .86), GOLD, 0, 7.04, -6.2);
    add(D, gb(21.9, .1, .86), GOLD, 0, 7.93, -6.2);
    for (let i = 0; i < 43; i++) {
      add(D, gb(.14, .14, .1), GOLD, -10.5 + i * .5, 6.9, -5.8);
    }
    add(D, gc(.4, .4, .06, 28), GOLD, 0, 7.5, -5.78, 1, 1, 1, PI / 2, 0, 0);
    add(E, gs(.2, 12, 8), 0xffe6b0, 0, 7.5, -5.74, 1, 1, .4);
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * PI * 2;
      add(
        D,
        gb(.05, .3, .03),
        GOLD,
        Math.cos(a) * .62,
        7.5 + Math.sin(a) * .62,
        -5.77,
        1,
        1,
        1,
        0,
        0,
        a - PI / 2
      );
    }
    for (let i = 0; i < 10; i++) {
      add(D, gs(1, 14, 8), i % 2 ? VELR : 0x1b3a6e, -9 + i * 2, 6.55, -6.0, 1, .5, .22);
    }
    for (let i = 0; i < 11; i++) {
      const x = -10 + i * 2;
      add(D, gs(.08, 8, 6), GOLD, x, 6.35, -5.95);
      add(D, gc(.012, .075, .42, 8), GOLD, x, 6.05, -5.95);
    }
    const drapeG = (w, h, folds, c1, c2, tie) => {
      const nx = folds * 6;
      const ny = 12;
      const P = [];
      const C = [];
      const I = [];
      const A = hx(c1);
      const B = hx(c2);
      for (let j = 0; j <= ny; j++) {
        for (let i = 0; i <= nx; i++) {
          const u = i / nx;
          const v = j / ny;
          const y = (1 - v) * h;
          let x = (u - .5) * w;
          const fp = u * folds * PI * 2;
          const z = Math.sin(fp) * (.12 + .06 * v);
          if (tie) {
            const gg = Math.exp(-Math.pow((y - tie.y) / tie.s, 2));
            const base = tie.side * w / 2;
            x = base + (x - base) * (1 - .6 * gg);
          }
          const c = mixc(A, B, (.5 + .5 * Math.sin(fp + 1.3)) * (.55 + .45 * v) + .1 * (1 - v));
          P.push(x, y, z);
          C.push(c[0], c[1], c[2]);
        }
      }
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i;
          const b = a + 1;
          const c2 = a + nx + 1;
          const d = c2 + 1;
          I.push(a, b, c2, b, d, c2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
      g.setIndex(I);
      g.computeVertexNormals();
      return g;
    };
    const drape = (g, x, y, z) => {
      const m = new THREE.Mesh(g, VM);
      m.position.set(x, y, z);
      scn.add(m);
      return m;
    };
    [-1, 1].forEach(sd => {
      drape(drapeG(3.2, 7.3, 6, 0x081633, 0x1d3f7a, {
        y: 2.6, s: .8, side: sd
      }), sd * 8.3, 0, -6.0);
      add(D, gt(.6, .04, PI * 2), GOLD, sd * 9.26, 2.6, -6.0, 1, .3, 1, PI / 2, 0, 0);
      add(D, gs(.07, 8, 6), GOLD, sd * 8.65, 2.5, -5.8);
      add(D, gc(.012, .07, .4, 8), GOLD, sd * 8.65, 2.2, -5.8);
    });
    drape(drapeG(19, 7.5, 14, 0x050e24, 0x142c5a, null), 0, 0, -12.15);
    const led = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 3.6),
      new THREE.MeshBasicMaterial({ map: ledTex })
    );
    led.position.set(0, 3.0, -12.05);
    scn.add(led);
    [
      [10.4, .2, 0, 4.9], [10.4, .2, 0, 1.1], [.2, 3.8, -5.1, 3.0], [.2, 3.8, 5.1, 3.0]
    ].forEach(a => add(D, gb(a[0], a[1], .12), GOLD, a[2], a[3], -12.0));
    const NEON_FONT = '"Great Vibes", "Dancing Script", "Segoe Script", "Brush Script MT", cursive';
    const drawNeon = (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.font = '92px ' + NEON_FONT;
      x.textAlign = 'center';
      x.shadowColor = '#ffb040';
      x.shadowBlur = 24;
      x.fillStyle = '#ffe3a0';
      x.fillText('S.Glow', w / 2, 92);
    };
    const neon = tx(512, 128, drawNeon);
    if (document.fonts && document.fonts.load) {
      document.fonts.load('92px "Great Vibes"', 'S.Glow').then(() => {
        drawNeon(neon.image.getContext('2d'), neon.image.width, neon.image.height);
        neon.needsUpdate = true;
      }).catch(() => {});
    }
    const nm = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.75),
      new THREE.MeshBasicMaterial({ map: neon, transparent: true })
    );
    nm.position.set(0, 5.9, -11.95);
    scn.add(nm);
    const beam = (a, tx2, tz2, r, hue, sw, ph) => {
      const L0 = Math.hypot(tx2 - a[0], .5 - a[1], tz2 - a[2]);
      const m = new THREE.Mesh(new THREE.ConeGeometry(
        r,
        L0,
        20,
        1,
        true
      ), new THREE.MeshBasicMaterial({
        color: 0xffe2a0,
        transparent: true,
        opacity: .07 * LIGHT.beam,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      }));
      scn.add(m);
      BEAMS.push({
        m, a, tx: tx2, tz: tz2, L0, h: hue, sw, ph
      });
    };
    const truss = (len, y, z) => {
      [
        [-1, -1], [1, -1], [-1, 1], [1, 1]
      ].forEach(q => add(
        D,
        gc(.03, .03, len, 8),
        STEEL,
        0,
        y + q[0] * .17,
        z + q[1] * .17,
        1,
        1,
        1,
        0,
        0,
        PI / 2
      ));
      for (let x = -len / 2 + .25, k = 0; x < len / 2; x += .5, k++) {
        [-1, 1].forEach(
          fz => add(
            D,
            gb(.02, .4, .02),
            STEEL,
            x,
            y,
            z + fz * .17,
            1,
            1,
            1,
            0,
            0,
            (k % 2 ? 1 : -1) * .7
          )
        );
      }
      [-len / 2 + .5, len / 2 - .5].forEach(
        x => add(D, gc(.012, .012, 8.05 - y - .2, 6), 0x555555, x, (y + .2 + 8.05) / 2, z)
      );
    };
    truss(17, 7.0, -4.4);
    truss(17.5, 7.0, -9.0);
    const HC = [0xffd080, 0x7f9cff, 0xffe0a0, 0x6f8cff, 0xffe0b0];
    const HH = [.1, .95, .55, .75, .12];
    [-7.5, -5, -2.5, 0, 2.5, 5, 7.5].forEach((x, i) => {
      const col = HC[i % 5];
      const y = 6.7;
      const z = -9.0;
      add(D, gb(.18, .1, .18), 0x15151a, x, y + .3, z);
      [-1, 1].forEach(q => add(D, gb(.03, .32, .05), 0x15151a, x + q * .13, y + .15, z));
      add(D, gc(.12, .1, .3, 14), 0x1a1a22, x, y, z, 1, 1, 1, .35, 0, 0);
      add(D, gt(.12, .012, PI * 2), 0xb8bcc2, x, y - .06, z + .08, 1, 1, 1, .35, 0, 0);
      add(E, gc(.1, .1, .02, 14), col, x, y - .08, z + .09, 1, 1, 1, .35, 0, 0);
      halo(x, y - .12, z + .1, 1.1, col, .55);
      beam([
        x, y - .1, z + .1
      ], x * .35, STZ + .3, 1.5, HH[i % 5], 1.6, i * .9);
    });
    [-6.25, -3.75, -1.25, 1.25, 3.75, 6.25].forEach((x, i) => {
      const col = i % 2 ? 0xffe0b0 : 0xffc070;
      const y = 6.6;
      const z = -4.4;
      add(D, gb(.05, .2, .05), 0x15151a, x, y + .22, z);
      add(D, gc(.13, .1, .28, 14), 0x15151a, x, y, z, 1, 1, 1, -.9, 0, 0);
      add(E, gc(.11, .11, .02, 14), col, x, y - .08, z - .12, 1, 1, 1, -.9, 0, 0);
      halo(x, y - .12, z - .14, 1.0, col, .5);
      beam([
        x, y - .12, z - .14
      ], x * .5, -8.2, 1.3, i % 2 ? .12 : .09, 1.2, i * 1.3);
    });
    [[-7, 0xffd080, -3], [7, 0x7f9cff, 3]].forEach(a => {
      const sl = new THREE.SpotLight(a[1], LIGHT.side, 32, .55, .9);
      sl.position.set(a[0], 6.4, -4.6);
      sl.target.position.set(a[2], .6, -9.3);
      scn.add(sl, sl.target);
    });
    [-1, 1].forEach(sd => {
      const x = sd * 7.1;
      const z = -7.1;
      add(D, gb(.9, .8, .8), 0x15151a, x, .9, z);
      add(D, gb(.7, .6, .6), 0x1a1a1f, x, 1.6, z);
      add(D, gb(.7, .6, .6), 0x1a1a1f, x, 2.2, z);
      [
        [.9, .55, .41], [1.6, .4, .31], [2.2, .4, .31]
      ].forEach(q => {
        add(
          D,
          gc(q[1] * .6, q[1] * .55, .05, 18),
          0x2a2a30,
          x,
          q[0],
          z + q[2],
          1,
          1,
          1,
          PI / 2,
          0,
          0
        );
        add(
          D,
          gc(q[1] * .2, q[1] * .2, .06, 12),
          STEEL,
          x,
          q[0],
          z + q[2] + .03,
          1,
          1,
          1,
          PI / 2,
          0,
          0
        );
      });
    });
    [-2.8, -1.4, 1.4, 2.8].forEach(x => {
      add(D, gb(.7, .32, .5), 0x15151a, x, .68, -6.85, 1, 1, 1, .45, 0, 0);
      add(D, gb(.5, .05, .02), STEEL, x, .74, -6.63, 1, 1, 1, .45, 0, 0);
    });
    const DX = 5.6;
    const DZ = -9.6;
    add(D, gc(.45, .45, .5, 24), 0x1b3158, DX, .95, DZ, 1, 1, 1, PI / 2, 0, 0);
    add(D, gt(.45, .02, PI * 2), GOLD, DX, .95, DZ + .26);
    [-.2, .2].forEach(
      o => add(D, gc(.22, .22, .18, 18), 0x1b3158, DX + o, 1.5, DZ - .05, 1, 1, 1, .3, 0, 0)
    );
    add(D, gc(.22, .22, .15, 18), STEEL, DX - .7, 1.0, DZ + .6);
    add(D, gc(.27, .27, .35, 18), 0x1b3158, DX + .8, .85, DZ + .4);
    add(D, gc(.012, .012, .9, 6), STEEL, DX - 1.2, .95, DZ + .4);
    [1.4, 1.43].forEach(y => add(D, gc(.18, .18, .012, 16), GOLD, DX - 1.2, y, DZ + .4));
    [[-.5, 1.95, -.3, .32], [.9, 1.8, -.2, .35]].forEach(c0 => {
      add(D, gc(.012, .012, c0[1] - .5, 6), STEEL, DX + c0[0], .5 + (c0[1] - .5) / 2, DZ + c0[2]);
      add(D, gc(c0[3], c0[3], .012, 18), GOLD, DX + c0[0], c0[1], DZ + c0[2], 1, 1, 1, .1, 0, .1);
    });
    add(D, gc(.17, .17, .07, 16), 0x15151a, DX, .7, DZ + 1.2);
    add(D, gc(.02, .02, .2, 6), STEEL, DX, .58, DZ + 1.2);
    const GX = -7.3;
    const GZ = -10.5;
    add(D, gs(.22, 14, 10), 0x8a4a1c, GX, 1.0, GZ, 1, 1.25, .32);
    add(D, gs(.16, 12, 8), 0x8a4a1c, GX, 1.3, GZ, 1, 1.1, .32);
    add(D, gb(.05, .55, .03), 0x3a2414, GX, 1.78, GZ);
    add(D, gb(.07, .12, .03), 0x3a2414, GX, 2.1, GZ);
    add(D, gc(.06, .06, .01, 12), 0x1a1008, GX, 1.05, GZ + .06, 1, 1, 1, PI / 2, 0, 0);
    add(D, gc(.012, .012, .8, 6), 0x15151a, GX, .55, GZ - .06);
    [-1, 1].forEach(
      q => add(
        D,
        gc(.012, .012, .55, 6),
        0x15151a,
        GX + q * .12,
        .28,
        GZ + .08,
        1,
        1,
        1,
        0,
        0,
        q * .25
      )
    );
    add(D, gb(.6, .5, .3), 0x2a1a0e, -7.3, .75, -11.6);
    add(D, gb(.5, .4, .02), 0xd4af37, -7.3, .75, -11.44);
    [.55].forEach(x => {
      add(D, gc(.2, .2, .03, 16), 0x15151a, x, .52, -8.6);
      add(D, gc(.012, .012, 1.2, 6), 0x15151a, x, 1.12, -8.6);
      add(D, gs(.04, 8, 6), 0x222222, x, 1.75, -8.6);
      add(D, gc(.02, .02, .14, 8), 0x222222, x, 1.68, -8.6);
    });
    STANDS.forEach((st2, k) => {
      const x = X3(st2[0]);
      const z = Z3(st2[1]);
      add(D, gc(.05, .08, 1.3, 10), GOLD, x, .65, z);
      add(D, gc(.18, .2, .04, 16), GOLD, x, .02, z);
      add(D, gl([
        [0, 0], [.2, 0], [.34, .18], [.3, .2], [0, .2]
      ], 16), GOLD, x, 1.3, z);
      for (let q = 0; q < 6; q++) {
        add(
          D,
          gs(.3, 8, 6),
          [0x2f6b3a, 0x3d8a4a, 0x25552e][q % 3],
          x + Math.cos(q * 1.05) * .22,
          1.62 + (q % 2) * .1,
          z + Math.sin(q * 1.05) * .22,
          1,
          .7,
          1
        );
      }
      for (let q = 0; q < 14; q++) {
        const a = q * 2.4 + k;
        const r0 = .08 + (q % 5) * .06;
        flower(
          x + Math.cos(a) * r0 * 1.4,
          1.72 + Math.sqrt(Math.max(0, .3 - r0 * r0)) * .6,
          z + Math.sin(a) * r0 * 1.4,
          [0xffffff, 0xf4e9c8, 0xd4af37, 0xfff4dc, 0xe8dcc0][q % 5]
        );
      }
    });
    const pg = new THREE.Shape();
    pg.moveTo(-.7, 0);
    pg.lineTo(.7, 0);
    pg.lineTo(.7, 1.3);
    pg.bezierCurveTo(.7, 2.1, .1, 2.5, -.2, 2.6);
    pg.lineTo(-.7, 2.6);
    pg.lineTo(-.7, 0);
    const pgeo = new THREE.ExtrudeGeometry(pg, { depth: .3, bevelEnabled: false });
    pgeo.rotateX(-PI / 2);
    const PX = -5.2;
    const PZ = -8.2;
    add(D, pgeo, 0x0d0d10, PX, 1.1, PZ);
    [
      [-.6, -.1], [.6, -.1], [0, -2.3]
    ].forEach(a => add(D, gc(.05, .04, .6, 10), 0x0d0d10, PX + a[0], .8, PZ + a[1]));
    add(D, gb(1.3, .06, .4), 0xf4f0e6, PX, 1.1, PZ + .2);
    for (let i = 0; i < 9; i++) {
      if (i % 7 !== 2 && i % 7 !== 6) {
        add(D, gb(.05, .05, .2), 0x111111, PX - .6 + i * .15, 1.15, PZ + .1);
      }
    }
    add(D, gb(1.35, .04, 2.2), 0x0d0d10, PX + .35, 1.45, PZ - 1.4, 1, 1, 1, 0, 0, .45);
    add(D, gb(.9, .1, .4), 0x2a170c, PX, .95, PZ + 1.1);
    [
      [-.35, .15], [.35, .15], [-.35, -.15], [.35, -.15]
    ].forEach(a => add(D, gc(.03, .03, .45, 8), 0x2a170c, PX + a[0], .72, PZ + 1.1 + a[1]));
    const mkNpc = (g, col, hair, skin, kind, label, x, y, z, ry, apron, hs) => {
      const fig = person(g, col, false, hair, skin, hs, Math.round(x * 7 + z * 13) + 5);
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.y = ry;
      grp.add(fig.g);
      if (apron) {
        const ap = new THREE.Mesh(gb(.42, .75, .04), mat(0xf4f4f4));
        ap.position.set(0, .95, .17);
        fig.g.add(ap);
      }
      if (label) {
        const lb = sprite(
          txTex(label, 256, 64, 'bold 34px "Times New Roman", Times, serif', '#f0c060'),
          1.5,
          .38
        );
        lb.position.set(0, 2.35, 0);
        grp.add(lb);
      }
      scn.add(grp);
      STAFF.push({
        g: grp, fig, kind, x, z
      });
    };
    mkNpc('m', 0x15151a, 0, 1, 'piano', null, PX, .5, PZ + 1.15, PI, false, 'slick');
    const CX = -17;
    add(D, gb(1.9, 1.1, 12.8), 0x4a2c15, CX, .55, 3.1);
    for (let i = 0; i < 25; i++) {
      add(D, gb(.05, .9, .38), 0x6a3f1e, CX + .98, .55, -3 + i * .5);
    }
    add(D, gb(2.2, .1, 13.2), 0x14161d, CX, 1.15, 3.1);
    add(D, gb(.04, .1, 12.9), 0xd4af37, CX + 1.0, 1.0, 3.1);
    add(D, gb(.8, .75, .9), 0xb8bcc2, CX - .3, 1.58, -1.4);
    add(D, gb(.9, .08, 1.0), 0x222222, CX - .3, 1.24, -1.4);
    add(D, gc(.04, .04, .3, 8), 0x222222, CX - .1, 1.9, -1.4);
    add(D, gl([
      [0, 0], [.16, 0], [.2, .15], [.17, .3], [.07, .38], [0, .4]
    ]), 0xc9ccd2, CX, 1.2, .1);
    add(D, gb(.9, .04, 1.5), 0x6a3f1e, CX + .1, 1.22, 2.2);
    [
      [-.2, 1.7], [.1, 2.2], [-.2, 2.7]
    ].forEach(a => add(D, gl([
      [0, 0], [.1, 0], [.15, .1], [.1, .2], [.04, .24], [0, .25]
    ], 16), 0xf4f0e6, CX + a[0] + .1, 1.26, a[1]));
    for (let i = 0; i < 6; i++) {
      add(
        D,
        gc(.05, .035, .06, 10),
        0xffffff,
        CX + .35 + (i % 2) * .15,
        1.28,
        1.8 + Math.floor(i / 2) * .45
      );
    }
    add(D, gc(.3, .3, .04, 20), 0x14161d, CX, 1.22, 4.9);
    [0xb5683a, 0xf0a0b0, 0xc88a4a, 0xf4d28a, 0xb5683a].forEach(
      (c, i) => add(
        D,
        gs(.07, 8, 6),
        c,
        CX + Math.cos(i * 1.3) * .14,
        1.3,
        4.9 + Math.sin(i * 1.3) * .14
      )
    );
    const dome = new THREE.Mesh(new THREE.SphereGeometry(
      .32,
      20,
      12,
      0,
      PI * 2,
      0,
      PI / 2
    ), new THREE.MeshStandardMaterial({
      color: 0xdff0f6, transparent: true, opacity: .3, roughness: .1
    }));
    dome.position.set(CX, 1.24, 4.9);
    scn.add(dome);
    add(D, gl([
      [0, 0], [.08, 0], [.12, .2], [.07, .3], [.09, .36], [0, .36]
    ], 14), 0x8fb6c9, CX, 1.2, 6.5);
    for (let i = 0; i < 7; i++) {
      const a = i * .9;
      add(
        D,
        gc(.008, .008, .3, 5),
        0x3d6a3a,
        CX + Math.cos(a) * .05,
        1.7,
        6.5 + Math.sin(a) * .05,
        1,
        1,
        1,
        Math.sin(a) * .3,
        0,
        Math.cos(a) * .3
      );
      flower(
        CX + Math.cos(a) * .13,
        1.88,
        6.5 + Math.sin(a) * .13,
        [0xf06292, 0xffd54f, 0xf48fb1, 0xffffff][i % 4]
      );
    }
    add(D, gs(.12, 12, 8), 0xd4af37, CX + .1, 1.22, 7.6, 1, .7, 1);
    add(D, gb(.3, .02, .22), 0x222222, CX + .1, 1.3, 8.4, 1, 1, 1, -.5, 0, 0);
    [.9, 8.9].forEach(z => {
      const jar = new THREE.Mesh(gc(.28, .25, .7, 20), new THREE.MeshStandardMaterial({
        color: 0xbfe3f2, transparent: true, opacity: .35, roughness: .1
      }));
      jar.position.set(CX + .2, 1.55, z);
      scn.add(jar);
      add(D, gc(.25, .23, .55, 20), 0x9fd3ea, CX + .2, 1.5, z);
      add(D, gc(.3, .3, .05, 20), 0xb8bcc2, CX + .2, 1.23, z);
      add(D, gc(.03, .03, .1, 8), 0xb8bcc2, CX + .5, 1.3, z, 1, 1, 1, 0, 0, PI / 2);
      for (let i = 0; i < 4; i++) {
        add(
          D,
          gc(.09, .09, .02, 12),
          0xf2d64b,
          CX + .2 + (i % 2 - .5) * .2,
          1.4 + i * .1,
          z + (i - 1.5) * .06,
          1,
          1,
          1,
          .4,
          0,
          .3
        );
      }
      for (let i = 0; i < 3; i++) {
        add(D, gc(.06, .045, .1, 12), 0xffffff, CX - .5, 1.27 + i * .09, z);
      }
    });
    disc = new THREE.Mesh(gc(.34, .34, .02, 32), mat(0x050505, .3));
    disc.position.set(CX + .3, 1.35, -2.7);
    scn.add(disc);
    const lab = new THREE.Mesh(gc(.1, .1, .025, 16), mat(0xd4af37));
    disc.add(lab);
    add(D, gb(.9, .12, .9), 0x4a2c15, CX + .3, 1.26, -2.7);
    add(D, gb(.03, .03, .5), 0xb8bcc2, CX + .6, 1.42, -2.55);
    [2, 2.8, 3.6].forEach(y => {
      add(D, gb(.4, .06, 12.2), 0x4a2c15, -19.75, y, 3.1);
      for (let i = 0; i < 18; i++) {
        const z = -2.8 + i * .68 + rnd() * .1;
        const k = Math.floor(rnd() * 3);
        const col = [0x2e6b4a, 0x8a5a2a, 0x1b3158, 0xd4af37, 0x2f4b7c][Math.floor(rnd() * 5)];
        if (k === 0) {
          add(D, gc(.06, .07, .42, 10), col, -19.75, y + .24, z);
          add(D, gc(.025, .03, .12, 8), col, -19.75, y + .52, z);
        }
        else if (k === 1) {
          add(D, gc(.1, .1, .26, 12), 0xe9e4da, -19.75, y + .16, z);
          add(D, gc(.105, .105, .05, 12), col, -19.75, y + .31, z);
        }
        else {
          for (let q = 0; q < 3; q++) {
            add(D, gc(.085, .06, .1, 12), 0xffffff, -19.75, y + .08 + q * .1, z);
          }
        }
      }
    });
    [2, 2.8, 3.6].forEach(y => {
      add(E, gb(.03, .03, 12.1), 0xffd49a, -19.5, y - .05, 3.1);
      pool(-19.88, y - .45, 3.1, 12.4, .9, 0xffc27a, .22, 0, PI / 2);
    });
    add(D, gc(.1, .12, .04, 14), 0xb08d2a, CX - .5, 1.22, 3.7);
    add(D, gc(.015, .015, .35, 8), 0xb08d2a, CX - .5, 1.42, 3.7);
    add(E, gl([
      [.04, .0], [.1, .04], [.17, .1], [.2, .16], [.19, .2], [0, .22]
    ], 20), 0xb8e8a0, CX - .5, 1.6, 3.7);
    add(E, gs(.04, 8, 6), 0xfff2c0, CX - .5, 1.62, 3.7);
    halo(CX - .5, 1.65, 3.7, 1.4, 0xffe0a0, .4);
    pool(CX - .4, 1.206, 3.7, 1.5, 1.5, 0xffe0a0, .35, -PI / 2);
    const chalk = (items, title) => tx(512, 256, (x, w, h) => {
      x.fillStyle = '#1d2a24';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#f0ead8';
      x.textAlign = 'center';
      x.font = 'bold 44px "Times New Roman", Times, serif';
      x.fillText(title, w / 2, 56);
      x.font = '32px "Times New Roman", Times, serif';
      items.forEach((s, i) => x.fillText(s, w / 2, 110 + i * 40));
    });
    [[
        .5, ['Trà Hoa Cúc', 'Trà Oolong', 'Cà Phê Moka', 'Mocktail'], 'THỰC ĐƠN NƯỚC'
      ], [
        6.5, [
          'Nước lọc thanh mát',
          'Ngồi thư giãn thoải mái',
          'Nghe nhạc cùng mọi người',
          'Mời quý khách dùng thử'
        ], 'LỄ TÂN'
      ]].forEach(a => {
      const g = new THREE.Group();
      g.position.set(-19.9, 5.3, a[0]);
      g.rotation.y = PI / 2;
      scn.add(g);
      g.add(new THREE.Mesh(gb(3.4, 1.9, .1), mat(0x6a3f1e, .6)));
      const bm = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 1.6),
        new THREE.MeshBasicMaterial({ map: chalk(a[1], a[2]) })
      );
      bm.position.z = .06;
      g.add(bm);
    });
    mkNpc('f', 0x2f6b4f, 1, 1, 'pour', 'Pha chế', -18.85, 0, .3, PI / 2, false, 'pony');
    mkNpc('m', 0x222831, 0, 0, 'wipe', 'Lễ tân', -18.85, 0, 5, PI / 2, true, 'side');
    PLANTS.forEach((p, i) => [palm, palm, ficus, ficus, monstera, snake][i](X3(p[0]), Z3(p[1])));
    [-1.5, 4.5, 10].forEach(z => {
      add(D, gc(.015, .015, 1.6, 6), 0x222222, 0, 8.0, z);
      add(D, gc(.3, .3, .06, 18), 0xd4af37, 0, 8.0, z);
      add(D, gl([
        [0,
        7.2],
        [.06,
        7.2],
        [.06,
        7.05],
        [.13,
        6.95],
        [.07,
        6.85],
        [.07,
        6.7],
        [.11,
        6.6],
        [.05,
        6.45],
        [0,
        6.4]
      ], 20), 0xd4af37, 0, 0, z);
      [[1.35, 6.3, 8], [.8, 6.75, 6]].forEach((tier, ti) => {
        const R2 = tier[0];
        const y0 = tier[1];
        const n = tier[2];
        add(D, gt(R2, .03, PI * 2), 0xd4af37, 0, y0 - .1, z, 1, 1, 1, PI / 2, 0, 0);
        for (let i = 0; i < n; i++) {
          const a = i / n * PI * 2 + ti * .4;
          const ex = Math.cos(a) * R2;
          const ez = z + Math.sin(a) * R2;
          tube(D, [
            0, 6.65 + ti * .35, z
          ], [
            ex * .55, y0 + .3, z + Math.sin(a) * R2 * .55
          ], [
            ex, y0 - .05, ez
          ], .016, 0xd4af37, 6);
          add(D, gc(.07, .04, .03, 12), 0xd4af37, ex, y0 - .05, ez);
          add(D, gc(.026, .026, .15, 10), 0xfff4dc, ex, y0 + .05, ez);
          add(E, gs(.04, 10, 8), 0xffe8a8, ex, y0 + .17, ez, .85, 1.7, .85);
          glow(ex, y0 + .17, ez, .7, 0xffc880, .5);
          for (let q = 0; q < 3; q++) {
            add(
              D,
              new THREE.OctahedronGeometry(.045 - q * .008),
              0xdff2ff,
              ex,
              y0 - .2 - q * .12,
              ez,
              1,
              1.6,
              1
            );
          }
          add(D, new THREE.OctahedronGeometry(.07), 0xe8f6ff, ex, y0 - .6, ez, 1, 2.4, 1);
          spark(ex, y0 - .6, ez);
        }
      });
      add(D, new THREE.OctahedronGeometry(.16), 0xe8f6ff, 0, 5.75, z, 1, 2.6, 1);
      spark(0, 5.75, z);
      halo(0, 6.4, z, 6, 0xffc880, .38);
      const pl = new THREE.PointLight(0xffd090, LIGHT.lamp, 18);
      pl.position.set(0, 5.6, z);
      scn.add(pl);
    });
    const slot = (px, pz, py, sc2) => {
      const g = new THREE.Group();
      g.position.set(px, py, pz);
      g.scale.setScalar(sc2 || 1);
      g.visible = false;
      scn.add(g);
      const cg = new THREE.Group();
      const gg = new THREE.Group();
      g.add(cg, gg);
      cyl(.18, .18, .015, 0xfaf6ee, 0, .008, 0, cg);
      cyl(.1, .065, .12, 0xffffff, 0, .075, 0, cg);
      const liq = cyl(.088, .088, .01, 0xd8b24a, 0, .125, 0, cg);
      const hd = new THREE.Mesh(new THREE.TorusGeometry(.04, .01, 6, 10), mat(0xffffff));
      hd.position.set(.115, .08, 0);
      cg.add(hd);
      const gl2 = cyl(.07, .055, .22, 0xcfe8f5, 0, .13, 0, gg);
      gl2.material.transparent = true;
      gl2.material.opacity = .45;
      const lq = cyl(.062, .05, .17, 0xe0507a, 0, .115, 0, gg);
      const sw2 = cyl(.008, .008, .3, 0xffffff, .02, .3, 0, gg);
      sw2.rotation.z = -.15;
      cyl(.06, .06, .015, 0xf0a030, .07, .23, 0, gg);
      const st = [0, 1].map(() => {
        const s = sprite(steamTex, .22, .22);
        s.material.opacity = 0;
        g.add(s);
        return s;
      });
      SLOT.push({
        g, cg, gg, liq, lq, st
      });
    };
    const clothG = pts => {
      const g = gl(pts, 48);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const a = Math.atan2(z, x);
        const k = 1 + .04 * Math.sin(a * 16) * Math.max(0, (.8 - y) / .8);
        p.setXYZ(i, x * k, y, z * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const SOFAC = [0x1b3158, 0x0f1f3d, 0x24345a, 0x2a2a38, 0x5a3a1c];
    const BOWC = [0xd4af37, 0xf0e6c8, 0xd4af37, 0xf0e6c8, 0xd4af37];
    const sofa = (sx, sz, col) => {
      add(D, gb(1.8, .3, .85), dk(col, .7), sx, .27, sz);
      [-1, 1].forEach(q => {
        add(D, gb(.84, .16, .72), col, sx + q * .43, .5, sz - .03);
        add(
          D,
          gb(.8, .5, .16),
          dk(col, 1.15 > 1 ? .95 : 1),
          sx + q * .43,
          .8,
          sz + .2,
          1,
          1,
          1,
          -.15,
          0,
          0
        );
        add(D, gb(.18, .5, .85), dk(col, .85), sx + q * .91, .55, sz);
        add(D, gc(.1, .1, .85, 12), col, sx + q * .91, .8, sz, 1, 1, 1, PI / 2, 0, 0);
        [
          [-.18, .66], [.18, .66], [0, .88]
        ].forEach(b => add(D, gs(.022, 6, 5), 0xd4af37, sx + q * .43 + b[0], b[1] + .02, sz + .1));
        [[.78, .36], [-.78, .36]].forEach(
          l => add(
            D,
            gc(.04, .03, .12, 8),
            0xd4af37,
            sx + l[0] * (q < 0 ? -1 : 1) * 1.05,
            .06,
            sz + l[1] * (q < 0 ? -1 : 1)
          )
        );
      });
      add(D, gb(1.8, .62, .22), col, sx, .8, sz + .31);
      add(D, gb(1.8, .03, .02), 0xd4af37, sx, .34, sz - .43);
    };
    const bowChair = (cx, cz, bc, fr) => {
      const frame = 0xd4af37;
      const cush = 0x16305a;
      add(D, gb(.64, .05, .62), frame, cx, .36, cz);
      add(D, gb(.6, .1, .58), cush, cx, .42, cz);
      [
        [.27, .26], [-.27, .26], [.27, -.26], [-.27, -.26]
      ].forEach(l => add(D, gc(.025, .02, .36, 8), frame, cx + l[0], .18, cz + l[1]));
      [-.28, .28].forEach(x => add(D, gb(.05, .8, .05), frame, cx + x, .87, cz + .28));
      add(D, gb(.62, .07, .05), frame, cx, 1.25, cz + .28);
      add(D, gb(.5, .55, .06), cush, cx, .95, cz + .28);
      add(D, gb(.5, .05, .012), bc, cx, .98, cz + .325);
      [-1, 1].forEach(q => {
        add(D, gs(.14, 14, 10), bc, cx + q * .19, 1.1, cz + .37, 1.5, 1, .45, 0, 0, q * -.3);
        add(D, gb(.075, .4, .016), bc, cx + q * .08, .86, cz + .375, 1, 1, 1, 0, 0, q * -.26);
      });
      add(D, gs(.075, 12, 9), dk(bc, .78), cx, 1.1, cz + .385, 1, 1.05, .8);
    };
    SOFAS.forEach(f => sofa(X3(f.x), Z3(f.y), SOFAC[f.g % 5]));
    CHAIRS.forEach((c, i) => bowChair(X3(c.x), Z3(c.y), BOWC[i % 5]));
    TABLES.forEach((t, i) => {
      const X = X3(t.x);
      const Z = Z3(t.y);
      const r = t.r;
      add(D, gc(r, r, .05, 28), 0x14284f, X, .775, Z);
      add(D, gt(r, .018, PI * 2), 0xd4af37, X, .8, Z, 1, 1, 1, PI / 2, 0, 0);
      add(D, gc(.04, .04, .72, 10), 0xd4af37, X, .4, Z);
      add(D, gc(.2, .24, .04, 20), 0x2a2a2a, X, .02, Z);
      const sg2 = sprite(
        txTex('Bàn ' + (i + 1), 256, 64, 'bold 34px "Times New Roman", Times, serif', '#f0c060'),
        1.0,
        .26
      );
      sg2.position.set(X, 1.5, Z);
      scn.add(sg2);
      add(D, gc(.045, .055, .1, 12), 0xb08d2a, X, .86, Z);
      add(D, gc(.028, .028, .12, 10), 0xfff4dc, X, .97, Z);
      add(E, gc(.004, .004, .03, 4), 0x222222, X, 1.04, Z);
      const fm = mk(gs(.028, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb030 }), X, 1.09, Z);
      fm.scale.set(.6, 1.6, .6);
      fm.castShadow = false;
      flames.push(fm);
      add(E, gs(.014, 8, 6), 0xfff6d8, X, 1.075, Z, .7, 1.5, .7);
      glows.push(halo(X, 1.12, Z, .9, 0xffa850, .5));
      pendant(X, Z);
      add(D, gl([
        [0, 0], [.045, 0], [.055, .08], [.035, .18], [.045, .2], [0, .2]
      ], 12), 0x8fb6c9, X + r * .55, .805, Z - r * .3);
      flower(X + r * .55, 1.02, Z - r * .3, [0xf06292, 0xffd54f, 0xf48fb1][i % 3]);
    });
    SEATS.forEach(s => {
      if (s.stool) {
        return;
      }
      const t = TABLES[s.t];
      slot(X3(t.x) + s.ox, Z3(t.y) + s.oz, .82, .65);
    });
    SEATS.forEach(s => {
      if (!s.stool) {
        return;
      }
      const sx = X3(s.x);
      const sz = Z3(s.y);
      add(D, gc(.25, .25, .08, 20), 0x1c1c20, sx, .71, sz);
      add(D, gc(.035, .035, .7, 10), 0xb8bcc2, sx, .36, sz);
      add(D, gc(.26, .3, .04, 20), 0xb8bcc2, sx, .02, sz);
      add(D, gt(.2, .015, PI * 2), 0xb8bcc2, sx, .3, sz, 1, 1, 1, PI / 2, 0, 0);
      slot(CX + 1.0, sz, 1.2);
    });
    const mg = new THREE.BufferGeometry();
    const mp = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      mp[i * 3] = (rnd() - .5) * 14;
      mp[i * 3 + 1] = 1 + rnd() * 8;
      mp[i * 3 + 2] = -12 + rnd() * 8;
    }
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    MOTES = new THREE.Points(mg, new THREE.PointsMaterial({
      color: 0xffe2a8, size: .07, transparent: true, opacity: .55, depthWrite: false
    }));
    scn.add(MOTES);
    const cob = tx(256, 256, (x, w, h) => {
      x.fillStyle = '#2a2a32';
      x.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          x.fillStyle = 'hsl(240,6%,' + (16 + Math.random() * 8) + '%)';
          x.fillRect(c * 32 + (r % 2) * 16 + 1, r * 32 + 1, 30, 30);
        }
      }
    }, 20, 10);
    const gr = mk(
      new THREE.PlaneGeometry(80, 40),
      new THREE.MeshStandardMaterial({ map: cob, roughness: .8 }),
      0,
      -.01,
      32
    );
    gr.rotation.x = -PI / 2;
    gr.castShadow = false;
    [-9, 9].forEach(x => {
      add(D, gc(.06, .08, 3.6, 10), 0x1a1a1f, x, 1.8, 15.5);
      add(D, gc(.1, .12, .1, 10), 0x1a1a1f, x, .05, 15.5);
      add(D, gb(.5, .04, .04), 0x1a1a1f, x - .2, 3.6, 15.5);
      add(E, gs(.2, 12, 10), 0xffe2a8, x - .4, 3.55, 15.5);
      halo(x - .4, 3.55, 15.5, 3, 0xffc880, .4);
      pool(x - .4, .02, 15.5, 8, 8, 0xffc880, .2, -PI / 2);
    });
    [[-3, 16.5], [4, 17]].forEach(q => {
      add(D, gb(1.2, .25, .4), 0x6a4a2a, q[0], .45, q[1]);
      add(D, gb(1.2, .5, .06), 0x6a4a2a, q[0], .75, q[1] - .17);
      [-.5, .5].forEach(o => add(D, gb(.06, .45, .36), 0x2a1a0e, q[0] + o, .22, q[1]));
    });
    scn.add(merged(D));
    scn.add(merged(E, true));
    FG.add(merged(F));
    const cm = merged(C);
    cm.castShadow = false;
    scn.add(cm);
  }
  buildDecor();
  function draw3d(dt, t) {
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (R._w !== w || R._h !== h) {
      R._w = w;
      R._h = h;
      R.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    if (rainOn || winDirty) {
      drawWin(dt);
      winDirty = false;
    }
    if (disc) {
      disc.rotation.y += dt * 3.5;
    }
    const lk = (t / 66) | 0;
    if (lk !== ledK) {
      ledK = lk;
      drawLed(t);
    }
    BEAMS.forEach(b => {
      const w2 = t / 1000 + b.ph;
      const tx2 = b.tx + Math.sin(w2 * .7) * b.sw;
      const tz2 = b.tz + Math.cos(w2 * .55) * b.sw * .5;
      const dx = tx2 - b.a[0];
      const dy = .5 - b.a[1];
      const dz = tz2 - b.a[2];
      const L = Math.hypot(dx, dy, dz);
      b.m.position.set(b.a[0] + dx / 2, b.a[1] + dy / 2, b.a[2] + dz / 2);
      b.m.quaternion.setFromUnitVectors(UP_D, new THREE.Vector3(dx / L, dy / L, dz / L));
      b.m.scale.y = L / b.L0;
      b.m.material.color.setHSL(Math.sin(b.ph * 7) > 0 ? .12 + .015 * Math.sin(t / 3000 + b.ph) : .61 + .015 * Math.sin(t / 3000 + b.ph), .75, .55);
    });
    const tr = tracks.find(x => now && x.id === now.trackId);
    const key = tr ? tr.id + (tr.g || 'm') : '';
    if (singer._k !== key) {
      singer._k = key;
      drawSinger(tr);
      [sFig, sFig2].forEach(o => {
        if (o) {
          scn.remove(o.g);
        }
      });
      sFig2 = null;
      const duet = !!tr && isDuet(tr.g);
      const fem = !!tr && (tr.g === 'f' || tr.g === 'df');
      sFig = person(fem ? 'f' : 'm', fem ? 0x14305a : 0x15151a, true, 0, 0);
      sFig.g.position.set(duet ? -1.15 : 0, .58, STZ + .2);
      scn.add(sFig.g);
      singerGLB(sFig, fem);
      if (duet) {
        const fem2 = tr.g === 'd' || tr.g === 'df';
        sFig2 = person(fem2 ? 'f' : 'm', fem2 ? 0x14305a : 0x15151a, true, 1, 1);
        sFig2.g.position.set(1.15, .58, STZ + .2);
        scn.add(sFig2.g);
        singerGLB(sFig2, fem2);
      }
    }
    singer.visible = !!tr;
    [sFig, sFig2].forEach((o, i) => {
      if (!o) {
        return;
      }
      o.g.visible = !!tr;
      o.g.rotation.y = Math.sin(t / 900 + i * 1.6) * .25 + (sFig2 ? (i ? -.28 : .28) : 0);
      if (!o.glb) {
        lifeFig(o, t, 3.1 + i * 1.3, 0, false, false);
        o.AL.rotation.x = Math.sin(t / 600 + i) * .15;
        o.AR.rotation.x = -1.9 + Math.sin(t / 500 + i) * .08;
      }
      else if (o.glb.mixer) {
        o.glb.mixer.update(dt);
      }
    });
    STAFF.forEach((s, i) => {
      const f = s.fig;
      const w2 = t / 1000;
      if (s.kind === 'piano') {
        s.g.visible = !tr;
        f.L.rotation.x = f.R.rotation.x = -1.5;
        f.LK.rotation.x = f.RK.rotation.x = 1.5;
        s.g.children[0].position.y = -.15;
        f.AL.rotation.x = -1.3 + Math.sin(w2 * 2.1) * .1;
        f.AR.rotation.x = -1.3 + Math.sin(w2 * 1.7 + 1) * .1;
        return;
      }
      s.g.position.y = Math.sin(w2 * 1.5 + i) * .008;
      lifeFig(f, t, i * 1.9 + .5, 0, false, false);
      if (s.kind === 'pour') {
        f.AR.rotation.x = -1.2 + Math.sin(w2 * .9) * .25 * (Math.sin(w2 * .3) > 0 ? 1 : .2);
        f.AL.rotation.x = -.9;
      }
      else {
        f.AL.rotation.x = -1.1 + Math.sin(w2 * 3) * .12;
        f.AR.rotation.x = -1.2 + Math.sin(w2 * 3 + 1) * .12;
      }
      f.AR.rotation.z = 0;
      if (greetT && t > greetT && t - greetT < 3000) {
        f.AR.rotation.x = -2.9;
        f.AR.rotation.z = Math.sin(t / 80) * .45;
      }
    });
    Object.values(P).concat([me]).forEach(p => {
      const isMe = p === me;
      const o = obj(p);
      label(p, isMe);
      if (USE_GLB && !o.glb && !o.glbTried && GLB[p.av === 'f' ? 'f' : 'm']) {
        attachGLB(p, o);
      }
      o.g.position.set(X3(p.x), 0, Z3(p.y));
      const si = SEATS.findIndex(s => Math.hypot(s.x - p.x, s.y - p.y) < 22);
      const seated = !p.mv && si >= 0;
      const so = seated ? SEATS[si].sh - .42 : 0;
      let hd = o.h;
      if (p.mv) {
        hd = Math.atan2(p.fx, p.fy);
      }
      else if (seated) {
        hd = SEATS[si].face;
      }
      let dh = hd - o.h;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      o.h += dh * Math.min(1, dt * 10);
      o.body.rotation.y = o.h;
      if (o.ph === undefined) {
        o.ph = ([...(p.n || 'x')].reduce((a2, ch) => a2 + ch.charCodeAt(0), 0) % 97) * .37;
        o.wk = 0;
      }
      o.wk += ((p.mv ? 1 : 0) - o.wk) * Math.min(1, dt * 9);
      const sw = Math.sin(t / 110) * .7 * o.wk;
      const fg = o.fig;
      const stool = seated && SEATS[si].stool;
      o.sk = (o.sk || 0) + ((seated && !stool && fg ? 1 : 0) - (o.sk || 0)) * Math.min(1, dt * 10);
      o.body.position.x = Math.sin(o.h) * SIT_FWD * o.sk;
      o.body.position.z = Math.cos(o.h) * SIT_FWD * o.sk;
      o.body.position.y = seated
        ? (fg ? SEATS[si].sh + fg.thR - .68 : -.18 + so)
        : (!(o.glb && o.glb.actions.walk)
          ? Math.abs(Math.sin(t / 110)) * .04 * o.wk + Math.sin(t / 700 + o.ph) * .004 * (1 - o.wk)
          : 0);
      if (fg) {
        fg.L.rotation.x = seated ? -1.6 : sw;
        fg.R.rotation.x = seated ? -1.6 : -sw;
        fg.LK.rotation.x = seated ? 1.72 : Math.max(0, -sw) * .9;
        fg.RK.rotation.x = seated ? 1.72 : Math.max(0, sw) * .9;
        if (fg.SK) {
          const m = seated ? (stool ? 2 : 1) : 0;
          fg.SK.forEach((q, qi) => {
            q.visible = qi === m;
          });
        }
        fg.relSit = stool ? .05 : fg.sitZ;
        const ab = seated ? (stool ? -1.1 : -fg.sitX) : 0;
        fg.AL.rotation.x = seated ? ab : -sw * .8;
        fg.AR.rotation.x = seated ? ab : sw * .8;
        fg.AL.rotation.z = 0;
        fg.AR.rotation.z = 0;
        lifeFig(fg, t, o.ph, o.wk, seated, true);
        if (p.sipT && t - p.sipT < 1100) {
          fg.AR.rotation.x = (seated ? ab : 0) - 1.3 * Math.sin(Math.PI * (t - p.sipT) / 1100);
        }
        if (p.waveT && t - p.waveT < 1800) {
          fg.AR.rotation.x = -2.9;
          fg.AR.rotation.z = Math.sin(t / 80) * .45;
        }
        if (p.clapT && t - p.clapT < 1500) {
          const c = .15 + .2 * (1 + Math.sin(t / 70));
          fg.AL.rotation.x = fg.AR.rotation.x = -1.4;
          fg.AL.rotation.z = c;
          fg.AR.rotation.z = -c;
        }
      }
      else if (o.glb) {
        glbAnimate(o, p, t, dt, seated);
      }
      const by = o.glb ? o.glb.h + .25 + (seated ? so - .18 : 0) : (seated ? 1.82 + so : 2.2);
      o.lb.position.y = by;
      const dcam = Math.hypot(
        o.g.position.x - cam.position.x,
        2 - cam.position.y,
        o.g.position.z - cam.position.z
      );
      const lk2 = clamp(dcam * .062, .3, 1.25);
      o.lb.scale.set(2.4 * lk2, .9 * lk2, 1);
      o.lb.visible = dcam < 26;
      o.bb.scale.set(1.1 * clamp(dcam * .07, .5, 1.3), 1.1 * clamp(dcam * .07, .5, 1.3), 1);
      if (p.bub && p.bub.u > t) {
        const k = 1 - (p.bub.u - t) / 2500;
        o.bb.visible = true;
        o.bb.material.map = emojiTex(p.bub.e);
        o.bb.material.needsUpdate = true;
        o.bb.position.y = by + .95 + k * .6;
      }
      else {
        o.bb.visible = false;
      }
      if (seated) {
        p._cs = si;
      }
      o.cup.visible = false;
      o.st.forEach(q => {
        q.visible = false;
      });
    });
    SLOT.forEach(sl => {
      sl.g.visible = false;
    });
    Object.values(P).concat([me]).forEach(p => {
      if (p.d < 0 || p._cs == null) {
        return;
      }
      const sl = SLOT[p._cs];
      const lvf = p === me ? clamp(me.lv / 100, .1, 1) : 1;
      const gl = p.d === 3;
      sl.g.visible = true;
      sl.cg.visible = !gl;
      sl.gg.visible = gl;
      sl.liq.material.color.setHex(DC[p.d] || DC[0]);
      sl.liq.position.y = .085 + .04 * lvf;
      sl.lq.scale.y = lvf;
      sl.lq.position.y = .03 + .085 * lvf;
      sl.st.forEach((q, i) => {
        const ph = ((t / 1800) + i * .5) % 1;
        q.visible = lvf > .12 && !gl;
        q.position.set(0, .2 + ph * .45, 0);
        q.material.opacity = (1 - ph) * .5;
      });
    });
    flames.forEach((fl, i) => {
      const k = .9 + Math.sin(t / 90 + i * 2) * .18 + Math.sin(t / 37 + i) * .06;
      fl.scale.set(.6 * k, 1.6 * k, .6 * k);
    });
    TW.forEach((q, i) => {
      const k = Math.max(0, Math.sin(t / 260 + i * 2.3));
      q.material.opacity = k * k * .9 * LIGHT.glow;
      q.scale.setScalar(.12 + .22 * k);
    });
    glows.forEach((g, i) => {
      g.material.opacity = (.42 + Math.sin(t / 110 + i * 1.7) * .08) * LIGHT.glow;
    });
    if (MOTES) {
      const a = MOTES.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) + dt * .08;
        if (y > 9) {
          y = 1;
        }
        a.setY(i, y);
      }
      a.needsUpdate = true;
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt / 1.6;
      if (f.t >= 1) {
        if (f.o) {
          scn.remove(f.o);
          f.o.material.dispose();
        }
        fx.splice(i, 1);
        continue;
      }
      if (f.t < 0) {
        continue;
      }
      if (!f.o) {
        f.o = sprite(emojiTex(f.e), 1, 1);
        scn.add(f.o);
      }
      f.o.position.set(
        X3(f.sx + (f.tx - f.sx) * f.t),
        1.8 + Math.sin(f.t * Math.PI) * 2.2,
        Z3(f.sy + (f.ty - f.sy) * f.t)
      );
      f.o.material.opacity = 1 - f.t * .6;
    }
    tgt.lerp(new THREE.Vector3(X3(me.x), 0, Z3(me.y)), 1 - Math.pow(.002, dt));
    const zmax = 12.3 + clamp((Math.cos(camYaw) - .5) / .5, 0, 1) * 14;
    const hxv = Math.sin(camYaw);
    const hzv = Math.cos(camYaw);
    let cl = 1e9;
    if (hxv > 1e-3) {
      cl = Math.min(cl, (19.3 - tgt.x) / hxv);
    }
    else if (hxv < -1e-3) {
      cl = Math.min(cl, (-19.3 - tgt.x) / hxv);
    }
    if (hzv > 1e-3) {
      cl = Math.min(cl, (zmax - tgt.z) / hzv);
    }
    else if (hzv < -1e-3) {
      cl = Math.min(cl, (-12.2 - tgt.z) / hzv);
    }
    cl = Math.max(cl, .5);
    let hor = Math.cos(camPitch) * camDist;
    let ver = Math.sin(camPitch) * camDist;
    if (hor > cl) {
      hor = cl;
      ver = Math.sqrt(Math.max(0, camDist * camDist - cl * cl));
    }
    ver = clamp(ver, 2.2 - tgt.y, 5.8 - tgt.y);
    cam.position.set(tgt.x + hxv * hor, tgt.y + ver, tgt.z + hzv * hor);
    if (FG) {
      FG.visible = cam.position.z < 12.2;
    }
    cam.lookAt(tgt.x, 1.0, tgt.z);
    R.render(scn, cam);
  }
  const rc = new THREE.Raycaster();
  const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const nd = new THREE.Vector2();
  function clickAt(cx, cy) {
    const r = cv.getBoundingClientRect();
    nd.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height * 2 - 1));
    rc.setFromCamera(nd, cam);
    const pj = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z).project(cam);
      return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top];
    };
    const m = pj(X3(me.x), 1, Z3(me.y));
    if (Math.hypot(cx - m[0], cy - m[1]) < 45) {
      return sip();
    }
    for (const k in P) {
      const o = P[k];
      const q = pj(X3(o.x), 1, Z3(o.y));
      if (Math.hypot(cx - q[0], cy - q[1]) < 45) {
        return HD.profile(k);
      }
    }
    for (const sf of STAFF) {
      if (sf.kind === 'piano') {
        continue;
      }
      const q = pj(sf.x, 1.2, sf.z);
      if (Math.hypot(cx - q[0], cy - q[1]) < 60) {
        toast('Nhân viên: Quý khách muốn dùng gì ạ? 🍵');
        return HD.menu();
      }
    }
    const reach = COARSE ? 70 : 52;
    const near = SEATS.map(sd => {
      const q = pj(X3(sd.x), .55, Z3(sd.y));
      return { sd, d: Math.hypot(cx - q[0], cy - q[1]) };
    }).filter(v => v.d < reach).sort((u, v) => u.d - v.d);
    if (near.length) {
      const free = near.find(v => !taken(v.sd) && !vipLocked(v.sd));
      if (free) {
        AE.seat();
        return goto(free.sd.x, free.sd.y);
      }
      if (near[0].d < 36) {
        return toast(vipLocked(near[0].sd)
          ? '🛋 Sofa VIP sát sân khấu dành cho Cấp 5 trở lên'
          : 'Chỗ này có người ngồi rồi');
      }
    }
    if (!rc.ray.intersectPlane(pl, hit)) {
      return;
    }
    goto(Math.round(hit.x * 40 + W / 2), Math.round(hit.z * 40 + H / 2));
  }
  const vipLocked = sd => sd.sh === .58 && lvl(score) < 5 && !amAdmin;
  function sitToggle() {
    const cur0 = SEATS.find(sd => Math.hypot(sd.x - me.x, sd.y - me.y) < 48);
    if (cur0) {
      return goto(cur0.stool ? cur0.x + 80 : cur0.x, cur0.stool ? cur0.y : cur0.y + 80);
    }
    const c = SEATS.filter(sd => !taken(sd) && !vipLocked(sd))
      .sort((u, v) => Math.hypot(u.x - me.x, u.y - me.y) - Math.hypot(v.x - me.x, v.y - me.y))[0];
    if (!c) {
      return toast('Hiện chưa còn chỗ trống phù hợp');
    }
    AE.seat();
    goto(c.x, c.y);
  }
  function moveDir(r, f) {
    const dx = -Math.sin(camYaw) * f + Math.cos(camYaw) * r;
    const dz = -Math.cos(camYaw) * f - Math.sin(camYaw) * r;
    const l = Math.hypot(dx, dz) || 1;
    goto(me.x + dx / l * 110, me.y + dz / l * 110);
  }
  const step = (p, dt) => {
    const w = p.path && p.path[0];
    if (!w) {
      p.mv = 0;
      return;
    }
    const dx = w.x - p.x;
    const dy = w.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      p.x = w.x;
      p.y = w.y;
      p.path.shift();
      if (!p.path.length) {
        p.mv = 0;
      }
      return;
    }
    const m = Math.min(d, SPD * dt);
    p.fx = dx / d;
    p.fy = dy / d;
    p.x += p.fx * m;
    p.y += p.fy * m;
    p.mv = 1;
  };
  let lt = performance.now();
  function loop(t) {
    const dt = Math.min(.05, (t - lt) / 1000);
    lt = t;
    step(me, dt);
    if (me.mv && t > nextStep) {
      nextStep = t + 340;
      AE.step();
    }
    for (const k in P) {
      step(P[k], dt);
    }
    draw3d(dt, t);
    requestAnimationFrame(loop);
  }
})();

