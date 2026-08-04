// netlify/functions/generate-practice-problems.cjs
// "Generate more like this" — matches the exact pattern every other
// AI function in this app uses (Gemini, not Anthropic — the spec
// this was built from assumed an Anthropic integration that doesn't
// actually exist in this codebase; this reuses what's real instead).

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };

  let topicName, difficulty;
  try {
    ({ topicName, difficulty } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!topicName) return { statusCode: 400, body: JSON.stringify({ error: 'Missing topicName' }) };

  const prompt = `Generate 5 practice problems for the topic "${topicName}" at difficulty "${difficulty || 'medium'}", appropriate for a pre-calculus/calculus student preparing for a computer engineering degree.
Respond with ONLY a JSON object: { "problems": [{ "prompt": "...", "answer": "..." }, ...] }
No preamble, no markdown fences, no explanation outside the JSON.`;

  async function callGemini() {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json', maxOutputTokens: 1500 },
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${errText.slice(0, 300)}`);
    }
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.problems)) throw new Error('Response did not contain a problems array');
    return parsed.problems;
  }

  // Retry once on failure, then surface a real error — never fail silently, per spec.
  try {
    const problems = await callGemini();
    return { statusCode: 200, body: JSON.stringify({ problems }) };
  } catch (firstErr) {
    try {
      const problems = await callGemini();
      return { statusCode: 200, body: JSON.stringify({ problems }) };
    } catch (secondErr) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Problem generation failed after retry', detail: String(secondErr) }) };
    }
  }
};
