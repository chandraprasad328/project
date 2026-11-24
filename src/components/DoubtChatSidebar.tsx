import { Bot, ChevronRight, Globe, HelpCircle, Lock, Send, Sparkles, Trash2, WifiOff } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { generateOfflineDoubtReply } from '../lib/offlineChat';
import { getChatHistoryOffline, saveChatHistoryOffline } from '../lib/offlineDb';
import {
  DoubtChatMessage,
  LearningModule,
  QuestionItem,
  SupportedLanguage,
  UserProfile,
} from '../shared/types';

interface DoubtChatSidebarProps {
  user: UserProfile;
  token: string;
  isEffectivelyOnline: boolean;
  activeModule: LearningModule | null;
  isPracticeMode: boolean;
  isExamMode?: boolean;
  uiLanguage?: SupportedLanguage;
  currentPracticeQuestion: QuestionItem | null;
  pendingPrompt: string | null;
  onConsumePendingPrompt: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

const QUICK_CHIPS = [
  'Explain this again more simply',
  'Give me an everyday life example',
  'Explain this module step by step',
];

const PRACTICE_CHIPS = [
  'Give me a progressive hint for this question',
  'Explain the rule simply without the answer',
  'Give me a similar everyday example',
];

export const DoubtChatSidebar: React.FC<DoubtChatSidebarProps> = ({
  user,
  token,
  isEffectivelyOnline,
  activeModule,
  isPracticeMode,
  isExamMode = false,
  uiLanguage,
  currentPracticeQuestion,
  pendingPrompt,
  onConsumePendingPrompt,
  isOpen,
  onToggleOpen,
}) => {
  const [messages, setMessages] = useState<DoubtChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>(uiLanguage || user.preferredLanguage || 'en');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (uiLanguage) {
      setLanguage(uiLanguage);
    }
  }, [uiLanguage]);

  useEffect(() => {
    getChatHistoryOffline(user.id).then((saved) => {
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        const welcome: DoubtChatMessage = {
          id: 'welcome-msg',
          role: 'assistant',
          text: `Hello ${user.name.split(' ')[0]}! Ask me any doubt about your ${
            user.role === 'teacher' ? 'selected class & module' : `Class ${user.classLevel || 6} lessons`
          }. Use "Explain simply" or "Everyday example" anytime—and when internet is off, I automatically use cached guides.`,
          mode: isEffectivelyOnline ? 'online-ai' : 'offline-cache',
          language,
          timestamp: new Date().toISOString(),
        };
        setMessages([welcome]);
      }
    });
  }, [user.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const contextLabel = activeModule
      ? `Class ${activeModule.classLevel} · ${activeModule.subjectName} · M${activeModule.moduleNumber}`
      : `Class ${user.classLevel || 6}`;

    const userMsg: DoubtChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      mode: isEffectivelyOnline ? 'online-ai' : 'offline-cache',
      language,
      contextLabel,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    await saveChatHistoryOffline(user.id, nextMessages);

    let replyText = '';
    let usedMode: 'online-ai' | 'offline-cache' = 'offline-cache';

    const moduleContent = activeModule
      ? [
          `Title: ${activeModule.title}`,
          `Summary: ${activeModule.summary}`,
          `Explanation: ${activeModule.moduleExplanation}`,
          ...activeModule.learningMaterial.map(
            (s) => `${s.heading}: ${s.explanation} Rule: ${s.keyRule} Example: ${s.example}`
          ),
        ].join('\n')
      : '';

    if (isExamMode) {
      replyText = generateOfflineDoubtReply({
        query: trimmed,
        classLevel: activeModule?.classLevel || user.classLevel || 6,
        activeModule,
        language,
        isPracticeMode,
        isExamMode: true,
        currentPracticeQuestion,
      });
      usedMode = 'offline-cache';
    } else if (isEffectivelyOnline) {
      try {
        const res = await fetch('/api/doubt-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: trimmed,
            classLevel: activeModule?.classLevel || user.classLevel || 6,
            subjectName: activeModule?.subjectName || 'General',
            moduleTitle: activeModule?.title || 'Overview',
            moduleContent,
            language,
            isPracticeMode,
            isExamMode,
            currentPracticeQuestion: currentPracticeQuestion?.prompt,
            history: nextMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        const data = await res.json();
        if (res.ok && data.reply) {
          replyText = data.reply;
          usedMode = 'online-ai';
        } else {
          const offlineReply = generateOfflineDoubtReply({
            query: trimmed,
            classLevel: activeModule?.classLevel || user.classLevel || 6,
            activeModule,
            language,
            isPracticeMode,
            isExamMode,
            currentPracticeQuestion,
          });
          replyText =
            data.code === 'NO_API_KEY'
              ? offlineReply
              : `${offlineReply}\n\n(Note: ${data.error || 'Used cached module guide'})`;
          usedMode = 'offline-cache';
        }
      } catch {
        replyText = generateOfflineDoubtReply({
          query: trimmed,
          classLevel: activeModule?.classLevel || user.classLevel || 6,
          activeModule,
          language,
          isPracticeMode,
          isExamMode,
          currentPracticeQuestion,
        });
        usedMode = 'offline-cache';
      }
    } else {
      replyText = generateOfflineDoubtReply({
        query: trimmed,
        classLevel: activeModule?.classLevel || user.classLevel || 6,
        activeModule,
        language,
        isPracticeMode,
        isExamMode,
        currentPracticeQuestion,
      });
      usedMode = 'offline-cache';
    }

    const assistantMsg: DoubtChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      text: replyText,
      mode: usedMode,
      language,
      contextLabel,
      timestamp: new Date().toISOString(),
    };

    const updated = [...nextMessages, assistantMsg];
    setMessages(updated);
    await saveChatHistoryOffline(user.id, updated);
    setSending(false);
  };

  useEffect(() => {
    if (pendingPrompt) {
      sendMessage(pendingPrompt);
      onConsumePendingPrompt();
    }
  }, [pendingPrompt]);

  const handleClearHistory = async () => {
    const resetMsg: DoubtChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      text: 'Chat cleared. Ask any question about your current lesson or request a step-by-step hint!',
      mode: isEffectivelyOnline ? 'online-ai' : 'offline-cache',
      language,
      timestamp: new Date().toISOString(),
    };
    setMessages([resetMsg]);
    await saveChatHistoryOffline(user.id, [resetMsg]);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label="Open AI Doubt-Clearing Chatbox"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-sky-700 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-sky-700 transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        Doubt Tutor
      </button>
    );
  }

  const chips = isPracticeMode ? PRACTICE_CHIPS : QUICK_CHIPS;

  return (
    <aside
      aria-label="AI Doubt-Clearing Chatbox"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:w-96 lg:static lg:z-auto lg:w-88 xl:w-96 lg:shadow-none shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50/80 to-indigo-50/80 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-indigo-600 text-white shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">Doubt-Clearing Tutor</h2>
            <p className="text-xs font-medium text-sky-700 truncate">
              {isEffectivelyOnline ? 'Online AI + Local Cache' : 'Offline Cached Mode'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleClearHistory}
            title="Clear conversation history"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            title="Collapse chatbox"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Context & Language Bar */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-slate-700 truncate">
            {activeModule
              ? `Class ${activeModule.classLevel} · ${activeModule.subjectName} · M${activeModule.moduleNumber}`
              : `Class ${user.classLevel || 6} Overview`}
          </span>
          {isExamMode ? (
            <span className="font-semibold text-red-700 whitespace-nowrap shrink-0">
              Exam Guard Active
            </span>
          ) : isPracticeMode ? (
            <span className="font-semibold text-amber-700 whitespace-nowrap shrink-0">
              Hint-Only Mode
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5" />
            Language
          </span>
          <div className="flex items-center gap-1 rounded-md bg-white border border-slate-200 p-0.5">
            {(
              [
                { code: 'en', label: 'EN' },
                { code: 'kn', label: 'ಕನ್ನಡ' },
                { code: 'hi', label: 'हिन्दी' },
              ] as const
            ).map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  language === lang.code
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isExamMode && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Assessment Guard: Answers &amp; hints are paused until you submit your exam.</span>
        </div>
      )}

      {!isEffectivelyOnline && !isExamMode && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Offline Mode: Answering from cached module notes &amp; FAQs.</span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {msg.text}
            </div>
            <span className="mt-1 text-[11px] text-slate-400">
              {msg.role === 'assistant'
                ? msg.mode === 'online-ai'
                  ? 'AI Tutor'
                  : 'Offline Guide'
                : 'You'}
              {msg.contextLabel ? ` · ${msg.contextLabel}` : ''}
            </span>
          </div>
        ))}
        {sending && (
          <div className="text-xs text-slate-500">Thinking through your question...</div>
        )}
      </div>

      {/* Smart Tutor Action Buttons + Quick Chips */}
      {!isExamMode && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-2 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={sending}
              onClick={() => sendMessage('Explain again more simply for my class level')}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              <Sparkles className="h-3 w-3" />
              Explain Simply
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => sendMessage('Give me an everyday life example for this concept')}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Give Me an Example
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={sending}
                onClick={() => sendMessage(chip)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-sky-300 hover:text-sky-800 transition-colors text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-slate-200 p-3 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          disabled={isExamMode}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isExamMode
              ? 'Tutor locked during active exam...'
              : isPracticeMode
              ? 'Ask for a hint on this question...'
              : activeModule
              ? `Ask about ${activeModule.title}...`
              : 'Ask any study doubt...'
          }
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || isExamMode}
          aria-label="Send doubt question"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
};
