// src/app/api/openai-chat/route.ts
// Dünner Provider-Adapter. Aktuell OpenAI; die Schnittstelle (messages + tools rein,
// vollständige Assistant-Message raus) ist bewusst anbieterneutral gehalten, damit
// später weitere Provider oder "Sign in with ChatGPT" eingesteckt werden können.
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.OPENAI_API_KEY;

// Der Zweck bestimmt Modell und Antwortlänge, NICHT der Client. Sonst kann sich
// jeder das teuerste Modell aussuchen, sobald der Endpunkt öffentlich steht.
const CONFIG = {
  chat: {
    model: process.env.MAHO_MODEL || 'gpt-5.6-terra',
    maxTokens: 800,
  },
  memory: {
    // Die Gedächtnis-Auswertung läuft nach JEDEM Wortwechsel und ist damit der
    // teuerste Einzelposten. Sie läuft deshalb auf dem günstigen Modell, das
    // für "verdichte diesen Wortwechsel" allemal reicht.
    model: process.env.MAHO_MEMORY_MODEL || 'gpt-5.6-luna',
    // Das Gedächtnis darf ohnehin nur 1500 Zeichen haben, 800 Token wären nie nutzbar.
    maxTokens: 450,
  },
} as const;

type Purpose = keyof typeof CONFIG;

/**
 * Die Parameter unterscheiden sich je Modellgeneration, am 16.08.2026 gegen die
 * echte API geprüft:
 *   gpt-4o und älter: max_tokens, kein reasoning_effort
 *   gpt-5 und neuer:  max_completion_tokens, und mit Function Tools zwingend
 *                     reasoning_effort "none", sonst antwortet die API mit 400
 *                     ("Function tools with reasoning_effort are not supported").
 * Für einen Assistenten ist "none" ohnehin richtig: Denk-Token werden als Output
 * abgerechnet und zehren vom Antwortlimit.
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

/**
 * Die App läuft nicht mehr unter derselben Herkunft wie diese Route: in der
 * Entwicklung liegt Expo Web auf Port 8081. Nur dort wird freigegeben, in
 * Produktion muss MAHO_ALLOWED_ORIGIN gesetzt sein.
 *
 * Wichtig: das ist kein Zugriffsschutz. Ein Origin-Header ist gefälscht, sobald
 * jemand die Anfrage nicht im Browser stellt. Der eigentliche Schutz
 * (Anmeldung, Kontingent, Ratenbegrenzung) fehlt noch und muss vor dem ersten
 * öffentlichen Deployment stehen.
 */
function corsKopf(): Record<string, string> {
  const erlaubt =
    process.env.MAHO_ALLOWED_ORIGIN ?? (process.env.NODE_ENV === 'development' ? '*' : '');
  return erlaubt
    ? {
        'Access-Control-Allow-Origin': erlaubt,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    : {};
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsKopf() });
}

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY fehlt. Bitte in .env.local setzen.' },
      { status: 500, headers: corsKopf() }
    );
  }

  const { messages, tools, purpose } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages[] fehlt.' }, { status: 400, headers: corsKopf() });
  }

  const cfg = CONFIG[(purpose as Purpose) in CONFIG ? (purpose as Purpose) : 'chat'];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(cfg.model, messages, tools, cfg.maxTokens)),
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500, headers: corsKopf() });
  }

  const data = await res.json();
  // Vollständige Message zurückgeben (content UND tool_calls), nicht nur den Text.
  // usage kommt mit, sonst gibt es später nichts zu messen und nichts zu deckeln.
  return NextResponse.json(
    { message: data.choices[0].message, usage: data.usage },
    { headers: corsKopf() }
  );
}
