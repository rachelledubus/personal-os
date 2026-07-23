// netlify/functions/ai-replan.js
//
// Server-side only, same pattern as classify-capture.js. Requires
// GOOGLE_AI_API_KEY in Netlify's environment variables — same free key
// from aistudio.google.com/apikey, shared with classify-capture.js.
//
// This is the qualitative layer on top of dailyExecution.js's
// deterministic scoring — for requests a heuristic can't judge
// ("I'm burnt out, lighten today"). It NEVER touches the database
// directly and never auto-applies anything: it receives a snapshot of
// today's real blocks/tasks/energy, and returns a structured proposal
// the client shows the user before anything changes. See
// src/services/aiOperator.js for how the proposal gets applied.

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };
  }

  let request, snapshot;
  try {
    ({ request, snapshot } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!snapshot || !Array.isArray(snapshot.tasks)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing schedule snapshot' }) };
  }

  const systemPrompt = `You are a scheduling assistant for a solo real estate agent's personal operating system.
You are given the tasks currently assigned to today's schedule (with id, title, priority, energy_type,
due_date, estimated_minutes) and today's current energy level. The user has made a free-text request.

Propose changes ONLY from the task ids you were given — never invent a task. Respond with ONLY a JSON
object, no other text:
{
  "summary": "one or two plain-language sentences explaining what you'd change and why",
  "actions": [
    { "task_id": "<uuid from the list>", "action": "unassign" | "deprioritize" | "keep", "reason": "short reason" }
  ]
}
"unassign" removes it from today's plan (it rolls to tomorrow). "deprioritize" keeps it today but signals
it should move to whatever's left of the day. Only include actions for tasks you're actually changing —
omit tasks you're leaving alone.`;

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
          contents: [{
            role: 'user',
            parts: [{ text: `Request: "${request}"\n\nToday's snapshot:\n${JSON.stringify(snapshot, null, 2)}` }],
          }],
          generationConfig: {
            response_mime_type: 'application/json',
            maxOutputTokens: 800,
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
    const proposal = JSON.parse(cleaned);

    return { statusCode: 200, body: JSON.stringify(proposal) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Replan failed', detail: String(err) }) };
  }
};
