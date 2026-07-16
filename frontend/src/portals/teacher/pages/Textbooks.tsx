import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  available: number;
  copies: number;
  _count: { loans: number };
  teacher?: { user: { name: string } };
  loans?: {
    id: string;
    student: {
      name: string;
      studentId: string;
      class: { name: string };
    } | null;
    borrowedAt: string;
    dueDate: string;
  }[];
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(2px)',
};

const modalCard: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  width: '100%',
  maxWidth: 540,
  margin: 20,
  overflow: 'hidden',
};

const modalHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid #e2e8f0',
};

const modalBody: React.CSSProperties = {
  padding: '24px',
  maxHeight: '70vh',
  overflowY: 'auto',
};

const modalFooter: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
  padding: '16px 24px',
  borderTop: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#4a5568',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const formGroup: React.CSSProperties = { marginBottom: 16 };

export default function TeacherTextbooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [issueData, setIssueData] = useState({ bookId: '', classId: '', dueDate: '' });

  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    totalCopies: '1',
    subjectId: '',
    classId: '',
    description: '',
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchBooks();
    fetchClasses();
    fetchSubjects();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/teachers/textbooks');
      setBooks(data);
    } catch {
      showToast('Failed to load textbook inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/teachers/my-classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to fetch classes');
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/api/subjects');
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to fetch subjects');
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueData.bookId || !issueData.classId || !issueData.dueDate) {
      showToast('Please fill all fields before issuing', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/api/teachers/textbooks/issue', issueData);
      showToast('Books issued to class successfully', 'success');
      setShowIssueModal(false);
      setIssueData({ bookId: '', classId: '', dueDate: '' });
      fetchBooks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to issue books', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) {
      showToast('Title and Author are required', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/api/library/books', newBook);
      showToast('Textbook added successfully', 'success');
      setShowAddModal(false);
      setNewBook({ title: '', author: '', isbn: '', totalCopies: '1', subjectId: '', classId: '', description: '' });
      fetchBooks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to add textbook', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Textbook Management</h1>
          <p>Register curriculum books, track copies, and manage class distributions.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => { setShowAddModal(true); }}
            className="portal-btn-primary"
            style={{ background: 'var(--portal-primary)', borderColor: 'var(--portal-primary)', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-plus"></i> Add Textbook
          </button>
          <button
            onClick={() => { setShowIssueModal(true); }}
            className="portal-btn-primary"
            style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-hand-holding"></i> Issue to Class
          </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-book-bookmark" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Curriculum Book Inventory</h2>
          <span style={{ fontSize: '0.82rem', color: '#718096' }}>{books.length} Books Registered</span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#cbd5e0' }}></i>
              <p style={{ color: '#718096', marginTop: 12 }}>Loading inventory...</p>
            </div>
          ) : books.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-book-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 16 }}></i>
              <p style={{ fontWeight: 600 }}>No textbooks registered yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Click <strong>Add Textbook</strong> to register your first curriculum book.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Total</th>
                    <th>Issued</th>
                    <th>Available</th>
                    <th>Added By</th>
                    <th>Stock Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.title}</td>
                      <td style={{ color: '#4a5568' }}>{b.author}</td>
                      <td style={{ fontSize: '0.82rem', color: '#718096' }}>{b.isbn || '—'}</td>
                      <td>{b.copies}</td>
                      <td style={{ fontWeight: 600, color: b._count.loans > 0 ? 'var(--portal-primary)' : '#cbd5e0' }}>{b._count.loans}</td>
                      <td style={{ fontWeight: 700 }}>{b.available}</td>
                      <td style={{ fontSize: '0.82rem', color: '#4a5568' }}>{b.teacher?.user?.name || 'Admin'}</td>
                      <td>
                        <span className={`portal-badge ${b.available === 0 ? 'danger' : b.available < 5 ? 'warning' : 'success'}`}>
                          {b.available === 0 ? 'Out of Stock' : b.available < 5 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedBook(b)}
                          className="btn-icon btn-view"
                          title="View active assignments"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── ADD TEXTBOOK MODAL ───────────────────────────────────────────── */}
      {showAddModal && (
        <div style={modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                  <i className="fas fa-plus-circle" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>
                  Add Curriculum Textbook
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#718096' }}>This book will be linked to your profile</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>&times;</button>
            </div>

            <form onSubmit={handleAddBook}>
              <div style={modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={formGroup}>
                    <label style={labelStyle}>Title <span style={{ color: 'var(--portal-danger)' }}>*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Pure Mathematics"
                      style={inputStyle}
                      value={newBook.title}
                      onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                    />
                  </div>
                  <div style={formGroup}>
                    <label style={labelStyle}>Author <span style={{ color: 'var(--portal-danger)' }}>*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. John Smith"
                      style={inputStyle}
                      value={newBook.author}
                      onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={formGroup}>
                    <label style={labelStyle}>ISBN</label>
                    <input
                      type="text"
                      placeholder="e.g. 978-3-16-148410-0"
                      style={inputStyle}
                      value={newBook.isbn}
                      onChange={e => setNewBook({ ...newBook, isbn: e.target.value })}
                    />
                  </div>
                  <div style={formGroup}>
                    <label style={labelStyle}>Total Copies <span style={{ color: 'var(--portal-danger)' }}>*</span></label>
                    <input
                      required
                      type="number"
                      min="1"
                      style={inputStyle}
                      value={newBook.totalCopies}
                      onChange={e => setNewBook({ ...newBook, totalCopies: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={formGroup}>
                    <label style={labelStyle}>For Class (Optional)</label>
                    <select
                      style={inputStyle}
                      value={newBook.classId}
                      onChange={e => setNewBook({ ...newBook, classId: e.target.value })}
                    >
                      <option value="">All classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={formGroup}>
                    <label style={labelStyle}>Subject (Optional)</label>
                    <select
                      style={inputStyle}
                      value={newBook.subjectId}
                      onChange={e => setNewBook({ ...newBook, subjectId: e.target.value })}
                    >
                      <option value="">Select subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={formGroup}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Optional notes about this textbook..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                    value={newBook.description}
                    onChange={e => setNewBook({ ...newBook, description: e.target.value })}
                  />
                </div>
              </div>

              <div style={modalFooter}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ minWidth: 120 }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Adding...</> : <><i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add Textbook</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ISSUE TO CLASS MODAL ─────────────────────────────────────────── */}
      {showIssueModal && (
        <div style={modalOverlay} onClick={() => setShowIssueModal(false)}>
          <div style={{ ...modalCard, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                  <i className="fas fa-hand-holding-open" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>
                  Issue Textbooks to Class
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#718096' }}>One copy per student will be issued</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>&times;</button>
            </div>

            <form onSubmit={handleIssue}>
              <div style={modalBody}>
                <div style={formGroup}>
                  <label style={labelStyle}>Select Book <span style={{ color: 'var(--portal-danger)' }}>*</span></label>
                  <select
                    required
                    style={inputStyle}
                    value={issueData.bookId}
                    onChange={e => setIssueData({ ...issueData, bookId: e.target.value })}
                  >
                    <option value="">Choose a textbook...</option>
                    {books.filter(b => b.available > 0).map(b => (
                      <option key={b.id} value={b.id}>{b.title} — {b.available} copies left</option>
                    ))}
                  </select>
                  {books.filter(b => b.available > 0).length === 0 && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--portal-danger)', marginTop: 4 }}>
                      No books with available copies. Add more copies first.
                    </p>
                  )}
                </div>

                <div style={formGroup}>
                  <label style={labelStyle}>Target Class <span style={{ color: 'var(--portal-danger)' }}>*</span></label>
                  <select
                    required
                    style={inputStyle}
                    value={issueData.classId}
                    onChange={e => setIssueData({ ...issueData, classId: e.target.value })}
                  >
                    <option value="">Select a class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div style={formGroup}>
                  <label style={labelStyle}>Return Due Date <span style={{ color: 'var(--portal-danger)' }}>*</span></label>
                  <input
                    required
                    type="date"
                    style={inputStyle}
                    min={new Date().toISOString().split('T')[0]}
                    value={issueData.dueDate}
                    onChange={e => setIssueData({ ...issueData, dueDate: e.target.value })}
                  />
                </div>

                <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '12px 16px', fontSize: '0.82rem', color: '#276749' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                  Each student in the selected class will receive one copy of this textbook. Make sure you have enough copies available.
                </div>
              </div>

              <div style={modalFooter}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowIssueModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ minWidth: 140, background: 'var(--portal-success)', borderColor: 'var(--portal-success)' }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Issuing...</> : <><i className="fas fa-paper-plane" style={{ marginRight: 6 }}></i>Confirm Issue</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW ASSIGNMENTS MODAL ───────────────────────────────────────── */}
      {selectedBook && (
        <div style={modalOverlay} onClick={() => setSelectedBook(null)}>
          <div style={{ ...modalCard, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                  <i className="fas fa-clipboard-list" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>
                  Active Assignments — <em>{selectedBook.title}</em>
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#718096' }}>
                  {selectedBook._count.loans} {selectedBook._count.loans === 1 ? 'copy' : 'copies'} currently issued
                </p>
              </div>
              <button onClick={() => setSelectedBook(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ ...modalBody, padding: 0, maxHeight: '420px' }}>
              {!selectedBook.loans || selectedBook.loans.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#718096' }}>
                  <i className="fas fa-inbox fa-3x" style={{ color: '#cbd5e0', marginBottom: 14 }}></i>
                  <p>No active assignments for this book.</p>
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Student ID</th>
                      <th>Class</th>
                      <th>Issued On</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBook.loans.map((loan) => {
                      const overdue = new Date(loan.dueDate) < new Date();
                      return (
                        <tr key={loan.id}>
                          <td style={{ fontWeight: 600 }}>{loan.student?.name || '—'}</td>
                          <td style={{ color: '#718096', fontSize: '0.85rem' }}>{loan.student?.studentId || '—'}</td>
                          <td>{loan.student?.class?.name || '—'}</td>
                          <td style={{ fontSize: '0.85rem' }}>{new Date(loan.borrowedAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`portal-badge ${overdue ? 'danger' : 'success'}`}>
                              {new Date(loan.dueDate).toLocaleDateString()}
                              {overdue && <> &nbsp;<i className="fas fa-exclamation-triangle"></i></>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div style={modalFooter}>
              <button className="portal-btn-primary" onClick={() => setSelectedBook(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
