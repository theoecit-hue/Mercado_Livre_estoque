const { load, save } = require('../lib/store');
const { resolve, dados } = require('../lib/ml');
const TTL = 30 * 60 * 1000;

module.exports = async (req, res) => {
  try {
    const itens = await load();
    let mudou = false;
    await Promise.all(itens.map(async (it) => {
      if (it.cache && Date.now() - it.cache.ts < TTL) return;
      try {
        if (!it.ref) it.ref = await resolve(it.link);
        if (it.ref) { it.cache = { ...(await dados(it.ref)), ts: Date.now() }; it.erro = null; }
        else it.erro = 'nao_identificado';
      } catch (e) {
        it.erro = String(e.message).slice(0, 120);
        if (it.cache) it.cache.ts = Date.now() - TTL + 5 * 60 * 1000;
      }
      mudou = true;
    }));
    if (mudou) {
      const atual = await load();
      const m = Object.fromEntries(itens.map((i) => [i.id, i]));
      atual.forEach((i) => { if (m[i.id]) { i.ref = m[i.id].ref; i.cache = m[i.id].cache; i.erro = m[i.id].erro; } });
      await save(atual);
    }
    const out = itens.map((i) => {
      const c = i.cache || {}, m = i.man || {};
      return { id: i.id, link: i.link, tipo: i.tipo || 'afiliado', nome: m.nome || c.nome || 'Ver oferta', preco: m.preco || c.preco || '', img: m.img || c.img || '' };
    });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json(out);
  } catch (e) { res.status(500).json({ erro: 'falha ao carregar' }); }
};
