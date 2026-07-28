// netlify/functions/lib/sendPushToSubscriptions.cjs
//
// The actual "send a push" logic, factored out so both send-push.js
// (on-demand, e.g. a test notification) and check-reminders.js
// (scheduled) call the same code instead of duplicating it.

const webpush = require('web-push');

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not configured in Netlify environment variables.');
  }
  webpush.setVapidDetails('mailto:noreply@example.com', publicKey, privateKey);
  configured = true;
}

/** subscriptions: rows from push_subscriptions (endpoint, keys_p256dh, keys_auth).
 *  payload: { title, body, url?, tag? }
 *  Returns { sent, failed, staleEndpoints } — staleEndpoints are ones
 *  that came back 404/410 (browser unsubscribed, e.g. cleared site
 *  data) and should be deleted from the table so this list stays real. */
async function sendPushToSubscriptions(subscriptions, payload) {
  ensureConfigured();
  let sent = 0, failed = 0;
  const staleEndpoints = [];

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      sent += 1;
    } catch (err) {
      failed += 1;
      if (err.statusCode === 404 || err.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  return { sent, failed, staleEndpoints };
}

module.exports = { sendPushToSubscriptions };
