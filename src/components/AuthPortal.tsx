import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  WifiOff,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SupportedLanguage, UserProfile, UserRole } from '../shared/types';

interface AuthPortalProps {
  onAuthenticated: (token: string, user: UserProfile) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onAuthenticated }) => {
  const [roleTab, setRoleTab] = useState<UserRole>('student');
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  // Shared credentials
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Role-specific registration fields
  const [classLevel, setClassLevel] = useState<number>(6);
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('en');
  const [studentCode, setStudentCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [email, setEmail] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<number[]>([6]);
  const [linkedStudentIdentifier, setLinkedStudentIdentifier] = useState('');

  // Reset password fields
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<UserProfile[]>([]);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    fetch('/api/auth/demo-accounts')
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((data) => {
        if (Array.isArray(data.accounts)) {
          setDemoAccounts(data.accounts);
        }
      })
      .catch(() => {
        // Offline or initial load fallback
      });
  }, []);

  const switchRoleTab = (role: UserRole) => {
    setRoleTab(role);
    setError(null);
    setInfoMsg(null);
    if (role === 'admin' && mode === 'register') {
      setMode('login');
    }
  };

  const toggleTeacherClass = (cls: number) => {
    setAssignedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, verificationCode, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Password reset failed.');
          return;
        }
        setInfoMsg('Password updated successfully. You can now sign in with your new password.');
        setMode('login');
        setPassword('');
        setVerificationCode('');
        setNewPassword('');
        return;
      }

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { username, password, expectedRole: roleTab }
          : {
              name,
              username,
              password,
              role: roleTab,
              classLevel,
              preferredLanguage,
              studentCode,
              teacherCode,
              email,
              assignedClasses,
              linkedStudentIdentifier,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      if (data.pendingApproval) {
        setInfoMsg(
          data.message ||
            'Teacher registration submitted and awaiting Administrator approval.'
        );
        setMode('login');
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch {
      setError('Unable to connect to the LEARNLOCAL server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (userId: string) => {
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Demo sign-in failed.');
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch {
      setError('Unable to reach server for demo sign-in.');
    } finally {
      setLoading(false);
    }
  };

  const highlightedDemos = demoAccounts.filter((acc) => {
    if (roleTab === 'teacher') return acc.role === 'teacher';
    if (roleTab === 'parent') return acc.role === 'parent';
    if (roleTab === 'admin') return acc.role === 'admin';
    return ['stu-c4-kabir', 'stu-c6-aarav', 'stu-c6-ishaan', 'stu-c10-ananya'].includes(acc.id);
  });

  const portalAccentBtn =
    roleTab === 'teacher'
      ? 'bg-indigo-600 hover:bg-indigo-700'
      : roleTab === 'parent'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : roleTab === 'admin'
      ? 'bg-slate-900 hover:bg-slate-800'
      : 'bg-sky-600 hover:bg-sky-700';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Clean 3-Zone Top Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            LEARNLOCAL
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#portal" className="hover:text-sky-700 transition-colors whitespace-nowrap shrink-0">
              Role Portals
            </a>
            <a href="#features" className="hover:text-sky-700 transition-colors whitespace-nowrap shrink-0">
              Classes 1–10
            </a>
            <a href="#offline-design" className="hover:text-sky-700 transition-colors whitespace-nowrap shrink-0">
              Offline & Security
            </a>
          </nav>
          <button
            type="button"
            onClick={() => {
              const firstDemo = highlightedDemos[0];
              if (firstDemo) handleDemoLogin(firstDemo.id);
            }}
            className="rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-sky-700 hover:to-indigo-700 transition-all whitespace-nowrap shrink-0"
          >
            Quick Demo Access
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero Split + Auth Portal */}
        <div id="portal" className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Story & Visual Column */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-6">
            <div className="bg-gradient-to-br from-sky-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white">
              <p className="text-xs font-semibold text-sky-200">
                Class 1 to Class 10 · EN / ಕನ್ನಡ / हिन्दी · Offline-First PWA
              </p>
              <h1 className="mt-2.5 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Learning Without Limits. Intelligence Without Internet.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-sky-100">
                Adaptive module practice, timed multi-format mock exams, parent &amp; teacher oversight,
                accessibility modes, and a dedicated right-side doubt tutor—engineered with strict role-based security.
              </p>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/learnlocal_classroom_hero_1795530158973.jpg"
                    alt="Students collaborating with notebooks and a learning tablet in a sunlit classroom"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="h-56 w-full object-cover sm:h-60"
                  />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 p-6 text-center">
                    <BookOpen className="h-10 w-10 text-sky-600" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Adaptive Classroom &amp; Offline Study Companion
                    </p>
                  </div>
                )}
              </div>

              {/* Colourful 6-Subject Spectrum Strip */}
              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {[
                  { label: 'Math', color: 'bg-sky-50 text-sky-800 border-sky-200' },
                  { label: 'Science', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { label: 'English', color: 'bg-violet-50 text-violet-800 border-violet-200' },
                  { label: 'Social / EVS', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                  { label: 'Hindi', color: 'bg-orange-50 text-orange-800 border-orange-200' },
                  { label: 'Computing', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-lg border px-2.5 py-2 text-center text-xs font-semibold ${s.color}`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>

              {/* 3-Item Claim-to-Proof Metric Row */}
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5">
                <div>
                  <div className="font-mono text-xl font-bold text-sky-700 tabular-nums">10 Classes</div>
                  <div className="mt-0.5 text-xs text-slate-500">6 subjects · 4 modules each</div>
                </div>
                <div>
                  <div className="font-mono text-xl font-bold text-emerald-700 tabular-nums">4 Portals</div>
                  <div className="mt-0.5 text-xs text-slate-500">Student · Teacher · Parent · Admin</div>
                </div>
                <div>
                  <div className="font-mono text-xl font-bold text-indigo-700 tabular-nums">100% Offline</div>
                  <div className="mt-0.5 text-xs text-slate-500">IndexedDB + resumable packs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Role-Based Login / Register Column */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-6">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                {/* 4-Portal Role Selector */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
                  {(
                    [
                      { id: 'student', label: 'Student', icon: GraduationCap, active: 'bg-sky-600 text-white' },
                      { id: 'teacher', label: 'Teacher', icon: Users, active: 'bg-indigo-600 text-white' },
                      { id: 'parent', label: 'Parent', icon: HeartHandshake, active: 'bg-emerald-600 text-white' },
                      { id: 'admin', label: 'Admin', icon: ShieldAlert, active: 'bg-slate-900 text-white' },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => switchRoleTab(item.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                          roleTab === item.id
                            ? `${item.active} shadow-sm`
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Login / Register / Reset Header */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    {mode === 'reset'
                      ? 'Verify Identity & Reset Password'
                      : mode === 'login'
                      ? `${
                          roleTab === 'student'
                            ? 'Student'
                            : roleTab === 'teacher'
                            ? 'Teacher'
                            : roleTab === 'parent'
                            ? 'Parent / Guardian'
                            : 'Administrator'
                        } Sign In`
                      : roleTab === 'student'
                      ? 'New Student Registration'
                      : roleTab === 'teacher'
                      ? 'Teacher Application (Admin Approval)'
                      : 'Parent / Guardian Registration'}
                  </h2>

                  <div className="flex items-center gap-3">
                    {mode === 'login' && roleTab !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setError(null);
                          setInfoMsg(null);
                        }}
                        className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0"
                      >
                        Create account
                      </button>
                    )}
                    {mode !== 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0"
                      >
                        Back to Sign In
                      </button>
                    )}
                  </div>
                </div>

                {roleTab === 'admin' && mode === 'login' && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Administrator accounts are invite-only and protected against public signup.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  {mode === 'reset' ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Username</label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter your registered username"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Verification ID or Email (Student ID, Teacher ID, or Email)
                        </label>
                        <input
                          type="text"
                          required
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="e.g., LL-STU-604 or email@example.com"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">New Strong Password</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="8+ chars with upper, lower, number, symbol"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {mode === 'register' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Full Name</label>
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={
                                roleTab === 'student'
                                  ? 'e.g., Meera Nair'
                                  : roleTab === 'teacher'
                                  ? 'e.g., Mr. Suresh Rao'
                                  : 'e.g., Mrs. Lakshmi Nair'
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Username</label>
                            <input
                              type="text"
                              required
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder={
                                roleTab === 'student'
                                  ? 'e.g., meera.c6'
                                  : roleTab === 'teacher'
                                  ? 'e.g., suresh.rao'
                                  : 'e.g., parent.nair'
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {mode === 'login' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            {roleTab === 'teacher'
                              ? 'Username or Teacher ID'
                              : roleTab === 'student'
                              ? 'Username or Student ID'
                              : 'Username'}
                          </label>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={
                              roleTab === 'student'
                                ? 'e.g., aarav.c6 or LL-STU-601'
                                : roleTab === 'teacher'
                                ? 'e.g., teacher.kavitha or LL-TEA-001'
                                : roleTab === 'parent'
                                ? 'e.g., parent.kulkarni'
                                : 'e.g., admin.learnlocal'
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      {mode === 'register' && roleTab === 'student' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Student ID</label>
                            <input
                              type="text"
                              required
                              value={studentCode}
                              onChange={(e) => setStudentCode(e.target.value)}
                              placeholder="e.g., LL-STU-604"
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Class</label>
                            <select
                              value={classLevel}
                              onChange={(e) => setClassLevel(Number(e.target.value))}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
                                <option key={c} value={c}>
                                  Class {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Language</label>
                            <select
                              value={preferredLanguage}
                              onChange={(e) => setPreferredLanguage(e.target.value as SupportedLanguage)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value="en">English</option>
                              <option value="kn">ಕನ್ನಡ (Kannada)</option>
                              <option value="hi">हिन्दी (Hindi)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {mode === 'register' && roleTab === 'teacher' && (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700">Teacher ID</label>
                              <input
                                type="text"
                                required
                                value={teacherCode}
                                onChange={(e) => setTeacherCode(e.target.value)}
                                placeholder="e.g., LL-TEA-010"
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700">Official Email</label>
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="teacher@school.edu"
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">
                              Assigned Classes (Select 1 or more)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => {
                                const selected = assignedClasses.includes(c);
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => toggleTeacherClass(c)}
                                    className={`rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
                                      selected
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    C{c}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {mode === 'register' && roleTab === 'parent' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700">
                              Child&apos;s Username or Student ID
                            </label>
                            <input
                              type="text"
                              required
                              value={linkedStudentIdentifier}
                              onChange={(e) => setLinkedStudentIdentifier(e.target.value)}
                              placeholder="e.g., aarav.c6 or LL-STU-601"
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700">Parent Email</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="parent@example.com"
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-slate-700">Password</label>
                          {mode === 'login' && roleTab !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setMode('reset');
                                setError(null);
                                setInfoMsg(null);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-sky-700"
                            >
                              <KeyRound className="h-3 w-3" />
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={
                            mode === 'register'
                              ? 'Min 8 chars: A-Z, a-z, 0-9, symbol'
                              : 'Enter your password'
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        {mode === 'register' && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Policy: at least 8 characters with uppercase, lowercase, number, and symbol (e.g., Study@2026).
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  {infoMsg && (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{infoMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${portalAccentBtn}`}
                  >
                    {loading
                      ? 'Please wait...'
                      : mode === 'reset'
                      ? 'Verify & Update Password'
                      : mode === 'login'
                      ? `Sign In to ${roleTab.charAt(0).toUpperCase() + roleTab.slice(1)} Portal`
                      : roleTab === 'teacher'
                      ? 'Submit Teacher Application'
                      : 'Register & Start'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Instant Demo Profiles for Current Role */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Instant {roleTab.charAt(0).toUpperCase() + roleTab.slice(1)} Demo Access
                  </span>
                  <span className="text-xs font-medium text-emerald-700">Clean initial state</span>
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {highlightedDemos.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin(acc.id)}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50/60 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-slate-900 truncate">{acc.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {acc.role === 'teacher'
                            ? `Classes ${acc.assignedClasses[0]}–${acc.assignedClasses[acc.assignedClasses.length - 1]}`
                            : acc.role === 'parent'
                            ? 'Linked: Aarav Kulkarni (Class 6)'
                            : acc.role === 'admin'
                            ? 'System Oversight & Approvals'
                            : `Class ${acc.classLevel} · ${acc.studentCode || '@' + acc.username}`}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-sky-700 whitespace-nowrap shrink-0">
                        Enter →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Curriculum & Architecture Overview */}
        <section id="features" className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="h-1 bg-sky-600" />
            <div className="p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900">Practice, Exams &amp; Gamified Goals</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Module-scoped adaptive practice paired with timed Chapter, Subject, and Full Mock Exams across MCQ,
                True/False, Fill-in-the-Blank, and Short Answer formats.
              </p>
            </div>
          </div>
          <div id="offline-design" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="h-1 bg-emerald-600" />
            <div className="p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <WifiOff className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900">Resumable Offline Packs &amp; Low Bandwidth</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Displays pack size before download, resumes interrupted subject packs cleanly, switches into Lightweight
                Mode, and syncs attempts without duplicates.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="h-1 bg-indigo-600" />
            <div className="p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900">Strict RBAC &amp; Parent Monitoring</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Students, Teachers, Parents, and Administrators have isolated permissions, scrypt password hashing,
                rate-limited login protection, and audit logging.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 items-center gap-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <img
              src="/src/assets/images/learnlocal_study_desk_1795530159096.jpg"
              alt="Geometry notebook, brass compass, prism, and tablet ready for offline study"
              referrerPolicy="no-referrer"
              className="h-56 w-full rounded-xl border border-slate-200 object-cover"
            />
          </div>
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-indigo-700">Inclusive Accessibility · EN / ಕನ್ನಡ / हिन्दी</p>
            <h2 className="mt-1.5 text-2xl font-bold text-slate-900">
              Multilingual UI, Audio Read-Aloud &amp; Smart Doubt Tutor
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Switch seamlessly between English, Kannada, and Hindi, turn on Dyslexia-friendly spacing or High-Contrast
              mode, listen to lesson audio via Text-to-Speech, and get everyday examples from the right-side tutor
              (strictly paused during active exams).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <UserCheck className="h-4 w-4" />
                Assessment Cheat-Guard
              </span>
              <span aria-hidden="true">·</span>
              <span>Text-to-Speech Lesson Audio</span>
              <span aria-hidden="true">·</span>
              <span>Dyslexia &amp; High Contrast Modes</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
