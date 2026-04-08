import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SAAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    subject: '',
    message: '',
    priority: 'Normal'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!newAnnouncement.subject || !newAnnouncement.message) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          subject: newAnnouncement.subject,
          message: newAnnouncement.message,
          priority: newAnnouncement.priority,
          date: new Date().toISOString()
        }]);
      
      if (error) throw error;
      setNewAnnouncement({ subject: '', message: '', priority: 'Normal' });
      setCompose(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error posting announcement:', error);
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'var(--red)';
      case 'Important': return 'var(--amber)';
      default: return 'var(--blue)';
    }
  };

  if (loading) return <div className="card" style={{textAlign: 'center', padding: 40}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{margin: 0}}>📢 Announcements</h2>
        <button className="btn btn-primary" onClick={() => setCompose(!compose)}>
          {compose ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {compose && (
        <div className="card" style={{marginBottom: 24}}>
          <h3 style={{margin: '0 0 16px 0'}}>Create Announcement</h3>
          <input
            type="text"
            placeholder="Subject"
            value={newAnnouncement.subject}
            onChange={(e) => setNewAnnouncement({...newAnnouncement, subject: e.target.value})}
            style={{width: '100%', padding: 12, marginBottom: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--input-bg)', color: 'var(--text)'}}
          />
          <select
            value={newAnnouncement.priority}
            onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
            style={{width: '100%', padding: 12, marginBottom: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--input-bg)', color: 'var(--text)'}}
          >
            <option value="Normal">Normal</option>
            <option value="Important">Important</option>
            <option value="Urgent">Urgent</option>
          </select>
          <textarea
            placeholder="Message"
            value={newAnnouncement.message}
            onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
            style={{width: '100%', padding: 12, marginBottom: 12, borderRadius: 4, border: '1px solid var(--border)', minHeight: 120, background: 'var(--input-bg)', color: 'var(--text)'}}
          />
          <button className="btn btn-primary" onClick={handlePost}>Post Announcement</button>
        </div>
      )}

      <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
        {announcements.map((announcement) => (
          <div key={announcement.id} className="card" style={{borderLeft: `4px solid ${getPriorityColor(announcement.priority)}`}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8}}>
              <h3 style={{margin: 0, color: getPriorityColor(announcement.priority)}}>
                {announcement.priority === 'Urgent' && '🚨 '}
                {announcement.priority === 'Important' && '⚠️ '}
                {announcement.subject}
              </h3>
              <span style={{fontSize: 12, color: 'var(--gray)'}}>
                {new Date(announcement.date).toLocaleDateString()}
              </span>
            </div>
            <p style={{margin: 0, color: 'var(--text)', lineHeight: 1.6}}>{announcement.message}</p>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="card" style={{textAlign: 'center', padding: 40, color: 'var(--gray)'}}>
            No announcements yet
          </div>
        )}
      </div>
    </div>
  );
}