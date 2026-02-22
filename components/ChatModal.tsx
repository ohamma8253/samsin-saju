'use client';

import { useState, useRef, useEffect } from 'react';
import { deductCookies, getCookieCount } from '@/lib/cookies';
import type { ReportContext } from '@/lib/claude';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  responses?: { cheongwoon: string; taeeul: string; luna: string };
}

interface BirthParams {
  name: string; year: string; month: string; day: string;
  hour: string; minute: string; gender: string; city?: string;
}

interface Props {
  params: BirthParams;
  onClose: () => void;
  onNeedCookies: () => void;
  reportContext?: ReportContext;
}

const CHAR_CONFIG = {
  cheongwoon: { name: '청운', emoji: '🌿', color: '#4ca87d' },
  taeeul:     { name: '태을', emoji: '☁️', color: '#a78bfa' },
  luna:       { name: '루나', emoji: '✦', color: '#c9a84c' },
};

const COST = 2;

export default function ChatModal({ params, onClose, onNeedCookies, reportContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    if (getCookieCount() < COST) { onNeedCookies(); return; }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const ok = deductCookies(COST);
    if (!ok) { onNeedCookies(); setLoading(false); return; }

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history, reportContext, ...params }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        responses: data.response,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: 'rgba(6,6,15,0.96)' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <div className="flex items-center gap-3">
          {Object.values(CHAR_CONFIG).map(c => (
            <span key={c.name} className="text-lg">{c.emoji}</span>
          ))}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>세 신에게 묻다</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🍪 {getCookieCount()}개 · {COST}개/질문</span>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <p className="text-2xl">🌿 ☁️ ✦</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              무엇이든 물어보세요.<br />세 신이 각자의 관점으로 답합니다.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['올해 연애운은?', '직업 방향이 맞나요?', '언제가 가장 좋은 시기인가요?'].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm"
                  style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--text-primary)' }}>
                  {msg.content}
                </div>
              </div>
            ) : msg.responses ? (
              <div className="space-y-3">
                {(Object.entries(CHAR_CONFIG) as [keyof typeof CHAR_CONFIG, typeof CHAR_CONFIG[keyof typeof CHAR_CONFIG]][]).map(([key, c]) => (
                  <div key={key} className="rounded-2xl p-4 space-y-1"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}20` }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span>{c.emoji}</span>
                      <span className="text-xs font-semibold" style={{ color: c.color }}>{c.name}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--silver)' }}>
                      {msg.responses![key]}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-400">{msg.content}</p>
            )}
          </div>
        ))}

        {loading && (
          <div className="space-y-2">
            {Object.values(CHAR_CONFIG).map(c => (
              <div key={c.name} className="rounded-2xl p-4 animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}20` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span>{c.emoji}</span>
                  <span className="text-xs" style={{ color: c.color }}>{c.name} 답변 중...</span>
                </div>
                <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.06)', width: '70%' }} />
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="질문을 입력하세요... (🍪 2개/질문)"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--text-primary)' }}
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg, #b8933e, #e8c97a)', color: '#06060f' }}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
