export default function ParentTransport() {
  const routes = [
    { 
      name: 'Route Alpha (CBD & Northern Suburbs)', 
      driver: 'Mr S. Dube', 
      vehicle: 'Bus 01 (Reg: AEK 1234)', 
      phone: '+263 77 111 2222', 
      status: 'In Transit',
      eta: '12 mins',
      progress: 65,
      stops: [
        { name: 'City Hall Bulawayo', time: '07:15 AM', status: 'completed' },
        { name: 'Ascot Shopping Centre', time: '07:30 AM', status: 'completed' },
        { name: 'Khartoum Terminus', time: '07:45 AM', status: 'active' },
        { name: 'Embakwe High School', time: '08:15 AM', status: 'pending' }
      ] 
    },
    { 
        name: 'Route Beta (Plumtree & Figtree)', 
        driver: 'Mr T. Ncube', 
        vehicle: 'Bus 04 (Reg: BYO 5678)', 
        phone: '+263 71 333 4444', 
        status: 'Departed School',
        eta: '45 mins',
        progress: 15,
        stops: [
          { name: 'Embakwe High School', time: '03:45 PM', status: 'completed' },
          { name: 'Figtree Junction', time: '04:15 PM', status: 'active' },
          { name: 'Plumtree Border', time: '05:00 PM', status: 'pending' }
        ] 
      },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Transport & Bus Tracking</h1>
        <p>Monitor school bus locations, view route schedules, and contact drivers.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {routes.map((r, i) => (
          <div key={i} className="portal-card" style={{ marginBottom: 0, borderTop: `4px solid ${r.status === 'In Transit' ? 'var(--school-primary, #3182ce)' : 'var(--portal-success)'}` }}>
            <div className="portal-card-body" style={{ padding: 24 }}>
                <div className="portal-grid-12-1">
                    
                    {/* Route Details */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: '#2d3748' }}>{r.name}</h3>
                                <span className="portal-badge info" style={{ fontSize: '0.7rem' }}>{r.status}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <small style={{ color: '#718096', display: 'block' }}>Estimated Arrival</small>
                                <strong style={{ fontSize: '1.2rem', color: 'var(--school-primary, #3182ce)' }}>{r.eta}</strong>
                            </div>
                        </div>

                        <div className="portal-grid-2" style={{ gap: 15, background: '#f8f9fc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
                            <div>
                                <small style={{ display: 'block', color: '#718096', marginBottom: 4 }}>Driver</small>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fas fa-user-circle" style={{ color: 'var(--school-primary, #3182ce)' }}></i>
                                    <strong style={{ fontSize: '0.9rem' }}>{r.driver}</strong>
                                </div>
                            </div>
                            <div>
                                <small style={{ display: 'block', color: '#718096', marginBottom: 4 }}>Vehicle</small>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fas fa-bus" style={{ color: 'var(--school-primary, #3182ce)' }}></i>
                                    <strong style={{ fontSize: '0.9rem' }}>{r.vehicle}</strong>
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <button className="portal-btn-secondary" style={{ width: '100%', justifyContent: 'center', background: 'white' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                                    <i className="fas fa-phone-alt"></i> Call Driver: {r.phone}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tracking Visualization */}
                    <div>
                        <h4 style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route Progress</h4>
                        <div style={{ position: 'relative', paddingLeft: 30 }}>
                            <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 4, background: '#edf2f7', borderRadius: 2 }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${r.progress}%`, background: 'var(--school-primary, #3182ce)', borderRadius: 2, transition: 'height 1s ease' }}></div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {r.stops.map((stop, j) => (
                                    <div key={j} style={{ position: 'relative' }}>
                                        <div style={{ 
                                            position: 'absolute', left: -26, top: 4, width: 16, height: 16, borderRadius: '50%', 
                                            background: stop.status === 'completed' ? 'var(--school-primary, #3182ce)' : stop.status === 'active' ? 'white' : 'white',
                                            border: `3px solid ${stop.status === 'completed' ? 'var(--school-primary, #3182ce)' : stop.status === 'active' ? 'var(--school-primary, #3182ce)' : '#cbd5e0'}`,
                                            zIndex: 2
                                        }}>
                                            {stop.status === 'active' && <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--school-primary, #3182ce)', transform: 'scale(0.5)' }}></div>}
                                        </div>
                                        <div style={{ opacity: stop.status === 'pending' ? 0.5 : 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.95rem', color: stop.status === 'active' ? 'var(--school-primary, #3182ce)' : '#2d3748' }}>{stop.name}</strong>
                                                <span style={{ fontSize: '0.75rem', color: '#718096' }}>{stop.time}</span>
                                            </div>
                                            {stop.status === 'active' && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--school-primary, #3182ce)' }}>BUS IS HERE</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

