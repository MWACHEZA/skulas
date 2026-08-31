import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

interface BookDuty {
  id: string;
  studentName: string;
  bookTitle: string;
  action: 'ISSUED' | 'RETURNED' | 'RESERVED';
  time: string;
}

export default function StudentLibraryAssistantPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'duty' | 'books' | 'hours'>('duty');
  const [search, setSearch] = useState('');
  const [dutyHours] = useState(14);
  const [recentDuties, setRecentDuties] = useState<BookDuty[]>([
    { id: 'DUTY-101', studentName: 'Chipo Dube', bookTitle: 'Advanced Physics Vol 1', action: 'ISSUED', time: '09:15 AM Today' },
    { id: 'DUTY-102', studentName: 'Farai Moyo', bookTitle: 'Setwork: The Sun Will Rise Again', action: 'RETURNED', time: '11:40 AM Today' },
    { id: 'DUTY-103', studentName: 'Tinashe Ndlovu', bookTitle: 'IGCSE Mathematics Core', action: 'RESERVED', time: '02:05 PM Yesterday' },
  ]);

  const [catalog] = useState([
    { id: 'BK-001', title: 'Focus on Geography Form 3', author: 'L. Sibanda', copiesAvailable: 4, shelf: 'Bay A3' },
    { id: 'BK-002', title: 'Ordinary Level Biology', author: 'Dr. C. Chitiyo', copiesAvailable: 1, shelf: 'Bay B1' },
    { id: 'BK-003', title: 'Principles of Accounts 4th Ed', author: 'R. Kambarami', copiesAvailable: 6, shelf: 'Bay C2' },
  ]);

  const filteredCatalog = catalog.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.shelf.toLowerCase().includes(search.toLowerCase())
  );

  const handleQuickIssue = (title: string) => {
    const newEntry: BookDuty = {
      id: `DUTY-${104 + recentDuties.length}`,
      studentName: 'Walk-in Student',
      bookTitle: title,
      action: 'ISSUED',
      time: 'Just now'
    };
    setRecentDuties([newEntry, ...recentDuties]);
    showToast(`Issued "${title}" to student. Log updated!`, 'success');
  };

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1>Student Library Assistant Portal</h1>
          <p>Manage shelf organization, issue returns, and track student helper duty hours.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          onClick={() => showToast('Duty Shift Logged: +2 Hours recorded successfully!', 'success')}
        >
          <i className="fas fa-clock portal-mr-6"></i>Clock Shift Hours
        </button>
      </div>

      {/* Stats Header */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-user-clock"></i></div>
          <div className="portal-stat-info">
            <h3>{dutyHours} Hours</h3>
            <p>Completed Duty Time</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-book-reader"></i></div>
          <div className="portal-stat-info">
            <h3>{recentDuties.length}</h3>
            <p>Transactions Assisted</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-layer-group"></i></div>
          <div className="portal-stat-info">
            <h3>3 Shelves</h3>
            <p>Assigned Bay Sections</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="portal-flex-gap-10-mb20">
        <button 
          className={activeTab === 'duty' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('duty')}
        >
          <i className="fas fa-tasks portal-mr-6"></i>Assisted Transactions
        </button>
        <button 
          className={activeTab === 'books' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('books')}
        >
          <i className="fas fa-search portal-mr-6"></i>Shelf Catalog Search
        </button>
        <button 
          className={activeTab === 'hours' ? 'portal-btn-primary' : 'portal-btn-secondary'}
          onClick={() => setActiveTab('hours')}
        >
          <i className="fas fa-award portal-mr-6"></i>Assistant Recognition
        </button>
      </div>

      {activeTab === 'duty' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-history portal-icon-primary"></i>Recent Desk Assistance Log</h2>
          </div>
          <div className="portal-card-body portal-p-0">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Book Title</th>
                  <th>Action</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentDuties.map((d) => (
                  <tr key={d.id}>
                    <td className="portal-font-700">{d.studentName}</td>
                    <td>{d.bookTitle}</td>
                    <td>
                      <span className={`portal-badge ${d.action === 'ISSUED' ? 'info' : d.action === 'RETURNED' ? 'success' : 'warning'}`}>
                        {d.action}
                      </span>
                    </td>
                    <td className="portal-text-muted-sm">{d.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'books' && (
        <div className="portal-card">
          <div className="portal-card-header portal-card-header-flex-between">
            <h2><i className="fas fa-boxes portal-icon-primary"></i>Bay Shelf Directory</h2>
            <input 
              type="text"
              className="portal-input portal-input-w260"
              placeholder="Search catalog or bay..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="portal-card-body portal-p-0">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Shelf Location</th>
                  <th>Available</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((b) => (
                  <tr key={b.id}>
                    <td className="portal-font-700">{b.title}</td>
                    <td>{b.author}</td>
                    <td><span className="portal-badge secondary">{b.shelf}</span></td>
                    <td className="portal-font-800">
                      {b.copiesAvailable} copies
                    </td>
                    <td>
                      <button 
                        className="portal-btn-secondary portal-btn-xs" 
                        onClick={() => handleQuickIssue(b.title)}
                        disabled={b.copiesAvailable === 0}
                      >
                        <i className="fas fa-hand-holding-box portal-mr-4"></i>Issue Desk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-medal portal-icon-primary"></i>Library Prefect Badge & Service Certificate</h2>
          </div>
          <div className="portal-card-body portal-card-award-body">
            <i className="fas fa-award fa-4x portal-award-icon"></i>
            <h3 className="portal-h3-title">Senior Library Helper Status: ACTIVE</h3>
            <p className="portal-p-subtitle-center">
              You have completed {dutyHours} of 20 required library volunteer hours this term to earn the Community Service Merit Badge.
            </p>
            <div className="portal-badge-progress-card">
              <div className="portal-flex-between-mb8-fw700">
                <span>Term Goal Progress</span>
                <span>{Math.round((dutyHours / 20) * 100)}%</span>
              </div>
              <progress className="portal-progress-bar" value={dutyHours} max={20}></progress>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
