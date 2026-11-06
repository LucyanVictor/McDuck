-- =====================================================================
-- Finanças — estrutura do banco (Supabase)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- Pode rodar de novo sem perder dados (usa "if not exists").
--
-- Se você rodou a versão anterior (tabela "lancamentos"), pode apagá-la:
--   drop view if exists public.saldo_contas;
--   drop table if exists public.lancamentos;
-- (as tabelas contas/categorias antigas são atualizadas abaixo)
-- =====================================================================

-- CONTAS ---------------------------------------------------------------
create table if not exists public.contas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome          text not null,
  saldo_inicial numeric(14,2) not null default 0,
  criado_em     timestamptz not null default now()
);
alter table public.contas add column if not exists tipo text not null default 'corrente';
alter table public.contas add column if not exists cor text not null default '#6366f1';
alter table public.contas add column if not exists icone text not null default '🏦';
alter table public.contas add column if not exists limite numeric(14,2);
alter table public.contas add column if not exists dia_fechamento int;
alter table public.contas add column if not exists dia_vencimento int;
alter table public.contas add column if not exists arquivada boolean not null default false;

-- CATEGORIAS -----------------------------------------------------------
create table if not exists public.categorias (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome      text not null,
  tipo      text not null check (tipo in ('receita','despesa')),
  cor       text not null default '#64748b',
  criado_em timestamptz not null default now()
);
alter table public.categorias add column if not exists icone text not null default '🏷️';

-- PESSOAS --------------------------------------------------------------
create table if not exists public.pessoas (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome      text not null,
  cor       text not null default '#8b5cf6',
  criado_em timestamptz not null default now()
);

-- GRUPOS DE CONTAS (seletor "Vendo") -----------------------------------
create table if not exists public.grupos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome      text not null,
  conta_ids uuid[] not null default '{}',
  criado_em timestamptz not null default now()
);

-- RECORRENTES ----------------------------------------------------------
create table if not exists public.recorrentes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao    text not null,
  tipo         text not null check (tipo in ('receita','despesa')),
  valor        numeric(14,2) not null check (valor > 0),
  conta_id     uuid references public.contas(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  pessoa_id    uuid references public.pessoas(id) on delete set null,
  frequencia   text not null default 'mensal' check (frequencia in ('semanal','quinzenal','mensal','anual')),
  proxima_data date not null,
  dia          int,
  ativo        boolean not null default true,
  auto         boolean not null default true,
  criado_em    timestamptz not null default now()
);

-- TRANSAÇÕES -----------------------------------------------------------
create table if not exists public.transacoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo             text not null check (tipo in ('receita','despesa','transferencia')),
  descricao        text not null,
  valor            numeric(14,2) not null check (valor > 0),
  data             date not null default current_date,
  conta_id         uuid references public.contas(id) on delete cascade,
  conta_destino_id uuid references public.contas(id) on delete cascade,
  categoria_id     uuid references public.categorias(id) on delete set null,
  pessoa_id        uuid references public.pessoas(id) on delete set null,
  recorrente_id    uuid references public.recorrentes(id) on delete set null,
  pago             boolean not null default true,
  observacao       text,
  import_id        text,
  criado_em        timestamptz not null default now()
);
create index if not exists transacoes_user_data_idx on public.transacoes (user_id, data);

-- ORÇAMENTOS (limite mensal por categoria) -----------------------------
create table if not exists public.orcamentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  valor        numeric(14,2) not null check (valor > 0),
  criado_em    timestamptz not null default now(),
  unique (user_id, categoria_id)
);

-- METAS ----------------------------------------------------------------
create table if not exists public.metas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome        text not null,
  icone       text not null default '🎯',
  cor         text not null default '#f59e0b',
  valor_alvo  numeric(14,2) not null check (valor_alvo > 0),
  valor_atual numeric(14,2) not null default 0,
  prazo       date,
  conta_id    uuid references public.contas(id) on delete set null,
  status      text not null default 'ativa' check (status in ('ativa','concluida','pausada','arquivada')),
  criado_em   timestamptz not null default now()
);

-- PATRIMÔNIO (bens e dívidas fora das contas) ---------------------------
create table if not exists public.patrimonio (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome      text not null,
  tipo      text not null default 'outro',
  natureza  text not null default 'ativo' check (natureza in ('ativo','passivo')),
  icone     text not null default '🏠',
  criado_em timestamptz not null default now()
);

create table if not exists public.patrimonio_valores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id    uuid not null references public.patrimonio(id) on delete cascade,
  data       date not null default current_date,
  valor      numeric(14,2) not null default 0,
  observacao text,
  criado_em  timestamptz not null default now()
);

-- REGRAS (categorização automática) ------------------------------------
create table if not exists public.regras (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  termo        text not null,
  categoria_id uuid references public.categorias(id) on delete cascade,
  pessoa_id    uuid references public.pessoas(id) on delete set null,
  criado_em    timestamptz not null default now()
);

-- =====================================================================
-- SEGURANÇA: cada usuário só enxerga e altera os próprios dados (RLS)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['contas','categorias','pessoas','grupos','recorrentes','transacoes',
                           'orcamentos','metas','patrimonio','patrimonio_valores','regras'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format('create policy "dono" on public.%I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
