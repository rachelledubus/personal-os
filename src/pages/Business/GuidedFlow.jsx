import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { FLOWS, startFlow, getActiveFlowRun, saveFlowStep, completeFlow } from '../../services/flows.js';

const FIELD_LABELS = {
  name: 'Name', phone: 'Phone', email: 'Email', source: 'Source',
  category: 'Category', timeline: 'Timeline', buyer_seller: 'Buyer or seller',
  persona: 'Persona', location_interest: 'Location interest',
  next_action: 'Next action', next_follow_up_date: 'Next follow-up date',
  situation_notes: 'Situation & timeline notes', lifestyle_notes: 'Lifestyle priorities',
  comfortable_payment: 'Comfortable monthly payment', budget_notes: 'Budget notes',
  must_haves: 'Must-haves', deal_breakers: 'Deal-breakers', note: 'Note',
  question: 'The question this content answers', audience: 'Audience',
  goal: 'Goal', trade_off: 'Trade-off to explain', cta: 'CTA', draft_notes: 'Draft',
  fact_checked: 'Fact-checked? (yes/no)',
};

export default function GuidedFlow() {
  const { flowKey } = useParams();
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get('contact') || null;
  const navigate = useNavigate();

  const flow = FLOWS[flowKey];
  const [run, setRun] = useState(null);
  const [values, setValues] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      let existing = await getActiveFlowRun(flowKey);
      if (!existing) existing = await startFlow(flowKey, contactId);
      setRun(existing);
      setValues(existing.answers || {});
    })();
  }, [flowKey]);

  if (!flow) return <div>Unknown flow.</div>;
  if (!run) return <div>Loading…</div>;

  const stepIndex = Math.min(run.current_step, flow.steps.length - 1);
  const step = flow.steps[stepIndex];
  const isLastStep = stepIndex === flow.steps.length - 1;

  async function handleNext() {
    const stepAnswers = {};
    step.fields.forEach(f => { stepAnswers[f] = values[f] || ''; });

    if (isLastStep) {
      await saveFlowStep(run.id, stepAnswers, stepIndex);
      await completeFlow(run.id, flowKey, contactId);
      setDone(true);
    } else {
      const merged = await saveFlowStep(run.id, stepAnswers, stepIndex + 1);
      setValues(merged);
      setRun({ ...run, current_step: stepIndex + 1 });
    }
  }

  function handleBack() {
    if (stepIndex === 0) return;
    setRun({ ...run, current_step: stepIndex - 1 });
  }

  if (done) {
    return (
      <div>
        <div className="page-title">{flow.label}</div>
        <Card>
          <p>Done — saved to your records.</p>
          <Button variant="primary" onClick={() => navigate('/business/contacts')}>Back to Business</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">{flow.label}</div>
      <Card>
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Step {stepIndex + 1} of {flow.steps.length}</div>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>{step.title}</h3>

        <div className="stack">
          {step.fields.map(f => (
            <label key={f} className="reset-field">
              <span>{FIELD_LABELS[f] || f}</span>
              <input
                value={values[f] || ''}
                onChange={e => setValues({ ...values, [f]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
          <Button variant="ghost" onClick={handleBack} disabled={stepIndex === 0}>Back</Button>
          <Button variant="primary" onClick={handleNext}>{isLastStep ? 'Finish' : 'Next'}</Button>
        </div>
      </Card>
    </div>
  );
}
