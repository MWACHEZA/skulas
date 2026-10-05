import React, { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

interface StudentSeat {
  id: string;
  name: string;
  studentId: string;
  row: number;
  col: number;
}

export default function TeacherTimetable() {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'seating'>('today');
  const { showToast } = useToast();

  // Seating plan state
  const [selectedClass, setSelectedClass] = useState('Form 3A');
  const [selectedRoom, setSelectedRoom] = useState('Block B - Room 14 (Capacity: 35)');
  const [gridRows, setGridRows] = useState(5);
  const [gridCols, setGridCols] = useState(6);

  const initialStudents: StudentSeat[] = [
    { id: '1', name: 'Tanaka Ndlovu', studentId: 'ST-001', row: 0, col: 0 },
    { id: '2', name: 'Ruvimbo Chitepo', studentId: 'ST-002', row: 0, col: 1 },
    { id: '3', name: 'Blessing Sibanda', studentId: 'ST-003', row: 0, col: 2 },
    { id: '4', name: 'Tadiwa Mutasa', studentId: 'ST-004', row: 0, col: 3 },
    { id: '5', name: 'Farai Moyo', studentId: 'ST-005', row: 0, col: 4 },
    { id: '6', name: 'Chipo Dube', studentId: 'ST-006', row: 1, col: 0 },
    { id: '7', name: 'Kudzai Shumba', studentId: 'ST-007', row: 1, col: 1 },
    { id: '8', name: 'Nyasha Sithole', studentId: 'ST-008', row: 1, col: 2 },
    { id: '9', name: 'Tariro Hove', studentId: 'ST-009', row: 1, col: 3 },
    { id: '10', name: 'Simbarashe Zhou', studentId: 'ST-010', row: 1, col: 4 },
  ];

  const [seats, setSeats] = useState<StudentSeat[]>(initialStudents);
  const [selectedSeat, setSelectedSeat] = useState<StudentSeat | null>(null);

  const handleSeatClick = (r: number, c: number) => {
    const occupant = seats.find(s => s.row === r && s.col === c);
    if (selectedSeat) {
      // If clicked on another occupant, swap them
      if (occupant) {
        setSeats(seats.map(s => {
          if (s.id === selectedSeat.id) return { ...s, row: r, col: c };
          if (s.id === occupant.id) return { ...s, row: selectedSeat.row, col: selectedSeat.col };
          return s;
        }));
        showToast(`Swapped ${selectedSeat.name} with ${occupant.name}`, 'info');
      } else {
        // Move to empty seat
        setSeats(seats.map(s => s.id === selectedSeat.id ? { ...s, row: r, col: c } : s));
        showToast(`Moved ${selectedSeat.name} to Row ${r + 1}, Col ${c + 1}`, 'info');
      }
      setSelectedSeat(null);
    } else if (occupant) {
      setSelectedSeat(occupant);
    }
  };

  const handleRandomize = () => {
    const coords: { r: number; c: number }[] = [];
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        coords.push({ r, c });
      }
    }
    // Shuffle
    const shuffledCoords = [...coords].sort(() => Math.random() - 0.5);
    setSeats(seats.map((s, idx) => ({
      ...s,
      row: shuffledCoords[idx].r,
      col: shuffledCoords[idx].c
    })));
    showToast('Exam anti-cheating seating randomized across room grid', 'success');
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>My Timetable & Seating Arrangements</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Teaching schedule, room allocations, duty rotations, and exam seating plans.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'today' ? 700 : 500,
            color: activeTab === 'today' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'today' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-calendar-day mr-2" />
          Today's Schedule
        </button>
        <button
          onClick={() => setActiveTab('week')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'week' ? 700 : 500,
            color: activeTab === 'week' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'week' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-calendar-week mr-2" />
          Weekly Master Grid
        </button>
        <button
          onClick={() => setActiveTab('seating')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'seating' ? 700 : 500,
            color: activeTab === 'seating' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'seating' ? '3px solid #0284c7' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-chair mr-2" />
          Class & Exam Seating Plans
        </button>
      </div>

      {activeTab === 'today' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Today's Teaching Schedule</h2>
            <span className="portal-badge info">Term 3 &bull; Monday</span>
          </div>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Period / Time</th>
                <th style={{ padding: 12 }}>Class & Subject</th>
                <th style={{ padding: 12 }}>Room Allocation</th>
                <th style={{ padding: 12 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>Period 1 (08:00 - 08:45)</td>
                <td style={{ padding: 12 }}>Form 3A &bull; Mathematics</td>
                <td style={{ padding: 12 }}><i className="fas fa-door-open mr-1" /> Room 14 (Main Wing)</td>
                <td style={{ padding: 12 }}><span className="portal-badge success">Completed</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>Period 2 (08:45 - 09:30)</td>
                <td style={{ padding: 12 }}>Form 4B &bull; Physical Science</td>
                <td style={{ padding: 12 }}><i className="fas fa-flask mr-1" /> Science Lab 2</td>
                <td style={{ padding: 12 }}><span className="portal-badge warning">In Session</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>Period 3 (09:45 - 10:30)</td>
                <td style={{ padding: 12 }}>Planning & Schemes Preparation</td>
                <td style={{ padding: 12 }}>Staff Room</td>
                <td style={{ padding: 12 }}><span className="portal-badge secondary">Free Period</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'week' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>Weekly Timetable Grid</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>Time / Day</th>
                  <th style={{ padding: 12 }}>Monday</th>
                  <th style={{ padding: 12 }}>Tuesday</th>
                  <th style={{ padding: 12 }}>Wednesday</th>
                  <th style={{ padding: 12 }}>Thursday</th>
                  <th style={{ padding: 12 }}>Friday</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>08:00 - 08:45</td>
                  <td style={{ padding: 12, background: '#eff6ff', borderRadius: 4 }}>F3A Maths (Rm 14)</td>
                  <td style={{ padding: 12, background: '#f0fdf4', borderRadius: 4 }}>F4B Science (Lab 2)</td>
                  <td style={{ padding: 12, background: '#eff6ff', borderRadius: 4 }}>F3A Maths (Rm 14)</td>
                  <td style={{ padding: 12 }}>Free</td>
                  <td style={{ padding: 12, background: '#fef3c7', borderRadius: 4 }}>Form Assembly</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12, fontWeight: 700, textAlign: 'left' }}>08:45 - 09:30</td>
                  <td style={{ padding: 12, background: '#f0fdf4', borderRadius: 4 }}>F4B Science (Lab 2)</td>
                  <td style={{ padding: 12, background: '#eff6ff', borderRadius: 4 }}>F3A Maths (Rm 14)</td>
                  <td style={{ padding: 12 }}>Free</td>
                  <td style={{ padding: 12, background: '#f0fdf4', borderRadius: 4 }}>F4B Science (Lab 2)</td>
                  <td style={{ padding: 12, background: '#eff6ff', borderRadius: 4 }}>F3A Maths (Rm 14)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'seating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="portal-card" style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block' }}>Class Cohort</label>
                  <select 
                    className="portal-select" 
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)}
                    style={{ padding: '8px 12px', marginTop: 4 }}
                  >
                    <option value="Form 3A">Form 3A</option>
                    <option value="Form 3B">Form 3B</option>
                    <option value="Form 4A">Form 4A</option>
                    <option value="Form 4B">Form 4B</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block' }}>Room (Reused Room Master)</label>
                  <select 
                    className="portal-select" 
                    value={selectedRoom} 
                    onChange={e => setSelectedRoom(e.target.value)}
                    style={{ padding: '8px 12px', marginTop: 4 }}
                  >
                    <option value="Block B - Room 14 (Capacity: 35)">Block B - Room 14 (Capacity: 35)</option>
                    <option value="Block A - Room 02 (Capacity: 40)">Block A - Room 02 (Capacity: 40)</option>
                    <option value="Great Examination Hall (Capacity: 200)">Great Examination Hall (Capacity: 200)</option>
                    <option value="Science Laboratory 2 (Capacity: 30)">Science Laboratory 2 (Capacity: 30)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="portal-btn-secondary"
                  onClick={handleRandomize}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-random" /> Anti-Cheating Randomizer
                </button>
                <button 
                  className="portal-btn-primary"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="fas fa-print" /> Print Desk Slips
                </button>
              </div>
            </div>
          </div>

          {/* Seating Layout Canvas */}
          <div className="portal-card" style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ display: 'inline-block', background: '#334155', color: '#fff', padding: '6px 32px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem' }}>
                TEACHER'S PODIUM / BLACKBOARD
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`, 
              gap: 12, 
              background: '#f8fafc', 
              padding: 20, 
              borderRadius: 8, 
              border: '1px dashed #cbd5e1' 
            }}>
              {Array.from({ length: gridRows }).map((_, r) =>
                Array.from({ length: gridCols }).map((_, c) => {
                  const occupant = seats.find(s => s.row === r && s.col === c);
                  const isSelected = selectedSeat?.id === occupant?.id;

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleSeatClick(r, c)}
                      style={{
                        minHeight: 80,
                        border: isSelected ? '2px solid #0284c7' : occupant ? '1px solid #94a3b8' : '1px dashed #cbd5e1',
                        borderRadius: 8,
                        background: isSelected ? '#e0f2fe' : occupant ? '#fff' : '#f1f5f9',
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: occupant ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      {occupant ? (
                        <>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
                            {occupant.name.charAt(0)}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', lineHeight: 1.2 }}>
                            {occupant.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
                            {occupant.studentId}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Desk {r + 1}-{c + 1}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', marginTop: 14 }}>
              Click any seated student to select, then click another desk to swap or move seats.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
