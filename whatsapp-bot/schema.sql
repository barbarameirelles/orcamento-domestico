-- Rode isto uma vez no SQL Editor do Supabase (mesmo projeto do app).
-- Guarda os ids das mensagens ja processadas para evitar cadastrar o mesmo
-- gasto duas vezes quando o bot reprocessa o backlog offline.

create table if not exists public.wa_processed (
  message_id text primary key,
  created_at timestamptz not null default now()
);

-- Se o app usa RLS na tabela expenses e voce for rodar o bot com a ANON key,
-- lembre de garantir policies de insert compativeis. Se rodar com a
-- service_role key (recomendado para backend), o RLS e ignorado.
