import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, Bot, User } from 'lucide-react'
import api from '../utils/api.js'

const SUGGESTIONS = [
  'Who should be treated next and why?',
  'How many critical patients are currently waiting?',
  'Which patient has been waiting the longest?',
  'Suggest priority adjustment based on SpO2 reading',
  'Give me a queue status summary',
  'How does the heap algorithm work?',
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '🤖 **Welcome to the ER Queue AI Assistant!**\n\nI can analyze real-time queue data to answer your questions about patient priorities, waiting times, and queue operations.\n\nTry asking me something below, or click a suggestion!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (query) => {
    const q = query || input.trim()
    if (!q) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const res = await api.post('/ai-assistant', { query: q })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.response },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error processing your query. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content) => {
    // Simple markdown-like rendering
    return content.split('\n').map((line, i) => {
      let rendered = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background:var(--bg-input);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.8em">$1</code>')
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: rendered }} />
          {i < content.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
          AI Queue Assistant
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
          Ask questions about the queue, patients, priorities, and algorithm
        </p>
      </div>

      <div className="glass-card ai-panel" style={{ maxWidth: 800 }}>
        {/* Messages */}
        <div className="ai-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`ai-message ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 6, fontSize: 'var(--font-size-xs)',
                  color: 'var(--accent-primary)', fontWeight: 700,
                }}>
                  <Bot size={14} /> AI Assistant
                </div>
              )}
              <div>{renderContent(msg.content)}</div>
            </div>
          ))}
          {loading && (
            <div className="ai-message assistant">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" />
                <span style={{ color: 'var(--text-muted)' }}>Analyzing queue data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="ai-suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="ai-suggestion-btn"
              onClick={() => handleSend(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="ai-input-area">
          <input
            id="ai-query-input"
            className="form-input"
            placeholder="Ask about the queue..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            id="ai-send-btn"
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
