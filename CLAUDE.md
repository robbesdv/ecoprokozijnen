# KozijnSuite – CLAUDE.md

## Wat is dit project?
Een Next.js 15 / React 19 SaaS-product voor kozijnbedrijven. Eerste klant: **EcoPro Kozijnen** (live in productie). Het product heet intern **KozijnSuite** en groeit richting een multi-tenant SaaS platform ("Suite"-lijn: DakkapelSuite, TuinSuite, etc.).

**Eigenaar/developer:** Robbe (robbesdv@gmail.com)

---

## Tech stack
| Technologie | Versie | Gebruik |
|---|---|---|
| Next.js | 15.1.0 | Framework, App Router |
| React | 19.0.0 | UI |
| Supabase | 2.48.0 | Database + Auth |
| Mollie | 4.5.0 | iDEAL betalingen |
| Resend | 6.12.0 | E-mail notificaties |
| pdf-lib | 1.17.1 | PDF facturen / offertes |
| QRCode | 4.2.0 | QR op documenten |
| Tailwind CSS | 4.0.0 | Styling |

---

## Directorystructuur

```
app/
  page.js                        ← Publieke landingspagina
  layout.js                      ← Root layout
  beheer/                        ← Admin dashboard (beschermd)
    page.js                      ← Hoofddashboard (orders, offertes, omzet)
    login/page.js                ← Inlogpagina beheer
    montage/page.js              ← Montage planning
    verkoop/page.js              ← Verkopersoverzicht
    leads/page.js                ← Leads beheer
    agenda/page.js               ← Agenda
    rapportage/page.js           ← Rapportages
    dakkapellab/page.js          ← Dakkapel calculator (lab)
  verkoper/page.js               ← Verkoper dashboard (beschermd)
  monteur/page.js                ← Monteur app (beschermd)
  portaal/[token]/page.js        ← Klantportaal (token-based, openbaar)
  montage/[token]/page.js        ← Montage-checklist (token-based)
  factuur/[token]/[type]/page.js ← Factuurpagina (PDF-generatie)
  api/
    login/route.js               ← Inloggen (cookie-based)
    me/route.js                  ← Huidige gebruiker
    notify/route.js              ← E-mail notificaties (centraal)
    portal/action/route.js       ← Klantportaal acties
    admin/
      order-action/route.js      ← Admin orderacties
      sales-action/route.js      ← Admin offerte genereren + PDF
    seller/action/route.js       ← Verkoper offerte genereren + PDF
    montage/action/route.js      ← Montage acties
    mollie/
      create-payment/route.js    ← Betalingslink aanmaken
      webhook/route.js           ← Mollie betaalstatus verwerken
    warmtefonds/route.js         ← Warmtefonds PDF invullen
    cron/route.js                ← Geplande taken
    leads/leadlab/route.js       ← Leadlab integratie
    leadlab/webhook/route.js     ← Leadlab webhook
    security/status/route.js     ← Security statuscheck

lib/
  phases.js          ← BRON VAN WAARHEID: fases, berekeningen, formatters
  supabase.js        ← Supabase client (browser)
  supabase-server.js ← Supabase client (server/API)
  auth-cookie.js     ← Cookie auth helpers
  internal-auth.js   ← Interne auth (webhook secrets)
  KozijnSVG.js       ← SVG-rendering kozijn/raam configuraties
  nijBegun.js        ← NijBegün quote-logica
  sales.js           ← Sales hulpfuncties
  notify.js          ← Notify hulpfuncties
  notifyCustomer.js  ← notifyCustomer() export (weinig gebruikt, zie issues)
  users.js           ← Gebruikersbeheer
  phases.js          ← Fase definities + berekeningen
  BeheerNav.js       ← Navigatiecomponent beheer
  logo-base64.js     ← Logo als base64 voor PDF
  lead-normalize.js  ← Lead normalisatie
  lead-appointments.js ← Afspraak helpers
  leadLabWebhook.js  ← LeadLab webhook verwerking
```

---

## Order fases (lib/phases.js)
| ID | Key | Betekenis |
|---|---|---|
| 0 | offerte | Offerte verstuurd |
| 1 | akkoord | Akkoord ontvangen |
| 2 | aanbetaling | Aanbetaling ontvangen (20%) |
| 3 | productie | In productie |
| 4 | geleverd | Geleverd bij EcoPro |
| 5 | montage_gepland | Montage ingepland |
| 6 | montage_klaar | Montage afgerond |
| 7 | compleet | Oplevering compleet |

## Betalingssplit
- `split_80_20`: 20% aanbetaling + 80% na montage
- `split_70_10`: 20% aanbetaling + 70% na montage + 10% slotbetaling (na oplevering)

---

## Bekende code-issues (audit mei 2026)

### OPGELOST (mei 2026)
- ~~Dubbele betaalberekeningen~~ → `create-payment/route.js` importeert nu van `lib/phases.js`
- ~~Hardcoded `onboarding@resend.dev`~~ → `MOLLIE_FROM_EMAIL` env var met correcte fallback
- ~~Hardcoded `robbesdv@gmail.com`~~ → `ADMIN_EMAIL` env var met fallback
- ~~Inconsistente glass pack ranking in seller route~~ → aligned met admin (packRank logica)
- ~~Console.logs in notify route en warmtefonds route~~ → verwijderd

### OPEN – Bij eerstvolgende refactor
1. **Dubbele buildDescription functies** – `admin/sales-action/route.js` en `seller/action/route.js` hebben identieke logica (nu zelfde kwaliteit). Uittrekken naar `lib/buildItemDescription.js` (laag risico maar housekeeping).
2. **Dubbele helpers** – `glassFinishLabel()` en `PANE_LABEL` bestaan in beide sales-action routes. Naar shared lib.
3. **Dubbele type-checks** – `isMatteGlassFinish()` en `isDoorPaneType()` in zowel `lib/nijBegun.js` als `lib/KozijnSVG.js`.
4. **`notifyCustomer()`** – Geëxporteerd in `lib/notifyCustomer.js` maar elke page herdefinieert hem lokaal. Consistentie nodig.
5. **`padk` veld** – Check op `row.padk` in beide sales-routes. Verifieer of dit veld in de database bestaat. Als niet: verwijderen.
6. **Twee timing-safe functies** – `constantTimeEqual()` (auth-cookie) en `timingSafeEqualString()` (internal-auth). Niet kritiek maar inconsistent.

---

## Geplande uitbreidingen (backlog)

### KozijnSuite verbeteringen
- [x] Verkopersaccounts en -details kunnen bekijken in beheer → "Verkopers" tab in sidebar (app/beheer/page.js)
- [x] Dashboard: klik op "gerealiseerde omzet" → OmzetBreakdownModal met breakdown per verkoper/order
- [x] Zijlicht in 2 vakken splitsen → "Splitsen: boven glas / beneden paneel" optie in KozijnLAB (public/KozijnLAB/app.js)

### Multi-tenant SaaS (SuitePlatform)
- Overkoepelend beheersdashboard voor alle Suite-klanten (10+ bedrijven)
- Makkelijk prijzen per klant aanpassen (zonder klant zelf)
- Snel een nieuwe Suite uitrollen: vul bedrijfsnaam + logo in → volledige omgeving
- Templates: KozijnSuite, DakkapelSuite, TuinSuite, TimmerSuite, etc.
- Rapportage per klant vanuit centraal dashboard

---

## Belangrijke vuistregels bij werken in deze codebase

1. **Productie is live** – EcoPro Kozijnen draait live. Nooit breekwijzigingen doorvoeren zonder test.
2. **lib/phases.js is de bron van waarheid** voor fases, berekeningen en formatters. Importeer altijd van daar, herdefinieer niet.
3. **API routes zijn server-side** – gebruik `lib/supabase-server.js`, niet `lib/supabase.js` (client).
4. **Auth** verloopt via cookies (`lib/auth-cookie.js`) en middleware (`middleware.js`), niet via Supabase Auth.
5. **Betalingen** – Mollie webhook is kritiek pad. Altijd timing-safe vergelijking voor webhook secrets.
6. **E-mails** – Centraal via `app/api/notify/route.js`. FROM-adres: `noreply@send.ecoprokozijnen.nl`.
7. **PDF-generatie** – Via pdf-lib in de sales-action en seller-action routes.
8. **Klantportaal** is token-based en openbaar toegankelijk (geen login nodig).
