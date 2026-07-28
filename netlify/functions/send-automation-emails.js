// netlify/functions/send-automation-emails.js
//
// The actual engine. Runs every 15 minutes (see netlify.toml).
// Checks every active enrollment where next_send <= now(), sends
// that step's email via Resend, advances to the next step (or marks
// the enrollment complete if there isn't one), and computes the new
// next_send from the next step's delay_days. Deterministic state
// machine — no AI involved, exactly as specced.
//
// Needs two new Netlify env vars: RESEND_API_KEY (from resend.com —
// free tier covers a real amount of volume) and FROM_EMAIL (must be
// on a domain you've verified in Resend; Resend rejects sends from
// unverified domains).

const { createClient } = require('@supabase/supabase-js');

function fillTemplate(text, contact) {
  return (text || '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, (contact.name || '').split(' ')[0] || 'there')
    .replace(/\{\{\s*name\s*\}\}/gi, contact.name || 'there')
    .replace(/\{\{\s*email\s*\}\}/gi, contact.email || '');
}

async function sendEmail(apiKey, fromEmail, to, subject, body) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: fromEmail, to, subject, text: body }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error: ${errText.slice(0, 200)}`);
  }
}

exports.handler = async () => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    if (!supabaseUrl || !serviceRoleKey) {
      return { statusCode: 501, body: JSON.stringify({ error: 'Missing Supabase service-role configuration' }) };
    }
    if (!resendKey || !fromEmail) {
      console.error('RESEND_API_KEY / FROM_EMAIL not configured — automation emails cannot send yet.');
      return { statusCode: 501, body: JSON.stringify({ error: 'Missing RESEND_API_KEY or FROM_EMAIL' }) };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();

    const { data: due, error } = await supabase
      .from('automation_enrollments')
      .select('*, contacts(name, email), automations(name)')
      .eq('status', 'active')
      .lte('next_send', now.toISOString());
    if (error) throw error;

    let sent = 0, completed = 0, failed = 0;

    for (const enrollment of due || []) {
      try {
        const contact = enrollment.contacts;
        if (!contact?.email) { failed += 1; continue; }

        const { data: step } = await supabase.from('automation_steps').select('*, email_templates(subject, body)')
          .eq('automation_id', enrollment.automation_id).eq('step_order', enrollment.current_step).maybeSingle();

        if (step?.email_templates) {
          const subject = fillTemplate(step.email_templates.subject, contact);
          const body = fillTemplate(step.email_templates.body, contact);
          await sendEmail(resendKey, fromEmail, contact.email, subject, body);
          sent += 1;
        }

        const { data: nextStep } = await supabase.from('automation_steps').select('delay_days')
          .eq('automation_id', enrollment.automation_id).eq('step_order', enrollment.current_step + 1).maybeSingle();

        if (nextStep) {
          const nextSend = new Date();
          nextSend.setDate(nextSend.getDate() + nextStep.delay_days);
          await supabase.from('automation_enrollments').update({
            current_step: enrollment.current_step + 1, next_send: nextSend.toISOString(), last_sent_at: now.toISOString(),
          }).eq('id', enrollment.id);
        } else {
          await supabase.from('automation_enrollments').update({
            status: 'completed', last_sent_at: now.toISOString(),
          }).eq('id', enrollment.id);
          completed += 1;
        }
      } catch (stepErr) {
        console.error(`Enrollment ${enrollment.id} failed:`, stepErr);
        failed += 1;
      }
    }

    return { statusCode: 200, body: JSON.stringify({ checked: (due || []).length, sent, completed, failed }) };
  } catch (err) {
    console.error('send-automation-emails failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
