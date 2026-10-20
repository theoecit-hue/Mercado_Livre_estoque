const crypto = require('crypto');
const { load, save } = require('../lib/store');
const { resolve, dados } = require('../lib/ml');

function senhaOk(s) {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) return false;
  const a = Buffer.from(String(s || '')), b = Buffer.from(p);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const okUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch (e) { return false; } };
const txt = (v, n) => String(v || '').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });
  const b = req.body || {};
  if (!senhaOk(b.senha)) { await new Promise((r) => setTimeout(r, 1200)); return res.status(401).json({ erro: 'Senha incorreta' }); }
  try {
    let itens = await load();
    if (b.acao === 'add') {
      if (!okUrl(b.link)) return res.status(400).json({ erro: 'Link invalido' });
      const it = { id: crypto.randomUUID().slice(0, 8), link: txt(b.link, 600), tipo: b.tipo === 'proprio' ? 'proprio' : 'afiliado', man: { nome: txt(b.nome, 120), preco: txt(b.preco, 20), img: okUrl(b.img) ? txt(b.img, 600) : '' }, ref: null, cache: null, erro: null };
      try {
        it.ref = await resolve(it.link);
        if (it.ref) it.cache = { ...(await dados(it.ref)), ts: Date.now() }; else it.erro = 'nao_identificado';
      } catch (e) { it.erro = String(e.message).slice(0, 120); }
      itens.unshift(it);
    } else if (b.acao === 'remove') {
      itens = itens.filter((i) => i.id !== b.id);
    } else if (b.acao === 'move') {
      const i = itens.findIndex((x) => x.id === b.id), j = i + (b.dir === 'up' ? -1 : 1);
      if (i >= 0 && j >= 0 && j < itens.length) [itens[i], itens[j]] = [itens[j], itens[i]];
    } else if (b.acao === 'refresh') {
      itens.forEach((i) => { i.cache = null; });
    } else if (b.acao !== 'list') return res.status(400).json({ erro: 'acao' });
    if (b.acao !== 'list') await save(itens);
    res.status(200).json(itens.map((i) => ({ id: i.id, link: i.link, tipo: i.tipo, man: i.man, nome: (i.man && i.man.nome) || (i.cache && i.cache.nome) || '', preco: (i.man && i.man.preco) || (i.cache && i.cache.preco) || '', erro: i.erro })));
  } catch (e) { res.status(500).json({ erro: 'Falha: ' + String(e.message).slice(0, 100) }); }
};
