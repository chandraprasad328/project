import {
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  ExamAttempt,
  ParentNotification,
  PracticeAttempt,
  StudentAnalyticsReport,
  StudentGamification,
  UserProfile,
} from '../shared/types';

interface ChildReport {
  student: UserProfile;
  analytics: StudentAnalyticsReport;
  gamification: StudentGamification;
  attempts: PracticeAttempt[];
  exams: ExamAttempt[];
  notifications: ParentNotification[];
}

interface ParentDashboardProps {
  parent: UserProfile;
  token: string;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ parent, token }) => {
  const [children, setChildren] = useState<ChildReport[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/parent/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Could not load parent dashboard.');
        setChildren(data.children || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to reach server.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        Loading your child&apos;s learning progress...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
    );
  }

  const child = children[selectedIdx];
  if (!child) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        No linked student profile found for this parent account.
      </div>
    );
  }

  const completedMods = child.analytics.subjects.reduce((s, sub) => s + sub.completedModules, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-2xl border border-emerald-700/20 bg-gradient-to-br from-emerald-700 via-teal-700 to-sky-800 p-6 sm:p-7 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-200">
              Parent &amp; Guardian Portal · Strictly Scoped Access
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              Welcome, {parent.name}
            </h1>
            <p className="mt-1 text-sm text-emerald-100">
              Monitoring {child.student.name} · Class {child.student.classLevel} ·{' '}
              {child.student.studentCode || '@' + child.student.username}
            </p>
          </div>
          {children.length > 1 && (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900"
            >
              {children.map((c, idx) => (
                <option key={c.student.id} value={idx}>
                  {c.student.name} (Class {c.student.classLevel})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-emerald-100">Overall Progress</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {child.analytics.overallProgressPercent}%
            </div>
            <div className="text-[11px] text-emerald-200">{completedMods}/24 modules</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-emerald-100">Practice Accuracy</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {child.analytics.overallAccuracy !== null ? `${child.analytics.overallAccuracy}%` : '—'}
            </div>
            <div className="text-[11px] text-emerald-200 tabular-nums">
              {child.analytics.totalPracticeSessions} practice sessions
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-emerald-100">Active Study Days</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {child.gamification.activeDates.length}
            </div>
            <div className="text-[11px] text-emerald-200 tabular-nums">
              {child.gamification.streakDays} day current streak
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs text-emerald-100">Timed Exams</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{child.exams.length}</div>
            <div className="text-[11px] text-emerald-200">
              Milestone: {child.gamification.milestone}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications & Weekly Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Milestones &amp; Support Alerts</h2>
          </div>
          {child.notifications.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-600">
              No milestone or support alerts yet. Alerts appear automatically as {child.student.name} completes
              practice sessions or achieves 80%+ mastery.
            </p>
          ) : (
            <div className="space-y-2.5">
              {child.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                    n.type === 'milestone'
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                      : 'border-amber-200 bg-amber-50/50 text-amber-950'
                  }`}
                >
                  {n.type === 'milestone' ? (
                    <Award className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>{n.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-6 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Weekly Report &amp; Focus Areas</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {child.gamification.weeklySummary.sessionsThisWeek}
              </div>
              <div className="text-[11px] text-slate-500">Sessions (7d)</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-mono text-lg font-bold text-sky-700 tabular-nums">
                {child.gamification.weeklySummary.averageAccuracy !== null
                  ? `${child.gamification.weeklySummary.averageAccuracy}%`
                  : '—'}
              </div>
              <div className="text-[11px] text-slate-500">Weekly Avg</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                {child.gamification.weeklySummary.improvementDelta !== null
                  ? `${child.gamification.weeklySummary.improvementDelta >= 0 ? '+' : ''}${
                      child.gamification.weeklySummary.improvementDelta
                    }%`
                  : '—'}
              </div>
              <div className="text-[11px] text-slate-500">Weekly Change</div>
            </div>
          </div>
          {child.gamification.weeklySummary.focusAreas.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs text-slate-800">
              <strong>Where Extra Support Helps:</strong>{' '}
              {child.gamification.weeklySummary.focusAreas.join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Subject-Wise Progress Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Subject-Wise Academic Progress (Class {child.student.classLevel})
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {child.analytics.subjects.map((sub) => (
            <div key={sub.subjectId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span>{sub.subjectName}</span>
                <span className="font-mono tabular-nums">
                  {sub.averageAccuracy !== null ? `${sub.averageAccuracy}%` : '—'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {sub.completedModules}/4 modules attempted
              </p>
              <div className="mt-2.5 space-y-1.5">
                {sub.modules.map((m) => (
                  <div key={m.moduleId} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate pr-2">
                      M{m.moduleNumber}: {m.moduleTitle}
                    </span>
                    <span
                      className={`font-mono font-semibold tabular-nums shrink-0 ${
                        m.status === 'Strong'
                          ? 'text-emerald-700'
                          : m.status === 'Needs Revision'
                          ? 'text-red-700'
                          : m.status === 'Developing'
                          ? 'text-amber-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {m.latestAccuracy !== null ? `${m.latestAccuracy}%` : 'Not started'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Practice & Exams */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Recent Practice Sessions</h2>
          </div>
          {child.attempts.length === 0 ? (
            <p className="text-xs text-slate-500">No practice sessions completed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {child.attempts.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{a.moduleTitle}</div>
                    <div className="text-slate-500">
                      {a.subjectName} · {new Date(a.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{a.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Recent Examination Scores</h2>
          </div>
          {child.exams.length === 0 ? (
            <p className="text-xs text-slate-500">No timed exams completed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {child.exams.slice(0, 6).map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {ex.title}
                    </div>
                    <div className="text-slate-500">
                      {ex.marksObtained}/{ex.totalMarks} marks · {new Date(ex.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-indigo-700 tabular-nums">{ex.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
