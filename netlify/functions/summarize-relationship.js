// netlify/functions/summarize-relationship.js
// Phase 5 (AI Integration) — the one gap in an otherwise-built AI
// layer: "AI summarizes notes" per the Development Constitution's own
// example list. Reads a contact's real interaction history (built in
// Phase 2's Relationship Tracking work) and produces a short, human
// summary instead of making Rachelle re-read a scrolling list.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };

  let contact, interactions, customInstructions;
  try {
    ({ contact, interactions, customInstructions } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!contact?.name) return { statusCode: 400, body: JSON.stringify({ error: 'Missing contact' }) };
  if (!interactions || interactions.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No interaction history to summarize' }) };
  }

  const systemPrompt = `You summarize a real estate agent's relationship history with one contact, from a real
interaction log (calls, texts, emails, meetings, notes). Brand voice: warm, direct, protective, never salesy.
2-4 sentences. Surface patterns and themes across entries, not a chronological recap of each one. Note anything
time-sensitive or worth following up on if it's actually present in the notes — never invent one. Respond with
ONLY a JSON object: { "summary": "the summary text" }
${customInstructions ? `\nAdditional instructions from the user, apply these too: ${customInstructions}` : ''}`;

  const historyText = interactions
    .map(i => `[${i.occurred_at}] ${i.type}: ${i.notes || '(no notes)'}`)
    .join('\n');

  const userPrompt = `Contact: ${contact.name}${contact.category ? ` (${contact.category})` : ''}
Relationship tier: ${contact.relationship_tier || 'untiered'}

Interaction history, most recent first:
${historyText}`;

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
    return { statusCode: 500, body: JSON.stringify({ error: 'Summary failed', detail: String(err) }) };
  }
};
