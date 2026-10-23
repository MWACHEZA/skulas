import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import { SkeletonLoader, Pagination } from '../../../components/shared';

interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  body?: string;
  category: string;
  priority: string;
  audience: string;
  isPinned: boolean;
  publishedAt: string;
  createdAt: string;
  expiryDate?: string | null;
  reads?: { id: string; userId: string; readAt: string }[];
}

export default function ParentNotices() {
  const { showToast } = useToast();
  const [notices, setNotices] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoticeForView, setActiveNoticeForView] = useState<AnnouncementRecord | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      // Connects directly to database announcements endpoint
      const res = await api.get('/api/announcements');
      if (Array.isArray(res.data)) {
        setNotices(res.data);
      } else {
        setNotices([]);
      }
    } catch (err: any) {
      console.error('Failed to load notices from database:', err);
      showToast('Could not load announcements from server.', 'error');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (noticeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/api/announcements/${noticeId}/read`);
      setNotices(prev =>
        prev.map(n =>
          n.id === noticeId
            ? { ...n, reads: [{ id: 'local-read', userId: 'current', readAt: new Date().toISOString() }] }
            : n
        )
      );
    } catch {
      // Optimistic mark as read
      setNotices(prev =>
        prev.map(n =>
          n.id === noticeId
            ? { ...n, reads: [{ id: 'local-read', userId: 'current', readAt: new Date().toISOString() }] }
            : n
        )
      );
    }
  };

  const handleOpenNotice = (notice: AnnouncementRecord) => {
    setActiveNoticeForView(notice);
    const isUnread = !notice.reads || notice.reads.length === 0;
    if (isUnread) {
      handleMarkAsRead(notice.id);
    }
  };

  // Categories list
  const categoryOptions = [
    { key: 'ALL', label: 'All Circulars' },
    { key: 'URGENT', label: 'Urgent Alerts' },
    { key: 'ACADEMIC', label: 'Academic' },
    { key: 'FEES', label: 'Billing & Fees' },
    { key: 'EVENTS', label: 'Events & Sports' },
    { key: 'GENERAL', label: 'General Notices' }
  ];

  // Filtering
  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      // Category match
      if (selectedCategory !== 'ALL') {
        const cat = (n.category || '').toUpperCase();
        if (selectedCategory === 'URGENT') {
          if (cat !== 'URGENT' && n.priority !== 'URGENT') return false;
        } else if (cat !== selectedCategory) {
          return false;
        }
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || n.body || '').toLowerCase().includes(q);
        if (!titleMatch && !contentMatch) return false;
      }

      return true;
    });
  }, [notices, selectedCategory, searchQuery]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Paginated records
  const paginatedNotices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotices.slice(start, start + itemsPerPage);
  }, [filteredNotices, currentPage, itemsPerPage]);

  const urgentPinnedList = useMemo(() => {
    return notices.filter(n => n.priority === 'URGENT' || n.category?.toUpperCase() === 'URGENT' || n.isPinned);
  }, [notices]);

  const unreadCount = useMemo(() => {
    return notices.filter(n => !n.reads || n.reads.length === 0).length;
  }, [notices]);

  const getCategoryMeta = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'URGENT':
        return { label: 'Urgent', bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', icon: 'fa-exclamation-triangle' };
      case 'FEES':
        return { label: 'Fees & Finance', bg: '#fef3c7', text: '#b45309', border: '#fcd34d', icon: 'fa-file-invoice-dollar' };
      case 'ACADEMIC':
        return { label: 'Academic', bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', icon: 'fa-graduation-cap' };
      case 'EVENTS':
        return { label: 'Event & Gala', bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: 'fa-calendar-star' };
      default:
        return { label: 'General', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: 'fa-bullhorn' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800 }}>
              <i className="fas fa-bullhorn" style={{ color: '#2563eb' }}></i>
              School Notices & Circulars
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Official administrative notices, academic directives, term calendar memos, and urgent school alerts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={fetchNotices}
              className="portal-btn-ghost"
              style={{ padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Refresh circulars"
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="portal-stat-icon blue">
            <i className="fas fa-newspaper"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{notices.length}</h3>
            <p>Active Circulars</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="portal-stat-icon red">
            <i className="fas fa-bell"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: unreadCount > 0 ? '#dc2626' : '#1e293b' }}>
              {unreadCount}
            </h3>
            <p>Unread Circulars</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="portal-stat-icon orange">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: urgentPinnedList.length > 0 ? '#d97706' : '#1e293b' }}>
              {urgentPinnedList.length}
            </h3>
            <p>Pinned & Urgent</p>
          </div>
        </div>
      </div>

      {/* Urgent Alert Banner (if urgent unread circulars exist) */}
      {urgentPinnedList.length > 0 && selectedCategory === 'ALL' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fca5a5',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>
                  PRIORITY ALERT
                </span>
                <span style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 700 }}>
                  {urgentPinnedList[0].title}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#7f1d1d', maxWidth: 800 }}>
                {urgentPinnedList[0].content?.slice(0, 160)}...
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenNotice(urgentPinnedList[0])}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            Read Notice <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="portal-card"
        style={{
          marginBottom: 0,
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          borderRadius: 14
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center', paddingBottom: 2 }}>
          {categoryOptions.map(cat => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  border: '1px solid',
                  borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                  borderRadius: 20,
                  padding: '7px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.key === 'URGENT' && <i className="fas fa-exclamation-triangle mr-1"></i>}
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Live Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
          <input
            type="text"
            placeholder="Search circulars..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
            >
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>
      </div>

      {/* Circulars List */}
      {loading ? (
        <div style={{ padding: '24px 0' }}>
          <SkeletonLoader type="card" count={4} />
        </div>
      ) : paginatedNotices.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8', fontSize: '1.8rem' }}>
            <i className="fas fa-bullhorn"></i>
          </div>
          <h3 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '1.15rem', fontWeight: 800 }}>
            No Notices Found in Database
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', maxWidth: 450, marginInline: 'auto' }}>
            {searchQuery
              ? `No circulars matching "${searchQuery}" under ${categoryOptions.find(c => c.key === selectedCategory)?.label}.`
              : `There are currently no active announcements published for this category.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {paginatedNotices.map(notice => {
            const isUrgent = notice.priority === 'URGENT' || notice.category?.toUpperCase() === 'URGENT';
            const meta = getCategoryMeta(notice.category);
            const isRead = !!(notice.reads && notice.reads.length > 0);
            const publishDate = notice.publishedAt || notice.createdAt;
            const formattedDate = publishDate ? new Date(publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';

            return (
              <div
                key={notice.id}
                className="portal-card"
                onClick={() => handleOpenNotice(notice)}
                style={{
                  marginBottom: 0,
                  borderRadius: 14,
                  cursor: 'pointer',
                  borderLeft: isUrgent ? '6px solid #dc2626' : isRead ? '4px solid #cbd5e1' : '4px solid #2563eb',
                  background: isUrgent ? '#fffbfb' : '#ffffff',
                  boxShadow: isUrgent ? '0 4px 12px rgba(220, 38, 38, 0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div className="portal-card-body" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        {/* Category Badge */}
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: meta.bg,
                            color: meta.text,
                            border: `1px solid ${meta.border}`,
                            padding: '3px 10px',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <i className={`fas ${meta.icon}`}></i> {meta.label}
                        </span>

                        {/* Pinned Marker */}
                        {notice.isPinned && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: 6 }}>
                            <i className="fas fa-thumbtack mr-1"></i> PINNED
                          </span>
                        )}

                        {/* Urgent Marker */}
                        {isUrgent && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: 6 }}>
                            <i className="fas fa-bolt mr-1"></i> URGENT
                          </span>
                        )}

                        {/* Read/Unread Pill */}
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: isRead ? '#f1f5f9' : '#dcfce7',
                            color: isRead ? '#94a3b8' : '#15803d'
                          }}
                        >
                          {isRead ? 'Read ✓' : '● New'}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          <i className="fas fa-calendar-alt mr-1 opacity-70"></i> {formattedDate}
                        </span>
                      </div>

                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: isUrgent ? '#991b1b' : '#0f172a', lineHeight: 1.4 }}>
                        {notice.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNotice(notice);
                        }}
                        className="portal-btn-ghost"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 6 }}
                      >
                        Read Full Notice <i className="fas fa-chevron-right ml-1"></i>
                      </button>
                    </div>
                  </div>

                  <p style={{ margin: 0, color: '#334155', lineHeight: 1.65, fontSize: '0.92rem' }}>
                    {notice.content?.length > 220 ? `${notice.content.slice(0, 220)}...` : notice.content}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Unified Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredNotices.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            itemLabel="circulars"
          />
        </div>
      )}

      {/* Notice Reader Modal */}
      {activeNoticeForView && (
        <div
          className="portal-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setActiveNoticeForView(null)}
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: 650, width: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: getCategoryMeta(activeNoticeForView.category).bg, color: getCategoryMeta(activeNoticeForView.category).text, padding: '3px 8px', borderRadius: 4 }}>
                    {getCategoryMeta(activeNoticeForView.category).label}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {new Date(activeNoticeForView.publishedAt || activeNoticeForView.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                  {activeNoticeForView.title}
                </h2>
              </div>
              <button
                className="portal-btn-ghost"
                onClick={() => setActiveNoticeForView(null)}
                style={{ padding: '6px 10px', fontSize: '1.1rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.98rem', color: '#1e293b', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {activeNoticeForView.body || activeNoticeForView.content}
              </div>

              {activeNoticeForView.expiryDate && (
                <div style={{ marginTop: 24, padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                  <i className="fas fa-clock mr-1"></i> Active through: {new Date(activeNoticeForView.expiryDate).toLocaleDateString()}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="portal-btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(`${activeNoticeForView.title}\n\n${activeNoticeForView.body || activeNoticeForView.content}`);
                  showToast('Circular text copied to clipboard!', 'success');
                }}
              >
                <i className="fas fa-copy mr-1"></i> Copy Circular
              </button>
              <button
                className="portal-btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700 }}
                onClick={() => setActiveNoticeForView(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
