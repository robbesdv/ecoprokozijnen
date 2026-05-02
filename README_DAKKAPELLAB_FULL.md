# DakkapelLAB full patch

Dit is een echte eerste DakkapelLAB-versie, niet alleen een simpele kopie van KozijnLAB.

## Bestanden

- `public/DakkapelLAB/index.html`
- `public/DakkapelLAB/styles.css`
- `public/DakkapelLAB/app.js`
- `app/beheer/dakkapellab/page.js`
- `lib/BeheerNav.js`

## Functionaliteit

- Klant- en projectgegevens
- Dakkapelmodel: plat, schuin, nokverhoging, prefab
- Breedte, hoogte, diepte, dakhelling, boeideel en overstek
- Materiaal: kunststof, polyester, hout, aluminium
- Kleuren buiten/binnen met RAL/folie opties
- Voorzijde met 1 t/m 8 vakken
- Per vak: type, breedte, draairichting, glaspakket, glasafwerking, ventilatierooster, screen/rolluik
- Dakbedekking, dakisolatie en zijwangen
- Binnenafwerking, elektra, spots, stucwerk, schilderwerk
- Montageopties: kraan, transport, sloop oude dakkapel, steigerwerk, vergunning, hemelwaterafvoer
- Extra posten
- Calculatie met line items, korting, marge en handmatige correctie
- Voorzijde-, zij-, bovenaanzicht en simpele 3D-impressie
- JSON export
- Print/PDF via browser print
- Doorzetten naar EcoPro order/offerte via `/beheer/dakkapellab`

## Installatie

Pak de zip uit in de root van je project:

```powershell
Expand-Archive .\dakkapellab_full_patch.zip -DestinationPath . -Force
```

Test lokaal:

```powershell
npm run build
npm run dev
```

Commit en push:

```powershell
git status
git add .
git commit -m "Make DakkapelLAB production ready"
git push
```

Na deploy:

```txt
https://ecoprokozijnen.vercel.app/beheer/dakkapellab
https://ecoprokozijnen.vercel.app/DakkapelLAB/index.html
```

## Let op

Dit gebruikt richtprijzen. De volgende commerciële stap is je echte dakkapel-inkoop-/fabricageprijzen invoeren, net zoals bij KozijnLAB met de Excel-matrix.
