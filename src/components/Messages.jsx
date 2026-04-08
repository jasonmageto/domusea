import { useState } from 'react';

export default function Messages({ userProfile }) {
  const [messages, setMessages] = useState([
    { id: 1, from: 'Property Admin', subject: 'Rent Reminder', message: 'Please pay your rent on time', date: '2026-04-05', read: false },
    { id: 2, from: 'System', subject: 'Maintenance Update', message: 'Your request has been resolved', date: '2026-04-03', read: true }
  ]);
  const [compose, setCompose] = useState(false);
  const [newMsg, setNewMsg] = useState({ subject: '', message: '' });

  const handleSend = () => {
    if (!newMsg.subject || !newMsg.message) return;
    const msg = {
      id: messages.length + 1,
      from: userProfile?.name || 'You',
      subject: newMsg.subject,
      message: newMsg.message,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    setMessages([msg, ...messages]);
    setNewMsg({ subject: '', message: '' });
    setCompose(false);
  };

  return (
    <div className="card" style={{padding: 20, maxWidth: 800, margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <h2 style={{margin: 0}}>📬 Messages</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setCompose(!compose)}
        >
          {compose ? 'Cancel' : 'Compose'}
        </button>
      </div>

      {compose && (
        <div style={{background: 'var(--card-bg)', padding: 16, borderRadius: 8, marginBottom: 20}}>
          <h3 style={{margin: '0 0 12px 0'}}>New Message</h3>
          <input
            type="text"
            placeholder="Subject"
            value={newMsg.subject}
            onChange={(e) => setNewMsg({...newMsg, subject: e.target.value})}
            style={{width: '100%', padding: 8, marginBottom: 8, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--input-bg)', color: 'var(--text)'}}
          />
          <textarea
            placeholder="Message"
            value={newMsg.message}
            onChange={(e) => setNewMsg({...newMsg, message: e.target.value})}
            style={{width: '100%', padding: 8, marginBottom: 12, borderRadius: 4, border: '1px solid var(--border)', minHeight: 100, background: 'var(--input-bg)', color: 'var(--text)'}}
          />
          <button className="btn btn-success" onClick={handleSend}>Send Message</button>
        </div>
      )}

      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        {messages.map(msg => (
          <div 
            key={msg.id} 
            style={{
              background: msg.read ? 'var(--card-bg)' : 'var(--primary-light)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
              <strong style={{color: msg.read ? 'var(--text)' : 'var(--primary)'}}>
                {!msg.read && '📩 '}{msg.from}
              </strong>
              <span style={{color: 'var(--muted)', fontSize: '0.875rem'}}>{msg.date}</span>
            </div>
            <h4 style={{margin: '4px 0', color: 'var(--text)'}}>{msg.subject}</h4>
            <p style={{margin: '8px 0', color: 'var(--muted)', lineHeight: 1.5}}>{msg.message}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <p style={{textAlign: 'center', color: 'var(--muted)', padding: 40}}>No messages yet</p>
        )}
      </div>
    </div>
  );
}