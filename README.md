# Ranking Unoeste - GitHub Pages

Arquivos principais:

- `index.html`: tela do ranking para abrir na TV.
- `dados.json`: arquivo com os nomes e números do ranking.
- `admin.html`: editor simples para gerar um novo `dados.json`.

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes 3 arquivos para a raiz do repositório.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Clique em **Save**.

Depois, acesse o link que o GitHub Pages gerar.

## Como atualizar o ranking

Opção mais simples:

1. Abra o arquivo `dados.json` no GitHub.
2. Clique no lápis para editar.
3. Altere os valores.
4. Clique em **Commit changes**.
5. O ranking busca o `dados.json` novamente a cada 30 segundos.

Opção usando o editor:

1. Abra `admin.html` no navegador.
2. Edite os dados.
3. Clique em **Baixar dados.json**.
4. Substitua o arquivo `dados.json` no repositório.

Observação: o GitHub Pages é uma hospedagem estática, então o `admin.html` não grava direto no GitHub sem uma integração mais avançada com token/API.
