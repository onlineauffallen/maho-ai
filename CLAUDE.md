# CLAUDE.md - Maho Personal Assistant

## Was Maho ist

Ein persönlicher KI-Assistent für normale Menschen (nicht Entwickler). Er lernt den
Nutzer in ~5 Minuten Onboarding kennen, pflegt ein größenbegrenztes Gedächtnis und
führt echte Aktionen aus (Termine, Todos) statt nur zu antworten.

Leitprinzip für ALLE Entscheidungen: **idiotensicher**. Keine API-Keys in der UI,
keine Modell-Dropdowns, keine Konfiguration. Wenn ein Feature eine Erklärung braucht,
ist es falsch designt.

## Architektur (Stand Juli 2026)

- Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Zustand mit persist
- `src/lib/promptBuilder.ts` - baut System-Prompt aus Profil + Gedächtnis; enthält
  auch den Gedächtnis-Evaluierungs-Prompt
- `src/lib/chatService.ts` - Agenten-Schleife: Nachricht + Tools an API, Tool-Calls
  clientseitig ausführen, Ergebnisse zurück, bis Textantwort kommt (max. 5 Runden)
- `src/lib/tools.ts` - Tool-Definitionen (OpenAI Function Calling) + Ausführung
  gegen die Stores. Neue Fähigkeiten kommen HIER dazu.
- `src/lib/memory.ts` - persistentes Gedächtnis, hartes Limit MAX_MEMORY_CHARS
  (1500). Nach jedem Wortwechsel Evaluierung im Hintergrund (fire-and-forget,
  darf den Chat nie blockieren).
- `src/app/api/openai-chat/route.ts` - dünner Provider-Adapter. Schnittstelle
  bewusst anbieterneutral (messages + tools rein, vollständige Message raus),
  damit weitere Provider / "Sign in with ChatGPT/Claude" später einsteckbar sind.
- Stores: `lib/todoStore.ts`, `features/calendar/CalendarStore.ts`,
  `lib/useOnboardingStore.ts`, `lib/chatStore.ts` - alle mit zustand/persist
  (localStorage)
- Screens: `app/chat`, `app/calendar`, `app/todos`, `app/onboarding`

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
- `npx tsc --noEmit` - Typprüfung; muss vor jedem Commit sauber sein
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
