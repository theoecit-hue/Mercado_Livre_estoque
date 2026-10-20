# Vitrine de afiliado com atualização automática

Você cola o link do produto no painel e o site busca nome, foto e preço sozinho.

## Estrutura (mantenha as pastas)
- index.html (vitrine pública)
- admin.html (painel do dono, protegido por senha no servidor)
- api/produtos.js e api/admin.js (servidor)
- lib/ml.js e lib/store.js (apoio)
- package.json

## Passo a passo

1. Mercado Livre Developers: entre em developers.mercadolivre.com.br com sua conta, crie um aplicativo
   e anote o Client ID e o Client Secret. O formulário pede uma URL de redirecionamento: use a
   URL do seu site na Vercel (ou qualquer https válido) e troque depois se precisar.
2. GitHub: crie um repositório e envie todos os arquivos mantendo as pastas api/ e lib/.
3. Vercel (vercel.com, login com GitHub): New Project, importe o repositório e faça o deploy.
4. Banco de dados: no projeto da Vercel, aba Storage, adicione um banco Redis do Upstash
   (plano gratuito) e conecte ao projeto. Isso cria as variáveis do banco automaticamente.
5. Variáveis: em Settings, Environment Variables, crie:
   - ML_CLIENT_ID  = seu Client ID
   - ML_CLIENT_SECRET = seu Client Secret
   - ADMIN_PASSWORD = a senha do painel
6. Faça um Redeploy. Abra https://SEUSITE.vercel.app/admin.html, entre com a senha e adicione um link.

## Observações
- Os dados vêm da API do Mercado Livre e são renovados a cada 30 minutos nas visitas.
  Se a busca falhar para algum produto, remova e adicione de novo preenchendo nome, preço e foto à mão.
- A senha agora é conferida no servidor, então use uma senha mais longa que uma palavra só.
- Nunca coloque o Client Secret nem a senha dentro dos arquivos: só nas variáveis da Vercel.
