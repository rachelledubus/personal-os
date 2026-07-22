import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import {
  listGoals, addGoal, listProjects, addProject,
  listProjectTasks, listMilestones, addMilestone, toggleMilestone, markGoalAchieved,
} from '../../services/goals.js';
import {
  listMissions, addMission, completeMission, deleteMission, listTasksForMission, addTaskToMission, toggleMissionTask,
} from '../../services/missions.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

async function listProjectResources(projectId) {
  const { data, error } = await supabase.from('project_resources').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data;
}

async function addProjectResource(projectId, fields) {
  const userId = await getUserId();
  const { error } = await supabase.from('project_resources').insert({ ...fields, project_id: projectId, user_id: userId });
  if (error) throw error;
}

async function listProjectNotes(projectId) {
  const { data, error } = await supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export default function ProjectsTab() {
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');

  async function refresh() {
    const [g, p] = await Promise.all([listGoals(), listProjects()]);
    setGoals(g);
    setProjects(p);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAddGoal() {
    if (!newGoalTitle.trim()) return;
    await addGoal({ title: newGoalTitle.trim() });
    setNewGoalTitle('');
    refresh();
  }

  async function handleMarkAchieved(goalId) {
    await markGoalAchieved(goalId);
    refresh();
  }

  async function handleAddProject() {
    if (!newProjectTitle.trim()) return;
    await addProject({ title: newProjectTitle.trim(), goal_id: newProjectGoal || null });
    setNewProjectTitle('');
    setNewProjectGoal('');
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Goals</div>
        </div>
        {goals.length === 0 ? <EmptyState icon="star" title="No goals yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {goals.map(g => (
              <GoalRow
                key={g.id}
                goal={g}
                expanded={expandedGoal === g.id}
                onToggleExpand={() => setExpandedGoal(expandedGoal === g.id ? null : g.id)}
                onMarkAchieved={() => handleMarkAchieved(g.id)}
              />
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 'var(--space-3)' }}>
          <input placeholder="New goal..." value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} />
          <Button size="sm" onClick={handleAddGoal}>+ Add goal</Button>
        </div>
      </Card>

      <Card>
        <div className="section-label">Projects</div>
        {projects.length === 0 ? <EmptyState icon="map" title="No projects yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-2)' }}>
            {projects.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                expanded={expandedProject === p.id}
                onToggleExpand={() => setExpandedProject(expandedProject === p.id ? null : p.id)}
              />
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <input placeholder="New project..." value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} />
          <select value={newProjectGoal} onChange={e => setNewProjectGoal(e.target.value)}>
            <option value="">No goal</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <Button size="sm" onClick={handleAddProject}>+ Add project</Button>
        </div>
      </Card>
    </div>
  );
}

function GoalRow({ goal, expanded, onToggleExpand, onMarkAchieved }) {
  const [missions, setMissions] = useState([]);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [expandedMission, setExpandedMission] = useState(null);

  useEffect(() => {
    if (!expanded) return;
    listMissions({ goalId: goal.id }).then(setMissions);
  }, [expanded, goal.id]);

  async function refreshMissions() {
    setMissions(await listMissions({ goalId: goal.id }));
  }

  async function handleAddMission() {
    if (!newMissionTitle.trim()) return;
    await addMission({ title: newMissionTitle.trim(), goal_id: goal.id });
    setNewMissionTitle('');
    refreshMissions();
  }

  async function handleCompleteMission(id) {
    await completeMission(id);
    refreshMissions();
  }

  async function handleDeleteMission(id) {
    await deleteMission(id);
    refreshMissions();
  }

  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid var(--sand)', cursor: 'pointer' }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }} onClick={onToggleExpand}>
        <div>
          <div style={{ fontWeight: 700 }}>{goal.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {goal.category} · {goal.status}
            {missions.length > 0 && ` · ${missions.filter(m => m.status === 'completed').length}/${missions.length} missions`}
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
          {goal.target_date && <div className="muted" style={{ fontSize: 12 }}>{goal.target_date}</div>}
          {goal.status !== 'Achieved' && (
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onMarkAchieved(); }}>Mark achieved</Button>
          )}
        </div>
      </div>
      {goal.target_value != null && (
        <div style={{ marginTop: 6 }} onClick={e => e.stopPropagation()}>
          <ProgressBar value={goal.current_value || 0} max={goal.target_value} />
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{goal.current_value || 0} / {goal.target_value}</div>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
          <div className="section-label">Missions</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
            Optional — a Mission groups a few Tasks under one outcome, like "Prepare for consultation."
          </div>
          {missions.length === 0 ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 'var(--space-2)' }}>No missions yet — not every goal needs one.</div>
          ) : (
            <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
              {missions.map(m => (
                <MissionRow
                  key={m.id}
                  mission={m}
                  expanded={expandedMission === m.id}
                  onToggleExpand={() => setExpandedMission(expandedMission === m.id ? null : m.id)}
                  onComplete={() => handleCompleteMission(m.id)}
                  onDelete={() => handleDeleteMission(m.id)}
                />
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="New mission..." value={newMissionTitle} onChange={e => setNewMissionTitle(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={handleAddMission}>+ Add mission</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionRow({ mission, expanded, onToggleExpand, onComplete, onDelete }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (!expanded) return;
    listTasksForMission(mission.id).then(setTasks);
  }, [expanded, mission.id]);

  async function refreshTasks() {
    setTasks(await listTasksForMission(mission.id));
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    await addTaskToMission(mission.id, newTaskTitle.trim());
    setNewTaskTitle('');
    refreshTasks();
  }

  async function handleToggleTask(taskId, done) {
    await toggleMissionTask(taskId, done);
    refreshTasks();
  }

  const doneCount = tasks.filter(t => t.completed).length;

  return (
    <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2)' }}>
      <div className="row-between" onClick={onToggleExpand} style={{ cursor: 'pointer' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, textDecoration: mission.status === 'completed' ? 'line-through' : 'none' }}>
            {mission.title}
          </span>
          {tasks.length > 0 && <span className="muted" style={{ fontSize: 11 }}> · {doneCount}/{tasks.length} tasks</span>}
        </div>
        {mission.status !== 'completed' && (
          <div className="row" style={{ gap: 4 }}>
            <Button size="sm" variant="text" onClick={e => { e.stopPropagation(); onComplete(); }}>Complete</Button>
            <Button size="sm" variant="text" onClick={e => { e.stopPropagation(); onDelete(); }}>Delete</Button>
          </div>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 'var(--space-2)' }} onClick={e => e.stopPropagation()}>
          <div className="stack" style={{ gap: 4 }}>
            {tasks.map(t => (
              <Checkbox key={t.id} checked={t.completed} onChange={v => handleToggleTask(t.id, v)} label={t.title} />
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="New task..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={handleAddTask}>+ Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, expanded, onToggleExpand }) {
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [resources, setResources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [newResource, setNewResource] = useState({ title: '', url: '' });

  useEffect(() => {
    if (!expanded) return;
    (async () => {
      const [t, m, r, n] = await Promise.all([
        listProjectTasks(project.id),
        listMilestones({ projectId: project.id }),
        listProjectResources(project.id),
        listProjectNotes(project.id),
      ]);
      setTasks(t); setMilestones(m); setResources(r); setNotes(n);
    })();
  }, [expanded, project.id]);

  const doneMilestones = milestones.filter(m => m.completed).length;
  const progressPct = milestones.length ? Math.round((doneMilestones / milestones.length) * 100) : null;
  const doneTasks = tasks.filter(t => t.completed).length;

  async function handleAddMilestone() {
    if (!newMilestone.trim()) return;
    await addMilestone({ project_id: project.id, title: newMilestone.trim(), sort_order: milestones.length });
    setNewMilestone('');
    setMilestones(await listMilestones({ projectId: project.id }));
  }

  async function handleAddResource() {
    if (!newResource.title.trim()) return;
    await addProjectResource(project.id, newResource);
    setNewResource({ title: '', url: '' });
    setResources(await listProjectResources(project.id));
  }

  return (
    <div className="planner-block" style={{ cursor: 'pointer' }}>
      <div className="row-between" onClick={onToggleExpand}>
        <div>
          <div style={{ fontWeight: 700 }}>{project.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {project.status}
            {project.goals?.title && ` · ${project.goals.title}`}
            {tasks.length > 0 && ` · ${doneTasks}/${tasks.length} tasks`}
            {progressPct !== null && ` · ${progressPct}% milestones`}
          </div>
        </div>
        {project.due_date && <div className="muted" style={{ fontSize: 12 }}>{project.due_date}</div>}
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-4)' }} onClick={e => e.stopPropagation()}>
          <div className="section-label">Milestones</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {milestones.map(m => (
              <Checkbox key={m.id} checked={m.completed} onChange={v => toggleMilestone(m.id, v).then(() => listMilestones({ projectId: project.id }).then(setMilestones))} label={m.title} />
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="New milestone..." value={newMilestone} onChange={e => setNewMilestone(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={handleAddMilestone}>+ Add</Button>
          </div>

          <div className="section-label" style={{ marginTop: 'var(--space-4)' }}>Tasks</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {tasks.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No tasks linked yet — add project_id when creating a task.</div>}
            {tasks.map(t => (
              <div key={t.id} className="muted" style={{ fontSize: 13 }}>{t.completed ? '✓ ' : '○ '}{t.title}</div>
            ))}
          </div>

          <div className="section-label" style={{ marginTop: 'var(--space-4)' }}>Resources</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {resources.map(r => (
              <div key={r.id} style={{ fontSize: 13 }}>
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            <input placeholder="Resource title..." value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} />
            <input placeholder="URL (optional)" value={newResource.url} onChange={e => setNewResource({ ...newResource, url: e.target.value })} />
            <Button size="sm" variant="ghost" onClick={handleAddResource}>+ Add</Button>
          </div>

          <div className="section-label" style={{ marginTop: 'var(--space-4)' }}>Notes</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {notes.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No notes yet — capture one from the Inbox and attach it here.</div>}
            {notes.map(n => <div key={n.id} className="muted" style={{ fontSize: 13, borderBottom: '1px solid var(--sand)', padding: '4px 0' }}>{n.content}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
