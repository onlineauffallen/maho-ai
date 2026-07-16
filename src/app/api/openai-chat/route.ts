// src/app/api/openai-chat/route.ts
// Dünner Provider-Adapter. Aktuell OpenAI; die Schnittstelle (messages + tools rein,
// vollständige Assistant-Message raus) ist bewusst anbieterneutral gehalten, damit
// später weitere Provider oder "Sign in with ChatGPT" eingesteckt werden können.
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.OPENAI_API_KEY;
const MODEL = process.env.MAHO_MODEL || 'gpt-4o';

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY fehlt. Bitte in .env.local setzen.' },
      { status: 500 }
    );
  }

  const { messages, tools } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages[] fehlt.' }, { status: 400 });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(tools?.length ? { tools } : {}),
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 });
  }

  const data = await res.json();
  // Vollständige Message zurückgeben (content UND tool_calls), nicht nur den Text.
  return NextResponse.json({ message: data.choices[0].message });
}
