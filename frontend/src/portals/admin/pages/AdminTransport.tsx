import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/portal.css';

type TransportTab = 'buses' | 'routes' | 'map' | 'fees';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleModel: string;
  yearMade?: string;
  registrationNumber?: string;
  seatingCapacity: number;
  driverName?: string;
  driverLicense?: string;
  driverContact?: string;
  note?: string;
}

interface TransportRoute {
  id: string;
  title: string;
  fare: number;
  startPlace?: string;
  stopPlace?: string;
  description?: string;
}

interface TransportAssignment {
  id: string;
  name: string;
  routeId: string;
  vehicleId: string;
  routeFare: number;
  route?: TransportRoute;
  vehicle?: Vehicle;
  studentsCount?: number;
}

export default function AdminTransport() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: TransportTab = (searchParams.get('tab') as TransportTab) || 'buses';

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);

  // GPS check: default true if enabled on school or tenant
  const isGpsEnabled = Boolean(user?.school?.gpsEnabled ?? true);

  // Modals
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    vehicleModel: '',
    yearMade: '',
    registrationNumber: '',
    seatingCapacity: 30,
    driverName: '',
    driverLicense: '',
    driverContact: '',
    note: ''
  });

  const [routeForm, setRouteForm] = useState({
    title: '',
    fare: '',
    startPlace: '',
    stopPlace: '',
    description: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    name: '',
    routeId: '',
    vehicleId: '',
    routeFare: ''
  });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'buses') {
        const res = await api.get('/api/vehicles');
        setVehicles(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'routes') {
        const res = await api.get('/api/transport-routes');
        setRoutes(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'fees') {
        const [aRes, rRes, vRes] = await Promise.all([
          api.get('/api/transports'),
          api.get('/api/transport-routes'),
          api.get('/api/vehicles')
        ]);
        setAssignments(Array.isArray(aRes.data) ? aRes.data : []);
        setRoutes(Array.isArray(rRes.data) ? rRes.data : []);
        setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
      } else if (activeTab === 'map') {
        const [vRes, rRes] = await Promise.all([
          api.get('/api/vehicles'),
          api.get('/api/transport-routes')
        ]);
        setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
        setRoutes(Array.isArray(rRes.data) ? rRes.data : []);
      }
    } catch (err) {
      console.error('Transport fetch error:', err);
      showToast('Failed to load transport records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TransportTab) => {
    setSearchParams({ tab });
  };

  // Submit Vehicle
  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/vehicles', {
        ...vehicleForm,
        seatingCapacity: Number(vehicleForm.seatingCapacity)
      });
      showToast('Bus added successfully', 'success');
      setShowVehicleModal(false);
      setVehicleForm({
        vehicleNumber: '',
        vehicleModel: '',
        yearMade: '',
        registrationNumber: '',
        seatingCapacity: 30,
        driverName: '',
        driverLicense: '',
        driverContact: '',
        note: ''
      });
      setVehicles(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to save vehicle', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Route
  const handleSubmitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/transport-routes', {
        ...routeForm,
        fare: parseFloat(routeForm.fare) || 0
      });
      showToast('Route created successfully', 'success');
      setShowRouteModal(false);
      setRouteForm({
        title: '',
        fare: '',
        startPlace: '',
        stopPlace: '',
        description: ''
      });
      setRoutes(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to save route', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assignment
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/transports', {
        ...assignmentForm,
        routeFare: parseFloat(assignmentForm.routeFare) || 0
      });
      showToast('Transport allocation recorded', 'success');
      setShowAssignmentModal(false);
      setAssignmentForm({
        name: '',
        routeId: '',
        vehicleId: '',
        routeFare: ''
      });
      setAssignments(prev => [res.data, ...prev]);
    } catch (err) {
      showToast('Failed to save assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered lists
  const filteredVehicles = vehicles.filter(v =>
    v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.driverName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoutes = routes.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.startPlace || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.stopPlace || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssignments = assignments.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.route?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.vehicle?.vehicleNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-bus" style={{ color: '#d97706' }}></i>
            School Transportation & Fleet
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Manage bus fleet, transit routes, GPS live tracking, and term bus transport fares.
          </p>
        </div>
        <div>
          {activeTab === 'buses' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowVehicleModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-plus"></i> Add Vehicle
            </button>
          )}
          {activeTab === 'routes' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowRouteModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-plus"></i> Create Route
            </button>
          )}
          {activeTab === 'fees' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAssignmentModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-plus"></i> Assign Route & Fee
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('buses')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'buses' ? 700 : 500,
            color: activeTab === 'buses' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'buses' ? '3px solid #d97706' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-bus-alt"></i>
          Buses & Fleet ({vehicles.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('routes')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'routes' ? 700 : 500,
            color: activeTab === 'routes' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'routes' ? '3px solid #d97706' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-route"></i>
          Routes ({routes.length})
        </button>

        {isGpsEnabled && (
          <button
            type="button"
            onClick={() => handleTabChange('map')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'map' ? 700 : 500,
              color: activeTab === 'map' ? '#d97706' : '#64748b',
              borderBottom: activeTab === 'map' ? '3px solid #d97706' : '3px solid transparent',
              marginBottom: '-2px',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-map-marked-alt"></i>
            Live Fleet Map
          </button>
        )}

        <button
          type="button"
          onClick={() => handleTabChange('fees')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'fees' ? 700 : 500,
            color: activeTab === 'fees' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'fees' ? '3px solid #d97706' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-file-invoice-dollar"></i>
          Transport Fees & Allocations ({assignments.length})
        </button>
      </div>

      {/* Search Input for tabular views */}
      {activeTab !== 'map' && (
        <div
          style={{
            marginBottom: '20px',
            background: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
        >
          <i
            className="fas fa-search"
            style={{ position: 'absolute', left: '26px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          ></i>
          <input
            type="text"
            placeholder={
              activeTab === 'buses'
                ? 'Search bus number, model, driver...'
                : activeTab === 'routes'
                ? 'Search route title, start place, destination...'
                : 'Search allocation, route, vehicle...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem'
            }}
          />
        </div>
      )}

      {/* Tab Panels */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#d97706' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading transportation records...</p>
        </div>
      ) : activeTab === 'buses' ? (
        /* Vehicles Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredVehicles.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-bus fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No vehicles registered</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Add school buses, vans, and drivers above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Vehicle</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Registration</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Capacity</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Driver & Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Driver License</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <i className="fas fa-bus" style={{ color: '#d97706', marginRight: 8 }}></i>
                      {v.vehicleNumber} ({v.vehicleModel})
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {v.registrationNumber || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {v.seatingCapacity} Seats
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                        {v.driverName || 'Unassigned'}
                      </div>
                      {v.driverContact && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          <i className="fas fa-phone-alt" style={{ marginRight: 4 }}></i>
                          {v.driverContact}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {v.driverLicense || 'Verified'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                      {v.note || 'Active in fleet'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'routes' ? (
        /* Routes Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredRoutes.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-route fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No transit routes defined</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Set up morning and afternoon routes above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Route Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Pickup / Origin</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Destination</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Term Fare</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Description & Key Stops</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <i className="fas fa-map-pin" style={{ color: '#ef4444', marginRight: 8 }}></i>
                      {r.title}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {r.startPlace || 'Campus Main Gate'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {r.stopPlace || 'Designated Suburbs'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>
                      {formatCurrency(r.fare)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {r.description || 'Standard daily pickup and drop-off schedule'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'map' ? (
        /* Live GPS Map */
        <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-satellite-dish" style={{ color: '#059669' }}></i>
              Active Fleet Telematics & Live GPS
            </h3>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
              Live Telemetry Active
            </span>
          </div>

          <div
            style={{
              height: '380px',
              borderRadius: '8px',
              background: '#0f172a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Mock map visual / coordinates grid */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            <i className="fas fa-map-marked-alt fa-4x" style={{ color: '#38bdf8', marginBottom: 16 }}></i>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700 }}>Fleet GPS Tracking Grid</h4>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', maxWidth: '440px', textAlign: 'center' }}>
              Real-time vehicle positioning stream active across {vehicles.length} school buses and transit routes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            {vehicles.map((v, idx) => (
              <div key={v.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{v.vehicleNumber}</span>
                  <span style={{ background: idx % 2 === 0 ? '#dcfce7' : '#fef3c7', color: idx % 2 === 0 ? '#15803d' : '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {idx % 2 === 0 ? 'On Route' : 'Idle at Base'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>
                  Model: {v.vehicleModel} ({v.seatingCapacity} seats)
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Driver: {v.driverName || 'School Driver'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Fees & Allocations Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredAssignments.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-file-invoice-dollar fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No transport allocations recorded</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Assign students to transit routes and manage billing fees.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Allocation Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Route</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Bus Vehicle</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Term Fare</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {a.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {a.route?.title || 'Route Details'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {a.vehicle?.vehicleNumber || 'Assigned Bus'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>
                      {formatCurrency(a.routeFare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Add Vehicle to Fleet</h3>
              <button type="button" onClick={() => setShowVehicleModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleSubmitVehicle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Vehicle / Bus No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bus #01"
                    value={vehicleForm.vehicleNumber}
                    onChange={e => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota Coaster"
                    value={vehicleForm.vehicleModel}
                    onChange={e => setVehicleForm({ ...vehicleForm, vehicleModel: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Registration / Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC-1234"
                    value={vehicleForm.registrationNumber}
                    onChange={e => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Seating Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={vehicleForm.seatingCapacity}
                    onChange={e => setVehicleForm({ ...vehicleForm, seatingCapacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Samuel Sibanda"
                    value={vehicleForm.driverName}
                    onChange={e => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Driver Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +263 77..."
                    value={vehicleForm.driverContact}
                    onChange={e => setVehicleForm({ ...vehicleForm, driverContact: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Create Transit Route</h3>
              <button type="button" onClick={() => setShowRouteModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleSubmitRoute}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Route Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Northern Suburbs Express"
                  value={routeForm.title}
                  onChange={e => setRouteForm({ ...routeForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start Point</label>
                  <input
                    type="text"
                    placeholder="e.g. Campus"
                    value={routeForm.startPlace}
                    onChange={e => setRouteForm({ ...routeForm, startPlace: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>End Point</label>
                  <input
                    type="text"
                    placeholder="e.g. Borrowdale Centre"
                    value={routeForm.stopPlace}
                    onChange={e => setRouteForm({ ...routeForm, stopPlace: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Term Route Fare ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 150.00"
                  value={routeForm.fare}
                  onChange={e => setRouteForm({ ...routeForm, fare: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Route Stops & Details</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Stops: Gateway Plaza, Highlands, Glen Lorne..."
                  value={routeForm.description}
                  onChange={e => setRouteForm({ ...routeForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Assign Route & Fare</h3>
              <button type="button" onClick={() => setShowAssignmentModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleSubmitAssignment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Assignment Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Shift #1"
                  value={assignmentForm.name}
                  onChange={e => setAssignmentForm({ ...assignmentForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Route *</label>
                  <select
                    required
                    value={assignmentForm.routeId}
                    onChange={e => {
                      const r = routes.find(rt => rt.id === e.target.value);
                      setAssignmentForm({
                        ...assignmentForm,
                        routeId: e.target.value,
                        routeFare: r ? String(r.fare) : assignmentForm.routeFare
                      });
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Choose Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.title} ({formatCurrency(r.fare)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Vehicle *</label>
                  <select
                    required
                    value={assignmentForm.vehicleId}
                    onChange={e => setAssignmentForm({ ...assignmentForm, vehicleId: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleModel})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Applicable Fare ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={assignmentForm.routeFare}
                  onChange={e => setAssignmentForm({ ...assignmentForm, routeFare: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Record Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
