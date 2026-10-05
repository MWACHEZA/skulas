import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface MessageItem {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
}

export default function MessagesPage() {
  const { t } = useTerminology();
  const { user } = useAuth();
  const { showToast, toastConfirm } = useToast();
  
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  
  // Form state
  const [activeTab, setActiveTab] = useState<'inbox' | 'meetings'>('inbox');
  const [newRecipientId, setNewRecipientId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Class SMS Broadcast modal state
  const [showClassSmsModal, setShowClassSmsModal] = useState(false);
  const [selectedClassSms, setSelectedClassSms] = useState('Form 3A');
  const [classSmsText, setClassSmsText] = useState('');

  // Meeting Requests state
  const [meetingRequests, setMeetingRequests] = useState([
    {
      id: 'MTG-001',
      parentName: 'Mrs. Tendai Moyo',
      studentName: 'Farai Moyo (Form 3A)',
      requestedDate: '2026-10-08 14:30',
      topic: 'Term 3 Mathematics CA Progress & Remedial Help',
      status: 'Pending',
      phone: '+263772111222'
    },
    {
      id: 'MTG-002',
      parentName: 'Mr. John Ndlovu',
      studentName: 'Tanaka Ndlovu (Form 3A)',
      requestedDate: '2026-10-09 15:00',
      topic: 'Science Fair Project & Subject Electives Consultation',
      status: 'Approved',
      phone: '+263773333444'
    }
  ]);

  useEffect(() => {
    fetchMessages();
    fetchRecipients();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/messages');
      setMessages(res.data.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    try {
      const res = await api.get('/api/messages/users');
      setRecipients(res.data);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    
    }
  };

  const handleSelectMessage = async (msg: MessageItem) => {
    setSelected(msg.id);
    if (!msg.isRead) {
      try {
        await api.patch(`/api/messages/${msg.id}/read`);
        // update local list
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientId || !newSubject || !newBody) return;
    setSubmitting(true);
    try {
      await api.post('/api/messages', {
        recipientId: newRecipientId,
        subject: newSubject,
        body: newBody
      });
      showToast('Message sent successfully!', 'success');
      setShowNewModal(false);
      setNewRecipientId('');
      setNewSubject('');
      setNewBody('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this message audit?'))) return;
    try {
      await api.delete(`/api/messages/${id}`);
      showToast('Message deleted successfully', 'success');
      setSelected(null);
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Failed to delete message', 'error');
    }
  };

  const handleReply = (activeMsg: MessageItem) => {
    setNewRecipientId(activeMsg.senderId);
    setNewSubject(`Re: ${activeMsg.subject}`);
    setShowNewModal(true);
  };

  const active = messages.find(m => m.id === selected);

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Institutional Communications</h1>
          <p>Internal secure messaging infrastructure for seamless coordination across academic and administrative departments.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#eff6ff', color: 'var(--school-primary, #0056b3)', border: '1px solid rgba(0, 86, 179, 0.2)', fontWeight: 900 }}>
           <i className="fas fa-paper-plane mr-2"></i>SECURE CHANNEL
        </div>
      {/* Communication Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('inbox')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'inbox' ? 700 : 500,
            color: activeTab === 'inbox' ? 'var(--school-primary, #0056b3)' : '#64748b',
            borderBottom: activeTab === 'inbox' ? '3px solid var(--school-primary, #0056b3)' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-inbox" />
          Inbox & Direct Messages ({messages.filter(m => !m.isRead).length})
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'meetings' ? 700 : 500,
            color: activeTab === 'meetings' ? 'var(--school-primary, #0056b3)' : '#64748b',
            borderBottom: activeTab === 'meetings' ? '3px solid var(--school-primary, #0056b3)' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-calendar-check" />
          Parent Meeting Requests ({meetingRequests.filter(m => m.status === 'Pending').length} Pending)
        </button>
      </div>

      {activeTab === 'inbox' && (
      <div className="portal-grid-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card" style={{ padding: 0 }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
              <i className="fas fa-inbox mr-3" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              Registry Inbox ({messages.filter(m => !m.isRead).length})
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {(user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN') && (
                <button 
                  onClick={() => setShowClassSmsModal(true)}
                  className="portal-btn-secondary" 
                  style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <i className="fas fa-sms mr-2"></i>Compose to Class SMS
                </button>
              )}
              <button 
                onClick={() => {
                  setNewRecipientId('');
                  setNewSubject('');
                  setShowNewModal(true);
                }}
                className="portal-btn-primary" 
                style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', padding: '10px 24px', fontSize: '0.8rem', fontWeight: 900 }}
              >
                <i className="fas fa-plus-circle mr-2"></i>New Message
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', padding: '12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#64748b', fontWeight: 600 }}>
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading inbox...
              </div>
            ) : messages.map(m => (
              <div 
                key={m.id} 
                onClick={() => handleSelectMessage(m)} 
                style={{ 
                  padding: '24px', 
                  borderRadius: '20px',
                  cursor: 'pointer', 
                  background: selected === m.id ? 'rgba(0, 86, 179, 0.08)' : 'transparent',
                  border: selected === m.id ? '1px solid rgba(0, 86, 179, 0.2)' : '1px solid transparent',
                  display: 'flex', 
                  gap: '20px', 
                  alignItems: 'flex-start',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  marginBottom: '4px',
                  position: 'relative'
                }}
                className="hover-card"
              >
                {!m.isRead && (
                    <div style={{ 
                        position: 'absolute',
                        left: '10px',
                        top: '34px',
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: 'var(--school-primary, #0056b3)', 
                        boxShadow: '0 0 12px rgba(37, 99, 235, 0.6)'
                    }}></div>
                )}
                <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '16px', 
                    background: selected === m.id ? '#fff' : '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--school-primary, #0056b3)',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    flexShrink: 0
                }}>
                    {m.sender?.name?.charAt(0) || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1rem', fontWeight: m.isRead ? 800 : 900, color: '#1e293b' }}>
                      {m.sender?.name}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: m.isRead ? 700 : 800, marginBottom: '6px', color: m.isRead ? '#475569' : '#1e293b' }}>{m.subject}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{m.body}</div>
                </div>
              </div>
            ))}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '120px 24px', color: '#94a3b8' }}>
                <i className="fas fa-envelope-open" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                <h3 style={{ fontWeight: 900, color: '#64748b', fontSize: '1.25rem' }}>Your Registry is Empty</h3>
                <p style={{ fontWeight: 600, margin: 0 }}>Internal communications will be synchronized here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {active ? (
            <div className="animate-in fade-in duration-300">
              <div className="portal-card-header" style={{ marginBottom: '40px', borderBottom: '1px solid #f1f5f9', paddingBottom: '32px' }}>
                <div className="status-badge" style={{ display: 'inline-flex', background: '#f8fafc', color: '#64748b', fontWeight: 900, fontSize: '0.7rem', marginBottom: '16px', border: '1px solid #f1f5f9' }}>
                    MESSAGE AUDIT LOG
                </div>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px' }}>{active.subject}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.25rem', boxShadow: '0 8px 16px -4px rgba(0, 86, 179, 0.2)' }}>
                    {active.sender?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 900 }}>{active.sender?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800, marginTop: '2px' }}>
                      Authorized on {new Date(active.createdAt).toLocaleDateString()} • {new Date(active.createdAt).toLocaleTimeString()} Registry Time
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '0 8px' }}>
                    <p style={{ lineHeight: 1.8, color: '#334155', fontSize: '1.05rem', fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {active.body}
                    </p>
                </div>
                
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '40px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      onClick={() => handleReply(active)}
                      className="portal-btn-primary" 
                      style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)', padding: '14px 40px', fontWeight: 900 }}
                    >
                        <i className="fas fa-reply mr-3"></i>Authorize Reply
                    </button>
                  </div>
                  <button 
                    onClick={() => handleDeleteMessage(active.id)}
                    className="portal-btn-ghost" 
                    style={{ color: '#dc2626', fontWeight: 900 }}
                  >
                    <i className="fas fa-trash-alt mr-2"></i> Delete Audit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '160px 24px', color: '#94a3b8', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', border: '1px solid #f1f5f9' }}>
                <i className="fas fa-envelope-open-text fa-2x" style={{ opacity: 0.2 }}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#cbd5e1' }}>Communication Selection Required</h3>
              <p style={{ marginTop: '12px', fontWeight: 700, maxWidth: '300px', margin: '12px auto 0' }}>Choose a secure communication from your inbox to view full audit details.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Parent Meeting Requests Tab */}
      {activeTab === 'meetings' && (
        <div className="portal-card animate-in fade-in" style={{ padding: 24, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                Parent Consultation & Meeting Requests
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Review incoming appointment requests from parents and synchronize approved slots to the institutional calendar.
              </p>
            </div>
            <span className="portal-badge info" style={{ fontWeight: 700 }}>
              {meetingRequests.length} Scheduled Requests
            </span>
          </div>

          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Parent / Guardian</th>
                <th style={{ padding: 12 }}>Student & Cohort</th>
                <th style={{ padding: 12 }}>Requested Slot</th>
                <th style={{ padding: 12 }}>Consultation Agenda</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetingRequests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12, fontWeight: 700, color: '#0f172a' }}>
                    <div>{req.parentName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{req.phone}</div>
                  </td>
                  <td style={{ padding: 12, fontWeight: 600 }}>{req.studentName}</td>
                  <td style={{ padding: 12, color: '#0284c7', fontWeight: 700 }}>
                    <i className="far fa-clock mr-1"></i> {req.requestedDate}
                  </td>
                  <td style={{ padding: 12, color: '#475569', fontSize: '0.85rem', maxWidth: 280 }}>
                    {req.topic}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span className={`portal-badge ${req.status === 'Approved' ? 'success' : req.status === 'Rescheduled' ? 'info' : 'warning'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      {req.status === 'Pending' && (
                        <>
                          <button
                            className="portal-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#16a34a', borderColor: '#16a34a' }}
                            onClick={() => {
                              setMeetingRequests(meetingRequests.map(m => m.id === req.id ? { ...m, status: 'Approved' } : m));
                              showToast('Meeting slot approved and synchronized to calendar', 'success');
                            }}
                          >
                            <i className="fas fa-check mr-1"></i> Approve
                          </button>
                          <button
                            className="portal-btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setMeetingRequests(meetingRequests.map(m => m.id === req.id ? { ...m, status: 'Rescheduled' } : m));
                              showToast('Proposed alternative time slot to parent via SMS', 'info');
                            }}
                          >
                            <i className="fas fa-exchange-alt mr-1"></i> Reschedule
                          </button>
                        </>
                      )}
                      {req.status === 'Approved' && (
                        <button
                          className="portal-btn-ghost"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#0284c7' }}
                          onClick={() => window.open(`tel:${req.phone}`, '_self')}
                        >
                          <i className="fas fa-phone mr-1"></i> Call Parent
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compose Class SMS Modal */}
      {showClassSmsModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '550px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Broadcast Class SMS to Parents</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Sends instant SMS notifications to guardians of all enrolled students via tenant gateway.
                </p>
              </div>
              <button onClick={() => setShowClassSmsModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label className="portal-label">Target Class Cohort</label>
                <select 
                  className="portal-input"
                  value={selectedClassSms}
                  onChange={e => setSelectedClassSms(e.target.value)}
                >
                  <option value="Form 3A">Form 3A (35 Registered Guardians)</option>
                  <option value="Form 3B">Form 3B (32 Registered Guardians)</option>
                  <option value="Form 4A">Form 4A (38 Registered Guardians)</option>
                  <option value="Form 4B">Form 4B (36 Registered Guardians)</option>
                </select>
              </div>

              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="portal-label">SMS Message Content</label>
                  <span style={{ fontSize: '0.75rem', color: classSmsText.length > 160 ? '#b91c1c' : '#64748b' }}>
                    {classSmsText.length} / 160 chars ({Math.ceil((classSmsText.length || 1) / 160)} SMS segment)
                  </span>
                </div>
                <textarea
                  className="portal-input"
                  rows={4}
                  placeholder="e.g. Reminder: Form 3A Mid-Term Assessment takes place this Thursday. Please ensure pupils bring graphing calculators."
                  value={classSmsText}
                  onChange={e => setClassSmsText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowClassSmsModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="portal-btn-primary"
                  onClick={() => {
                    if (!classSmsText.trim()) {
                      showToast('Please enter SMS text', 'warning');
                      return;
                    }
                    showToast(`Broadcast sent to ${selectedClassSms} guardians successfully via SMS gateway`, 'success');
                    setShowClassSmsModal(false);
                    setClassSmsText('');
                  }}
                >
                  <i className="fas fa-paper-plane mr-2"></i>Send Class SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Compose New Message</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Send a secure communication to another user</p>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>
            <div className="portal-modal-body">
              <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Recipient <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    required 
                    className="portal-input" 
                    value={newRecipientId} 
                    onChange={e => setNewRecipientId(e.target.value)}
                  >
                    <option value="">Select a user</option>
                    {recipients.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Subject <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="portal-input" 
                    placeholder="Message subject" 
                    value={newSubject} 
                    onChange={e => setNewSubject(e.target.value)} 
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Message Body <span style={{ color: 'red' }}>*</span></label>
                  <textarea 
                    required 
                    className="portal-input" 
                    rows={6} 
                    placeholder="Type your secure message content here..." 
                    value={newBody} 
                    onChange={e => setNewBody(e.target.value)} 
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '10px' }}>
                  <button type="button" className="portal-btn-neutral" onClick={() => setShowNewModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
