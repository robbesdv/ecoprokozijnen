# DakkapelLAB patch

Ik heb DakkapelLAB opgezet als kopie/afsplitsing van KozijnLAB zonder KozijnLAB zelf te overschrijven.

## Wat zit erin

- `public/DakkapelLAB/index.html`
  - DakkapelLAB shell.
  - Laadt de bestaande KozijnLAB `styles.css`, `kozijn3d.js` en `app.js`.
  - Heeft eigen branding en eigen localStorage namespace: `DL_V1_STATE`.

- `public/DakkapelLAB/dakkapellab.js`
  - Zet startertemplate klaar:
    - Dakkapel voorzijde
    - Zijwang links
    - Zijwang rechts
    - Extra's voor dakconstructie, binnenafwerking en plaatsing.
  - Nieuwe dakkapel-knop laadt opnieuw een dakkapel-template.

- `app/beheer/dakkapellab/page.js`
  - Nieuwe beheerpagina met iframe naar `/DakkapelLAB/index.html`.

- `lib/BeheerNav.js`
  - Menu-item `DakkapelLAB` onder Werkplekken toegevoegd.

## Installeren

Pak de zip uit in je projectroot:

```powershell
Expand-Archive .\dakkapellab_patch.zip -DestinationPath . -Force
```

Daarna:

```powershell
npm run build
git status
git add .
git commit -m "Add DakkapelLAB as KozijnLAB copy"
git push
```

Na Vercel deploy staat hij op:

```txt
https://ecoprokozijnen.vercel.app/beheer/dakkapellab
```

En los op:

```txt
https://ecoprokozijnen.vercel.app/DakkapelLAB/index.html
```

## Belangrijk

Dit is bewust een veilige eerste kopie:
- KozijnLAB blijft intact.
- DakkapelLAB gebruikt nog wel de KozijnLAB-engine.
- De volgende stap is dakkapel-specifieke prijzen, types, dakhelling, boeideel, overstek, rolluik/screens, binnenafwerking en montage-logica los modelleren.
