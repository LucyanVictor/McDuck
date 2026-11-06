# Finanças — sistema pessoal (HTML + Supabase)

Controle financeiro completo, no estilo do Securo, rodando 100% no navegador.
O site fica no GitHub Pages; login e banco de dados ficam no Supabase.

## Funções
- **Início**: saldo disponível por conta, entradas/saídas do mês, patrimônio líquido, taxa de economia, alertas de vencidos, gastos por categoria (com variação vs mês anterior), evolução do saldo vs mediana dos meses anteriores, orçamento, metas e próximas pendências
- **Transações**: lista e calendário, busca, filtros (tipo, conta, categoria, pessoa, situação, valor), colunas configuráveis, ordenação, seleção em lote (categorizar, atribuir pessoa, marcar pago/pendente, excluir), transferências entre contas, parcelamento e repetição mensal, duplicar, exportar CSV
- **Contas**: corrente, poupança, carteira, investimento, cartão de crédito (limite, fechamento, vencimento, “pagar fatura”), arquivar
- **Importar**: extratos OFX dos bancos e CSV (com mapeamento de colunas, criação automática de categorias/contas e detecção de duplicadas)
- **Relatórios**: Patrimônio líquido, Receitas vs Despesas, Fluxo de caixa e Mapa do dinheiro (Sankey), com períodos Este mês / Mês passado / 6M / YTD / 1A / 2A / personalizado
- **Patrimônio**: imóveis, veículos e dívidas com histórico de valores
- **Orçamentos** por categoria (com sugestão pela média de 3 meses)
- **Metas** (ativa, concluída, pausada, arquivada), manuais ou ligadas ao saldo de uma conta
- **Recorrentes**: geram lançamentos pendentes automaticamente na data
- **Categorias** (ícone e cor), **Pessoas**, **Grupos** de contas (seletor “VENDO”) e **Regras** de categorização automática
- Busca global (**Ctrl+K**), botão de ocultar valores (👁), backup em JSON, funciona no celular

## Instalação

### 1. Supabase
1. Crie um projeto em https://supabase.com
2. **SQL Editor › New query** › cole todo o `schema.sql` › **Run**
3. **Project Settings › API**: copie a *Project URL* e a chave *anon / publishable*
4. Cole no arquivo `js/config.js`
   ⚠️ Nunca use a chave `service_role` / `secret`.

### 2. GitHub Pages
1. Crie um repositório e envie **todos** os arquivos mantendo as pastas (`index.html`, `style.css`, `js/…`)
   — no site do GitHub: *Add file › Upload files* e arraste a pasta inteira
2. **Settings › Pages › Deploy from a branch › main / (root)** › Save
3. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

### 3. Ajustes no Supabase
- **Authentication › URL Configuration › Site URL**: o endereço do GitHub Pages
- Depois de criar sua conta: **Authentication › Sign In / Providers** › desative *Allow new users to sign up*

## Trazer os dados do Securo
No Securo, em **Transações › Exportar CSV** (mês a mês ou o período que ele permitir).
Aqui, em **Importar**, envie o CSV e mapeie as colunas *Data, Descrição, Valor* e, se existirem, *Categoria* e *Conta* — elas são criadas automaticamente.
Cadastre antes as contas com o mesmo nome que aparecem no Securo, com o saldo inicial correto.

## Observações
- Plano gratuito do GitHub Pages exige repositório público; os dados continuam protegidos no Supabase (login + RLS). Para repositório privado use Vercel ou Cloudflare Pages.
- Projetos gratuitos do Supabase podem ser pausados após dias sem uso; é só reativar no painel.
