import React from 'react';

export default function parentCalendar() {
  const events = [
    { date: '25 Mar 2026', title: 'Parent-Teacher Consultations', time: '08:30 - 16:30', category: 'Academic', location: 'Great Hall' },
    { date: '28 Mar 2026', title: 'Inter-School Swimming Gala', time: '09:00 - 13:00', category: 'Sports', location: 'Main Pool' },
    { date: '02 Apr 2026', title: 'Easter Assembly', time: '10:00 - 11:30', category: 'Event', location: 'School Chapel' },
    { date: '05 Apr 2026', title: 'Start of Half-Term Break', time: 'All Day', category: 'Holiday', location: 'N/A' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>School Calendar</h1>
        <p>Keep track of important dates, events, and holidays for the current term.</p>
      </div>

      <div className="portal-grid-1-2">
         {/* Month selector placeholder */}
         <div className="portal-card">
            <div className="portal-card-header">
               <h2><i className="fas fa-calendar-check" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Viewing</h2>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
               <div style={{ padding: 20 }}>
                  <h3 style={{ margin: '0 0 10px' }}>March 2026</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, textAlign: 'center' }}>
                     {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a0aec0' }}>{d}</div>)}
                     {Array.from({ length: 31 }).map((_, i) => (
                        <div key={i} style={{ 
                           padding: '8px 0', 
                           fontSize: '0.85rem', 
                           borderRadius: 5, 
                           background: (i + 1 === 25 || i + 1 === 28) ? '#ebf8ff' : 'transparent',
                           color: (i + 1 === 25 || i + 1 === 28) ? 'var(--school-primary, #3182ce)' : '#2d3748',
                           fontWeight: (i + 1 === 25 || i + 1 === 28) ? 700 : 400
                        }}>{i + 1}</div>
                     ))}
                  </div>
               </div>
               <div style={{ borderTop: '1px solid #edf2f7', padding: 15 }}>
                  <button className="portal-btn-secondary" style={{ width: '100%', marginBottom: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Sync to My Calendar</button>
                  <button className="portal-btn-secondary" style={{ width: '100%' }} onClick={() => alert('This feature is currently under development or disabled.')}>Download Term Planner</button>
               </div>
            </div>
         </div>

         {/* Upcoming Events */}
         <div className="portal-card">
            <div className="portal-card-header">
               <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: '#ed8936' }}></i>Upcoming Events</h2>
            </div>
            <div className="portal-card-body">
               <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {events.map((e, i) => (
                     <div key={i} style={{ 
                        padding: 15, 
                        borderRadius: 12, 
                        border: '1px solid #edf2f7', 
                        display: 'flex', 
                        gap: 20, 
                        background: '#f8f9fc' 
                     }}>
                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                           <div style={{ fontSize: '0.75rem', color: 'var(--portal-danger)', fontWeight: 800, textTransform: 'uppercase' }}>
                              {e.date.split(' ')[1]}
                           </div>
                           <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                              {e.date.split(' ')[0]}
                           </div>
                        </div>
                        <div style={{ flex: 1 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <h3 style={{ margin: 0, fontSize: '1rem' }}>{e.title}</h3>
                              <span className="portal-badge info" style={{ fontSize: '0.65rem' }}>{e.category}</span>
                           </div>
                           <div style={{ display: 'flex', gap: 15, fontSize: '0.8rem', color: '#718096' }}>
                              <span><i className="fas fa-clock" style={{ marginRight: 5 }}></i>{e.time}</span>
                              <span><i className="fas fa-map-marker-alt" style={{ marginRight: 5 }}></i>{e.location}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </>
  );
}
