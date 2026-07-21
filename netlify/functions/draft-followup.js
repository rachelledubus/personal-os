// netlify/functions/draft-followup.js
// A5: Email & Client Communication — draft personalized follow-ups
// from CRM context. Under 150 words, one idea, one CTA, no sales
// pressure, per the brand voice rules in System 01/14.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };

  let contact, customInstructions;
  try {
    ({ contact, customInstructions } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!contact?.name) return { statusCode: 400, body: JSON.stringify({ error: 'Missing contact' }) };

  const systemPrompt = `You write follow-up messages for a Southwest Broward real estate agent. Brand voice: warm,
educational, direct but approachable, protective, never pushy. Under 150 words. One idea, one CTA. Never use "just
checking in," "touching base," "dream home," "don't miss out," "act now," or generic realtor language. Prefer text
or email tone over phone-call language — never suggest calling. Respond with ONLY a JSON object:
{ "message": "the drafted message", "channel": "text" or "email", "reasoning": "one short sentence on the approach" }
${customInstructions ? `\nAdditional instructions from the user, apply these too: ${customInstructions}` : ''}`;

  const userPrompt = `Contact: ${contact.name}
Category: ${contact.category || 'unknown'}
Timeline: ${contact.timeline || 'unknown'}
Source: ${contact.source || 'unknown'}
Next action noted: ${contact.next_action || 'none'}
Concerns: ${contact.concerns || 'none noted'}
Goals: ${contact.goals || 'none noted'}
Relationship notes: ${contact.relationship_notes || 'none'}
Preferred contact method: ${contact.preferred_contact_method || 'text'}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: 'application/json', maxOutputTokens: 300 },
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
