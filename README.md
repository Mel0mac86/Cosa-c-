# 🛡️ AllerScan

App tipo **Yuka** per chi è **allergico o intollerante**. Imposti gli ingredienti
da evitare, scansioni il codice a barre di un prodotto e l'app ti dice subito se
contiene uno dei tuoi allergeni — e ti propone un'**alternativa**.

## Come funziona

1. **Imposta i tuoi allergeni** — Nella scheda *"I miei allergeni"* scrivi gli
   ingredienti a cui sei intollerante/allergico (es. *latte*, *glutine*, *arachidi*).
   Vengono salvati nel browser (`localStorage`), quindi restano anche se chiudi l'app.
2. **Scansiona** — Nella scheda *"Scansiona"* premi **Avvia fotocamera** e inquadra
   il codice a barre. In alternativa inserisci il codice a mano.
3. **Risultato** — L'app interroga [Open Food Facts](https://world.openfoodfacts.org)
   e mostra:
   - 🚫 **ATTENZIONE** se trova un tuo allergene (evidenziato negli ingredienti)
   - ⚠️ **Tracce** se l'allergene è solo tra le possibili contaminazioni
   - ✅ **Sicuro** se non rileva nulla
4. **Alternativa** — Se il prodotto è pericoloso, cerca automaticamente un prodotto
   della stessa categoria **senza** quel allergene, con il miglior Nutri-Score.

5. **Cronologia** — Ogni prodotto controllato resta nella scheda *"Cronologia"*
   con esito, marca e ora. Tocca una voce per rivederla. Puoi **esportarla** in JSON
   o svuotarla.
6. **Cerca per nome** — Se non hai il codice a barre, cerca il prodotto per nome
   (es. *nutella*) e tocca il risultato per analizzarlo.

## 📱 Installazione su iPhone (come app)

La fotocamera e l'installazione su iOS richiedono un sito **HTTPS**: usa GitHub Pages.

1. Su GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Il workflow incluso (`.github/workflows/pages.yml`) pubblica l'app a ogni push.
   L'URL sarà tipo `https://mel0mac86.github.io/cosa-c-/`.
3. Sull'iPhone apri quell'URL con **Safari**.
4. Tocca il pulsante **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home**.
5. Apri AllerScan dall'icona: parte a schermo intero come una vera app.
   Al primo avvio della scansione Safari chiederà l'accesso alla **fotocamera**: consenti.

> Nota iOS: la fotocamera funziona solo da Safari su HTTPS (non in app di terze parti
> né su `http://`). Se non vedi la fotocamera, usa l'inserimento del codice o la ricerca per nome.

## Tecnologie

- HTML/CSS/JavaScript puro, nessun backend.
- [@zxing/library](https://github.com/zxing-js/library) per leggere i codici a barre.
- [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/) (gratuita, senza chiave) per i dati prodotto.

## Avvio in locale

La fotocamera richiede **HTTPS o `localhost`**. Avvia un piccolo server statico:

```bash
# Python 3
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Oppure con Node:

```bash
npx serve .
```

Su desktop senza fotocamera puoi comunque provare con l'**inserimento manuale**
del codice a barre (es. `3017620422003` = Nutella).

## ⚠️ Avvertenza importante

AllerScan è un **aiuto**, non una garanzia. I dati di Open Food Facts sono
inseriti dalla community e potrebbero essere incompleti o non aggiornati.
**Verifica sempre l'etichetta ufficiale** del prodotto prima del consumo,
soprattutto in caso di allergie gravi.
