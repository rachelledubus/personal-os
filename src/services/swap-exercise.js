// netlify/functions/swap-exercise.js
//
// Server-side only, same pattern as the other two functions. Requires
// GOOGLE_AI_API_KEY. Suggests a substitute exercise targeting the same
// muscles — used when you're not feeling a specific exercise that day.
// This is SESSION-ONLY: the client only swaps what's displayed for
// today's logging, never the saved template (workout_exercise_templates).

const MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return { statusCode: 501, body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }) };
  }

  let exerciseName, targetReps, dayLabel, otherExercises;
  try {
    ({ exerciseName, targetReps, dayLabel, otherExercises } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!exerciseName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing exerciseName' }) };
  }

  const systemPrompt = `You are a strength training assistant. The user wants to swap one exercise for an
equivalent that targets the same primary muscle group(s), because they're not feeling the original exercise
today — usually equipment availability, joint discomfort, or just wanting variety. Suggest ONE realistic gym
substitute. Avoid suggesting anything already in their list of other exercises for the day (given below) so
they don't end up doing the same muscle group twice by accident.

Respond with ONLY a JSON object, no other text:
{
  "substitute_name": "Exercise Name",
  "target_reps": "same style as the original, e.g. '8-10' or '10-12/leg'",
  "reasoning": "one short sentence on why this is an equivalent swap"
}`;

  const userPrompt = `Original exercise: "${exerciseName}" (${targetReps || 'no rep target given'})
Day: ${dayLabel || 'unspecified'}
Other exercises already in today's session (avoid overlapping muscle groups with these): ${(otherExercises || []).join(', ') || 'none'}`;

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
    const suggestion = JSON.parse(cleaned);

    return { statusCode: 200, body: JSON.stringify(suggestion) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Swap failed', detail: String(err) }) };
  }
};
