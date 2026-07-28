// netlify/functions/submit-lead-form.cjs
//
// PUBLIC endpoint — this is what your actual website's lead magnet
// forms POST to. No user session exists (an anonymous visitor is
// submitting), so this uses the Supabase service-role key, same
// pattern as check-reminders.js. Since the app is single-user right
// now, SITE_OWNER_USER_ID (a Netlify env var, your own Supabase auth
// user id — find it in Supabase Dashboard -> Authentication -> Users)
// tells this function whose contacts/automations to write into.
//
// Flow: upsert contact by email -> merge in any new tags -> if an
// automation name was given, enroll them (current_step 0, next_send
// = now + that step's delay_days).

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGIN = process.env.SITE_ORIGIN || '*'; // set SITE_ORIGIN to your real domain once you have one, for real CORS protection instead of wildcard

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerUserId = process.env.SITE_OWNER_USER_ID;
  if (!supabaseUrl || !serviceRoleKey || !ownerUserId) {
    return { statusCode: 501, headers: corsHeaders(), body: JSON.stringify({ error: 'Not configured — missing SUPABASE_SERVICE_ROLE_KEY or SITE_OWNER_USER_ID' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { name, email, phone, tags, automation_name, honeypot } = payload;

  // Simplest possible spam trap: a hidden field named "honeypot" that
  // real visitors never see or fill, real bots often do.
  if (honeypot) return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: true }) }; // silently succeed, don't tip off the bot

  if (!isValidEmail(email)) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'A valid email is required' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Find existing contact by email (case-insensitive) for this owner, or create one.
    const { data: existing } = await supabase.from('contacts').select('id, tags')
      .eq('user_id', ownerUserId).ilike('email', email).limit(1);

    let contactId;
    if (existing && existing.length > 0) {
      contactId = existing[0].id;
      const mergedTags = Array.from(new Set([...(existing[0].tags || []), ...(tags || [])]));
      await supabase.from('contacts').update({ tags: mergedTags, name: name || undefined, phone: phone || undefined }).eq('id', contactId);
    } else {
      const { data: created, error: createErr } = await supabase.from('contacts').insert({
        user_id: ownerUserId, name: name || email, email, phone: phone || null,
        tags: tags || [], category: 'Lead',
      }).select('id').single();
      if (createErr) throw createErr;
      contactId = created.id;
    }

    let enrolled = false;
    if (automation_name) {
      const { data: automation } = await supabase.from('automations').select('id')
        .eq('user_id', ownerUserId).eq('name', automation_name).eq('active', true).maybeSingle();
      if (automation) {
        const { data: firstStep } = await supabase.from('automation_steps').select('delay_days')
          .eq('automation_id', automation.id).eq('step_order', 0).maybeSingle();
        const nextSend = new Date();
        nextSend.setDate(nextSend.getDate() + (firstStep?.delay_days || 0));
        // Don't double-enroll someone already active in this automation.
        const { data: alreadyActive } = await supabase.from('automation_enrollments').select('id')
          .eq('contact_id', contactId).eq('automation_id', automation.id).eq('status', 'active').limit(1);
        if (!alreadyActive || alreadyActive.length === 0) {
          await supabase.from('automation_enrollments').insert({
            user_id: ownerUserId, contact_id: contactId, automation_id: automation.id,
            current_step: 0, next_send: nextSend.toISOString(), status: 'active',
          });
          enrolled = true;
        }
      }
    }

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: true, enrolled }) };
  } catch (err) {
    console.error('submit-lead-form failed:', err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
