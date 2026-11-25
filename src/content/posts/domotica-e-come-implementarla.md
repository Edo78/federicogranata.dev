---
title: "Perché la mia domotica resta locale"
description: "Un hub locale richiede più lavoro iniziale, ma evita dipendenze fragili e lascia pieno controllo sulle automazioni."
category: tecnologia
format: nota
tags:
  - home-assistant
  - domotica
published: true
pinned: false
status: needs-review
date: 2022-02-04T18:31:52+01:00
cover: /img/domotica-e-come-implementarla.jpg
coverAlt: "Un altoparlante intelligente grigio su una superficie chiara."
---

Ci sono molte strade per ottenere un'abitazione domotica, alcune più facili da ottenere rispetto ad altre, ma spesso la facilità estrema è solo un modo per attirare utenti e in realtà creano più problemi di quanti ne risolvano. A volte vale la pena investire in un po' di impegno iniziale per ottenere risultati molto più significativi.

Molti dispositivi di quelli che considero "facili" richiedono una connessione a internet per interfacciarsi a un server di terze parti. Spesso la configurazione è questione di pochi minuti ma i problemi iniziano a sorgere quando si vuol sfruttare due dispositivi diversi, magari un sensore di movimento e un relè per controllare una lampada.

O ci si lega a uno specifico ecosistema di prodotti che dovrebbero interagire agevolmente tra di loro o inizierà ad essere più laborioso riuscire a farli comunicare e, in ogni caso, si dovrà sottostare alle possibili automazioni messe a disposizione dal servizio online che si sfrutta. Oltre a tutti questi inconvenienti bisogna sempre ricordare che è già successo in diversi casi che un'azienda fallisse o che decidesse di dismettere un servizio e tutti i dispositivi che si collegavano a un certo server sono improvvisamente diventati dei graziosi soprammobili lasciando gli utenti in una spiacevole situazione.

L'unica strada sicura, a mio parere, è quella di usare un hub locale per la domotica. Nel mio caso sto attualmente usando un Raspberry Pi 4 su cui gira [Home Assistant](https://www.home-assistant.io/). Questo mi consente di supportare localmente una ampissima gamma di dispositivi e di implementare qualsiasi logica io voglia.

Ad esempio non mi limito a controllare i caloriferi con un sensore di temperatura e un relè wifi ma ho fatto sì che il sistema controllasse nel mio calendario se, per caso dovessi essere in ufficio. Oppure ho impostato il sistema per accendere i climatizzatori nelle camere 25 minuti prima della sveglia del mio cellulare e farli andare per 30 minuti. In questo modo, a qualsiasi ora della mattina imposti la sveglia la temperatura sarà piacevole. In bocca al lupo cercando di ottenere qualcosa di simile con servizi gratuiti online.

Presto approfondirò concetti ed esempi, se siete interessati sapete dove trovarmi.
