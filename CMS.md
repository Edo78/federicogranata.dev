# Decap CMS: GitHub OAuth

## Produzione

- Sito: <https://blog.federicogranata.dev>
- Pannello: <https://blog.federicogranata.dev/admin/>
- Repository: `Edo78/federicogranata.dev`, branch `main`

I salvataggi dal pannello di produzione creano commit in `main` e attivano la
pubblicazione Netlify. Il contesto `production` imposta esplicitamente questo
branch e il CMS usa il dominio principale come collegamento di ritorno al sito.

## Ambiente di collaudo

- Repository: `Edo78/federicogranata.dev`
- Branch del nuovo sito e dei contenuti CMS: `cms-oauth`
- Progetto Netlify esistente: `federico-granata`
- URL del branch deploy: <https://cms-oauth--federico-granata.netlify.app>
- Pannello: <https://cms-oauth--federico-granata.netlify.app/admin/>

Il branch di produzione rimane `main`. Il collaudo usa un vero branch deploy,
aggiornato dai commit, non un deploy manuale con alias.

Le PR possono essere collaudate sul relativo Deploy Preview Netlify. Per il
branch `cms-media-attachments`, il contesto omonimo fissa esplicitamente il branch
su cui il CMS salva: le prove su quell'URL restano separate dalla produzione.

## Provider OAuth

Creare una **OAuth App** in GitHub, in Settings → Developer settings → OAuth Apps:

- Application name: `Decap CMS - Federico Granata`
- Homepage URL: `https://cms-oauth--federico-granata.netlify.app`
- Authorization callback URL: `https://api.netlify.com/auth/done`

Nel progetto Netlify `federico-granata`, aprire Project configuration → Security
→ OAuth → Authentication Providers e configurare GitHub con Client ID e Client
Secret dell'app. Se esiste già un provider GitHub, verificarlo prima di sostituirlo.
Il Client Secret va inserito in Netlify, mai nel repository o nella configurazione
pubblica del CMS. Non sono necessari Netlify Identity o Git Gateway.

L'accesso al CMS richiede un account GitHub con permesso di scrittura sul
repository. Il repository è pubblico e il CMS richiede lo scope `public_repo`.

## Configurazione per ambiente

`src/_data/env.js` alimenta la configurazione generata `/admin/config.yml`:

| Variabile | Valore predefinito / comportamento |
| --- | --- |
| `CMS_GITHUB_REPO` | `Edo78/federicogranata.dev` |
| `CMS_GITHUB_BRANCH` | Valore esplicito, altrimenti `BRANCH` di Netlify, altrimenti `main` |
| `CMS_GITHUB_AUTH_SCOPE` | `public_repo`; usare `repo` per un repository privato |
| `CMS_OAUTH_SITE_DOMAIN` | `federico-granata.netlify.app`, identifica il progetto che gestisce OAuth |
| `URL` / `DEPLOY_PRIME_URL` | Dominio principale in produzione; URL del branch negli altri deploy |

Il contesto `cms-oauth` in `netlify.toml` fissa esplicitamente il branch di scrittura
del CMS. La configurazione locale mantiene `local_backend: true` soltanto in
sviluppo: il proxy locale salva su disco e non verifica l'autenticazione OAuth.

## Copertine, allegati e bozze

La cover può essere caricata e vista nell'anteprima prima del salvataggio: il
pannello risolve il file temporaneo del CMS, conservando nei contenuti il normale
URL pubblico `/img/...`.

In **Allegati** aggiungere un elemento per ciascun file, ad esempio PDF ed EPUB
dello stesso racconto. L'etichetta è facoltativa; se manca viene usato il nome del
file. I file sono salvati in `src/assets/files` e pubblicati sotto `/files/`.
Il campo File usa il percorso `/src/assets/files` dalla radice del repository:
un percorso relativo verrebbe interpretato rispetto alla cartella dei post,
facendo comparire anche i file editoriali nella libreria degli allegati.
Il vecchio campo singolo `attachment` resta leggibile e viene preservato quando
si modifica un articolo precedente.

**Repository del progetto** è un link facoltativo al codice descritto dal post,
non il repository che ospita il blog. Può essere lasciato vuoto nella narrativa.

Il comando Publish del CMS salva una versione nel repository. Se il campo
**Pubblicato** è disattivato, l'articolo resta una bozza esclusa dalle pagine,
dagli archivi e dai feed del sito.

## Criteri di collaudo

### Stato editoriale

`Corrente` è lo stato normale e predefinito. `Evergreen` indica una valutazione
editoriale di validità duratura: entrambi rimangono pubblici e senza avvisi, senza
automatismi differenti per scadenze, feed o revisioni. `Da rivedere` e `Archivio`
mostrano invece una nota al lettore.

Il client Decap è fissato alla versione 3.18.0. Dopo ogni salvataggio il pannello
aggiorna la copia delle voci usata per rilevare le modifiche; durante questa breve
sincronizzazione l'editor rimane occupato. Questo permette anche di ripristinare
un valore precedentemente salvato senza dover riaprire l'articolo.

### Prove

1. Aprire `/admin/` sull'URL del branch e accedere con GitHub.
2. Creare un articolo di prova e controllare il commit sul branch `cms-oauth`.
3. Modificare l'articolo, caricare una copertina e verificare file e commit.
4. Verificare che Netlify ricostruisca automaticamente il branch deploy.
5. Verificare il contenuto pubblicato sull'URL temporaneo.
6. Eseguire logout e nuovo login; eliminare i contenuti di prova tramite il CMS.

Le prove editoriali vanno eseguite su un Deploy Preview o su `cms-oauth`; il
pannello di produzione salva invece in `main`. L'app OAuth e il provider Netlify
sono condivisi: non serve
ricrearli quando si promuove il codice in produzione.
