const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { resolve, dados } = require('../lib/ml');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function senhaOk(s) {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) return false;
  const a = Buffer.from(String(s || '')), b = Buffer.from(p);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const okUrl = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
const txt = (v, n) => String(v || '').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });
  const b = req.body || {};
  if (!senhaOk(b.senha)) { 
    await new Promise((r) => setTimeout(r, 1200)); 
    return res.status(401).json({ erro: 'Senha incorreta' }); 
  }

  try {
    if (b.acao === 'add') {
      if (!okUrl(b.link)) return res.status(400).json({ erro: 'Link invalido' });
      const id = crypto.randomUUID().slice(0, 8);
      let ref = null, cache = null, erro = null;
      try {
        ref = await resolve(b.link);
        if (ref) cache = { ...(await dados(ref)), ts: Date.now() };
        else erro = 'nao_identificado';
      } catch (e) { erro = String(e.message).slice(0, 120); }

      const novo = {
        id,
        link: txt(b.link, 600),
        tipo: b.tipo === 'proprio' ? 'proprio' : 'afiliado',
        man: { nome: txt(b.nome, 120), preco: txt(b.preco, 20), img: okUrl(b.img) ? txt(b.img, 600) : '' },
        ref,
        cache,
        erro,
        position: 0
      };
      // joga todos pra baixo e insere no topo
      const { data: atuais } = await supabase.from('products').select('id,position').order('position');
      if (atuais) {
        for (let i = 0; i < atuais.length; i++) {
          await supabase.from('products').update({ position: i + 1 }).eq('id', atuais[i].id);
        }
      }
      await supabase.from('products').insert(novo);
    } 
    else if (b.acao === 'remove') {
      await supabase.from('products').delete().eq('id', b.id);
    } 
    else if (b.acao === 'move') {
      const { data: itens } = await supabase.from('products').select('*').order('position');
      if (itens) {
        const i = itens.findIndex((x) => x.id === b.id);
        const j = i + (b.dir === 'up' ? -1 : 1);
        if (i >= 0 && j >= 0 && j < itens.length) {
          const posI = itens[i].position, posJ = itens[j].position;
          await supabase.from('products').update({ position: posJ }).eq('id', itens[i].id);
          await supabase.from('products').update({ position: posI }).eq('id', itens[j].id);
        }
      }
    } 
    else if (b.acao === 'refresh') {
      const { data: itens } = await supabase.from('products').select('id,ref');
      for (const it of (itens || [])) {
        if (!it.ref) continue;
        try {
          const cache = { ...(await dados(it.ref)), ts: Date.now() };
          await supabase.from('products').update({ cache, erro: null }).eq('id', it.id);
        } catch {}
      }
    }

    // LIST (sempre retorna no final)
    const { data: final, error } = await supabase.from('products').select('*').order('position', { ascending: true });
    if (error) throw error;

    res.status(200).json(final.map((i) => ({ 
      id: i.id, link: i.link, tipo: i.tipo, man: i.man, 
      nome: (i.man && i.man.nome) || (i.cache && i.cache.nome) || '', 
      preco: (i.man && i.man.preco) || (i.cache && i.cache.preco) || '', 
      erro: i.erro 
    })));

  } catch (e) { 
    console.error(e);
    res.status(500).json({ erro: 'Falha: ' + String(e.message).slice(0, 200) }); 
  }
};