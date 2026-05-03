-- EcoPro verkoperportaal
-- Run dit eenmalig in de Supabase SQL Editor voor bestaande projecten.

alter table public.orders
  add column if not exists sales_owner text;

create index if not exists idx_orders_sales_owner
  on public.orders (sales_owner);

create index if not exists idx_leads_assigned_to
  on public.leads (assigned_to);
