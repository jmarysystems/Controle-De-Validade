# Controle de Validade

Registro dos produtos próximos do vencimento, no mesmo estilo do
Armazenados e Não Expostos.

## Telas

- **Dashboard** — itens no controle, vencendo em 30 dias, vencidos, aguardando retorno
- **Lançar produto** — escolhe o estabelecimento, digita o EAN/SKU, quantidade e validade
- **Produtos no controle** — lista com situação, filtros e edição

## Banco

Tabela `val_itens` (loja, produto, EAN, SKU, descrição, categoria, UMB,
quantidade, vencimento, remetente, retorno, datas).

Permissões pelo módulo **validade** do Controle de Acesso.
