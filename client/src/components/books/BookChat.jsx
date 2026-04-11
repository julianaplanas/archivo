import React, { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';
import './BookChat.css';

export default function BookChat({ onClose, onBooksChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState({}); // { "title|author": true }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      // Send only role+content for the API (strip recommendations from prior messages)
      const apiMessages = next.map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/ai/book-chat', { messages: apiMessages });
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.reply,
        recommendations: data.recommendations || [],
      }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'something went wrong — try again?', recommendations: [] }]);
    }
    setLoading(false);
  }

  async function handleSaveRec(rec) {
    const key = `${rec.title}|${rec.author}`;
    if (saved[key]) return;
    try {
      await api.post('/books', {
        title: rec.title,
        author: rec.author || null,
        status: 'want_to_read',
        comment: rec.reason || null,
      });
      setSaved(s => ({ ...s, [key]: true }));
      onBooksChanged?.();
    } catch {
      // might already exist
      setSaved(s => ({ ...s, [key]: true }));
    }
  }

  return (
    <div className="book-chat-overlay">
      <div className="book-chat">
        <div className="book-chat-header">
          <span className="book-chat-title">what should i read next?</span>
          <button className="book-chat-close" onClick={onClose}>&times;</button>
        </div>

        <div className="book-chat-messages">
          {messages.length === 0 && (
            <div className="book-chat-empty">
              <div className="book-chat-empty-art">[ your literary friend ]</div>
              <div className="book-chat-empty-sub">
                ask me for recommendations, or tell me what mood you're in
              </div>
              <div className="book-chat-starters">
                {['what should i read next?', 'something short and intense', 'more like leila guerriero'].map(s => (
                  <button key={s} className="book-chat-starter" onClick={() => { setInput(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`book-chat-msg ${msg.role}`}>
              {msg.role === 'assistant' && <span className="book-chat-label">archivo</span>}
              <div className="book-chat-bubble">{msg.content}</div>
              {msg.recommendations?.length > 0 && (
                <div className="book-chat-recs">
                  {msg.recommendations.map((rec, j) => {
                    const key = `${rec.title}|${rec.author}`;
                    const isSaved = saved[key];
                    return (
                      <button
                        key={j}
                        className={`book-chat-rec ${isSaved ? 'saved' : ''}`}
                        onClick={() => handleSaveRec(rec)}
                        disabled={isSaved}
                      >
                        <span className="book-chat-rec-icon">{isSaved ? '★' : '☆'}</span>
                        <span className="book-chat-rec-info">
                          <span className="book-chat-rec-title">{rec.title}</span>
                          {rec.author && <span className="book-chat-rec-author">{rec.author}</span>}
                        </span>
                        <span className="book-chat-rec-action">{isSaved ? 'saved' : 'want to read'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="book-chat-msg assistant">
              <span className="book-chat-label">archivo</span>
              <div className="book-chat-bubble book-chat-typing">thinking...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form className="book-chat-input-bar" onSubmit={handleSend}>
          <input
            ref={inputRef}
            type="text"
            placeholder="tell me what you're in the mood for..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="book-chat-send" disabled={!input.trim() || loading}>
            &rarr;
          </button>
        </form>
      </div>
    </div>
  );
}
