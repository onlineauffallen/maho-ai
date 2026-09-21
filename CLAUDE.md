# CLAUDE.md - Maho Personal Assistant

## Was Maho ist

Ein persönlicher KI-Assistent für normale Menschen (nicht Entwickler). Er lernt den
Nutzer in ~5 Minuten Onboarding kennen, pflegt ein größenbegrenztes Gedächtnis und
führt echte Aktionen aus (Termine, Todos) statt nur zu antworten.

Leitprinzip für ALLE Entscheidungen: **idiotensicher**. Keine API-Keys in der UI,
keine Modell-Dropdowns, keine Konfiguration. Wenn ein Feature eine Erklärung braucht,
ist es falsch designt.

## Architektur (Stand 21. September 2026)

Zwei Teile in einem Repo. Die Next.js-Oberfläche gibt es nicht mehr (16.08. gelöscht),
übrig ist der API-Endpunkt.

**Server (`src/`, Next.js 15):**
- `src/app/api/openai-chat/route.ts` - der einzige Weg zum Sprachmodell. Nimmt nur Daten
  entgegen (Eingabe, Verlauf, Profil, Gedächtnis), baut Prompt und Werkzeugkatalog selbst.
  Mit `stream: true` im Körper antwortet er als Zeilenstrom (NDJSON).
- `src/server/prompts.ts` - Prompts. Der Alltags-Prompt ist zweigeteilt: `fest` (für alle
  gleich) und `stand` (Datum, Profil, Gedächtnis). **Nichts Veränderliches in den festen
  Teil**, sonst ist der Cache weg (`tests/cache.ts` prüft das).
- `src/server/werkzeuge.ts` - Werkzeugkatalog, für alle Nutzer byte-gleich, aus demselben Grund.
- `src/server/schutz.ts` - Zugangscodes, Ratenbegrenzung, Tagesbudget je Code. Alles im
  Arbeitsspeicher, je Prozess.
- `src/server/strom.ts` - liest den Anbieterstrom und setzt Werkzeugaufrufe zusammen.

**App (`mobile/`, Expo SDK 57, expo-router, Zustand mit persist auf AsyncStorage):**
- `mobile/src/lib/chatService.ts` - Agenten-Schleife: Anfrage, Werkzeugaufrufe lokal
  ausführen, Ergebnisse zurück, bis Text kommt.
- `mobile/src/lib/tools.ts` - Ausführung der Werkzeuge gegen die Stores. Neue Fähigkeiten
  brauchen Beschreibung in `src/server/werkzeuge.ts` UND Ausführung hier.
- Stores: profileStore, memory, todoStore, calendarStore, followupStore, chatStore,
  zustimmungStore. Neue Stores gehören in `useHydrated.ts`.
- Vor jeder Übertragung an den Anbieter muss `zustimmungStore` zugestimmt haben, die Weiche
  liegt in `mobile/src/app/_layout.tsx`.

**Prompt Caching (GPT-5.6):** ein gemeinsames Präfix wird nur mit ausdrücklichem
Haltepunkt gecached (`prompt_cache_breakpoint` und `prompt_cache_options.mode: explicit`,
siehe `kopfNachrichten` in der Route). Am 21.09.2026 gemessen: 2454 von 2530 Token gelesen,
auch bei fremden Nutzern. Implizit war es 0.

## Harte Regeln (nie verletzen)

1. API-Keys existieren NUR serverseitig (`.env.local`, Route-Handler). Niemals im
   Client-Code, niemals im UI abfragen.
2. Niemals Nutzer-Passwörter fremder Dienste entgegennehmen. Konto-Verknüpfung
   nur per OAuth (Browser-Redirect zum Anbieter). Auch keine OAuth-Anbieter-Logins
   implementieren oder im UI ankündigen, solange kein offizielles Dritt-App-Programm
   mit offener Registrierung existiert.
3. Das Gedächtnis-Limit bleibt hart. Bei Platzmangel wird verdichtet/priorisiert,
   nicht das Limit erhöht.
4. Der Provider-Adapter bleibt dünn und neutral. Keine OpenAI-Spezifika außerhalb
   von `route.ts` und `tools.ts`.
5. UI-Sprache ist Deutsch, Ton freundlich und knapp.

## Befehle

- `npm run dev` - Dev-Server (braucht `.env.local` mit `OPENAI_API_KEY=...`)
- `npx tsc --noEmit` - Typprüfung, in Wurzel und in `mobile/`; muss vor jedem Commit sauber sein
- `npm test` - Server-Tests (Schutz, Cache-Stabilität, Strom); in `mobile/` die App-Tests
  (Zeitrechnung, Werkzeuge gegen die echten Stores, Chatspeicher, Markdown)
- `npm run lint` - ESLint

## Geschäftsmodell-Kontext (für Produktentscheidungen)

Zielbild: Maho-Konto per Google/Apple/E-Mail. Monetarisierung ausschließlich über
Betreiber-Key: Gratis-Stufe mit günstigem Modell und hartem Tageslimit, Abo-Stufe
mit starkem Modell. Anbieter-Logins (OAuth mit Abrechnung über Nutzerkonto)
existieren bei keinem Anbieter als offen zugängliches Programm (Stand 07/2026,
Anthropic: untersagt und volatil; OpenAI: nur Pilot mit Interesse-Formular;
Google: Mechanismus existiert nicht). Status: Beobachtungspunkt mit ToS-Risiko,
keine UI und keine Zusagen dafür bauen. Der Provider-Adapter bleibt aus Gründen
der Modellflexibilität bestehen.

## Roadmap / Backlog (Reihenfolge = Priorität)

1. Onboarding-Flow durchspielen und UX-Kanten glätten (zurück-Navigation,
   Bereiche später änderbar machen)
2. Chat: Streaming der Antworten, Fehlerzustände, "Gedächtnis ansehen"-Screen
   (Transparenz: Nutzer sieht und löscht, was Maho sich merkt)
3. Erinnerungen: Termine mit Benachrichtigung (Web Push) statt nur Kalendereintrag
4. Beta-Fähigkeit: einfaches Deployment (Vercel), Zugangsschutz für ~20 Testnutzer
5. Danach erst: echtes Konto-System und Freemium-Limits
6. Chat als Hauptbühne, Kalender/Todos als aufklappbare Seitenpanels statt
   eigener Seiten (UX-Konzept, größerer Umbau)

## Arbeitsweise

- Kleine, fokussierte Commits mit klaren Messages
- Bei Architekturfragen erst kurz den Plan nennen, dann umsetzen
- Bestehende Muster wiederverwenden (Stores, Tool-Pattern) statt neue einführen
