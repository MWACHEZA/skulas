import { useState } from 'react';
import { BASE_URL } from '../../lib/api';

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am Santa, your School Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Find school code from URL or default to a known one from the system
      const schoolCodeFromUrl = window.location.pathname.split('/')[1]?.startsWith('S-') 
        ? window.location.pathname.split('/')[1] 
        : 'AX-EMBAKWE'; // Use AX-EMBAKWE as default demo school

      const response = await fetch(`${BASE_URL}/api/chat/santa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          schoolCode: schoolCodeFromUrl,
          history: messages.map(m => ({ 
            role: m.role, 
            content: m.text 
          }))
        })
      });

      const data = await response.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: `Santa Note: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "I'm having a bit of trouble connecting to our systems. Please try again in a moment!" }]);
      }
    } catch (error) {
      console.error('Santa Fetch Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', text: "Santa is currently offline. Check your internet connection or server status!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
      {isOpen ? (
        <div style={{ 
          width: 350, 
          height: 500, 
          background: '#fff', 
          borderRadius: 20, 
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '20px', background: '#3182ce', color: '#fff', textAlign: 'center' }}>
            <h4 style={{ margin: 0 }}>Santa AI Assistant</h4>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ready to help you</span>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: 15, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 15 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#3182ce' : '#f0f4f8',
                color: m.role === 'user' ? '#fff' : '#333',
                padding: '10px 15px',
                borderRadius: 15,
                maxWidth: '85%',
                fontSize: '0.9rem'
              }}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#f0f4f8', padding: '10px 15px', borderRadius: 15, fontSize: '0.8rem', color: '#718096' }}>
                Santa is thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} style={{ padding: 15, borderTop: '1px solid #edf2f7', display: 'flex', gap: 10 }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Santa..." 
              style={{ flex: 1, border: '1px solid #edf2f7', padding: '10px 15px', borderRadius: 20, outline: 'none' }} 
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} style={{ width: 40, height: 40, background: '#3182ce', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            width: 60, 
            height: 60, 
            background: '#3182ce', 
            color: '#fff', 
            borderRadius: '50%', 
            border: 'none', 
            boxShadow: '0 5px 20px rgba(49, 130, 206, 0.4)', 
            cursor: 'pointer',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fas fa-comment-dots"></i>
        </button>
      )}
    </div>
  );
}
