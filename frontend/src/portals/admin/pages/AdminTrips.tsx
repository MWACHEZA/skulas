import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SearchInput, ExportButton } from '../../../components/shared';
import ErrorBoundary from '../../../components/shared/ErrorBoundary';
import '../../../styles/portal.css';

interface TripStats {
  totalInvited: number;
  approvedPaid: number;
  approvedUnpaid: number;
  pending: number;
  declined: number;
  expired: number;
  boarded: number;
}

interface SchoolTrip {
  id: string;
  title: string;
  type: string;
  destination: string;
  purpose?: string | null;
  date: string;
  departureTime?: string | null;
  returnTime?: string | null;
  cost: number;
  currency: string;
  transport?: string | null;
  busId?: string | null;
  bus?: { id: string; name: string; number: string; model?: string; quantity?: number } | null;
  staffId?: string | null;
  staff?: { id: string; name: string; email?: string; phone?: string } | null;
  nurseStaffId?: string | null;
  nurseStaff?: { id: string; name: string; email?: string; phone?: string } | null;
  requiredDocuments?: string | null;
  consentDeadline?: string | null;
  riskAssessmentFile?: string | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  itinerary?: string | null;
  seatLimit?: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  publishedAt?: string | null;
  stats?: TripStats;
  consents?: any[];
}

export default function AdminTrips({ defaultTab }: { defaultTab?: 'all-trips' | 'details' | 'create' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const tab = (searchParams.get('tab') as 'all-trips' | 'details' | 'create') || defaultTab || 'all-trips';
  const selectedTripId = searchParams.get('tripId');

  // Module checks
  const isTransportEnabled = (user?.school as any)?.modules?.transport ?? true;
  const isClinicEnabled = (user?.school as any)?.modules?.clinic ?? true;

  // State
  const [trips, setTrips] = useState<SchoolTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<SchoolTrip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Filters for All Trips tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Create Trip Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'academic',
    destination: '',
    purpose: '',
    date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    departureTime: '07:30',
    returnTime: '16:30',
    cost: 0,
    currency: 'USD',
    transport: 'School Bus',
    busId: '',
    staffId: '',
    nurseStaffId: '',
    requiredDocuments: 'Indemnity Form, Medical Clearance',
    consentDeadline: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16),
    riskAssessmentFile: 'https://cdn.acadex.app/docs/excursion-risk-assessment-template.pdf',
    riskLevel: 'LOW',
    itinerary: '07:30 - Departure from Main Gate\n09:30 - Guided Tour & Field Study\n12:30 - Packed Lunch\n14:00 - Group Activities\n16:30 - Return Arrival',
    seatLimit: 50,
    selectedClassIds: [] as string[]
  });

  // Modal / Gate Manifest View
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifestData, setManifestData] = useState<any>(null);

  // Load Trips List
  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/trips');
      if (res.data?.success) {
        setTrips(res.data.trips || []);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load excursions list', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Metadata (Classes, Vehicles, Staff)
  const fetchMetadata = async () => {
    try {
      const [clsRes, vehRes, staffRes] = await Promise.allSettled([
        api.get('/api/classes'),
        api.get('/api/vehicles'),
        api.get('/api/users?role=TEACHER')
      ]);

      if (clsRes.status === 'fulfilled' && clsRes.value.data) {
        setClasses(clsRes.value.data.classes || clsRes.value.data || []);
      }
      if (vehRes.status === 'fulfilled' && vehRes.value.data) {
        setVehicles(vehRes.value.data.vehicles || vehRes.value.data || []);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.data) {
        setStaffList(staffRes.value.data.users || staffRes.value.data || []);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchMetadata();
  }, []);

  // Load Selected Trip
  const fetchTripDetails = async (id: string) => {
    try {
      setLoadingTrip(true);
      const res = await api.get(`/api/trips/${id}`);
      if (res.data?.success) {
        setSelectedTrip(res.data.trip);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load trip details', 'error');
    } finally {
      setLoadingTrip(false);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchTripDetails(selectedTripId);
    }
  }, [selectedTripId]);

  const setTab = (newTab: 'all-trips' | 'details' | 'create', tripId?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    if (tripId) {
      params.set('tripId', tripId);
    } else if (newTab !== 'details') {
      params.delete('tripId');
    }
    setSearchParams(params);
  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || t.type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [trips, searchQuery, statusFilter, typeFilter]);

  // Overall KPI metrics
  const totalTripsCount = trips.length;
  const totalInvitedLearners = trips.reduce((sum, t) => sum + (t.stats?.totalInvited || 0), 0);
  const totalApprovedPaid = trips.reduce((sum, t) => sum + (t.stats?.approvedPaid || 0), 0);
  const totalPending = trips.reduce((sum, t) => sum + (t.stats?.pending || 0), 0);

  // Actions
  const handlePublishTrip = async (tripId: string) => {
    if (!window.confirm('Publish this excursion to selected learners and send legal consent SMS to parents?')) return;
    try {
      // If publishing an existing draft, prompt or use existing targets
      const classIds = classes.slice(0, 2).map((c: any) => c.id);
      const res = await api.post(`/api/trips/${tripId}/publish`, { classIds });
      if (res.data?.success) {
        showToast(res.data.message || 'Excursion published and parent notifications queued!', 'success');
        fetchTrips();
        if (selectedTripId === tripId) fetchTripDetails(tripId);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to publish trip', 'error');
    }
  };

  const handleSendReminder = async (tripId: string) => {
    try {
      const res = await api.post(`/api/trips/${tripId}/remind-pending`);
      if (res.data?.success) {
        showToast(res.data.message || 'Reminder SMS dispatched to parents.', 'success');
        if (selectedTripId === tripId) fetchTripDetails(tripId);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to dispatch reminders', 'error');
    }
  };

  const handleExpireConsents = async (tripId: string) => {
    try {
      const res = await api.post(`/api/trips/${tripId}/expire-consents`);
      if (res.data?.success) {
        showToast(res.data.message || 'Overdue consents expired.', 'info');
        if (selectedTripId === tripId) fetchTripDetails(tripId);
        fetchTrips();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to expire consents', 'error');
    }
  };

  const handleBoardToggle = async (tripId: string, studentId: string) => {
    try {
      const res = await api.post(`/api/trips/${tripId}/board`, { studentId });
      if (res.data?.success) {
        showToast(res.data.message, 'success');
        if (selectedTripId === tripId) fetchTripDetails(tripId);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update boarding status', 'error');
    }
  };

  const handleSyncAttendance = async (tripId: string) => {
    try {
      const res = await api.post(`/api/trips/${tripId}/sync-attendance`);
      if (res.data?.success) {
        showToast(res.data.message || 'Daily attendance records synchronized.', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to synchronize attendance', 'error');
    }
  };

  const handleViewManifest = async (tripId: string) => {
    try {
      const res = await api.get(`/api/trips/${tripId}/gate-manifest`);
      if (res.data?.success) {
        setManifestData(res.data);
        setShowManifestModal(true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load gate manifest', 'error');
    }
  };

  const handleCreateTrip = async (e: React.FormEvent, publishImmediately: boolean = false) => {
    e.preventDefault();
    if (!formData.title || !formData.destination || !formData.date) {
      showToast('Title, destination and date are required', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/api/trips', {
        title: formData.title,
        type: formData.type,
        destination: formData.destination,
        purpose: formData.purpose,
        date: formData.date,
        departureTime: formData.departureTime,
        returnTime: formData.returnTime,
        cost: formData.cost,
        currency: formData.currency,
        transport: isTransportEnabled ? formData.transport : 'Private transport',
        busId: isTransportEnabled && formData.busId ? formData.busId : null,
        staffId: formData.staffId || null,
        nurseStaffId: isClinicEnabled && formData.nurseStaffId ? formData.nurseStaffId : null,
        requiredDocuments: formData.requiredDocuments,
        consentDeadline: formData.consentDeadline,
        riskAssessmentFile: formData.riskAssessmentFile,
        riskLevel: formData.riskLevel,
        itinerary: formData.itinerary,
        seatLimit: formData.seatLimit
      });

      if (res.data?.success) {
        const createdTrip = res.data.trip;
        if (publishImmediately && formData.selectedClassIds.length > 0) {
          await api.post(`/api/trips/${createdTrip.id}/publish`, {
            classIds: formData.selectedClassIds
          });
          showToast(`Trip "${formData.title}" created and published with parent notifications!`, 'success');
        } else {
          showToast(`Trip "${formData.title}" saved as draft.`, 'success');
        }

        fetchTrips();
        setTab('details', createdTrip.id);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create trip', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="portal-page-container" style={{ padding: '24px 32px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}>
              <i className="fas fa-route" style={{ fontSize: '1.4rem' }}></i>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>
                Trips & Excursions
              </h1>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                Legal consent tracking, parent approvals, gate manifests & risk management
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setTab('create')}
              className="btn btn-primary"
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-plus"></i>
              Plan New Excursion
            </button>
          </div>
        </div>

        {/* Global KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}>
          <div className="portal-card" style={{ padding: '16px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Planned Trips
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
              {totalTripsCount}
            </div>
          </div>
          <div className="portal-card" style={{ padding: '16px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Invited Learners
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
              {totalInvitedLearners}
            </div>
          </div>
          <div className="portal-card" style={{ padding: '16px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Consents Approved
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
              {totalApprovedPaid}
            </div>
          </div>
          <div className="portal-card" style={{ padding: '16px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Consents
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
              {totalPending}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
          <button
            onClick={() => setTab('all-trips')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: tab === 'all-trips' ? '#4f46e5' : '#64748b',
              borderBottom: tab === 'all-trips' ? '3px solid #4f46e5' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            <i className="fas fa-list" style={{ marginRight: 8 }}></i>
            All Trips & Excursions ({trips.length})
          </button>

          <button
            onClick={() => setTab('details', selectedTripId || trips[0]?.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: tab === 'details' ? '#4f46e5' : '#64748b',
              borderBottom: tab === 'details' ? '3px solid #4f46e5' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>
            Trip Roster & Gate Manifest
            {selectedTrip && <span style={{ marginLeft: 6, fontWeight: 500, color: '#64748b' }}>({selectedTrip.title})</span>}
          </button>

          <button
            onClick={() => setTab('create')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: tab === 'create' ? '#4f46e5' : '#64748b',
              borderBottom: tab === 'create' ? '3px solid #4f46e5' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            <i className="fas fa-plus-circle" style={{ marginRight: 8 }}></i>
            Create Excursion
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: ALL TRIPS
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'all-trips' && (
          <div>
            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 18,
              alignItems: 'center',
              flexWrap: 'wrap',
              background: '#fff',
              padding: '14px 18px',
              borderRadius: 12,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by trip title or destination..."
                />
              </div>

              <div>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    background: '#fff'
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="academic">Academic</option>
                  <option value="sports">Sports</option>
                  <option value="club">Club & Society</option>
                  <option value="religious">Religious / Retreat</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    background: '#fff'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Trips Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: 12 }}></i>
                <div>Loading excursions...</div>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#fff',
                borderRadius: 12,
                border: '1px dashed #cbd5e1'
              }}>
                <i className="fas fa-map-marked-alt" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: 12 }}></i>
                <h3 style={{ margin: '0 0 6px', color: '#334155' }}>No Excursions Found</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Click "Plan New Excursion" to schedule an upcoming school trip.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
                {filteredTrips.map(trip => {
                  const s = trip.stats || {
                    totalInvited: 0,
                    approvedPaid: 0,
                    approvedUnpaid: 0,
                    pending: 0,
                    declined: 0,
                    expired: 0,
                    boarded: 0
                  };

                  const riskBadgeColor =
                    trip.riskLevel === 'HIGH' ? '#ef4444' : trip.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981';

                  return (
                    <div
                      key={trip.id}
                      className="portal-card"
                      style={{
                        background: '#ffffff',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div>
                        {/* Header line */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: '#eff6ff',
                            color: '#2563eb',
                            textTransform: 'uppercase'
                          }}>
                            {trip.type}
                          </span>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: riskBadgeColor + '18',
                              color: riskBadgeColor
                            }}>
                              Risk: {trip.riskLevel}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: trip.status === 'PUBLISHED' ? '#dcfce7' : '#f1f5f9',
                              color: trip.status === 'PUBLISHED' ? '#16a34a' : '#475569'
                            }}>
                              {trip.status}
                            </span>
                          </div>
                        </div>

                        <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                          {trip.title}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.88rem', marginBottom: 10 }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                          <span>{trip.destination}</span>
                        </div>

                        <div style={{
                          background: '#f8fafc',
                          padding: '10px 12px',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          color: '#64748b',
                          marginBottom: 14,
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 6
                        }}>
                          <div>
                            <strong>Date:</strong> {new Date(trip.date).toLocaleDateString('en-GB')}
                          </div>
                          <div>
                            <strong>Cost:</strong> ${trip.cost} {trip.currency}
                          </div>
                          <div>
                            <strong>Transport:</strong> {trip.bus?.name || trip.transport || 'Private'}
                          </div>
                          <div>
                            <strong>Nurse:</strong> {isClinicEnabled ? (trip.nurseStaff?.name || 'Assigned') : 'First Aid Kit'}
                          </div>
                        </div>

                        {/* Consent Progress Bar */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
                            <span>Parent Consents ({s.totalInvited} invited)</span>
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>
                              {s.totalInvited > 0 ? Math.round(((s.approvedPaid + s.approvedUnpaid) / s.totalInvited) * 100) : 0}% Approved
                            </span>
                          </div>

                          <div style={{
                            height: 8,
                            width: '100%',
                            background: '#e2e8f0',
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex'
                          }}>
                            <div style={{ width: `${s.totalInvited ? (s.approvedPaid / s.totalInvited) * 100 : 0}%`, background: '#16a34a' }} title={`Approved & Paid: ${s.approvedPaid}`} />
                            <div style={{ width: `${s.totalInvited ? (s.approvedUnpaid / s.totalInvited) * 100 : 0}%`, background: '#3b82f6' }} title={`Approved (Unpaid): ${s.approvedUnpaid}`} />
                            <div style={{ width: `${s.totalInvited ? (s.pending / s.totalInvited) * 100 : 0}%`, background: '#f59e0b' }} title={`Pending: ${s.pending}`} />
                            <div style={{ width: `${s.totalInvited ? (s.declined / s.totalInvited) * 100 : 0}%`, background: '#ef4444' }} title={`Declined: ${s.declined}`} />
                            <div style={{ width: `${s.totalInvited ? (s.expired / s.totalInvited) * 100 : 0}%`, background: '#94a3b8' }} title={`Expired: ${s.expired}`} />
                          </div>

                          <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: '#16a34a' }}>● {s.approvedPaid + s.approvedUnpaid} Appr</span>
                            <span style={{ color: '#d97706' }}>● {s.pending} Pend</span>
                            <span style={{ color: '#ef4444' }}>● {s.declined} Decl</span>
                            {s.expired > 0 && <span style={{ color: '#94a3b8' }}>● {s.expired} Exp</span>}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                        <button
                          onClick={() => setTab('details', trip.id)}
                          className="btn btn-outline-primary"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fas fa-clipboard-list" style={{ marginRight: 6 }}></i>
                          Roster & Manifest
                        </button>

                        {trip.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublishTrip(trip.id)}
                            className="btn btn-primary"
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              background: '#16a34a',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fas fa-paper-plane" style={{ marginRight: 6 }}></i>
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: TRIP DETAILS, ROSTER & GATE MANIFEST
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'details' && (
          <div>
            {loadingTrip ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: 12 }}></i>
                <div>Loading excursion details & roster...</div>
              </div>
            ) : !selectedTrip ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: 12 }}>
                <p>Please select a trip from the "All Trips" tab.</p>
                <button onClick={() => setTab('all-trips')} className="btn btn-secondary">
                  View All Trips
                </button>
              </div>
            ) : (
              <div>
                {/* Trip Hero Card */}
                <div className="portal-card" style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '24px',
                  marginBottom: 20,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {selectedTrip.type}
                        </span>

                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: selectedTrip.riskLevel === 'HIGH' ? '#fee2e2' : selectedTrip.riskLevel === 'MEDIUM' ? '#fef3c7' : '#dcfce7',
                          color: selectedTrip.riskLevel === 'HIGH' ? '#dc2626' : selectedTrip.riskLevel === 'MEDIUM' ? '#d97706' : '#16a34a',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          <i className="fas fa-shield-alt" style={{ marginRight: 5 }}></i>
                          Risk: {selectedTrip.riskLevel}
                        </span>

                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          Status: {selectedTrip.status}
                        </span>
                      </div>

                      <h2 style={{ margin: '0 0 6px', fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                        {selectedTrip.title}
                      </h2>
                      <div style={{ color: '#475569', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                        <strong>{selectedTrip.destination}</strong>
                        {selectedTrip.purpose && <span>— {selectedTrip.purpose}</span>}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleSendReminder(selectedTrip.id)}
                        className="btn btn-outline-warning"
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          border: '1px solid #f59e0b',
                          background: '#fffbeb',
                          color: '#b45309',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-bell" style={{ marginRight: 6 }}></i>
                        SMS Reminder to Pending
                      </button>

                      <button
                        onClick={() => handleExpireConsents(selectedTrip.id)}
                        className="btn btn-outline-secondary"
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-hourglass-end" style={{ marginRight: 6 }}></i>
                        Expire Overdue
                      </button>

                      <button
                        onClick={() => handleViewManifest(selectedTrip.id)}
                        className="btn btn-primary"
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: '#4f46e5',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-file-invoice" style={{ marginRight: 6 }}></i>
                        Gate Manifest & QR
                      </button>

                      <button
                        onClick={() => handleSyncAttendance(selectedTrip.id)}
                        className="btn btn-success"
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-calendar-check" style={{ marginRight: 6 }}></i>
                        Sync Daily Attendance
                      </button>
                    </div>
                  </div>

                  {/* Metadata Bar */}
                  <div style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: '1px solid #f1f5f9',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    fontSize: '0.85rem',
                    color: '#475569'
                  }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date & Schedule</div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>
                        {new Date(selectedTrip.date).toLocaleDateString('en-GB')} ({selectedTrip.departureTime || '07:30'} - {selectedTrip.returnTime || '16:30'})
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Lead Staff</div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>
                        {selectedTrip.staff?.name || 'Assigned Lead'} {selectedTrip.staff?.phone && `(${selectedTrip.staff.phone})`}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Medical & First Aid</div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>
                        {isClinicEnabled ? (
                          selectedTrip.nurseStaff ? `Nurse ${selectedTrip.nurseStaff.name}` : 'Staff Nurse'
                        ) : (
                          <span style={{ color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                            First Aid Kit Only
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Transport & Bus</div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>
                        {isTransportEnabled ? (selectedTrip.bus?.name || selectedTrip.transport || 'School Transport') : 'Private Transport'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cost Per Learner</div>
                      <div style={{ fontWeight: 600, marginTop: 2, color: '#16a34a' }}>
                        ${selectedTrip.cost} {selectedTrip.currency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consent Roster Table */}
                <div className="portal-card" style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                      Learner Consents & Gate Roster ({selectedTrip.consents?.length || 0})
                    </h3>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                        ● {selectedTrip.stats?.boarded || 0} Boarded
                      </span>
                    </div>
                  </div>

                  <div className="portal-table-container" style={{ overflowX: 'auto' }}>
                    <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px' }}>Seat #</th>
                          <th style={{ padding: '10px 12px' }}>Student</th>
                          <th style={{ padding: '10px 12px' }}>Class</th>
                          <th style={{ padding: '10px 12px' }}>Eligibility Checks</th>
                          <th style={{ padding: '10px 12px' }}>Consent Status</th>
                          <th style={{ padding: '10px 12px' }}>Payment</th>
                          <th style={{ padding: '10px 12px' }}>Legal Signature</th>
                          <th style={{ padding: '10px 12px' }}>Gate Boarding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!selectedTrip.consents || selectedTrip.consents.length === 0) ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                              No learners invited to this trip yet.
                            </td>
                          </tr>
                        ) : (
                          selectedTrip.consents.map((consent: any, idx: number) => {
                            const isBoarded = consent.boardedAt !== null;
                            const isApproved = consent.status === 'approved';

                            return (
                              <tr key={consent.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>
                                  #{consent.seatNumber || (idx + 1)}
                                </td>

                                <td style={{ padding: '12px' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{consent.student?.name}</div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    ID: {consent.student?.studentId} • Parent: {consent.parentName || 'Primary Contact'} ({consent.parentPhone || '—'})
                                  </div>
                                </td>

                                <td style={{ padding: '12px', color: '#334155' }}>
                                  {consent.student?.schoolClass?.name || 'Class'}
                                </td>

                                {/* Eligibility checks: Discipline & Arrears */}
                                <td style={{ padding: '12px' }}>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {consent.hasDisciplineIssue ? (
                                      <span style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        background: '#fee2e2',
                                        color: '#b91c1c',
                                        fontWeight: 700
                                      }}>
                                        <i className="fas fa-exclamation-triangle" style={{ marginRight: 3 }}></i>
                                        Discipline Flag
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                                        <i className="fas fa-check" style={{ marginRight: 3 }}></i> Clean
                                      </span>
                                    )}

                                    {consent.hasFeeArrears ? (
                                      <span style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        background: '#fef3c7',
                                        color: '#b45309',
                                        fontWeight: 700
                                      }}>
                                        Arrears: ${consent.feeBalance}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>

                                {/* Consent status */}
                                <td style={{ padding: '12px' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    textTransform: 'uppercase',
                                    background:
                                      consent.status === 'approved' ? '#dcfce7' :
                                      consent.status === 'pending' ? '#fef3c7' :
                                      consent.status === 'declined' ? '#fee2e2' : '#f1f5f9',
                                    color:
                                      consent.status === 'approved' ? '#15803d' :
                                      consent.status === 'pending' ? '#b45309' :
                                      consent.status === 'declined' ? '#b91c1c' : '#64748b'
                                  }}>
                                    {consent.status}
                                  </span>
                                </td>

                                {/* Payment status */}
                                <td style={{ padding: '12px' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background:
                                      consent.paymentStatus === 'paid' ? '#dcfce7' :
                                      consent.paymentStatus === 'unpaid' ? '#fee2e2' : '#f1f5f9',
                                    color:
                                      consent.paymentStatus === 'paid' ? '#15803d' :
                                      consent.paymentStatus === 'unpaid' ? '#b91c1c' : '#64748b'
                                  }}>
                                    {consent.paymentStatus}
                                  </span>
                                </td>

                                {/* Signature */}
                                <td style={{ padding: '12px', fontSize: '0.8rem', color: '#475569' }}>
                                  {consent.signatureName ? (
                                    <div>
                                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                        <i className="fas fa-signature" style={{ marginRight: 4, color: '#4f46e5' }}></i>
                                        {consent.signatureName}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        IP: {consent.signatureIp || 'recorded'} • {consent.consentedAt ? new Date(consent.consentedAt).toLocaleDateString('en-GB') : ''}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Awaiting signature</span>
                                  )}
                                </td>

                                {/* Gate Boarding Check */}
                                <td style={{ padding: '12px' }}>
                                  <button
                                    onClick={() => handleBoardToggle(selectedTrip.id, consent.studentId)}
                                    disabled={!isApproved}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: 6,
                                      border: 'none',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      cursor: isApproved ? 'pointer' : 'not-allowed',
                                      background: isBoarded ? '#16a34a' : isApproved ? '#f1f5f9' : '#e2e8f0',
                                      color: isBoarded ? '#fff' : isApproved ? '#334155' : '#94a3b8'
                                    }}
                                  >
                                    <i className={isBoarded ? "fas fa-check-circle" : "fas fa-bus"} style={{ marginRight: 5 }}></i>
                                    {isBoarded ? 'Boarded' : 'Check-In'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: CREATE EXCURSION
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'create' && (
          <div className="portal-card" style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '28px',
            maxWidth: 920,
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Plan New Trip or Excursion
            </h2>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem' }}>
              Create an educational field trip, athletic tournament, or club tour with automated parent consent and risk clearance.
            </p>

            <form onSubmit={e => handleCreateTrip(e, false)}>
              {/* Row 1: Title & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Trip Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Matobo Hills Geography Fieldwork & Heritage Tour"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Category
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="academic">Academic / Field Trip</option>
                    <option value="sports">Sports Tournament</option>
                    <option value="club">Club & Society</option>
                    <option value="religious">Religious Retreat</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Destination & Purpose */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Destination *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. Matobo National Park, Bulawayo"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Educational / Tour Purpose
                  </label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g. Form 3 ZIMSEC Physical Geography syllabus coverage"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Row 3: Date, Departure & Return */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Trip Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Departure Time
                  </label>
                  <input
                    type="text"
                    value={formData.departureTime}
                    onChange={e => setFormData({ ...formData, departureTime: e.target.value })}
                    placeholder="07:30 AM"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Return Time
                  </label>
                  <input
                    type="text"
                    value={formData.returnTime}
                    onChange={e => setFormData({ ...formData, returnTime: e.target.value })}
                    placeholder="16:30 PM"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Row 4: Cost, Transport & Risk Level */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Cost Per Learner ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Transport Vehicle {isTransportEnabled ? '' : '(Private)'}
                  </label>
                  {isTransportEnabled ? (
                    <select
                      value={formData.busId}
                      onChange={e => setFormData({ ...formData, busId: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      <option value="">Select School Bus</option>
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.name || v.number} ({v.quantity || 50} seats)</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Private Transport (Module disabled)"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f1f5f9' }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Risk Level
                  </label>
                  <select
                    value={formData.riskLevel}
                    onChange={e => setFormData({ ...formData, riskLevel: e.target.value as any })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="LOW">Low (Standard Field Trip)</option>
                    <option value="MEDIUM">Medium (Hiking / Water Activity)</option>
                    <option value="HIGH">High (Overnight / Wilderness)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Staff, Nurse & Consent Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Lead Staff / Teacher
                  </label>
                  <select
                    value={formData.staffId}
                    onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="">Select Lead Teacher</option>
                    {staffList.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Accompanying Nurse
                  </label>
                  {isClinicEnabled ? (
                    <select
                      value={formData.nurseStaffId}
                      onChange={e => setFormData({ ...formData, nurseStaffId: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}
                    >
                      <option value="">Select Clinic Nurse</option>
                      {staffList.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontSize: '0.85rem' }}>
                      <i className="fas fa-medkit" style={{ marginRight: 6 }}></i>
                      First aid kit only (Clinic OFF)
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Parent Consent Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.consentDeadline}
                    onChange={e => setFormData({ ...formData, consentDeadline: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Target Class Selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                  Target Classes for Participation
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {classes.map((cls: any) => {
                    const isSelected = formData.selectedClassIds.includes(cls.id);
                    return (
                      <button
                        type="button"
                        key={cls.id}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            selectedClassIds: isSelected
                              ? prev.selectedClassIds.filter(id => id !== cls.id)
                              : [...prev.selectedClassIds, cls.id]
                          }));
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#fff',
                          color: isSelected ? '#4f46e5' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        <i className={isSelected ? "fas fa-check-square" : "far fa-square"} style={{ marginRight: 6 }}></i>
                        {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setTab('all-trips')}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: '1px solid #4f46e5',
                    background: '#eff6ff',
                    color: '#4f46e5',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-save" style={{ marginRight: 6 }}></i>
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={loading || formData.selectedClassIds.length === 0}
                  onClick={e => handleCreateTrip(e as any, true)}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: formData.selectedClassIds.length > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  <i className="fas fa-paper-plane" style={{ marginRight: 6 }}></i>
                  Publish & Notify Parents
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL: GATE MANIFEST & QR CHECK-IN
            ══════════════════════════════════════════════════════════════════════ */}
        {showManifestModal && manifestData && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: 20
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 820,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                    Official Gate Manifest
                  </h3>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {manifestData.tripTitle} • {manifestData.destination} ({new Date(manifestData.date).toLocaleDateString('en-GB')})
                  </div>
                </div>

                <button
                  onClick={() => setShowManifestModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <strong>Approved Learners:</strong> {manifestData.totalApproved}
                </div>
                <div>
                  <strong>Checked-In / Boarded:</strong> {manifestData.totalBoarded}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px' }}>Seat</th>
                      <th style={{ padding: '8px 10px' }}>Student</th>
                      <th style={{ padding: '8px 10px' }}>Emergency Contact</th>
                      <th style={{ padding: '8px 10px' }}>Medical / Allergies</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifestData.manifest?.map((m: any) => (
                      <tr key={m.consentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>#{m.seatNumber}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <strong>{m.studentName}</strong> ({m.className})
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {m.parentName}: {m.parentPhone}
                        </td>
                        <td style={{ padding: '8px 10px', color: m.allergies !== 'None' ? '#dc2626' : '#64748b' }}>
                          {m.allergies}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: m.isBoarded ? '#dcfce7' : '#f1f5f9',
                            color: m.isBoarded ? '#15803d' : '#64748b'
                          }}>
                            {m.isBoarded ? 'Boarded' : 'Not Boarded'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
                >
                  <i className="fas fa-print" style={{ marginRight: 6 }}></i>
                  Print Gate Manifest
                </button>
                <button
                  onClick={() => setShowManifestModal(false)}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', borderRadius: 8, background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
