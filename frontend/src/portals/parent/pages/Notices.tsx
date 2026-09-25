import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';

interface NoticeItem {
  id?: string;
  title: string;
  date: string;
  publishedAt?: string;
  category: 'Academic' | 'Fees' | 'Events' | 'Urgent' | 'General';
  priority?: 'high' | 'medium' | 'low';
  content: string;
  isUrgent?: boolean;
}

export default function ParentNotices() {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState<NoticeItem | null>(null);

  const fallbackNotices: NoticeItem[] = [
    {
      id: 'n-urg-1',
      title: 'Urgent: Water Pipe Maintenance & Early Closure Tomorrow',
      date: '2026-03-26',
      publishedAt: '2026-03-26T08:00:00Z',
      category: 'Urgent',
      priority: 'high',
      isUrgent: true,
      content: 'City municipal water maintenance will interrupt supply tomorrow afternoon. Classes will conclude at 12:30 PM. School transport will depart at 12:45 PM. Please arrange early student pickup.'
    },
    {
      id: 'n-1',
      title: 'Term 2 Opening Date & Orientation Schedule',
      date: '2026-03-20',
      publishedAt: '2026-03-20T09:00:00Z',
      category: 'Academic',
      priority: 'high',
      content: 'Term 2 opens promptly on Tuesday, 5 May 2026. All students must report by 7:45 AM in complete formal winter uniform with all required textbooks and stationery.'
    },
    {
      id: 'n-2',
      title: 'Term 2 Tuition Invoicing & Early Settlement Rebate',
      date: '2026-03-18',
      publishedAt: '2026-03-18T11:30:00Z',
      category: 'Fees',
      priority: 'medium',
      content: 'Term 2 invoices have been published to your parent portal. A 5% early settlement rebate applies to accounts fully settled by Friday, 17 April 2026.'
    },
    {
      id: 'n-3',
      title: 'Annual Inter-House Athletics & Family Fun Day',
      date: '2026-03-15',
      publishedAt: '2026-03-15T14:00:00Z',
      category: 'Events',
      priority: 'medium',
      content: 'The Annual Inter-House Athletics Gala will be hosted at the main sports complex on Saturday, 18 April 2026 starting at 8:30 AM. Parents and guardians are warmly invited.'
    },
    {
      id: 'n-4',
      title: 'Winter Blazer & Tracksuit Uniform Collection',
      date: '2026-03-12',
      publishedAt: '2026-03-12T10:00:00Z',
      category: 'General',
      priority: 'low',
      content: 'Winter uniform stocks (blazers, woollen sweaters, and tracksuits) are now ready for collection at the school uniform shop. Orders placed via the parent portal can be collected from 8:00 AM to 3:30 PM weekdays.'
    }
  ];

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/content/announcements');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped: NoticeItem[] = res.data.map((a: any) => {
          const cat = (a.category || 'General') as any;
          const isUrg = cat === 'Urgent' || a.title?.toLowerCase().includes('urgent');
          return {
            id: a.id,
            title: a.title,
            date: a.publishedAt ? new Date(a.publishedAt).toISOString().split('T')[0] : '',
            publishedAt: a.publishedAt,
            category: isUrg ? 'Urgent' : cat,
            priority: isUrg ? 'high' : 'medium',
            isUrgent: isUrg,
            content: a.content
          };
        });
        setNotices(mapped);
      } else {
        setNotices(fallbackNotices);
      }
    } catch {
      setNotices(fallbackNotices);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Academic', 'Fees', 'Events', 'Urgent'];

  // Identify urgent notices (pinned to the top in default view)
  const urgentNotices = notices.filter(n => n.category === 'Urgent' || n.isUrgent);

  // Filter notices according to selected category
  const filteredNotices = notices.filter(n => {
    if (selectedCategory === 'All') return true;
    return n.category === selectedCategory;
  });

  // In default "All" view, order with Urgent pinned at top
  const displayedNotices = selectedCategory === 'All'
    ? [
        ...urgentNotices,
        ...notices.filter(n => n.category !== 'Urgent' && !n.isUrgent)
      ]
    : filteredNotices;

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Urgent':
        return 'danger';
      case 'Fees':
        return 'warning';
      case 'Academic':
        return 'info';
      case 'Events':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="portal-page-header">
        <div>
          <h1>School Notices & Circulars</h1>
          <p>Official announcements, circulars, and critical updates from school administration.</p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginRight: 4 }}>Filter:</span>
        {categories.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
                background: isSelected
                  ? cat === 'Urgent' ? '#dc2626' : 'var(--school-primary, #2563eb)'
                  : '#f1f5f9',
                color: isSelected ? '#ffffff' : cat === 'Urgent' ? '#b91c1c' : '#475569',
                boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {cat === 'Urgent' && <i className="fas fa-exclamation-triangle mr-1"></i>}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Notices List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x mr-2"></i> Loading school notices...
        </div>
      ) : displayedNotices.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: 48, background: '#f8fafc' }}>
          <i className="fas fa-bell-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
          <h4 style={{ margin: '0 0 4px', color: '#334155' }}>No Notices Found</h4>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            There are currently no circulars published under the "{selectedCategory}" category.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayedNotices.map((n, i) => {
            const isUrgent = n.category === 'Urgent' || n.isUrgent;
            return (
              <div
                key={n.id || i}
                className="portal-card"
                style={{
                  marginBottom: 0,
                  borderLeft: isUrgent ? '6px solid #dc2626' : '4px solid var(--school-primary, #2563eb)',
                  background: isUrgent ? '#fffdfd' : '#ffffff',
                  boxShadow: isUrgent ? '0 4px 12px rgba(220, 38, 38, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div className="portal-card-body" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span
                          className={`portal-badge ${getCategoryBadgeClass(n.category)}`}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {isUrgent && <i className="fas fa-exclamation-circle mr-1"></i>}
                          {n.category}
                        </span>
                        {isUrgent && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              color: '#dc2626',
                              background: '#fee2e2',
                              padding: '2px 8px',
                              borderRadius: 4
                            }}
                          >
                            PINNED PRIORITY
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          <i className="fas fa-calendar-alt mr-1"></i> {n.date}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: isUrgent ? '#991b1b' : '#0f172a' }}>
                        {n.title}
                      </h3>
                    </div>
                  </div>

                  <p style={{ margin: 0, color: '#334155', lineHeight: 1.7, fontSize: '0.95rem' }}>
                    {n.content}
                  </p>

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      className="portal-btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                      onClick={() => setIsShareOpen(n)}
                    >
                      <i className="fas fa-share-alt mr-1"></i> Share Notice
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {isShareOpen && (
        <div
          className="portal-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setIsShareOpen(null)}
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: '420px', width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Share Announcement</h3>
              <button className="portal-btn-ghost" onClick={() => setIsShareOpen(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#475569' }}>
                Share <strong>"{isShareOpen.title}"</strong> with family or emergency contacts:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  className="portal-btn-secondary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    navigator.clipboard.writeText(`${isShareOpen.title}\n\n${isShareOpen.content}`);
                    showToast('Notice content copied to clipboard!', 'success');
                    setIsShareOpen(null);
                  }}
                >
                  <i className="fas fa-copy mr-2"></i> Copy Text
                </button>
                <button
                  className="portal-btn-secondary"
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    const mailto = `mailto:?subject=${encodeURIComponent(isShareOpen.title)}&body=${encodeURIComponent(isShareOpen.content)}`;
                    window.location.href = mailto;
                    setIsShareOpen(null);
                  }}
                >
                  <i className="fas fa-envelope mr-2"></i> Email
                </button>
              </div>
            </div>
            <div className="portal-modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="portal-btn-secondary" onClick={() => setIsShareOpen(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
