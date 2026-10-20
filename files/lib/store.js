const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// converte linha do Supabase pro formato que seu site já usa
function rowParaItem(row) {
  return {
    id: row.id,
    link: row.link,
    tipo: row.tipo,
    manual_nome: row.manual_nome,
    manual_preco: row.manual_preco,
    manual_imagem: row.manual_imagem,
    ml_id: row.ml_id,
    cache_nome: row.cache_nome,
    cache_preco: row.cache_preco,
    cache_imagem: row.cache_imagem,
    cache_at: row.cache_at,
    erro: row.erro,
    posicao: row.posicao
  };
}

exports.load = async () => {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('posicao', { ascending: true });
  
  if (error) throw new Error('Erro Supabase load: ' + error.message);
  return (data || []).map(rowParaItem);
};

exports.save = async (items) => {
  // apaga tudo e grava de novo na ordem que veio
  // é o jeito mais simples de manter seu código atual funcionando
  const { error: delError } = await supabase
    .from('produtos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // deleta todos

  if (delError) throw new Error('Erro Supabase delete: ' + delError.message);

  if (!items || items.length === 0) return;

  const paraInserir = items.map((item, index) => ({
    id: item.id || undefined, // se não tem id, o Supabase gera sozinho
    link: item.link,
    tipo: item.tipo || 'afiliado',
    manual_nome: item.manual_nome || null,
    manual_preco: item.manual_preco || null,
    manual_imagem: item.manual_imagem || null,
    ml_id: item.ml_id || null,
    cache_nome: item.cache_nome || null,
    cache_preco: item.cache_preco || null,
    cache_imagem: item.cache_imagem || null,
    cache_at: item.cache_at || null,
    erro: item.erro || null,
    posicao: typeof item.posicao === 'number' ? item.posicao : index
  }));

  const { error: insError } = await supabase.from('produtos').insert(paraInserir);
  if (insError) throw new Error('Erro Supabase save: ' + insError.message);
};