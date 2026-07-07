# Ranking Unoeste — Supabase + GitHub Pages

Arquivos principais:

- `index.html`: tela do ranking para abrir na TV.
- `admin.html`: painel para atualizar as matrículas.
- `dados.json`: backup local dos dados iniciais.

## Supabase

A tabela usada é `ranking`, com as colunas:

- `id`
- `nome`
- `valor`
- `tipo` (`presencial` ou `ead`)
- `ordem`
- `ativo`
- `created_at`

## Como usar

1. Publique estes arquivos no GitHub Pages.
2. Abra `index.html` na TV.
3. Abra `admin.html` no computador/celular.
4. Use `+` ou `-` para atualizar os números.
5. Clique em salvar.

A tela da TV busca os dados no Supabase e atualiza automaticamente.

## Observação de segurança

As regras atuais liberam escrita pública temporariamente para facilitar o teste.
Para uso definitivo, o ideal é configurar login no painel administrativo.
