// netlify/functions/classify-capture.js
//
// Server-side only. Requires a GOOGLE_AI_API_KEY environment variable
// set in Netlify (Site settings -> Environment variables) — get a free
// key at aistudio.google.com/apikey, no credit card required. Never the
// client-side VITE_ vars, since this key must not reach the browser.
//
// Uses Gemini 2.5 Flash — the current free-tier workhorse model as of
// mid-2026 (10 requests/min, 250/day on the free tier, plenty for a
// personal capture inbox). Gemini 2.0 Flash is being deprecated June
// 2026, so this deliberately does not use it.
//
// Called by src/services/capture.js: requestSuggestion(). If this
// function isn't deployed or the env var isn't set, the client call
// fails quietly and the inbox falls back to fully manual triage —
// nothing else in the capture system depends on this working.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };
  }

  let text;
  try {
    ({ text } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!text || !text.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing text' }) };
  }

  const systemPrompt = `You triage quick-capture notes for a solo real estate agent's personal operating system.
Given one short piece of captured text, classify it. Respond with ONLY a JSON object, no other text:
{
  "type": one of "task" | "idea" | "content_idea" | "note" | "research" | "purchase" | "reminder" | "opportunity" | "thought",
  "category": a short label, e.g. "Partnership opportunity", "CRM relationship", "Home maintenance",
  "system": which part of the business/life system this belongs to, e.g. "CRM", "Content Engine", "Pipeline Generation", "Personal Maintenance", "Business Admin",
  "reasoning": one short sentence explaining the classification
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Gemini API error', detail: errText }) };
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const suggestion = JSON.parse(cleaned);

    return { statusCode: 200, body: JSON.stringify(suggestion) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Classification failed', detail: String(err) }) };
  }
};
