import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import TabbedPage from '../../../components/portals/shared/TabbedPage';
import ViewingAsToggle from '../../../components/shared/ViewingAsToggle';
import { useModuleAccess } from '../../../hooks/useModuleAccess';

export default function PrefectBoard() {
  const { user } = useAuth();
  const access = useModuleAccess('prefects');
  
  if (!access) return <div>Loading...</div>;

  if (access.level === 'none') {
    return (
      <div className="portal-page">
        <div className="portal-page-header">
          <h1>Prefect Board</h1>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
          Access Denied
        </div>
      </div>
    );
  }

  const DutyRosterTab = () => {
    const [duties, setDuties] = useState<any[]>([]);
    useEffect(() => {
      api.get('/api/prefects/duty').then(res => setDuties(res.data)).catch(console.error);
    }, []);
    return (
      <table className="portal-table">
        <thead><tr><th>Date</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          {duties.map(d => <tr key={d.id}><td>{new Date(d.date).toLocaleDateString()}</td><td>{d.role}</td><td>{d.status}</td></tr>)}
        </tbody>
      </table>
    );
  };

  const MeetingsTab = () => {
    const [meetings, setMeetings] = useState<any[]>([]);
    useEffect(() => {
      api.get('/api/prefects/meetings').then(res => setMeetings(res.data)).catch(console.error);
    }, []);
    return (
      <table className="portal-table">
        <thead><tr><th>Date</th><th>Agenda</th><th>Status</th></tr></thead>
        <tbody>
          {meetings.map(m => <tr key={m.id}><td>{new Date(m.date).toLocaleDateString()}</td><td>{m.agenda}</td><td>{m.status}</td></tr>)}
        </tbody>
      </table>
    );
  };

  const ConductReportsTab = () => {
    const [reports, setReports] = useState<any[]>([]);
    useEffect(() => {
      api.get('/api/prefects/conduct').then(res => setReports(res.data)).catch(console.error);
    }, []);
    return (
      <table className="portal-table">
        <thead><tr><th>Date</th><th>Offence</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>
          {reports.map(r => <tr key={r.id}><td>{new Date(r.date).toLocaleDateString()}</td><td>{r.offenceType}</td><td>{r.severity}</td><td>{r.status}</td></tr>)}
        </tbody>
      </table>
    );
  };

  const PrefectsListTab = () => {
    const [prefects, setPrefects] = useState<any[]>([]);
    useEffect(() => {
      api.get('/api/prefects').then(res => setPrefects(res.data)).catch(console.error);
    }, []);
    return (
      <table className="portal-table">
        <thead><tr><th>Student</th><th>Role</th></tr></thead>
        <tbody>
          {prefects.map(p => <tr key={p.id}><td>{p.student?.name}</td><td>{p.leadershipRole}</td></tr>)}
        </tbody>
      </table>
    );
  };

  const tabs = [
    { id: 'duty', label: 'Duty Roster', content: <DutyRosterTab /> },
    { id: 'meetings', label: 'Meeting Minutes', content: <MeetingsTab /> },
    { id: 'conduct', label: 'Conduct Reports', content: <ConductReportsTab /> },
    { id: 'list', label: 'Prefects List', content: <PrefectsListTab /> }
  ];

  return (
    <div className="portal-page">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Prefect Board</h1>
        {access.actingAs && <ViewingAsToggle actingAs={access.actingAs} />}
      </div>
      <TabbedPage title="Prefect Board" tabs={tabs} defaultTab="duty" />
    </div>
  );
}
