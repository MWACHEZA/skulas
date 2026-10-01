import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import TabbedPage from '../../../components/shared/TabbedPage';
import ViewingAsToggle from '../../../components/shared/ViewingAsToggle';
import { useModuleAccess } from '../../../hooks/useModuleAccess';

export default function SportsModule() {
  const { user } = useAuth();
  const access = useModuleAccess('sports');
  
  // Data
  const [teams, setTeams] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);

  useEffect(() => {
    if (access && access.level !== 'none') {
      fetchTeams();
      if (access.actingAs !== 'sports_tech') fetchHouses();
      fetchEquipment();
    }
  }, [access]);

  const fetchTeams = () => api.get('/api/sports-extended/teams').then(res => setTeams(res.data)).catch(console.error);
  const fetchHouses = () => api.get('/api/sports-extended/houses').then(res => setHouses(res.data)).catch(console.error);
  const fetchEquipment = () => api.get('/api/sports-extended/equipment').then(res => setEquipment(res.data)).catch(console.error);

  if (!access) return <div>Loading...</div>;

  if (access.level === 'none') {
    return (
      <div className="portal-page">
        <div className="portal-page-header">
          <h1>Sports</h1>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
          Not assigned to any team
        </div>
      </div>
    );
  }

  const TeamsTab = () => (
    <div>
      <table className="portal-table">
        <thead>
          <tr><th>Name</th><th>Category</th></tr>
        </thead>
        <tbody>
          {teams.map(t => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const HousesTab = () => (
    <div>
      <table className="portal-table">
        <thead>
          <tr><th>House</th><th>Points</th></tr>
        </thead>
        <tbody>
          {houses.map(h => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>{h.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const EquipmentTab = () => (
    <div>
      <table className="portal-table">
        <thead>
          <tr><th>Item</th><th>Quantity</th><th>Condition</th></tr>
        </thead>
        <tbody>
          {equipment.map(e => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.quantity}</td>
              <td>{e.condition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tabs = [
    { id: 'teams', label: 'Teams', content: <TeamsTab /> },
    ...(access.actingAs !== 'sports_tech' ? [{ id: 'houses', label: 'Houses', content: <HousesTab /> }] : []),
    { id: 'equipment', label: 'Equipment', content: <EquipmentTab /> }
  ];

  return (
    <div className="portal-page">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Sports Module</h1>
        <ViewingAsToggle module="sports" />
      </div>
      <TabbedPage tabs={tabs} defaultTab="teams" />
    </div>
  );
}
