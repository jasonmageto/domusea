import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, RefreshCw, Send, Mail, X, Loader2, MessageCircle,
  CheckCircle2, XCircle, ChevronRight, Inbox
} from 'lucide-react';

export default function Messages() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (userProfile?.id) {
      loadConversations();
      loadRecipients();
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (showNewMessageModal) {
      loadRecipients();
    }
  }, [showNewMessageModal]);

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
        .or(`from_id.eq.${userProfile.id},to_id.eq.${userProfile.id}`)
        .order('date', { ascending: true });

      if (error) throw error;

      const filteredMessages = data?.filter(m =>
        (m.from_id === userProfile.id && m.to_id === selectedConversation.otherUserId) ||
        (m.from_id === selectedConversation.otherUserId && m.to_id === userProfile.id)
      ) || [];

      const unreadIds = filteredMessages
        .filter(m => m.to_id === userProfile.id && !m.read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadIds);

        if (updateError) console.error('⚠️ Error marking messages as read:', updateError);
      }

      setMessages(filteredMessages);
    } catch (err) {
      console.error('❌ Error loading messages:', err);
    }
  };

  const loadRecipients = async () => {
    try {
      console.log('🔄 Loading recipients for role:', userProfile?.role, 'User ID:', userProfile?.id);
      setRecipientsLoading(true);

      let filteredAdmins = [];
      let filteredTenants = [];

      if (userProfile?.role === 'supreme_admin') {
        console.log('📡 Supreme Admin fetching all admins...');

        const { data: allAdmins, error: adminsError } = await supabase
          .from('admins')
          .select('id, name, email, subscription_status')
          .neq('id', userProfile.id);

        if (adminsError) {
          console.error('❌ Admins fetch error:', adminsError);
          toast.error('Failed to load admins: ' + adminsError.message);
        } else {
          console.log('✅ Admins loaded:', allAdmins?.length || 0);
          filteredAdmins = allAdmins || [];
        }

      } else if (userProfile?.role === 'admin') {
        console.log('🏢 Admin fetching tenants...');

        const { data: myTenants, error: tErr } = await supabase
          .from('tenants')
          .select('id, name, email, house, property')
          .eq('admin_id', userProfile.id);

        if (tErr) {
          console.error('❌ Tenants fetch error:', tErr);
        } else {
          console.log('✅ Tenants loaded:', myTenants?.length || 0);
          filteredTenants = myTenants || [];
        }

      } else if (userProfile?.role === 'tenant') {
        console.log('🏠 Tenant fetching admin...');

        const { data: adminData, error } = await supabase
          .from('admins')
          .select('id, name, email')
          .eq('id', userProfile.admin_id)
          .single();

        if (error) {
          console.error('❌ Admin fetch error:', error);
        } else {
          console.log('✅ Admin loaded:', adminData?.name);
          filteredAdmins = adminData ? [adminData] : [];
        }
      }

      console.log('📋 Setting state - Admins:', filteredAdmins.length, 'Tenants:', filteredTenants.length);
      setAdmins(filteredAdmins);
      setTenants(filteredTenants);

    } catch (err) {
      console.error('❌ loadRecipients error:', err);
      toast.error('Failed to load recipients: ' + err.message);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    console.log('📤 Sending message to:', selectedConversation.userName);
    setSending(true);

    try {
      const payload = {
        from_id: userProfile.id,
        from_name: userProfile.name || 'User',
        from_email: userProfile.email || null,
        to_id: selectedConversation.otherUserId,
        to_name: selectedConversation.userName || 'User',
        to_email: selectedConversation.userEmail || null,
        admin_id: userProfile.role === 'admin' ? userProfile.id :
                  userProfile.role === 'supreme_admin' ? selectedConversation.otherUserId : null,
        tenant_id: userProfile.role === 'tenant' ? userProfile.id :
                   userProfile.role === 'supreme_admin' ? selectedConversation.otherUserId : null,
        message: newMessage.trim(),
        date: new Date().toISOString(),
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select();

      if (error) {
        console.error('❌ Supabase Error:', error);
        throw error;
      }

      console.log('✅ Message sent:', data[0]);
      toast.success('Message sent!');
      setNewMessage('');

      setMessages(prev => [...prev, data[0]]);
      loadConversations();

    } catch (err) {
      console.error('❌ Send failed:', err);
      toast.error('Failed to send: ' + (err.message || 'Unknown error'));
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

  const rootClass = `msg-root${isDarkMode ? ' msg-dark' : ''}`;

  const recipientTitle = userProfile.role === 'supreme_admin' ? 'Send Message to Property Admin' :
                          userProfile.role === 'admin' ? 'Send Message to Tenant' :
                          'Send Message to Property Admin';

  const noRecipients =
    (userProfile.role === 'supreme_admin' && admins.length === 0) ||
    (userProfile.role === 'admin' && tenants.length === 0) ||
    (userProfile.role === 'tenant' && admins.length === 0);

  // CHAT CONVERSATION VIEW
  if (selectedConversation) {
    return (
      <div key="chat-view" className={`${rootClass} msg-chat-shell`}>
        <div className="msg-chat-header">
          <div className="msg-chat-header-left">
            <button className="msg-back-btn" onClick={() => setSelectedConversation(null)}>
              <ArrowLeft size={18} />
            </button>
            <div className="msg-avatar msg-avatar-lg msg-avatar-blue">
              {(selectedConversation.userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="msg-chat-name">{selectedConversation.userName}</div>
              <div className="msg-chat-status">
                <span className="msg-status-dot"></span>
                Active Stakeholder
              </div>
            </div>
          </div>
          <button className="msg-icon-btn" onClick={loadMessagesForConversation} title="Refresh chat">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="msg-thread">
          {messages.map((msg, index) => {
            const isFromMe = msg.from_id === userProfile.id;
            const showAvatar = index === 0 || messages[index - 1].from_id !== msg.from_id;

            return (
              <div key={msg.id} className={`msg-row ${isFromMe ? 'msg-row-mine' : 'msg-row-theirs'}`}>
                {showAvatar && !isFromMe ? (
                  <div className="msg-avatar msg-avatar-sm msg-avatar-green">
                    {(selectedConversation.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                ) : !isFromMe ? (
                  <div className="msg-avatar-spacer" />
                ) : null}

                <div className={`msg-bubble ${isFromMe ? 'msg-bubble-mine' : 'msg-bubble-theirs'}`}>
                  {msg.message}
                  <div className="msg-bubble-time">
                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="msg-composer">
          <div className="msg-composer-row">
            <textarea
              className="msg-textarea"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Write your message..."
              rows={1}
            />
            <button
              className="msg-send-btn"
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              title="Send message"
            >
              {sending ? <Loader2 size={20} className="msg-spin" /> : <Send size={19} />}
            </button>
          </div>
          <div className="msg-composer-hint">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Secure Stakeholder Communication</span>
          </div>
        </div>

        <style>{msgStyles}</style>
      </div>
    );
  }

  // CONVERSATIONS LIST VIEW
  return (
    <div key="conversations-list" className={`${rootClass} msg-list-shell`}>
      <div className="msg-list-header">
        <h2>Messages</h2>
        <button className="msg-new-btn" onClick={() => setShowNewMessageModal(true)}>
          <Mail size={16} />
          New Message
        </button>
      </div>

      <div className="msg-conversations">
        {loading ? (
          <div key="loading" className="msg-empty-state">
            <Loader2 size={36} className="msg-spin" />
            <div>Loading conversations…</div>
          </div>
        ) : conversations.length === 0 ? (
          <div key="empty" className="msg-empty-state">
            <Inbox size={40} />
            <div className="msg-empty-title">No messages yet</div>
            <div className="msg-empty-sub">Start a conversation!</div>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.otherUserId}
              className={`msg-conv-row ${conv.unreadCount > 0 ? 'msg-conv-unread' : ''}`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="msg-avatar msg-avatar-xl msg-avatar-purple">
                {(conv.userName || 'U').charAt(0).toUpperCase()}
                {conv.unreadCount > 0 && (
                  <div className="msg-badge">{conv.unreadCount}</div>
                )}
              </div>

              <div className="msg-conv-body">
                <div className="msg-conv-top">
                  <strong className={conv.unreadCount > 0 ? 'msg-conv-name-unread' : ''}>
                    {conv.userName}
                  </strong>
                  <span className="msg-conv-date">{formatDate(conv.lastMessage.date)}</span>
                </div>
                <div className={`msg-conv-preview ${conv.unreadCount > 0 ? 'msg-conv-preview-unread' : ''}`}>
                  {conv.lastMessage.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showNewMessageModal && (
        <div key="new-message-modal" className="msg-modal-overlay" onClick={() => setShowNewMessageModal(false)}>
          <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="msg-modal-header">
              <h3>{recipientTitle}</h3>
              <button className="msg-modal-close" onClick={() => setShowNewMessageModal(false)}>
                <X size={20} />
              </button>
            </div>

            {recipientsLoading && (
              <div className="msg-empty-state">
                <Loader2 size={36} className="msg-spin" />
                <div>Loading recipients…</div>
              </div>
            )}

            {!recipientsLoading && userProfile.role === 'supreme_admin' && admins.length > 0 && (
              <div>
                <div className="msg-modal-hint">Select a Property Admin to message</div>
                <div className="msg-recipient-list">
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      className="msg-recipient-card"
                      onClick={() => startNewConversation(admin.id, admin.name, admin.email)}
                    >
                      <div className="msg-avatar msg-avatar-md msg-avatar-purple">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="msg-recipient-info">
                        <div className="msg-recipient-name">{admin.name}</div>
                        <div className="msg-recipient-email">{admin.email}</div>
                        {admin.subscription_status && (
                          <div className={`msg-recipient-status ${admin.subscription_status === 'Active' ? 'msg-text-green' : 'msg-text-red'}`}>
                            {admin.subscription_status === 'Active' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {admin.subscription_status === 'Active' ? 'Active' : 'Inactive'}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={18} className="msg-recipient-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!recipientsLoading && userProfile.role === 'admin' && tenants.length > 0 && (
              <div>
                <div className="msg-modal-hint">Select a tenant to message</div>
                <div className="msg-recipient-list">
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      className="msg-recipient-card"
                      onClick={() => startNewConversation(tenant.id, tenant.name, tenant.email)}
                    >
                      <div className="msg-avatar msg-avatar-md msg-avatar-green">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="msg-recipient-info">
                        <div className="msg-recipient-name">{tenant.name}</div>
                        <div className="msg-recipient-email">{tenant.email}</div>
                        {(tenant.property || tenant.house) && (
                          <div className="msg-recipient-meta">{tenant.property} - {tenant.house}</div>
                        )}
                      </div>
                      <ChevronRight size={18} className="msg-recipient-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!recipientsLoading && userProfile.role === 'tenant' && admins.length > 0 && (
              <div>
                <div className="msg-modal-hint">Your Property Admin</div>
                <div className="msg-recipient-list">
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      className="msg-recipient-card"
                      onClick={() => startNewConversation(admin.id, admin.name, admin.email)}
                    >
                      <div className="msg-avatar msg-avatar-md msg-avatar-purple">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="msg-recipient-info">
                        <div className="msg-recipient-name">{admin.name}</div>
                        <div className="msg-recipient-email">{admin.email}</div>
                        <div className="msg-recipient-status msg-text-green">
                          <CheckCircle2 size={13} />
                          Property Admin
                        </div>
                      </div>
                      <ChevronRight size={18} className="msg-recipient-arrow" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!recipientsLoading && noRecipients && (
              <div className="msg-empty-state">
                <Inbox size={40} />
                <div className="msg-empty-title">
                  {userProfile.role === 'supreme_admin' ? 'No Property Admins found' :
                   userProfile.role === 'admin' ? 'No active tenants found' :
                   'No Property Admin assigned'}
                </div>
                <div className="msg-empty-sub">
                  {userProfile.role === 'admin' ? 'Add tenants to start messaging' : 'Please contact support'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{msgStyles}</style>
    </div>
  );
}

const msgStyles = `
.msg-root {
  --msg-bg: #f8fafc;
  --msg-surface: #ffffff;
  --msg-surface-alt: #f1f5f9;
  --msg-border: #e2e8f0;
  --msg-text: #1e293b;
  --msg-text-muted: #64748b;
  --msg-text-faint: #94a3b8;
  --msg-blue: #1e3a5f;
  --msg-blue-soft: #eff6ff;
}

.msg-root.msg-dark {
  --msg-bg: #0f172a;
  --msg-surface: #1e293b;
  --msg-surface-alt: #334155;
  --msg-border: #334155;
  --msg-text: #f1f5f9;
  --msg-text-muted: #94a3b8;
  --msg-text-faint: #64748b;
  --msg-blue-soft: #1e3a5f;
}

.msg-spin { animation: msgSpin 1s linear infinite; }
@keyframes msgSpin { to { transform: rotate(360deg); } }

@keyframes msgSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Chat shell */
.msg-chat-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: var(--msg-bg);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  border: 1px solid var(--msg-border);
}

.msg-chat-header {
  padding: 12px 20px;
  background: var(--msg-surface);
  border-bottom: 1px solid var(--msg-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.msg-chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.msg-back-btn {
  background: var(--msg-surface-alt);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--msg-text);
  transition: background 0.15s ease;
}
.msg-back-btn:hover { background: var(--msg-border); }

.msg-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--msg-text-muted);
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 8px;
  transition: background 0.15s ease;
}
.msg-icon-btn:hover { background: var(--msg-surface-alt); }

.msg-chat-name { font-weight: 600; font-size: 16px; color: var(--msg-text); }
.msg-chat-status {
  font-size: 12px;
  color: var(--msg-text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}
.msg-status-dot {
  width: 7px; height: 7px; background: #10b981; border-radius: 50%; display: inline-block;
}

.msg-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  flex-shrink: 0;
  position: relative;
}
.msg-avatar-sm { width: 32px; height: 32px; font-size: 14px; }
.msg-avatar-md { width: 48px; height: 48px; font-size: 18px; }
.msg-avatar-lg { width: 40px; height: 40px; font-size: 16px; }
.msg-avatar-xl { width: 56px; height: 56px; font-size: 20px; }
.msg-avatar-blue { background: linear-gradient(135deg, #1e3a5f, #2c5282); }
.msg-avatar-green { background: linear-gradient(135deg, #10b981, #1e3a5f); }
.msg-avatar-purple { background: linear-gradient(135deg, #1e3a5f, #8b5cf6); }
.msg-avatar-spacer { width: 32px; flex-shrink: 0; }

.msg-thread {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  animation: msgSlideIn 0.25s ease-out;
}
.msg-row-mine { flex-direction: row-reverse; }

.msg-bubble {
  max-width: 70%;
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.4;
  word-wrap: break-word;
}
.msg-bubble-mine {
  background: linear-gradient(135deg, #1e3a5f, #2c5282);
  color: white;
  border-radius: 18px 18px 4px 18px;
}
.msg-bubble-theirs {
  background: var(--msg-surface-alt);
  color: var(--msg-text);
  border-radius: 18px 18px 18px 4px;
}
.msg-bubble-time { font-size: 11px; margin-top: 4px; opacity: 0.7; text-align: right; }

.msg-composer {
  padding: 16px 20px;
  background: var(--msg-surface);
  border-top: 1px solid var(--msg-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msg-composer-row { display: flex; gap: 12px; align-items: center; }

.msg-textarea {
  flex: 1;
  padding: 12px 18px;
  background: var(--msg-bg);
  border: 1px solid var(--msg-border);
  border-radius: 24px;
  font-size: 15px;
  resize: none;
  max-height: 120px;
  outline: none;
  color: var(--msg-text);
  font-family: inherit;
  transition: border-color 0.15s ease;
}
.msg-textarea:focus { border-color: #1e3a5f; }

.msg-send-btn {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #1e3a5f, #2c5282);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.msg-send-btn:disabled {
  background: var(--msg-surface-alt);
  color: var(--msg-text-faint);
  cursor: not-allowed;
}
.msg-send-btn:not(:disabled):hover { transform: scale(1.04); }

.msg-composer-hint {
  font-size: 11px;
  color: var(--msg-text-faint);
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
}

/* Conversations list */
.msg-list-shell { max-width: 800px; margin: 0 auto; padding: 20px; }

.msg-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.msg-list-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--msg-text);
  letter-spacing: -0.02em;
}

.msg-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: linear-gradient(135deg, #1e3a5f, #2c5282);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 15px;
  transition: transform 0.1s ease;
}
.msg-new-btn:hover { transform: translateY(-1px); }

.msg-conversations {
  background: var(--msg-surface);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.06);
  border: 1px solid var(--msg-border);
}

.msg-conv-row {
  padding: 16px 20px;
  border-bottom: 1px solid var(--msg-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s ease;
}
.msg-conv-row:last-child { border-bottom: none; }
.msg-conv-row:hover { background: var(--msg-surface-alt); }
.msg-conv-unread { background: var(--msg-blue-soft); }
.msg-conv-unread:hover { background: var(--msg-blue-soft); }

.msg-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.msg-conv-body { flex: 1; min-width: 0; }
.msg-conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.msg-conv-top strong { font-size: 16px; color: var(--msg-text); font-weight: 600; }
.msg-conv-name-unread { font-weight: 700 !important; }
.msg-conv-date { font-size: 13px; color: var(--msg-text-muted); }
.msg-conv-preview {
  font-size: 14px;
  color: var(--msg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.msg-conv-preview-unread { font-weight: 600; }

.msg-empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--msg-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.msg-empty-title { font-size: 16px; color: var(--msg-text); }
.msg-empty-sub { font-size: 14px; }

/* Modal */
.msg-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.msg-modal {
  background: var(--msg-surface);
  border-radius: 16px;
  padding: 24px;
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  overflow: auto;
}

.msg-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.msg-modal-header h3 { margin: 0; color: var(--msg-text); font-size: 18px; }

.msg-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--msg-text-muted);
  display: flex;
  padding: 4px;
  border-radius: 8px;
}
.msg-modal-close:hover { background: var(--msg-surface-alt); }

.msg-modal-hint {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--msg-surface-alt);
  border-radius: 8px;
  font-size: 14px;
  color: var(--msg-text-muted);
}

.msg-recipient-list { display: grid; gap: 10px; }

.msg-recipient-card {
  padding: 16px;
  background: var(--msg-bg);
  border: 2px solid var(--msg-border);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.15s ease, transform 0.1s ease;
  width: 100%;
}
.msg-recipient-card:hover {
  border-color: #1e3a5f;
  transform: translateY(-2px);
}

.msg-recipient-info { flex: 1; min-width: 0; }
.msg-recipient-name { font-weight: 600; font-size: 16px; color: var(--msg-text); }
.msg-recipient-email { font-size: 13px; color: var(--msg-text-muted); margin-top: 2px; }
.msg-recipient-meta { font-size: 12px; color: var(--msg-text-faint); margin-top: 4px; }
.msg-recipient-status {
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.msg-recipient-arrow { color: var(--msg-text-faint); flex-shrink: 0; }

.msg-text-green { color: #10b981; }
.msg-text-red { color: #ef4444; }

@media (max-width: 640px) {
  .msg-list-shell { padding: 12px; }
}
`;
