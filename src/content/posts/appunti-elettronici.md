---
title: "Da KOReader a Obsidian"
description: "Perché ho sviluppato un plugin che porta note e metadati dal lettore al mio archivio personale."
category: tecnologia
format: nota
tags:
  - obsidian
  - koreader
published: true
pinned: false
status: needs-review
date: 2022-02-04T17:46:38+01:00
cover: /img/appunti-elettronici.jpg
coverAlt: "Un quaderno aperto e una penna stilografica su un tavolo di legno."
repository: https://github.com/Edo78/obsidian-koreader-sync
---

Recentemente mi sono rimpossessato del piacere della lettura grazie a un [Kobo Clara HD](https://it.kobobooks.com/products/kobo-clara-hd) (e al fatto che non mi serva spazio fisico per i libri). Ho scoperto subito [KOReader](https://koreader.rocks/), un software per la lettura, alternativo a quello distribuito nativamente sul dispositivo, e mi sono tuffato in un mare di parole.

KOReader permette, abbastanza agevolmente, anche di prendere appunti sui libri ma è un po' carente quando si tratta di estrarre queste note dal dispositivo mentre io avrei volute importarle in [Obsidian](https://obsidian.md/) (un software per la gestione di note di cui certamente vi parlerò a breve).

L'unica strada plausibile che avevo davanti era di scrivere un plugin per Obsidian che estraesse le note da KOReader, e così ho fatto: [obsidian-koreader-sync su GitHub](https://github.com/Edo78/obsidian-koreader-sync).

Un semplice plugin a cui sto rapidamente aggiungendo nuove funzionalità e che sta venendo apprezzato molto già dai pochi utenti che hanno subito iniziato a usarlo. Un utente mi ha pure donato 6 euro tramite [Buy Me a Coffee](https://www.buymeacoffee.com/Edo78/c/2504284).

Il plugin al momento consente un certo livello di personalizzazione, l'uso di template personalizzati, arricchisce ogni nota con una grande quantità di dati e metadati che possono essere sfruttati in Obsidian per fare ricerche e viste dinamiche e molto altro.

Procedo a pari passo tra l'aggiunta di nuove funzionalità, il refactoring del codice e la risoluzione di bug. Essendo qualcosa che serve a me in prima persona sono felice di averlo fatto ma sapere che anche altri utenti lo usano e lo apprezzano è sicuramente uno stimolo in più per mantenere attivo lo sviluppo.

Se doveste rientrare in quel sottoinsieme di utenti a cui può tornare utile ricordatevi di provarlo e di darmi il vostro feedback.
