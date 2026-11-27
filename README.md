# Ranking de Matrículas — Unoeste

App que roda na TV do setor comercial com o ranking de matrículas por consultor.
Hospedado na **Vercel**, com dados no **Supabase**. Cada push na `main` gera um deploy novo, e a TV recarrega sozinha.

| Rota | O que é |
|---|---|
| `/` | Tela da TV. Alterna **Presencial → EAD → Gráfico geral**, 20 s cada, com a transição do Uninho |
| `/admin` | Painel para atualizar as matrículas (botões + / −) e trocar as fotos dos consultores |

## Como funciona

- **Vite + JavaScript puro**, sem framework e sem backend próprio. O Supabase é o backend (REST).
- A TV lê a tabela `ranking` a cada **5 s** e a tabela `fotos` a cada **60 s**. Linhas sem nome são ignoradas.
- A cada 5 min, a TV verifica se saiu um deploy novo. Se saiu, recarrega na próxima troca de tela. Não é preciso mexer na TV depois de atualizar o código.
- As fotos **não estão mais no HTML**. Ficam na tabela `fotos` (nome → imagem WebP em base64, ~8 KB cada). O site inteiro tem ~270 KB.
- Se o Supabase cair, a TV continua mostrando os últimos dados, com um aviso discreto no canto.

```
index.html          tela da TV (/)
admin/index.html    painel admin (/admin)
src/tv.js, tv.css   corrida, gráfico, rotação, auto-atualização
src/admin.js, .css  painel admin + upload de foto
src/supabase.js     acesso ao Supabase (lê as variáveis de ambiente)
public/             logo da Unoeste e mascote Uninho
supabase.sql        o que rodar no SQL Editor do Supabase
vercel.json         build + rota /admin
```

## Supabase

Tabelas usadas:

- `ranking`: `id, nome, valor, tipo ('presencial' | 'ead'), ordem, ativo`
- `fotos`: `nome (único), foto (data URI ou URL), atualizado_em`

**Rode `supabase.sql` uma vez** no SQL Editor (Supabase → SQL Editor → New query → cole → Run). O script:

1. garante a estrutura da tabela `fotos` e um índice único em `nome` (necessário para o upload do admin);
2. cria as permissões de leitura e gravação de `fotos` para a chave pública;
3. insere a Laura Miranda no Presencial **só se ela não existir** (hoje ela já existe, com 3 matrículas, e nada muda);
4. insere as fotos de todos os consultores que estavam no HTML antigo, **sem sobrescrever** as que já existem.

Ele não apaga nada e pode ser rodado de novo sem problema. A seção 4 tem correções opcionais, comentadas (ver "Pendências").

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # e cole a chave publishable
npm run dev                  # http://localhost:5173  e  http://localhost:5173/admin
```

`npm run build && npm run preview` testa a versão de produção.

## Deploy na Vercel (uma vez só)

1. Entre em <https://vercel.com> com a conta do GitHub.
2. **Add New… → Project**. Escolha o repositório `ranking-unoeste` e clique em **Import**.
3. A Vercel detecta **Vite** sozinha (build `npm run build`, saída `dist`). Não mude nada.
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = `https://dckgbwmbasqfnpnfrddm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = a chave `sb_publishable_...` (Supabase → Project Settings → API Keys)
5. Clique em **Deploy**. O endereço será `ranking-unoeste.vercel.app` (ou parecido). Dá para trocar em **Settings → Domains**.
6. Pronto: todo push na `main` publica sozinho. Se você mudar uma variável de ambiente, faça **Redeploy** (Deployments → ⋯ → Redeploy).

## Deixar a TV abrindo o link

- **Navegador da TV / Chromecast / TV Box:** abra `https://ranking-unoeste.vercel.app`, adicione aos favoritos e use o modo tela cheia (geralmente F11 ou o botão ⛶).
- **Computador ligado à TV (Windows):** crie um atalho na área de trabalho com o destino

  ```
  "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-session-crashed-bubble https://ranking-unoeste.vercel.app
  ```

  e coloque uma cópia em `shell:startup` (Win+R → `shell:startup`) para abrir sozinho ao ligar. Para sair do modo quiosque: Alt+F4.
- Pode apagar a cópia local antiga do `index.html` da TV.

## Pendências e dados estranhos encontrados (27/11)

- Na tabela `ranking`, a linha **id 18** (EAD, ordem 4) está com o **nome vazio**. Pela ordem antiga era o *Guilherme Jozima*. A TV esconde essa linha. Há um `update` comentado no `supabase.sql`.
- A **Micheline Dantas** (EAD) não está mais na tabela. Se ela ainda for consultora, há um `insert` comentado.
- **Senha do admin:** ainda não tem. Ver a proposta abaixo.

## Proteção do admin (proposta, não implementada)

Hoje qualquer pessoa com a chave pública pode gravar no Supabase. A chave aparece no código do site, o que é normal para chaves *publishable*. Quem protege os dados são as regras (RLS) do banco. Opções:

1. **Login do Supabase (recomendado):** cria-se um usuário (e-mail + senha) no Supabase Auth. O `/admin` pede login, e as regras do banco passam a permitir gravar em `ranking`/`fotos` **só** para usuários logados. A TV continua lendo sem login. É a única opção que impede alterações de verdade.
2. **Senha simples via variável de ambiente (`VITE_ADMIN_SENHA`):** rápida, mas a senha fica dentro do JavaScript publicado e quem souber procurar a encontra. Só esconde a tela; não protege os dados.
