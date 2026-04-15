-- ============================================================
-- EcoPro Kozijnen — Database Schema
-- Voer dit uit in de Supabase SQL Editor van je project
-- ============================================================

-- Zorg dat UUID generatie beschikbaar is
create extension if not exists "pgcrypto";


-- ============================================================
-- TABEL: orders
-- Eén rij per klantorder, van offerte tot oplevering
-- ============================================================
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Klantgegevens
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text,
  customer_address text,

  -- Financieel
  total_amount    numeric(10,2) not null default 0,

  -- Status (0–7, zie lib/phases.js)
  phase           integer not null default 0,

  -- Betaalsplitsing (relevant vanaf fase 6)
  -- 'pending'     = klant heeft nog niet gekozen
  -- 'full_80'     = klant betaalt 80% in één keer na montage
  -- 'split_70_10' = klant betaalt 70% na montage + 10% na oplevering
  payment_split   text not null default 'pending',

  -- Keuzedatums & planning
  quote_expires_at          date,
  quote_accepted_at         timestamptz,
  deposit_paid_at           timestamptz,
  factory_ordered_at        timestamptz,
  factory_delivery_expected date,
  installation_date         date,
  installation_done_at      timestamptz,
  completed_at              timestamptz,

  -- Betaalbevestigingen (admin vinkt aan)
  deposit_confirmed       boolean not null default false,   -- 20% ontvangen
  main_payment_confirmed  boolean not null default false,   -- 70% of 80% ontvangen
  final_payment_confirmed boolean not null default false,   -- 10% ontvangen (split_70_10)

  -- Klant heeft betaling gemeld (nog niet bevestigd door admin)
  deposit_notified        boolean not null default false,
  main_payment_notified   boolean not null default false,
  final_payment_notified  boolean not null default false,

  -- Intern
  internal_notes  text,
  crm_reference   text,

  -- Portaal toegang via unieke token in de URL
  portal_token    text unique not null default encode(gen_random_bytes(24), 'hex'),
  portal_accessed_at timestamptz
);


-- ============================================================
-- TABEL: order_items
-- Offerteregels per order
-- ============================================================
create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  description text not null,
  quantity    integer not null default 1,
  unit_price  numeric(10,2) not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- TABEL: defects
-- Bevindingen die klant meldt na montage
-- ============================================================
create table public.defects (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  description  text not null,
  status       text not null default 'open',  -- 'open' | 'resolved'
  reported_at  timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_note text
);


-- ============================================================
-- TABEL: status_history
-- Audittrail van alle fasewijzigingen
-- ============================================================
create table public.status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_phase  integer,
  to_phase    integer not null,
  note        text,
  changed_by  text not null default 'beheer',  -- 'beheer' | 'klant'
  created_at  timestamptz not null default now()
);


-- ============================================================
-- TRIGGER: updated_at automatisch bijwerken
-- ============================================================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();


-- ============================================================
-- RLS (Row Level Security)
-- Alle tabellen zijn beveiligd. Toegang via anon key is open
-- voor nu — koppel later aan Supabase Auth rollen.
-- ============================================================
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.defects enable row level security;
alter table public.status_history enable row level security;

-- Tijdelijk: volledige toegang via anon key (veilig achter middleware)
create policy "Volledige toegang orders"        on public.orders        for all using (true) with check (true);
create policy "Volledige toegang order_items"   on public.order_items   for all using (true) with check (true);
create policy "Volledige toegang defects"       on public.defects       for all using (true) with check (true);
create policy "Volledige toegang status_history" on public.status_history for all using (true) with check (true);


-- ============================================================
-- DEMO DATA — optioneel, voor testen
-- Haal dit weg in productie
-- ============================================================
/*
insert into public.orders (customer_name, customer_email, customer_phone, customer_address, total_amount, phase, quote_expires_at, payment_split)
values
  ('Familie de Vries',  'devries@example.nl',  '06-12345678', 'Gronausestraat 44, Enschede',    6240.00, 3, null, 'pending'),
  ('Dhr. Mulder',       'mulder@example.nl',   '06-23456789', 'Haaksbergerstraat 91, Enschede', 4890.00, 0, current_date + 7, 'pending'),
  ('Mevr. Bakker',      'bakker@example.nl',   '06-34567890', 'Oldenzaalsestraat 12, Enschede', 8150.00, 4, null, 'pending'),
  ('Fam. Jansen',       'jansen@example.nl',   '06-45678901', 'Marktstraat 3, Enschede',        5640.00, 1, null, 'pending'),
  ('Dhr. van Dijk',     'vandijk@example.nl',  '06-56789012', 'Pathmos 8, Enschede',            3980.00, 6, null, 'split_70_10');
*/
