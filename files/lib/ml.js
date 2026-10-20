let tok = { v: null, exp: 0 };

async function token() {
  if (tok.v && Date.now() < tok.exp) return tok.v;
  const r = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.ML_CLIENT_ID || '', client_secret: process.env.ML_CLIENT_SECRET || '' })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('token ML: ' + (j.message || r.status));
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in - 300) * 1000 };
  return tok.v;
}

async function api(path) {
  const r = await fetch('https://api.mercadolibre.com' + path, { headers: { Authorization: 'Bearer ' + (await token()) } });
  if (!r.ok) throw new Error('ML ' + path.split('/')[1] + ' ' + r.status);
  return r.json();
}

function achar(s) {
  s = String(s || '');
  let m = s.match(/\/p\/(MLB\d+)/i);
  if (m) return { t: 'p', id: m[1].toUpperCase() };
  m = s.match(/MLB-?(\d{6,})/i);
  if (m) return { t: 'i', id: 'MLB' + m[1] };
  return null;
}

exports.resolve = async (link) => {
  let x = achar(link);
  if (x) return x;
  try {
    const r = await fetch(link, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    x = achar(r.url);
    if (x) return x;
    const h = (await r.text()).slice(0, 300000);
    const c = h.match(/rel=["']canonical["'][^>]*href=["']([^"']+)/i);
    return c ? achar(c[1]) : null;
  } catch (e) { return null; }
};

const brl = (v) => v == null ? '' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const https = (u) => String(u || '').replace(/^http:\/\//, 'https://');

exports.dados = async (ref) => {
  if (ref.t === 'i') {
    const it = await api('/items/' + ref.id);
    return { nome: it.title || '', preco: brl(it.price), img: https((it.pictures && it.pictures[0] && it.pictures[0].secure_url) || it.thumbnail) };
  }
  const p = await api('/products/' + ref.id);
  return { nome: p.name || '', preco: brl(p.buy_box_winner && p.buy_box_winner.price), img: https(p.pictures && p.pictures[0] && p.pictures[0].url) };
};
