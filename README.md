# Controle de Estoque (e-Shop)

Sistema de estoque por código de barras, pensado para uso no celular.

## Estrutura

```
estoque-app/
├── index.html          # telas (login, bipar, estoque, histórico, logins)
├── css/styles.css      # estilos (mobile-first)
├── js/
│   ├── config.js       # Supabase, fuso horário, master, nome da tabela do histórico
│   ├── products.js     # catálogo: código de barras -> SKU / nome / cor
│   ├── utils.js        # helpers (avisos, datas no fuso certo, CSV)
│   ├── db.js           # cliente Supabase
│   ├── history.js      # histórico de bipagens por dia
│   ├── team.js         # desempenho por colaborador, reinício de contagem, período
│   ├── stock.js        # estoque, bipagem, ajustes, exportação
│   ├── scanner.js      # câmera (ZXing) e leitor USB/Bluetooth
│   ├── users.js        # gestão de logins (master)
│   ├── auth.js         # login, sessão, permissões
│   └── app.js          # navegação e ligação entre os módulos
├── sql/historico.sql   # cria a tabela do histórico no Supabase
├── sql/funcao.sql      # grava a função (admin/entrada/saída) no histórico (rodar depois do historico.sql)
└── sql/equipe.sql      # reinício de contagem + resumos por pessoa/dia (rodar depois do historico.sql)
```

## Ativar o histórico (uma vez só)

1. Abra o projeto no Supabase → **SQL Editor** → **New query**.
2. Cole o conteúdo de `sql/historico.sql` e clique em **Run**.
3. Pronto: a partir daí cada bipagem é gravada e aparece na aba **Histórico**.

> Bipagens feitas *antes* de criar a tabela não têm registro; o histórico começa a valer a partir da primeira bipagem depois do SQL.

## Ativar a aba Equipe (uma vez só, depois do histórico)

Rode `sql/equipe.sql` no SQL Editor do Supabase. Ele cria a tabela de reinícios e as funções de resumo.

- **Hoje / total:** unidades bipadas por colaborador no dia e desde o último reinício.
- **Reiniciar contagem** (só o master): o total de todos volta a zero. O histórico e o estoque não são apagados.
- **Período:** intervalo personalizado de até 30 dias, com total por pessoa e detalhe por dia (exportável em CSV). Não é afetado pelo reinício.

## Como funciona o histórico

- Cada bipagem (entrada/saída), ajuste manual e "zerar estoque" vira uma linha com data, hora e utilizador.
- A aba **Histórico** (administradores) agrupa por dia e **só mostra dias em que houve bipagem** — dias sem movimento são pulados automaticamente.
- Cada dia mostra o total bipado, entradas, saídas, o resumo por produto e, se abrir, a lista por horário.
- O "dia" usa o fuso `America/Sao_Paulo` (muda em `js/config.js`).
- Na tela de bipar: quem faz **entrada** vê só quantos produtos bipou em entrada hoje; quem faz **saída**, só os de saída; o **admin** vê os dois (de todos).
- O CSV do histórico sai em ordem cronológica (mais antigo no topo, mais novo no final) e tem a coluna **Funcao** (Admin, Entrada ou Saída). Rode `sql/funcao.sql` uma vez para ativá-la e preencher as bipagens antigas.
- O CSV da equipe (período) traz, por colaborador e dia, as entradas com o total após a entrada e as saídas com o total após a saída.

## Publicar

A câmera só funciona em **HTTPS** (Netlify, Vercel, GitHub Pages, Cloudflare Pages ou o seu servidor com certificado). Suba a pasta inteira, mantendo a estrutura.
