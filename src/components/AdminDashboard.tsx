import {
  Activity,
  CheckCircle2,
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AccountStatus, AuditLogEntry, LearningModule, UserProfile } from '../shared/types';

interface AdminOverviewResponse {
  users: UserProfile[];
  stats: {
    totalUsers: number;
    studentsCount: number;
    teachersCount: number;
    pendingTeachersCount: number;
    parentsCount: number;
    totalPracticeAttempts: number;
    totalExamsCompleted: number;
    totalModules: number;
    verifiedModules: number;
    dbSizeKB: number;
    backupCount: number;
  };
  modulesSummary: LearningModule[];
  auditLogs: AuditLogEntry[];
  apiErrors: Array<{ id: string; endpoint: string; message: string; timestamp: string }>;
}

interface AdminDashboardProps {
  admin: UserProfile;
  token: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, token }) => {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load admin overview.');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reach admin API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

  const updateUser = async (
    userId: string,
    patch: { status?: AccountStatus; assignedClasses?: number[]; classLevel?: number }
  ) => {
    setActionMsg(null);
    const res = await fetch(`/api/admin/user/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setActionMsg('User access record updated.');
      await fetchOverview();
    }
  };

  const toggleVerifyModule = async (moduleId: string, currentVerified: boolean) => {
    const res = await fetch(`/api/admin/curriculum/${moduleId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ verified: !currentVerified }),
    });
    if (res.ok) {
      setActionMsg('Curriculum verification status updated.');
      await fetchOverview();
    }
  };

  const handleDownloadBackup = async () => {
    const res = await fetch('/api/admin/backup', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learnlocal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMsg('Database backup created and downloaded.');
    await fetchOverview();
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        Loading Administrator Console...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Admin overview unavailable.'}
      </div>
    );
  }

  const pendingTeachers = data.users.filter((u) => u.role === 'teacher' && u.status === 'pending');
  const filteredUsers =
    roleFilter === 'all' ? data.users : data.users.filter((u) => u.role === roleFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 p-6 sm:p-7 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-sky-300">
              System Administrator Console · {admin.name}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              Platform Governance, Approvals &amp; Backups
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Download className="h-3.5 w-3.5" />
              Create &amp; Download Backup
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-white/10 p-3.5">
            <div className="text-xs text-slate-300">Total Accounts</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{data.stats.totalUsers}</div>
            <div className="text-[11px] text-slate-300 tabular-nums">
              {data.stats.studentsCount}S · {data.stats.teachersCount}T · {data.stats.parentsCount}P
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5">
            <div className="text-xs text-amber-200">Pending Teachers</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
              {data.stats.pendingTeachersCount}
            </div>
            <div className="text-[11px] text-slate-300">awaiting approval</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5">
            <div className="text-xs text-slate-300">Assessments</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
              {data.stats.totalPracticeAttempts + data.stats.totalExamsCompleted}
            </div>
            <div className="text-[11px] text-slate-300 tabular-nums">
              {data.stats.totalPracticeAttempts} practice · {data.stats.totalExamsCompleted} exams
            </div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5">
            <div className="text-xs text-slate-300">Verified Modules</div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
              {data.stats.verifiedModules}/{data.stats.totalModules}
            </div>
            <div className="text-[11px] text-slate-300">Class 1–10 syllabus</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3.5">
            <div className="text-xs text-slate-300">Database Storage</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{data.stats.dbSizeKB} KB</div>
            <div className="text-[11px] text-slate-300 tabular-nums">{data.stats.backupCount} backup(s)</div>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          {actionMsg}
        </div>
      )}

      {/* Pending Teacher Approvals */}
      {pendingTeachers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-bold text-amber-950">
              Pending Teacher Approvals ({pendingTeachers.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pendingTeachers.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-4"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-600">
                    @{t.username} · {t.teacherCode || 'No ID'} · {t.email || 'No email'} · Classes{' '}
                    {t.assignedClasses.join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateUser(t.id, { status: 'active' })}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUser(t.id, { status: 'suspended' })}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Directory & RBAC Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">User Directory &amp; Role Management</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {['all', 'student', 'teacher', 'parent', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                  roleFilter === r
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Scope / Class</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-2.5">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-slate-500">
                      @{u.username} {u.studentCode ? `· ${u.studentCode}` : u.teacherCode ? `· ${u.teacherCode}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-semibold uppercase text-slate-700">{u.role}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {u.role === 'student'
                      ? `Class ${u.classLevel} (${u.section || 'A'})`
                      : u.role === 'teacher'
                      ? `Classes: ${u.assignedClasses.join(', ')}`
                      : u.role === 'parent'
                      ? `${u.linkedStudentIds?.length || 0} linked student(s)`
                      : 'Global Admin'}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">
                    <span
                      className={
                        u.status === 'active'
                          ? 'text-emerald-700'
                          : u.status === 'pending'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {u.id !== admin.id && (
                      <button
                        type="button"
                        onClick={() =>
                          updateUser(u.id, {
                            status: u.status === 'active' ? 'suspended' : 'active',
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {u.status === 'active' ? (
                          <>
                            <UserX className="h-3 w-3 text-red-600" /> Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 text-emerald-600" /> Activate
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Curriculum Verification & Audit Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Curriculum Quality Verification</h2>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
            {data.modulesSummary.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{m.title}</div>
                  <div className="text-slate-500">
                    Class {m.classLevel} · {m.subjectName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVerifyModule(m.id, Boolean(m.verifiedByAdmin))}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold shrink-0 ${
                    m.verifiedByAdmin
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {m.verifiedByAdmin ? 'Verified' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Security &amp; Activity Audit Log</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Database className="h-3.5 w-3.5" />
              {data.apiErrors.length} API error(s)
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
            {data.auditLogs.slice(0, 25).map((log) => (
              <div key={log.id} className="py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-indigo-700">{log.action}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="mt-0.5 text-slate-700">
                  <strong>{log.actorName}</strong> ({log.actorRole}) — {log.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
