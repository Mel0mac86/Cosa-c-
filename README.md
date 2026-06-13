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
