const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const { resolve, dados } = require('../lib/ml');
const TTL = 30 * 60 * 1000;

module.exports = async (req, res) => {
  try {
    const { data: itens } = await supabase.from('produtos').select('*');
    if (!itens) return res.status(200).json([]);

    let paraSalvar = [];

    await Promise.all(itens.map(async (it) => {
      if (it.cache && Date.now() - it.cache.ts < TTL) return;
      try {
        if (!it.ref) it.ref = await resolve(it.link);
        if (it.ref) {
          it.cache = { ...(await dados(it.ref)), ts: Date.now() };
          it.erro = null;
          paraSalvar.push(it);
        } else {
          it.erro = 'nao_identificado';
        }
      } catch (e) {
        it.erro = String(e.message).slice(0, 120);
      }
    }));

    // salva no supabase os que mudaram
    for (const p of paraSalvar) {
      await supabase.from('produtos').update({ ref: p.ref, cache: p.cache, erro: p.erro }).eq('id', p.id);
    }

    const out = itens.map((i) => {
      const c = i.cache || {}, m = i.man || {};
      return { 
        id: i.id, 
        link: i.link, 
        tipo: i.tipo || 'afiliado', 
        nome: m.nome || c.nome || 'Ver oferta', 
        preco: m.preco || c.preco || '', 
        img: m.img || c.img || '' 
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.status(500).json({ erro: 'falha ao carregar' });
  }
};