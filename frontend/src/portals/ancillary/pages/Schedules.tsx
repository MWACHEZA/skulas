export default function AncillarySchedules() {
  const shifts = [
    { staff: 'Mr Dube (Security)', mon: '06:00–18:00', tue: '06:00–18:00', wed: 'OFF', thu: '06:00–18:00', fri: '06:00–18:00' },
    { staff: 'Mrs Ncube (Kitchen)', mon: '05:00–14:00', tue: '05:00–14:00', wed: '05:00–14:00', thu: '05:00–14:00', fri: '05:00–12:00' },
    { staff: 'Mr Phiri (Grounds)', mon: '07:00–16:00', tue: '07:00–16:00', wed: '07:00–16:00', thu: '07:00–16:00', fri: '07:00–16:00' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Work Schedules</h1>
        <p>View weekly duty rosters and shift assignments.</p>
      </div>
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-clock" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>This Week's Roster</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="portal-table">
            <thead><tr><th>Staff Member</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr></thead>
            <tbody>
              {shifts.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.staff}</td>
                  {[s.mon, s.tue, s.wed, s.thu, s.fri].map((shift, j) => (
                    <td key={j} style={{ color: shift === 'OFF' ? 'var(--portal-danger)' : '#718096', fontWeight: shift === 'OFF' ? 700 : 400 }}>{shift}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
