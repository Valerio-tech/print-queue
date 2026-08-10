# Print Queue

App personale per salvare e organizzare modelli 3D da stampare. Pensata per **Android** come PWA (Progressive Web App).

## Funzionalità

- Incolla un link da **Printables**, **Thingiverse**, **MakerWorld**, **Thangs**, **Creality Cloud**, **Cults3D**, **MyMiniFactory**, **Yeggi** o **Sketchfab**
- Recupero automatico di titolo e immagine di anteprima
- Tag personalizzati per organizzare i modelli
- Segna come **stampato** o **da stampare**
- Filtri per stato e tag, ricerca testuale
- Dati salvati sul dispositivo (localStorage)
- Backup esportabile/importabile in JSON
- Funziona offline dopo il primo caricamento

## Installazione su Android

### Opzione A — GitHub Pages (consigliata)

1. Vai su **Settings → Pages** del repository
2. Imposta **Source** su branch `main`, cartella `/ (root)`
3. Attendi il deploy (1–2 minuti)
4. Apri l’URL generato (es. `https://tuonome.github.io/print-queue/`) in Chrome
5. Menu ⋮ → **Aggiungi a schermata Home** / **Installa app**

### Opzione B — File locale

1. Scarica il progetto (Download workspace)
2. Servi i file con un server HTTP locale (i moduli ES non funzionano aprendo `index.html` direttamente)
3. Apri l’URL dal telefono sulla stessa rete, oppure usa un hosting statico

## Uso

1. Tocca **+** per aggiungere un link
2. Incolla l’URL del modello e opzionalmente i tag (es. `vase, regalo`)
3. Il modello compare nella lista **Da stampare**
4. Dopo la stampa, tocca **○ Da stampare** per segnarlo come stampato
5. Usa i filtri e i tag per trovare ciò che cerchi
6. Tocca una card per aprire il modello nel browser

## Backup

- **↓** Esporta un file JSON con tutti i modelli
- **↑** Importa un backup (sovrascrive la lista attuale)

## Note tecniche

- I metadati (titolo/immagine) vengono recuperati via proxy CORS; su alcuni link potrebbe servire un secondo tentativo o il titolo generico
- I dati restano solo sul telefono: non c’è account né cloud

---

Built with [BrainDaemon](https://braindaemon.com)
