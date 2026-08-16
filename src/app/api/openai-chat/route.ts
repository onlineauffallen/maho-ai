// src/app/api/openai-chat/route.ts
//
// Der einzige Weg der App zum Sprachmodell.
//
// Bis eben nahm diese Route entgegen, was der Client schickte: fertige
// messages samt System-Rolle und einen eigenen Werkzeugkatalog. Wer die Adresse
// kannte, hatte damit einen kostenlosen Assistenten auf fremde Rechnung, mit
// beliebigem Auftrag und ohne Obergrenze.
//
// Jetzt liefert der Client nur noch Daten. Der Prompt, die Werkzeuge, das
// Modell und die Grenzen kommen von hier.
import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt, buildOnboardingPrompt, buildMemoryEvalPrompt } from '@/server/prompts';
import { getToolDefinitions, getOnboardingToolDefinitions } from '@/server/werkzeuge';
import {
  MAX_EINGABE_ZEICHEN,
  MAX_MEMORY_CHARS,
  MAX_PROFILE_CHARS,
  MAX_VERLAUF,
} from '@/server/grenzen';
import { absenderPruefen, limitPruefen, zugangOffen } from '@/server/schutz';

const apiKey = process.env.OPENAI_API_KEY;

const CONFIG = {
  chat: { model: process.env.MAHO_MODEL || 'gpt-5.6-terra', maxTokens: 800 },
  onboarding: { model: process.env.MAHO_MODEL || 'gpt-5.6-terra', maxTokens: 600 },
  memory: { model: process.env.MAHO_MEMORY_MODEL || 'gpt-5.6-luna', maxTokens: 450 },
} as const;

type Zweck = keyof typeof CONFIG;

type Nachricht = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; [k: string]: unknown };

/**
 * Erlaubte Herkünfte. Keine Wildcard, auch nicht in der Entwicklung: ein
 * versehentlich mit NODE_ENV=development gestartetes Deployment würde sonst
 * alles offenlegen.
 */
const ERLAUBTE_HERKUENFTE = (process.env.MAHO_ALLOWED_ORIGIN ?? 'http://localhost:8080,http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsKopf(req: NextRequest): Record<string, string> {
  const herkunft = req.headers.get('origin') ?? '';
  if (!ERLAUBTE_HERKUENFTE.includes(herkunft)) return {};
  return {
    'Access-Control-Allow-Origin': herkunft,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Maho-Geraet',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

/**
 * Die Parameter unterscheiden sich je Modellgeneration, am 16.08.2026 gegen die
 * echte API geprüft: gpt-5 und neuer verlangen max_completion_tokens, und mit
 * Function Tools zwingend reasoning_effort "none".
 */
function buildBody(model: string, messages: unknown, tools: unknown[] | undefined, maxTokens: number) {
  const neueGeneration = /^(gpt-5|o[1-9])/.test(model);
  return {
    model,
    messages,
    ...(tools?.length ? { tools } : {}),
    temperature: 0.7,
    ...(neueGeneration
      ? { max_completion_tokens: maxTokens, reasoning_effort: 'none' }
      : { max_tokens: maxTokens }),
  };
}

function fehler(text: string, status: number, req: NextRequest) {
  return NextResponse.json({ error: text }, { status, headers: corsKopf(req) });
}

/** Kürzt und säubert, was von außen kommt. Nichts davon wird ungeprüft eingesetzt. */
function text(wert: unknown, max: number): string {
  return typeof wert === 'string' ? wert.slice(0, max) : '';
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsKopf(req) });
}

export async function POST(req: NextRequest) {
  if (!apiKey) return fehler('Der Dienst ist nicht eingerichtet.', 500, req);

  const absender = absenderPruefen(req);
  if (!absender) return fehler('Kein gültiger Zugang.', 401, req);

  const limit = limitPruefen(`${absender.code}:${absender.geraet}`);
  if (!limit.erlaubt) {
    return NextResponse.json(
      { error: limit.grund, wiederIn: limit.sekunden },
      { status: 429, headers: corsKopf(req) }
    );
  }

  let koerper: Record<string, unknown>;
  try {
    koerper = await req.json();
  } catch {
    return fehler('Anfrage nicht lesbar.', 400, req);
  }

  const zweck: Zweck = (['chat', 'onboarding', 'memory'] as const).includes(koerper.zweck as Zweck)
    ? (koerper.zweck as Zweck)
    : 'chat';
  const cfg = CONFIG[zweck];

  const kontext = (koerper.kontext ?? {}) as Record<string, unknown>;
  const eingabe = text(koerper.eingabe, 4000);
  if (!eingabe) return fehler('Es fehlt der Text.', 400, req);

  // Profil und Gedächtnis kommen aus der App, deshalb hart begrenzen: sie
  // landen im Prompt und wären sonst ein Weg, ihn beliebig aufzublähen.
  const profil = {
    name: text(kontext.name, 60),
    basics: text(kontext.basics, MAX_PROFILE_CHARS),
    categories: Array.isArray(kontext.categories)
      ? kontext.categories.slice(0, 12).map((c) => text(c, 40)).filter(Boolean)
      : [],
  };
  const gedaechtnis = text(kontext.memory, MAX_MEMORY_CHARS);

  // Der Verlauf darf ausschließlich aus Nutzer- und Assistenzzeilen bestehen.
  // Eine System-Rolle von außen wäre genau die Lücke, die den Endpunkt zum
  // Freifahrtschein gemacht hat.
  const roh = Array.isArray(koerper.verlauf) ? koerper.verlauf.slice(-MAX_VERLAUF) : [];
  const verlauf: Nachricht[] = roh
    .map((m) => {
      const eintrag = (m ?? {}) as Record<string, unknown>;
      const rolle = eintrag.rolle === 'maho' ? 'assistant' : 'user';
      return { role: rolle as 'user' | 'assistant', content: text(eintrag.text, 2000) };
    })
    .filter((m) => m.content);

  const gesamtLaenge =
    eingabe.length + gedaechtnis.length + profil.basics.length + verlauf.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  if (gesamtLaenge > MAX_EINGABE_ZEICHEN) return fehler('Die Anfrage ist zu groß.', 413, req);

  // Prompt und Werkzeuge entstehen hier, nicht im Client.
  let systemPrompt: string;
  let werkzeuge: unknown[] | undefined;

  if (zweck === 'memory') {
    systemPrompt = buildMemoryEvalPrompt({ currentMemory: gedaechtnis, maxChars: MAX_MEMORY_CHARS });
  } else if (zweck === 'onboarding') {
    systemPrompt = buildOnboardingPrompt({ profil, letzteRunde: koerper.letzteRunde === true });
    werkzeuge = getOnboardingToolDefinitions();
  } else {
    systemPrompt = buildSystemPrompt({
      profil,
      memory: gedaechtnis,
      keineVorschlaege: koerper.keineVorschlaege === true,
      faellig: Array.isArray(kontext.faellig)
        ? kontext.faellig.slice(0, 3).map((w) => {
            const e = (w ?? {}) as Record<string, unknown>;
            return { thema: text(e.thema, 200), kontext: text(e.kontext, 200), faelligAm: text(e.faelligAm, 10) };
          })
        : [],
    });
    werkzeuge = getToolDefinitions(profil.categories);
  }

  const messages: Nachricht[] = [
    { role: 'system', content: systemPrompt },
    ...verlauf,
    { role: 'user', content: eingabe },
  ];

  // Zwischenrunden: die Assistenzantwort mit ihren Werkzeugaufrufen und was die
  // App damit gemacht hat. Erlaubt sind nur diese beiden Rollen, und die
  // Werkzeugnamen müssen aus dem eigenen Katalog stammen.
  const erlaubteNamen = new Set(
    (werkzeuge ?? []).map((w) => ((w as { function?: { name?: string } }).function?.name ?? ''))
  );
  const runden = Array.isArray(koerper.runden) ? koerper.runden.slice(0, 5) : [];
  let letzteOhneWerkzeuge = false;

  for (const runde of runden) {
    const r = (runde ?? {}) as Record<string, unknown>;
    const assistent = (r.assistent ?? {}) as Record<string, unknown>;
    const aufrufe = Array.isArray(assistent.tool_calls) ? assistent.tool_calls : [];
    if (!aufrufe.length) continue;

    messages.push({
      role: 'assistant',
      content: text(assistent.content, 2000) || null,
      tool_calls: aufrufe,
    });

    const ergebnisse = Array.isArray(r.ergebnisse) ? r.ergebnisse : [];
    for (const e of ergebnisse) {
      const eintrag = (e ?? {}) as Record<string, unknown>;
      const name = text(eintrag.name, 60);
      if (!erlaubteNamen.has(name)) continue;
      messages.push({
        role: 'tool',
        tool_call_id: text(eintrag.tool_call_id, 100),
        content: text(eintrag.result, 4000),
      });
    }
  }
  // In der letzten erlaubten Runde ohne Werkzeuge fragen, das erzwingt eine
  // Textantwort statt einer weiteren Werkzeugrunde.
  if (runden.length >= 4) letzteOhneWerkzeuge = true;

  let antwort: Response;
  try {
    antwort = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(
        buildBody(cfg.model, messages, letzteOhneWerkzeuge ? undefined : werkzeuge, cfg.maxTokens)
      ),
    });
  } catch (e) {
    console.error('[maho] Anbieter nicht erreichbar:', e);
    return fehler('Der Anbieter ist gerade nicht erreichbar.', 502, req);
  }

  if (!antwort.ok) {
    // Die Antwort des Anbieters bleibt im Log. Sie enthält im Fehlerfall
    // Organisations- und Kontodetails und hat im Client nichts verloren.
    console.error('[maho] Anbieterfehler', antwort.status, await antwort.text().catch(() => ''));
    return fehler(
      antwort.status === 429 ? 'Gerade zu viel los.' : 'Der Anbieter hat einen Fehler gemeldet.',
      antwort.status === 429 ? 429 : 502,
      req
    );
  }

  const daten = await antwort.json().catch(() => null);
  const nachricht = daten?.choices?.[0]?.message;
  if (!nachricht) {
    console.error('[maho] Unerwartete Antwortform:', JSON.stringify(daten)?.slice(0, 500));
    return fehler('Der Anbieter hat unerwartet geantwortet.', 502, req);
  }

  // Verbrauch mitschreiben. Ohne diese Zahl gibt es später nichts zu deckeln.
  const verbrauch = daten.usage;
  if (verbrauch) {
    console.log(
      `[maho] ${zweck} ${cfg.model} ${absender.code}/${absender.geraet} ` +
        `in=${verbrauch.prompt_tokens} out=${verbrauch.completion_tokens}`
    );
  }

  return NextResponse.json({ message: nachricht, usage: verbrauch }, { headers: corsKopf(req) });
}

// Beim Start einmal warnen, wenn der Zugang offensteht.
if (zugangOffen && process.env.NODE_ENV === 'production') {
  console.warn('[maho] ACHTUNG: MAHO_ZUGANG ist nicht gesetzt, der Endpunkt steht offen.');
}
