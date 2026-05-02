-- EcoPro leads module
-- Run this once in the Supabase SQL Editor for an existing project.

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  lead_date        timestamptz not null default now(),

  source           text not null default 'webhook',
  source_lead_id   text not null,
  status           text not null default 'nieuw',

  customer_name    text not null default 'Onbekende lead',
  customer_email   text,
  customer_phone   text,
  customer_address text,
  postcode         text,
  city             text,

  project_type     text,
  message          text,
  potential_amount numeric(10,2) not null default 0,
  assigned_to      text,
  last_contact_at  timestamptz,

  order_id         uuid references public.orders(id) on delete set null,
  raw_payload      jsonb not null default '{}'::jsonb,

  unique (source, source_lead_id)
);

create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at();

alter table public.leads enable row level security;

drop policy if exists "Volledige toegang leads" on public.leads;
create policy "Volledige toegang leads"
  on public.leads
  for all
  using (true)
  with check (true);
