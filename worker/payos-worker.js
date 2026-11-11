
const PRICES = {
  nc_neon: 19000, nc_ruby: 19000, nc_rainbow: 39000,
  bd_bfly: 19000, bd_dragon: 39000,
  ea_bfly: 29000, ea_heart: 29000, ea_fire: 39000
};
const DD_PRICE = 20000;      // giá một lời tặng bài hát
const DD_MIN_DAYS = 2;       // bài chưa có trong danh sách phải đặt trước ít nhất 2 ngày
const DD_MAX_DAYS = 90;
const PAYOS = 'https://api-merchant.payos.vn';
const LINK_TTL = 15 * 60;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64u = v => btoa(typeof v === 'string' ? v : String.fromCharCode(...new Uint8Array(v)))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
function safeEq(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return d === 0;
}
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const vnDay = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
const vnYear = () => new Date(Date.now() + 7 * 3600e3).getUTCFullYear();
const yearEnd = y => Date.UTC(y + 1, 0, 1) - 7 * 3600e3;

let tok = { v: '', exp: 0 };
async function dbToken(env) {
  if (tok.v && tok.exp > Date.now() + 60e3) {
    return tok.v;
  }
  const sa = JSON.parse(env.FIREBASE_SA);
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + claim));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + head + '.' + claim + '.' + b64u(sig)
  });
  const j = await r.json();
  if (!j.access_token) {
    throw new Error('Không lấy được token Firebase');
  }
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tok.v;
}
async function dbReq(env, method, path, body, headers) {
  const r = await fetch(env.DB_URL + '/' + path + '.json', {
    method,
    headers: { authorization: 'Bearer ' + await dbToken(env), 'content-type': 'application/json', ...(headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return r;
}
const dbGet = async (env, path) => (await dbReq(env, 'GET', path)).json();
async function dbPatch(env, up) {
  const r = await dbReq(env, 'PATCH', '', up);
  if (!r.ok) {
    throw new Error('Firebase PATCH ' + r.status);
  }
}
async function dbAdd(env, path, n) {
  for (let i = 0; i < 6; i++) {
    const g = await dbReq(env, 'GET', path, undefined, { 'x-firebase-etag': 'true' });
    const etag = g.headers.get('etag');
    const cur = (await g.json()) || 0;
    const p = await dbReq(env, 'PUT', path, cur + n, { 'if-match': etag });
    if (p.ok) {
      return cur + n;
    }
    if (p.status !== 412) {
      throw new Error('Firebase PUT ' + p.status);
    }
  }
  throw new Error('Không cộng được doanh thu (xung đột)');
}

async function payosCreate(env, orderCode, amount, description, siteUrl) {
  const cancelUrl = siteUrl, returnUrl = siteUrl;
  const signature = await hmac(env.PAYOS_CHECKSUM_KEY,
    'amount=' + amount + '&cancelUrl=' + cancelUrl + '&description=' + description
    + '&orderCode=' + orderCode + '&returnUrl=' + returnUrl);
  const r = await fetch(PAYOS + '/v2/payment-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-id': env.PAYOS_CLIENT_ID, 'x-api-key': env.PAYOS_API_KEY },
    body: JSON.stringify({
      orderCode, amount, description, cancelUrl, returnUrl, signature,
      expiredAt: Math.floor(Date.now() / 1000) + LINK_TTL
    })
  });
  const j = await r.json();
  if (j.code !== '00' || !j.data || !j.data.checkoutUrl) {
    throw new Error('payOS: ' + (j.desc || r.status));
  }
  return j.data;
}
async function webhookSig(env, data) {
  const s = Object.keys(data).sort().map(k => {
    let v = data[k];
    if (v === null || v === undefined || v === 'null' || v === 'undefined') {
      v = '';
    }
    else if (typeof v === 'object') {
      v = JSON.stringify(v);
    }
    return k + '=' + v;
  }).join('&');
  return hmac(env.PAYOS_CHECKSUM_KEY, s);
}

function cors(req, env) {
  const origins = (env.ALLOWED_ORIGINS || env.SITE_URL || '').split(',').map(s => s.trim()).filter(Boolean);
  const o = req.headers.get('origin');
  return {
    'access-control-allow-origin': origins.includes(o) ? o : origins[0] || '',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'origin'
  };
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json', ...(h || {}) } });

async function verifyUser(env, idToken) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + env.FB_API_KEY, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken })
  });
  const j = await r.json();
  const u = j.users && j.users[0];
  return u && u.email ? u.localId : null;
}

async function createOrder(req, env, h) {
  const idToken = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const uid = idToken && await verifyUser(env, idToken);
  if (!uid) {
    return json({ error: 'Hãy đăng nhập tài khoản đã đăng ký' }, 401, h);
  }
  const body = await req.json().catch(() => ({}));
  const sku = String(body.sku || '');
  const min = +env.MIN_DONATE || 5000, max = +env.MAX_TX || 10000000, cap = +env.YEAR_CAP || 900000000;
  let amount;
  let dd = null;
  if (sku === 'donate') {
    amount = Math.round(+body.amount);
    if (!(amount >= min && amount <= max)) {
      return json({ error: 'Số tiền ủng hộ phải từ ' + min + ' đến ' + max }, 400, h);
    }
  }
  else if (sku === 'dd') {
    amount = DD_PRICE;
    const b = body.dd || {};
    dd = { to: clean(b.to, 16), m: clean(b.m, 100) };
    if (!dd.to) {
      return json({ error: 'Hãy nhập tên người nhận' }, 400, h);
    }
    if (!dd.m) {
      return json({ error: 'Hãy nhập lời nhắn' }, 400, h);
    }
    if (b.k) {
      const k = clean(b.k, 30);
      const tr = /^[-\w]+$/.test(k) ? await dbGet(env, 'tracks/' + k) : null;
      if (!tr || !(+tr.dur > 0)) {
        return json({ error: 'Bài hát này không còn trong danh sách' }, 400, h);
      }
      dd.k = k;
    }
    else {
      dd.sn = clean(b.sn, 80);
      dd.day = clean(b.day, 10);
      const lo = vnDay(Date.now() + DD_MIN_DAYS * 86400e3), hi = vnDay(Date.now() + DD_MAX_DAYS * 86400e3);
      if (!dd.sn) {
        return json({ error: 'Hãy nhập tên bài hát' }, 400, h);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dd.day) || dd.day < lo || dd.day > hi) {
        return json({ error: 'Bài ngoài danh sách phải đặt trước ít nhất ' + DD_MIN_DAYS + ' ngày (tối đa ' + DD_MAX_DAYS + ' ngày)' }, 400, h);
      }
    }
  }
  else if (PRICES[sku]) {
    amount = PRICES[sku];
  }
  else {
    return json({ error: 'Vật phẩm không tồn tại' }, 400, h);
  }
  const closed = (await dbGet(env, 'shop/closedUntil')) || 0;
  if (closed > Date.now()) {
    return json({ error: 'Cửa hàng và ủng hộ đang tạm nghỉ' }, 403, h);
  }
  const rev = (await dbGet(env, 'revenue/' + vnYear())) || 0;
  if (rev + amount > cap) {
    return json({ error: 'Phòng trà tạm nghỉ nhận thêm trong năm nay, cảm ơn bạn 🙏' }, 403, h);
  }
  if (sku !== 'donate' && sku !== 'dd' && (await dbGet(env, 'owned/' + uid + '/' + sku))) {
    return json({ error: 'Bạn đã sở hữu vật phẩm này' }, 400, h);
  }
  const mine = (await dbGet(env, 'orders/' + uid)) || {};
  if (Object.values(mine).filter(o => o.s === 0).length >= 5) {
    return json({ error: 'Bạn đang có 5 đơn chờ, hãy hoàn tất hoặc hủy bớt' }, 429, h);
  }
  const name = String((await dbGet(env, 'users/' + uid + '/n')) || 'Khách').slice(0, 16);
  const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const code = 'PT' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  const pay = await payosCreate(env, orderCode, amount, code, env.SITE_URL);
  const ts = { '.sv': 'timestamp' };
  await dbPatch(env, {
    ['orders/' + uid + '/' + orderCode]: Object.assign({ sku, a: amount, c: code, n: name, t: ts, s: 0, url: pay.checkoutUrl }, dd ? { dd } : {}),
    ['payorders/' + orderCode]: Object.assign({ u: uid, sku, a: amount, n: name, t: ts, st: 0 }, dd ? { dd } : {})
  });
  return json({ id: String(orderCode), url: pay.checkoutUrl, amount, code }, 200, h);
}

async function webhook(req, env) {
  const body = await req.json().catch(() => null);
  if (!body || !body.data || !body.signature) {
    return json({ error: 'bad body' }, 400);
  }
  if (!safeEq(await webhookSig(env, body.data), body.signature)) {
    return json({ error: 'bad signature' }, 401);
  }
  const d = body.data;
  if (body.success !== true || d.code !== '00') {
    return json({ ok: true, skip: 'not paid' });
  }
  const oc = String(d.orderCode);
  const rec = await dbGet(env, 'payorders/' + oc);
  if (!rec) {
    return json({ ok: true, skip: 'unknown order' });
  }
  const g = await dbReq(env, 'GET', 'payorders/' + oc + '/st', undefined, { 'x-firebase-etag': 'true' });
  const etag = g.headers.get('etag');
  if (((await g.json()) || 0) >= 1) {
    return json({ ok: true, skip: 'done' });
  }
  if (+d.amount !== rec.a) {
    await dbPatch(env, { ['payorders/' + oc + '/bad']: { paid: +d.amount, t: { '.sv': 'timestamp' } } });
    return json({ ok: true, skip: 'amount mismatch' });
  }
  const claim = await dbReq(env, 'PUT', 'payorders/' + oc + '/st', 1, { 'if-match': etag });
  if (!claim.ok) {
    return json({ ok: true, skip: 'claimed elsewhere' });
  }
  try {
    const manual = (await dbGet(env, 'orders/' + rec.u + '/' + oc + '/s')) === 1;
    const up = { ['orders/' + rec.u + '/' + oc + '/s']: 1 };
    if (rec.sku === 'donate') {
      const prev = (await dbGet(env, 'donors/' + rec.u + '/a')) || 0;
      up['donors/' + rec.u] = { n: rec.n, a: manual ? prev : prev + rec.a, t: { '.sv': 'timestamp' } };
      up['owned/' + rec.u + '/bd_donor'] = true;
    }
    else if (rec.sku === 'dd') {
      // admin xác nhận tay trước đó có thể đã tạo lời tặng rồi: không ghi đè (giữ nguyên dấu "đã phát")
      if (rec.dd && !(await dbGet(env, 'dedics/' + oc))) {
        up['dedics/' + oc] = Object.assign({ u: rec.u, f: rec.n, t: { '.sv': 'timestamp' } }, rec.dd);
      }
    }
    else {
      up['owned/' + rec.u + '/' + rec.sku] = true;
    }
    await dbPatch(env, up);
    if (!manual) {
      const y = vnYear();
      const total = await dbAdd(env, 'revenue/' + y, rec.a);
      if (total >= (+env.YEAR_CAP || 900000000)) {
        await dbPatch(env, { 'shop/closedUntil': yearEnd(y) });
      }
    }
    await dbPatch(env, { ['payorders/' + oc + '/st']: 2 });
    return json({ ok: true });
  }
  catch (e) {
    await dbReq(env, 'PUT', 'payorders/' + oc + '/st', 0).catch(() => {});
    return json({ error: String(e.message || e) }, 500);
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: h });
    }
    try {
      if (req.method === 'POST' && url.pathname === '/create') {
        return await createOrder(req, env, h);
      }
      if (req.method === 'POST' && url.pathname === '/webhook') {
        return await webhook(req, env);
      }
      return json({ ok: true, service: 'phongtra-pay' }, 200, h);
    }
    catch (e) {
      return json({ error: String(e.message || e) }, 500, h);
    }
  }
};
