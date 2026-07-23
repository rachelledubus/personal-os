// netlify/functions/estimate-food-calories.js
//
// Server-side only, same pattern as the other AI functions. Given a
// food description (e.g. "Trader Joe's frozen cheese pizza, half box"),
// estimates calories/protein/carbs/fat for that specific serving —
// meant for quick/packaged foods that don't have a real ingredient
// breakdown, not a substitute for real nutrition labels when accuracy
// matters.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };
  }

  let description;
  try {
    ({ description } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!description) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing description' }) };
  }

  const systemPrompt = `You estimate nutrition for a food or quick meal description, including packaged/premade items
(frozen pizza, boxed pasta, a fast food order). Use your best real-world knowledge of typical products matching the
description. Be honest that this is an estimate, not a lab measurement.

Respond with ONLY a JSON object, no other text:
{
  "calories": <integer>,
  "protein": <number, grams>,
  "carbs": <number, grams>,
  "fat": <number, grams>,
  "serving_note": "one short phrase describing what serving size this estimate covers"
}`;

  const userPrompt = `Food: "${description}"`;

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
            maxOutputTokens: 200,
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
    const estimate = JSON.parse(cleaned);

    return { statusCode: 200, body: JSON.stringify(estimate) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Estimate failed', detail: String(err) }) };
  }
};
