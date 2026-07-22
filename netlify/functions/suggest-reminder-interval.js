// netlify/functions/suggest-reminder-interval.js
//
// Server-side only, same pattern as the other AI functions. Requires
// GOOGLE_AI_API_KEY. Given a habit name, suggests how often a gentle
// "have you done this yet today" nudge makes sense — "drink water"
// wants hourly-ish, "take evening vitamins" wants once, not six times.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };
  }

  let habitName;
  try {
    ({ habitName } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!habitName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing habitName' }) };
  }

  const systemPrompt = `You suggest a reasonable reminder interval for a personal habit, for someone with ADHD who
wants a gentle "have you done this yet today?" nudge spread across a normal waking day (roughly 8am-9pm, 13 hours).
Think about how often this specific habit realistically needs checking — something like drinking water suits a
short interval (every 60-120 min), something like a single evening task suits a long interval (once, near the
relevant time of day) or no repeat nudge at all beyond one check. Never suggest more than 6 reminders across the
day (interval floor: 130 minutes) and never fewer than 1 (interval ceiling: 780 minutes, i.e. once).

Respond with ONLY a JSON object, no other text:
{
  "interval_minutes": <integer, between 130 and 780>,
  "reasoning": "one short sentence explaining the choice"
}`;

  const userPrompt = `Habit: "${habitName}"`;

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
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            maxOutputTokens: 150,
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

    // Clamp defensively — never trust the model's numeric output blindly,
    // even though the prompt already asks for a bounded range.
    suggestion.interval_minutes = Math.min(780, Math.max(130, Math.round(suggestion.interval_minutes)));

    return { statusCode: 200, body: JSON.stringify(suggestion) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Suggestion failed', detail: String(err) }) };
  }
};
