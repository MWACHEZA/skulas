import React, { useState } from 'react';
import '../../../styles/portal.css';

interface ClassAnnouncement {
  id: string;
  title: string;
  date: string;
  content: string;
  author: string;
}

export default function ClassMonitorDashboard() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'announcements'>('attendance');
  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([
    { id: '1', title: 'Math Worksheet Collection', date: '2026-04-16', content: 'Please submit your math worksheets to my desk by break time.', author: 'Monitor' },
    { id: '2', title: 'Class Cleaning Roster', date: '2026-04-14', content: 'Group A is responsible for class cleanup this week.', author: 'Monitor' }
  ]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAnnouncement.trim()) return;

    const newPost: ClassAnnouncement = {
      id: Date.now().toString(),
      title: newTitle,
      date: new Date().toISOString().split('T')[0],
      content: newAnnouncement,
      author: 'Monitor'
    };

    setAnnouncements([newPost, ...announcements]);
    setNewTitle('');
    setNewAnnouncement('');
  };

  return (
    <div className="class-monitor-container">
      <div className="portal-page-header">
        <h1>Class Monitor Dashboard</h1>
        <p>Assist with class attendance and manage class-specific announcements.</p>
      </div>

      <div className="portal-tabs">
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          <i className="fas fa-clipboard-check"></i> Attendance Helper
        </button>
        <button className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
          <i className="fas fa-bullhorn"></i> Class Digital Noticeboard
        </button>
      </div>

      <div className="portal-card mt-6">
        {activeTab === 'attendance' && (
          <div className="tab-content">
            <div className="flex justify-between items-center mb-6">
              <h3>Morning Registration Helper</h3>
              <p className="text-sm text-gray-500 mb-0">Record raw attendance data to pass to the Form Teacher.</p>
            </div>
            
            <div className="info-alert mb-6">
              <i className="fas fa-info-circle"></i>
              <span>This tool helps you quickly mark present students. Formal attendance must still be validated by your teacher.</span>
            </div>

            <div className="management-table-card">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status (Quick Mark)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Alice Mwale</td>
                    <td>
                       <select className="form-control" defaultValue="Present">
                         <option>Present</option>
                         <option>Absent</option>
                         <option>Late</option>
                       </select>
                    </td>
                    <td><input type="text" className="form-control" placeholder="Optional notes" /></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Robert Phiri</td>
                    <td>
                       <select className="form-control" defaultValue="Absent">
                         <option>Present</option>
                         <option>Absent</option>
                         <option>Late</option>
                       </select>
                    </td>
                    <td><input type="text" className="form-control" placeholder="Medical" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex mt-6 justify-end">
               <button className="portal-btn-primary py-2 px-6" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-paper-plane mr-2"></i>Submit Data to Teacher</button>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="tab-content">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1">
                     <div className="portal-card-header mb-4">
                       <h3>Create Notice</h3>
                     </div>
                     <form className="portal-form" onSubmit={handlePostAnnouncement}>
                        <div className="form-group">
                            <label>Notice Title</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="E.g. Homework Collection"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              required
                            />
                        </div>
                        <div className="form-group">
                            <label>Content</label>
                            <textarea 
                              className="form-control" 
                              rows={4} 
                              placeholder="Write your announcement here..."
                              value={newAnnouncement}
                              onChange={(e) => setNewAnnouncement(e.target.value)}
                              required
                            ></textarea>
                        </div>
                        <button type="submit" className="portal-btn-primary w-full py-2">Post to Noticeboard</button>
                     </form>
                 </div>
                 
                 <div className="lg:col-span-2">
                     <div className="portal-card-header mb-4">
                       <h3>Active Notices</h3>
                     </div>
                     <div className="space-y-4">
                        {announcements.map((post) => (
                          <div key={post.id} className="p-4 border rounded-xl bg-gray-50">
                             <div className="flex justify-between items-start mb-2">
                                <h4 className="m-0 font-bold text-gray-800">{post.title}</h4>
                                <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">{post.date}</span>
                             </div>
                             <p className="text-sm text-gray-600 mb-0">{post.content}</p>
                          </div>
                        ))}
                     </div>
                 </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
