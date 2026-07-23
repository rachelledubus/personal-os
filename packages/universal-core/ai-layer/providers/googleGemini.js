// packages/universal-core/ai-layer/providers/googleGemini.js
// Default Google Gemini provider implementation (server-side). This module
// intentionally does not auto-register itself — registration must be done by
// application bootstrap code to avoid accidentally enabling LLM calls.

const MODEL = 'gemini-2.5-flash';

export async function classify(text) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');
  if (!text || !text.trim()) return null;

  const systemPrompt = `You triage quick-capture notes for a personal operating system.\nRespond with ONLY a JSON object:`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      maxOutputTokens: 300,
    },
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function generate(prompt, opts = {}) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');

  const body = {
    system_instruction: { parts: [{ text: '' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'text/plain',
      maxOutputTokens: opts.maxTokens || 300,
    },
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return raw;
}
