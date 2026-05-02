# DakkapelLAB modal fix

Fix voor het scherm "Zet dakkapelofferte door naar EcoPro?" dat niet sluit.

Oorzaak: CSS `.confirm-modal` overschreef het HTML `hidden` attribuut.

Aangepast:
- `public/DakkapelLAB/styles.css` krijgt `.confirm-modal[hidden]{display:none!important}`
- `public/DakkapelLAB/app.js` krijgt `closeConfirm()` + sluiten met Annuleren, Escape en klik op achtergrond.

Installeren vanuit projectroot:

```powershell
Expand-Archive .\dakkapellab_modal_fix.zip -DestinationPath . -Force
npm run build
git add .
git commit -m "Fix DakkapelLAB confirm modal"
git push
```
