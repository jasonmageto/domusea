import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

export default function Messages() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [recipientType, setRecipientType] = useState('');
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (userProfile?.id) {
      loadConversations();
      loadRecipients();
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessagesForConversation();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`to_id.eq.${userProfile.id},from_id.eq.${userProfile.id}`)
        .order('date', { ascending: false });

      if (error) throw error;

      // Group by other user ID
      const conversationMap = new Map();
      
      data?.forEach(msg => {
        const isFromMe = msg.from_id === userProfile.id;
        const otherUserId = isFromMe ? msg.to_id : msg.from_id;
        const otherUserName = isFromMe ? msg.to_name || 'User' : msg.from_name || 'User';
        const otherUserEmail = isFromMe ? msg.to_email : msg.from_email;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId: otherUserId,
            userName: otherUserName,
            userEmail: otherUserEmail || '',
            lastMessage: msg,
            unreadCount: 0,
            messages: []
          });
        }
        
        const conv = conversationMap.get(otherUserId);
        conv.messages.push(msg);
        
        if (!isFromMe && !msg.read) {
          conv.unreadCount++;
        }
      });

      // Convert to array and sort by date
      const conversationsArray = Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.lastMessage.date) - new Date(a.lastMessage.date)
      );

      setConversations(conversationsArray);
    } catch (err) {
      console.error('❌ Error loading conversations:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForConversation = async () => {
    if (!selectedConversation) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(from_id.eq.${userProfile.id},to_id.eq.${selectedConversation.otherUserId}),` +
          `and(from_id.eq.${selectedConversation.otherUserId},to_id.eq.${userProfile.id})`
        )
        .order('date', { ascending: true });

      if (error) throw error;

      // Mark as read
      const unreadMessages = data?.filter(m => m.to_id === userProfile.id && !m.read) || [];
      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(m => 
            supabase.from('messages').update({ read: true }).eq('id', m.id)
          )
        );
      }

      setMessages(data || []);
    } catch (err) {
      console.error('❌ Error loading messages:', err);
    }
  };

  const loadRecipients = async () => {
    try {
      let filteredAdmins = [];
      
      if (userProfile.role === 'sa') {
        const {  allAdmins } = await supabase
          .from('admins')
          .select('id, name, email')
          .neq('id', userProfile.id);
        filteredAdmins = allAdmins || [];
      } else if (userProfile.role === 'admin') {
        const {  selfAdmin } = await supabase
          .from('admins')
          .select('id, name, email')
          .eq('id', userProfile.id)
          .single();
        filteredAdmins = selfAdmin ? [selfAdmin] : [];
      } else if (userProfile.role === 'tenant') {
        const {  adminData } = await supabase
          .from('admins')
          .select('id, name, email')
          .eq('id', userProfile.admin_id)
          .single();
        filteredAdmins = adminData ? [adminData] : [];
      }
      
      setAdmins(filteredAdmins);

      let filteredTenants = [];
      
      if (userProfile.role === 'sa') {
        const {  allTenants } = await supabase
          .from('tenants')
          .select('id, name, email, house, property');
        filteredTenants = allTenants || [];
      } else if (userProfile.role === 'admin') {
        const {  myTenants } = await supabase
          .from('tenants')
          .select('id, name, email, house, property')
          .eq('admin_id', userProfile.id);
        filteredTenants = myTenants || [];
      }
      
      setTenants(filteredTenants);
    } catch (err) {
      console.error('❌ Error loading recipients:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert([{
        from_id: userProfile.id,
        from_name: userProfile.name,
        from_email: userProfile.email,
        to_id: selectedConversation.otherUserId,
        to_email: selectedConversation.userEmail,
        subject: 'Message',
        message: newMessage,
        date: new Date().toISOString(),
        read: false
      }]);

      if (error) throw error;
      
      toast.success('Message sent!');
      setNewMessage('');
      loadMessagesForConversation();
      loadConversations();
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async (recipientId, recipientName, recipientEmail) => {
    setSelectedConversation({
      otherUserId: recipientId,
      userName: recipientName,
      userEmail: recipientEmail,
      messages: [],
      lastMessage: null,
      unreadCount: 0
    });
    setShowNewMessageModal(false);
    setNewMessage('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const isDarkMode = document.body.classList.contains('dark-mode') || 
                     getComputedStyle(document.body).getPropertyValue('--bg').includes('13, 18, 30');

  // 📱 CHAT CONVERSATION VIEW
  if (selectedConversation) {
    return (
      <div key="chat-view" style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 100px)',
        background: isDarkMode ? '#0f172a' : '#f8fafc',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: isDarkMode ? '#1e293b' : 'white',
          borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <button 
            onClick={() => setSelectedConversation(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              padding: 0
            }}
          >
            ←
          </button>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 16
          }}>
            {(selectedConversation.userName || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>
              {selectedConversation.userName}
            </div>
            <div style={{ fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              {selectedConversation.userEmail}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {messages.map((msg, index) => {
            const isFromMe = msg.from_id === userProfile.id;
            const showAvatar = index === 0 || messages[index - 1].from_id !== msg.from_id;
            
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: isFromMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                {showAvatar && !isFromMe ? (
                  <div style={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 14,
                    flexShrink: 0
                  }}>
                    {(selectedConversation.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                ) : !isFromMe ? (
                  <div style={{ width: 32, flexShrink: 0 }} />
                ) : null}
                
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  background: isFromMe 
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : isDarkMode ? '#334155' : '#e2e8f0',
                  color: isFromMe ? 'white' : isDarkMode ? '#f1f5f9' : '#1e293b',
                  borderRadius: isFromMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: 15,
                  lineHeight: 1.4,
                  wordWrap: 'break-word'
                }}>
                  {msg.message}
                  <div style={{
                    fontSize: 11,
                    marginTop: 4,
                    opacity: 0.7,
                    textAlign: 'right'
                  }}>
                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px 20px',
          background: isDarkMode ? '#1e293b' : 'white',
          borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end'
        }}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: isDarkMode ? '#334155' : '#f1f5f9',
              border: 'none',
              borderRadius: 20,
              fontSize: 15,
              resize: 'none',
              maxHeight: 100,
              outline: 'none',
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            style={{
              padding: '12px 24px',
              background: newMessage.trim() ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: 20,
              fontWeight: 600,
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              opacity: newMessage.trim() ? 1 : 0.6,
              transition: 'all 0.2s'
            }}
          >
            Send
          </button>
        </div>

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  // 📬 CONVERSATIONS LIST VIEW
  return (
    <div key="conversations-list" style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: 20
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: 32, 
          fontWeight: 700,
          color: isDarkMode ? '#f1f5f9' : '#1e293b'
        }}>
          Messages
        </h2>
        <button
          onClick={() => setShowNewMessageModal(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 15
          }}
        >
          ✉️ New Message
        </button>
      </div>

      {/* Conversations List */}
      <div style={{
        background: isDarkMode ? '#1e293b' : 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {loading ? (
          <div key="loading" style={{ padding: 60, textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div>Loading conversations...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div key="empty" style={{ padding: 60, textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>No messages yet</div>
            <div style={{ fontSize: 14 }}>Start a conversation!</div>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.otherUserId}
              onClick={() => setSelectedConversation(conv)}
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.2s',
                background: conv.unreadCount > 0 ? (isDarkMode ? '#1e3a5f' : '#eff6ff') : 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = conv.unreadCount > 0 ? (isDarkMode ? '#1e3a5f' : '#eff6ff') : (isDarkMode ? '#334155' : '#f8fafc')}
              onMouseLeave={(e) => e.currentTarget.style.background = conv.unreadCount > 0 ? (isDarkMode ? '#1e3a5f' : '#eff6ff') : 'transparent'}
            >
              <div style={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 20,
                flexShrink: 0,
                position: 'relative'
              }}>
                {(conv.userName || 'U').charAt(0).toUpperCase()}
                {conv.unreadCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {conv.unreadCount}
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4
                }}>
                  <strong style={{
                    fontSize: 16,
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    fontWeight: conv.unreadCount > 0 ? 700 : 600
                  }}>
                    {conv.userName}
                  </strong>
                  <span style={{
                    fontSize: 13,
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}>
                    {formatDate(conv.lastMessage.date)}
                  </span>
                </div>
                <div style={{
                  fontSize: 14,
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: conv.unreadCount > 0 ? 600 : 400
                }}>
                  {conv.lastMessage.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div key="new-message-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: isDarkMode ? '#1e293b' : 'white',
            borderRadius: 16,
            padding: 24,
            maxWidth: 600,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <h3 style={{ margin: 0, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>New Message</h3>
              <button
                onClick={() => setShowNewMessageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {!recipientType && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {userProfile.role === 'sa' && admins.length > 0 && (
                  <button
                    key="admin-btn"
                    onClick={() => setRecipientType('admin')}
                    style={{
                      padding: 24,
                      background: isDarkMode ? '#334155' : '#f8fafc',
                      border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👔</div>
                    <div style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Admin</div>
                    <div style={{ fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>{admins.length} available</div>
                  </button>
                )}
                
                {(userProfile.role === 'admin' || userProfile.role === 'sa') && tenants.length > 0 && (
                  <button
                    key="tenant-btn"
                    onClick={() => setRecipientType('tenant')}
                    style={{
                      padding: 24,
                      background: isDarkMode ? '#334155' : '#f8fafc',
                      border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
                    <div style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Tenant</div>
                    <div style={{ fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>{tenants.length} available</div>
                  </button>
                )}
              </div>
            )}

            {recipientType && (
              <div>
                <button
                  onClick={() => setRecipientType('')}
                  style={{
                    marginBottom: 16,
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ← Back
                </button>
                
                <div style={{ display: 'grid', gap: 8 }}>
                  {(recipientType === 'admin' ? admins : tenants).map((person) => (
                    <button
                      key={person.id}
                      onClick={() => startNewConversation(person.id, person.name, person.email)}
                      style={{
                        padding: '12px 16px',
                        background: isDarkMode ? '#334155' : '#f8fafc',
                        border: `1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>{person.name}</div>
                        <div style={{ fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b' }}>{person.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}