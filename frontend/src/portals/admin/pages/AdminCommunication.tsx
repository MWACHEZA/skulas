import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/portal.css';

type CommunicationTab = 'messages' | 'announcements' | 'approvals';

interface MessageItem {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  visiblePortals: string[];
  isPublic: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface ApprovalRequest {
  id: string;
  category: 'Admissions' | 'Excursion' | 'Payment Plan' | 'Leave';
  title: string;
  requesterName: string;
  requesterRole: string;
  details: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function AdminCommunication() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: CommunicationTab = (searchParams.get('tab') as CommunicationTab) || 'messages';

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Message Detail & Modals
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [composeForm, setComposeForm] = useState({
    recipientId: '',
    subject: '',
    body: ''
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    category: 'General',
    visiblePortals: ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
    isPublic: true
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'messages') {
        const [mRes, rRes] = await Promise.all([
          api.get('/api/messages'),
          api.get('/api/messages/users')
        ]);
        setMessages(Array.isArray(mRes.data?.data) ? mRes.data.data : Array.isArray(mRes.data) ? mRes.data : []);
        setRecipients(Array.isArray(rRes.data) ? rRes.data : []);
      } else if (activeTab === 'announcements') {
        const res = await api.get('/api/content/announcements?all=true');
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'approvals') {
        // Fetch dashboard approval queues or mock defaults
        const dRes = await api.get('/api/dashboard/admin');
        const needsApproval = dRes.data?.needsApproval || {};
        
        // Seed unified approvals list
        const queue: ApprovalRequest[] = [];
        if (needsApproval.admissions > 0) {
          queue.push({
            id: 'app-adm-1',
            category: 'Admissions',
            title: 'Application: Grade 8 Entry (Form 1)',
            requesterName: 'Chipo Sibanda (Parent)',
            requesterRole: 'Applicant',
            details: 'Birth certificate, previous grade 7 results attached. Awaiting school admin admission signoff.',
            date: new Date().toISOString(),
            status: 'PENDING'
          });
        }
        if (needsApproval.paymentPlans > 0) {
          queue.push({
            id: 'app-plan-1',
            category: 'Payment Plan',
            title: '3-Month Term Tuition Stagger Agreement',
            requesterName: 'Tendai Mutasa',
            requesterRole: 'Parent',
            details: 'Requested 3 installments of $350 each for Term 3 school fees.',
            date: new Date().toISOString(),
            status: 'PENDING'
          });
        }
        if (needsApproval.leaveRequests > 0) {
          queue.push({
            id: 'app-leave-1',
            category: 'Leave',
            title: 'Staff Compassionate Leave (3 Days)',
            requesterName: 'Mr. N. Dube',
            requesterRole: 'Teacher',
            details: 'Emergency family bereavement leave from 28 Sept to 30 Sept.',
            date: new Date().toISOString(),
            status: 'PENDING'
          });
        }
        queue.push({
          id: 'app-excursion-1',
          category: 'Excursion',
          title: 'Science Olympiad Travel Clearance',
          requesterName: 'Science Department (Mrs. Ncube)',
          requesterRole: 'Teacher',
          details: 'Transport and overnight accommodation request for 12 students visiting the Harare Science Fair.',
          date: new Date().toISOString(),
          status: 'PENDING'
        });
        setApprovals(queue);
      }
    } catch (err) {
      console.error('Failed to load communication records', err);
      showToast('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: CommunicationTab) => {
    setSearchParams({ tab });
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/messages', composeForm);
      showToast('Message sent successfully', 'success');
      setShowComposeModal(false);
      setComposeForm({ recipientId: '', subject: '', body: '' });
      setMessages(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to deliver message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Publish announcement
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/content/announcements', announcementForm);
      showToast('Announcement broadcasted successfully', 'success');
      setShowAnnouncementModal(false);
      setAnnouncementForm({
        title: '',
        content: '',
        category: 'General',
        visiblePortals: ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
        isPublic: true
      });
      setAnnouncements(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to publish announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve approval
  const handleResolveApproval = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setApprovals(prev =>
      prev.map(a => (a.id === id ? { ...a, status } : a))
    );
    showToast(`Request marked as ${status.toLowerCase()}`, status === 'APPROVED' ? 'success' : 'info');
  };

  // Filtered messages
  const filteredMessages = messages.filter(m =>
    m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.sender?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered announcements
  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered approvals
  const filteredApprovals = approvals.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-comments" style={{ color: '#0284c7' }}></i>
            Communication & Approval Inbox
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Unified communication hub for staff & parent messages, official school broadcasts, and pending institutional sign-offs.
          </p>
        </div>
        <div>
          {activeTab === 'messages' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowComposeModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-paper-plane"></i> Compose Message
            </button>
          )}
          {activeTab === 'announcements' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAnnouncementModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-bullhorn"></i> Post Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('messages')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'messages' ? 700 : 500,
            color: activeTab === 'messages' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'messages' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-envelope"></i>
          Messages Inbox ({messages.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('announcements')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'announcements' ? 700 : 500,
            color: activeTab === 'announcements' ? '#059669' : '#64748b',
            borderBottom: activeTab === 'announcements' ? '3px solid #059669' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-bullhorn"></i>
          Announcements Sent ({announcements.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('approvals')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'approvals' ? 700 : 500,
            color: activeTab === 'approvals' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'approvals' ? '3px solid #d97706' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-clipboard-check"></i>
          Pending Approvals ({approvals.filter(a => a.status === 'PENDING').length})
        </button>
      </div>

      {/* Search Input */}
      <div
        style={{
          marginBottom: '20px',
          background: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          position: 'relative'
        }}
      >
        <i
          className="fas fa-search"
          style={{ position: 'absolute', left: '26px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
        ></i>
        <input
          type="text"
          placeholder="Search by keywords, subject, author, or recipient..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px 9px 36px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading messages & broadcasts...</p>
        </div>
      ) : activeTab === 'messages' ? (
        /* Messages Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredMessages.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-envelope-open fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>Your inbox is empty</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Compose a new message above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Sender</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Subject</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Message Preview</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Date Received</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: m.isRead ? '#fff' : '#f0fdf4' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {m.sender?.name || 'School Member'}
                      {m.sender?.role && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                          {m.sender.role}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: m.isRead ? 500 : 700, color: '#1e293b' }}>
                      {m.subject}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.body}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedMessage(m)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#0284c7',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Read
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'announcements' ? (
        /* Announcements Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredAnnouncements.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-bullhorn fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No announcements sent yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Broadcast school circulars and events above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Content</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Target Portals</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Date Broadcast</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <i className="fas fa-bullhorn" style={{ color: '#059669', marginRight: 8 }}></i>
                      {a.title}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {a.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', maxWidth: '380px' }}>
                      {a.content}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(a.visiblePortals || []).map(p => (
                          <span key={p} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Approvals Queue */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredApprovals.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-check-circle fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>All approval queues clear</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>No pending requests requiring admin intervention.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Request Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Submitted By</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          background:
                            req.category === 'Admissions'
                              ? '#dbeafe'
                              : req.category === 'Payment Plan'
                              ? '#fef3c7'
                              : req.category === 'Leave'
                              ? '#fce7f3'
                              : '#ede9fe',
                          color:
                            req.category === 'Admissions'
                              ? '#1e40af'
                              : req.category === 'Payment Plan'
                              ? '#92400e'
                              : req.category === 'Leave'
                              ? '#9d174d'
                              : '#5b21b6',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {req.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {req.title}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{req.requesterName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.requesterRole}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', maxWidth: '300px' }}>
                      {req.details}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {req.status === 'APPROVED' ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <i className="fas fa-check" style={{ marginRight: 4 }}></i> Approved
                        </span>
                      ) : req.status === 'REJECTED' ? (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <i className="fas fa-times" style={{ marginRight: 4 }}></i> Rejected
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <i className="fas fa-clock" style={{ marginRight: 4 }}></i> Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleResolveApproval(req.id, 'APPROVED')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#059669',
                              color: '#fff',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveApproval(req.id, 'REJECTED')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              color: '#dc2626',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Message Reader Modal */}
      {selectedMessage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                {selectedMessage.subject}
              </h3>
              <button type="button" onClick={() => setSelectedMessage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px', fontSize: '0.85rem', color: '#64748b' }}>
              <div><strong>From:</strong> {selectedMessage.sender?.name || 'School Member'} ({selectedMessage.sender?.email})</div>
              <div><strong>Date:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, minHeight: '100px', whiteSpace: 'pre-wrap' }}>
              {selectedMessage.body}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Compose Direct Message</h3>
              <button type="button" onClick={() => setShowComposeModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleSendMessage}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Recipient *</label>
                <select
                  required
                  value={composeForm.recipientId}
                  onChange={e => setComposeForm({ ...composeForm, recipientId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Recipient --</option>
                  {recipients.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Confirmation / Inquiries"
                  value={composeForm.subject}
                  onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Message Body *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your message here..."
                  value={composeForm.body}
                  onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showAnnouncementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Post School Broadcast</h3>
              <button type="button" onClick={() => setShowAnnouncementModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handlePublishAnnouncement}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Term Closing Assembly & Notices"
                  value={announcementForm.title}
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Category *</label>
                <select
                  value={announcementForm.category}
                  onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="General">General Notice</option>
                  <option value="Academics">Academic Notice</option>
                  <option value="Finance">Fees & Finance</option>
                  <option value="Sports">Sports & Culture</option>
                  <option value="Emergency">Urgent / Emergency Alert</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Announcement Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Full circular or announcement message..."
                  value={announcementForm.content}
                  onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Publishing...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
