// netlify/functions/send-push.js
//
// On-demand send, scoped to the authenticated caller's own
// subscriptions only — this is what "Send me a test notification"
// calls. The scheduled reminder check (check-reminders.js) is
// separate since it needs to reach across all users, which requires
// the service-role key, not a user's own session token.

const { createClient } = require('@supabase/supabase-js');
const { sendPushToSubscriptions } = require('./_lib/sendPushToSubscriptions.js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Missing auth token' }) };

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { statusCode: 501, body: JSON.stringify({ error: 'Supabase env vars not configured' }) };
  }

  // A client scoped to this caller's own token — RLS still applies,
  // so this can only ever see/send to their own subscriptions.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session' }) };

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }
  if (!payload.title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing title' }) };

  const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('*').eq('user_id', user.id);
  if (subError) return { statusCode: 500, body: JSON.stringify({ error: subError.message }) };
  if (!subs || subs.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No push subscription on file \u2014 enable notifications first.' }) };
  }

  try {
    const result = await sendPushToSubscriptions(subs, payload);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
