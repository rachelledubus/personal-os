// netlify/functions/repurpose-content.js
// Same pattern as the other Gemini functions. Turns one flagship
// content piece into draft copy for email, Instagram, Facebook, a
// short-form video script, and a partner-shareable version — the
// System 03 repurposing waterfall, automated instead of manual.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };

  let title, buyerQuestion, audience, customInstructions;
  try {
    ({ title, buyerQuestion, audience, customInstructions } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing title' }) };

  const systemPrompt = `You are a real estate content strategist for an education-first Southwest Broward (Cooper City,
Pembroke Pines, Plantation) relocation and first-time-buyer specialist. Brand voice: warm, educational, analytical,
direct but approachable, protective. Never use hype, urgency, or generic realtor language ("dream home," "don't miss
out," "act now"). Every piece should answer a real question and leave the reader feeling more prepared.

Given one flagship content piece, draft 5 short derivative versions for different channels. Respond with ONLY a JSON
object, no other text:
{
  "email": "one short paragraph, under 120 words, one CTA",
  "instagram": "a caption with a hook first line, under 150 words",
  "facebook": "a direct, helpful answer as if replying to someone's question in a local group, under 120 words",
  "video_script": "a 30-45 second short-form video script, spoken style, under 100 words",
  "partner_resource": "a neutral, non-sales version suitable for an employer/healthcare partner to share, under 120 words"
}
${customInstructions ? `\nAdditional instructions from the user, apply these too: ${customInstructions}` : ''}`;

  const userPrompt = `Flagship piece title: "${title}"
Buyer question it answers: ${buyerQuestion || 'not specified'}
Audience: ${audience || 'not specified'}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: 'application/json', maxOutputTokens: 900 },
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
    return { statusCode: 200, body: JSON.stringify(JSON.parse(cleaned)) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Repurpose failed', detail: String(err) }) };
  }
};
