import React, { useState, useEffect, useRef } from 'react';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CONNIE_PORTRAIT = 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/wissums/connie-ai.png';

interface TributeContributePageProps {
  storyId: string;
  storySubject: string;
  onDone: () => void;
}

interface Message { role: 'connie' | 'user'; text: string; }

export const TributeContributePage: React.FC<TributeContributePageProps> = ({ storyId, storySubject, onDone }) => {
  const [contributorName, setContributorName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const gold = '#C4973B';
  const dark = '#0D0B0A';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addConnieMessage = (text: string) => {
    setMessages(prev => [...prev, { role: 'connie', text }]);
    setIsTyping(false);
  };

  const handleNameSubmit = () => {
    if (!contributorName.trim()) return;
    setNameSubmitted(true);
    setIsTyping(true);
    setTimeout(() => {
      addConnieMessage(
        `Thank you, ${contributorName}. I'm Connie — I'm collecting memories of ${storySubject} for their family. ` +
        `Would you like to share a memory, a story, or something you loved about them?`
      );
    }, 1000);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || isSaving) return;
    setInput('');
    const userMessage: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    const updatedTranscript = fullTranscript
      ? `${fullTranscript}\n${contributorName}: ${text}`
      : `${contributorName}: ${text}`;
    setFullTranscript(updatedTranscript);
    setIsTyping(true);

    try {
      const history = [...messages, userMessage]
        .map(m => `${m.role === 'connie' ? 'Connie' : contributorName}: ${m.text}`)
        .join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: `You are Connie, a warm and gentle AI memory keeper. You are collecting memories of ${storySubject} from ${contributorName}, a family member or friend. Ask one gentle follow-up question to draw out more detail. After 2-3 exchanges, if you have a meaningful memory, respond with exactly: MEMORY_COMPLETE: [your warm closing message]. Keep responses under 60 words.`,
          messages: [{ role: 'user', content: history }],
        }),
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Thank you for sharing that.';

      if (reply.startsWith('MEMORY_COMPLETE:')) {
        const closingMessage = reply.replace('MEMORY_COMPLETE:', '').trim();
        addConnieMessage(closingMessage);
        await saveMemory(updatedTranscript);
      } else {
        addConnieMessage(reply);
      }
    } catch {
      addConnieMessage('Thank you for sharing that memory. Would you like to tell me anything else about them?');
    }
  };

  const saveMemory = async (transcript: string) => {
    setIsSaving(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/story_memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          story_session_id: storyId,
          contributor_name: contributorName,
          transcript,
          created_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to save memory:', err);
    } finally {
      setIsSaving(false);
      setIsDone(true);
    }
  };

  if (isDone) {
    return (
      <div style={{ minHeight: '100vh', background: dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <img src={CONNIE_PORTRAIT} alt="Connie" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${gold}`, marginBottom: 24 }} />
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: 'rgba(253,246,236,0.95)', textAlign: 'center', marginBottom: 12 }}>
          Thank you, {contributorName}.
        </div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: 'rgba(253,246,236,0.55)', textAlign: 'center', maxWidth: 320, lineHeight: 1.7, marginBottom: 32 }}>
          Your memory of {storySubject} has been preserved and will be woven into their story.
        </div>
        <div style={{ width: 48, height: 1, background: `${gold}40`, marginBottom: 32 }} />
        <a href="/" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: gold, textDecoration: 'none', fontWeight: 700 }}>
          Preserve your own story →
        </a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: dark, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src={CONNIE_PORTRAIT} alt="Connie" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid rgba(196,151,59,0.5)`, marginBottom: 12 }} />
        <div style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: `${gold}70`, fontFamily: 'system-ui', fontWeight: 700 }}>
          Share a Memory of
        </div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'rgba(253,246,236,0.95)', marginTop: 4 }}>
          {storySubject}
        </div>
      </div>

      {!nameSubmitted ? (
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'rgba(253,246,236,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
            Connie would love to hear your memory. What's your name?
          </div>
          <input
            value={contributorName}
            onChange={e => setContributorName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Your first name"
            autoFocus
            style={{ width: '100%', padding: '14px 18px', background: 'rgba(196,151,59,0.06)', border: '1px solid rgba(196,151,59,0.3)', borderRadius: 12, color: 'rgba(253,246,236,0.9)', fontFamily: 'Georgia, serif', fontSize: 16, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          />
          <button
            onClick={handleNameSubmit}
            disabled={!contributorName.trim()}
            style={{ width: '100%', padding: '14px', background: contributorName.trim() ? gold : 'rgba(196,151,59,0.2)', border: 'none', borderRadius: 12, color: contributorName.trim() ? '#1A1208' : 'rgba(196,151,59,0.4)', fontWeight: 700, fontSize: 13, cursor: contributorName.trim() ? 'pointer' : 'default', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Begin
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'connie' ? 'row' : 'row-reverse', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
                {msg.role === 'connie' && (
                  <img src={CONNIE_PORTRAIT} alt="Connie" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(196,151,59,0.4)', flexShrink: 0 }} />
                )}
                <div style={{ maxWidth: '80%', padding: '12px 16px', background: msg.role === 'connie' ? 'rgba(196,151,59,0.08)' : 'rgba(255,255,255,0.05)', border: msg.role === 'connie' ? '1px solid rgba(196,151,59,0.2)' : '1px solid rgba(255,255,255,0.08)', borderRadius: msg.role === 'connie' ? '4px 16px 16px 16px' : '16px 4px 16px 16px', fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.65, color: 'rgba(253,246,236,0.88)' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
                <img src={CONNIE_PORTRAIT} alt="Connie" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ padding: '14px 18px', background: 'rgba(196,151,59,0.08)', border: '1px solid rgba(196,151,59,0.2)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: `${gold}60`, display: 'inline-block' }} />)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder="Share your memory..."
              rows={2}
              style={{ flex: 1, padding: '12px 14px', background: 'rgba(196,151,59,0.06)', border: '1px solid rgba(196,151,59,0.25)', borderRadius: 12, color: 'rgba(253,246,236,0.9)', fontFamily: 'Georgia, serif', fontSize: 15, outline: 'none', resize: 'none' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || isSaving}
              style={{ padding: '0 18px', background: input.trim() && !isTyping ? gold : 'rgba(196,151,59,0.2)', border: 'none', borderRadius: 12, color: '#1A1208', fontWeight: 700, cursor: input.trim() && !isTyping ? 'pointer' : 'default', fontSize: 18 }}
            >›</button>
          </div>

          <button
            onClick={() => fullTranscript && saveMemory(fullTranscript)}
            disabled={!fullTranscript || isSaving}
            style={{ marginTop: 16, background: 'none', border: 'none', color: `${gold}50`, fontSize: 11, cursor: fullTranscript ? 'pointer' : 'default', letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            {isSaving ? 'Saving…' : 'Submit my memory →'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TributeContributePage;
