# Maho - Personal Assistant

Ein persönlicher KI-Assistent, der sich in wenigen Minuten an seinen Nutzer anpasst
und danach echte Aufgaben übernimmt: Termine, Todos, Erinnerungen - gesteuert in
natürlicher Sprache, idiotensicher, ohne Konfiguration.

## Die Idee (seit 2023/2024)

Maho basiert auf drei Prinzipien, die ich ausgearbeitet habe, bevor sie 2026 durch
Projekte wie OpenClaw und Hermes Agent zum Mainstream wurden:

1. **Onboarding statt Konfiguration.** Maho lernt den Nutzer in ~5 Minuten kennen
   (Lebensbereiche als Mehrfachauswahl, gezielte Fragen pro Bereich) und baut daraus
   ein Profil, das jede Antwort personalisiert.
2. **Größenbegrenztes Gedächtnis mit Evaluierung.** Nach jedem Wortwechsel bewertet
   ein eigener Schritt, was langfristig wichtig ist. Der Speicher ist hart limitiert -
   das zwingt das System zu priorisieren und zu verdichten, und hält es schnell.
3. **Aktionen statt Antworten.** Der Assistent beschreibt nicht, was man tun könnte,
   er tut es: Über eine maschinenlesbare Fähigkeitsbeschreibung (heute: Function
   Calling / Tools) legt er Termine und Todos direkt an. Nachgefragt wird nur,
   wenn die Absicht unklar ist.

## Stand der Umsetzung

**Prototyp Juni 2025:** Onboarding-Flow (Name, Lebensbereiche, Fragebögen),
Prompt-Builder-Pipeline (Profil + Kontextfenster der letzten 10 Nachrichten),
Chat-, Kalender- und Todo-Screens.

**Update Juli 2026:** Kernkonzepte lauffähig gemacht:
- Echtes Tool-Calling: Die KI legt Termine und Todos wirklich an (Agenten-Schleife
  mit clientseitiger Tool-Ausführung, Aktions-Bestätigungen in der UI).
- Persistentes Gedächtnis mit hartem Limit (1.500 Zeichen) und Evaluierungsschritt
  nach jedem Wortwechsel.
- Alle Nutzerdaten (Profil, Termine, Todos, Gedächtnis) persistent.
- Anbieterneutraler API-Adapter, vorbereitet für weitere Modelle und künftige
  Konto-Logins ("Sign in with ChatGPT" etc.).

## Setup

```bash
npm install
echo "OPENAI_API_KEY=sk-..." > .env.local
npm run dev
```

Optional: `MAHO_MODEL` in `.env.local` setzen (Default: `gpt-4o`).

## Stack

Next.js 15, React 19, TypeScript, Tailwind 4, Zustand (persist).
