// netlify/functions/daily-briefing.cjs
// "Executive Assistant" (Phase 4 backlog, built from a one-line
// description). One real paragraph, written from real data the
// caller already gathered (overdue items, this week's build,
// pipeline health) — not a second dashboard restating the same
// numbers. Matches the existing draft-content.js Gemini call pattern.

const MODEL = 'gemini-2.5-flash';
const { BRAND_VOICE_PROMPT } = require('./lib/brandVoice.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };

  let data;
  try {
    ({ data } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!data) return { statusCode: 400, body: JSON.stringify({ error: 'Missing data' }) };

  const systemPrompt = `You write a short daily business briefing for a solo real estate agent, like an executive
assistant would hand her one page before the day starts.
${BRAND_VOICE_PROMPT}
2-4 sentences, plain prose, no headers or bullet points. Mention only what's actually in the data provided — never
invent a number, a name, or a task. If everything is genuinely quiet, say that plainly instead of manufacturing
urgency. Respond with ONLY a JSON object: { "briefing": "the briefing text" }`;

  const userPrompt = `Today's data:\n${JSON.stringify(data, null, 2)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: 'application/json', maxOutputTokens: 400 },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Gemini API error', detail: errText }) };
    }
    const responseData = await response.json();
    const raw = responseData.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return { statusCode: 200, body: JSON.stringify(JSON.parse(cleaned)) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Briefing failed', detail: String(err) }) };
  }
};
