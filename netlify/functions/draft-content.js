// netlify/functions/draft-content.js
// Content Engine — expands a brief (question/audience/goal/trade-off/
// CTA) into a full draft. Same graceful-degrade contract as every
// other AI function here: 501 if unconfigured, real errors otherwise,
// never silently wrong.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };

  let piece, customInstructions;
  try {
    ({ piece, customInstructions } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!piece?.title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing content piece' }) };

  const systemPrompt = `You write flagship content for a Southwest Broward real estate agent's audience. Brand voice: warm,
educational, direct but approachable, protective, never pushy or salesy. Write a complete first draft ready for the
agent to fact-check and personalize — not an outline, not bullet points unless the format calls for it. Never use
"just checking in," "touching base," "dream home," "don't miss out," "act now," or generic realtor language.
Respond with ONLY a JSON object: { "draft": "the full draft text" }
${customInstructions ? `\nAdditional instructions from the user, apply these too: ${customInstructions}` : ''}`;

  const userPrompt = `Title: ${piece.title}
Buyer question this answers: ${piece.buyer_question || 'none specified'}
Audience: ${piece.audience || 'general'}
Funnel stage: ${piece.funnel_stage || 'Awareness'}
Goal: ${piece.goal || 'not specified'}
The one trade-off to be honest about: ${piece.trade_off || 'not specified'}
Call to action: ${piece.cta || 'not specified'}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: 'application/json', maxOutputTokens: 1200 },
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
    return { statusCode: 500, body: JSON.stringify({ error: 'Draft failed', detail: String(err) }) };
  }
};
