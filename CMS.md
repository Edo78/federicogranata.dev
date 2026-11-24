# Decap CMS: GitHub OAuth

## Ambiente di collaudo

- Repository: `Edo78/federicogranata.dev`
- Branch del nuovo sito e dei contenuti CMS: `cms-oauth`
- Progetto Netlify esistente: `federico-granata`
- URL del branch deploy: <https://cms-oauth--federico-granata.netlify.app>
- Pannello: <https://cms-oauth--federico-granata.netlify.app/admin/>

Il branch di produzione rimane `main`. Il collaudo usa un vero branch deploy,
aggiornato dai commit, non un deploy manuale con alias.

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
| `CMS_GITHUB_BRANCH` | Valore esplicito, altrimenti `BRANCH` di Netlify, altrimenti `cms-oauth` |
| `CMS_GITHUB_AUTH_SCOPE` | `public_repo`; usare `repo` per un repository privato |
| `CMS_OAUTH_SITE_DOMAIN` | `federico-granata.netlify.app`, identifica il progetto che gestisce OAuth |
| `DEPLOY_PRIME_URL` | URL usato dal CMS per tornare al sito del deploy corrente |

Il contesto `cms-oauth` in `netlify.toml` fissa esplicitamente il branch di scrittura
del CMS. La configurazione locale mantiene `local_backend: true` soltanto in
sviluppo: il proxy locale salva su disco e non verifica l'autenticazione OAuth.

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

La migrazione del branch di produzione avviene soltanto dopo questo collaudo.
