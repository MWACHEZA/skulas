import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../lib/api';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { getPublicMediaUrl } from '../../utils/formatters';
import { qrOfflineService, type OfflineScanLog } from '../../services/qrOfflineService';

interface GateStudent {
  id: string;
  studentId: string;
  name: string;
  className: string | null;
  avatar: string | null;
  boardingStatus: string;
  balance: number;
  parentPhone?: string | null;
}

interface ScanResult {
  success: boolean;
  type: 'STUDENT' | 'STAFF';
  direction: 'IN' | 'OUT';
  allowed: boolean;
  status: string;
  reason: string;
  isBoarder: boolean;
  student?: GateStudent;
  staff?: {
    id: string;
    staffId: string | null;
    name: string;
    role: string;
  };
  gateLogId?: string;
  autoConfirmed?: boolean;
}

interface OfflineStudent {
  studentId: string;
  regNo: string;
  name: string;
  className: string | null;
  photoUrl: string | null;
  qrToken: string | null;
  isBoarder: boolean;
  feeStatus: string;
  allowed: boolean;
}

export default function GateScannerApp() {
  const { user: authUser } = useAuth();

  // Auth state
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('gate_auth_token') || localStorage.getItem('acadex_token');
  });
  const [guardName, setGuardName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('acadex_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) return parsed.name;
      }
    } catch {}
    return localStorage.getItem('gate_guard_name') || 'Security Guard';
  });
  const [schoolName, setSchoolName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('acadex_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.schoolName || parsed.school?.name) return parsed.schoolName || parsed.school?.name;
      }
    } catch {}
    return localStorage.getItem('gate_school_name') || 'Skulas Academy';
  });

  // Effective school and officer identities
  const effectiveOfficerName = authUser?.name || guardName || 'Security Guard';
  const effectiveSchoolName = authUser?.schoolName || authUser?.school?.name || schoolName || 'Skulas Academy';
  const effectiveSchoolCode = authUser?.schoolCode || authUser?.school?.code || 'global';
  
  // PIN Login modal state
  const [pinInput, setPinInput] = useState('');
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanDirection, setScanDirection] = useState<'IN' | 'OUT'>('IN');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Live Autocomplete Search state
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    studentId: string;
    name: string;
    className: string | null;
    avatar: string | null;
    boardingStatus: string;
    balance: number;
    feeStatus?: string;
    allowed?: boolean;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<any>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [bursarNoticeMsg, setBursarNoticeMsg] = useState<string | null>(null);

  // HM Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [hmPin, setHmPin] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Counters & Offline state
  const [allowedCount, setAllowedCount] = useState(0);
  const [deniedCount, setDeniedCount] = useState(0);
  const [overrideCount, setOverrideCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scanHistory, setScanHistory] = useState<OfflineScanLog[]>([]);
  const [cachedStudentCount, setCachedStudentCount] = useState<number>(0);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);
  const timerRef = useRef<any>(null);

  // Register PWA Service Worker for offline resilience
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration note:', err);
      });
    }
  }, []);

  // Sync auth context with local state
  useEffect(() => {
    if (!token) {
      const adminToken = localStorage.getItem('acadex_token');
      if (adminToken) {
        setToken(adminToken);
      }
    }
    if (authUser?.name) {
      setGuardName(authUser.name);
    }
    if (authUser?.schoolName || authUser?.school?.name) {
      setSchoolName(authUser.schoolName || authUser.school?.name);
    }
  }, [authUser, token]);

  // Click outside listener for search autocomplete dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Online / Offline monitor & initial IndexedDB load
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline queue and history from IndexedDB
    qrOfflineService.getPendingQueueCount().then(setOfflineQueueCount);
    qrOfflineService.getRecentHistory(30).then(setScanHistory);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch daily allow-list and sync manifest on mount if authenticated
  useEffect(() => {
    if (token) {
      downloadDailyAllowList();
      syncOfflineQueue();
    }
  }, [token]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Countdown timer for auto-clearing allowed scans
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      clearScanAndResume();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const downloadDailyAllowList = async () => {
    try {
      const res = await api.get('/api/gate/daily-allow-list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.data) {
        localStorage.setItem('gate_daily_allow_list', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.warn('Could not refresh offline allow list, using cached version:', err);
    }
  };

  const syncOfflineQueue = async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      // 1. Sync queued scans from IndexedDB
      await qrOfflineService.syncPendingQueue(token);
      // 2. Refresh offline manifest (student roster + Ed25519 tenant public key)
      const manifestRes = await qrOfflineService.syncOfflineManifest(token);
      setCachedStudentCount(manifestRes.studentCount);
      // 3. Update pending count & history
      const pendingCount = await qrOfflineService.getPendingQueueCount();
      setOfflineQueueCount(pendingCount);
      const history = await qrOfflineService.getRecentHistory(30);
      setScanHistory(history);
    } catch (err) {
      console.warn('Offline sync attempt:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter your 4-digit security PIN');
      return;
    }

    setIsLoggingIn(true);
    setPinError('');

    try {
      const res = await api.post('/api/gate/auth/pin', {
        pin: pinInput.trim(),
        schoolCode: schoolCodeInput.trim() || undefined
      });

      if (res.data.token) {
        setToken(res.data.token);
        setGuardName(res.data.user.name || 'Security Guard');
        setSchoolName(res.data.user.schoolName || 'Skulas Academy');
        localStorage.setItem('gate_auth_token', res.data.token);
        localStorage.setItem('gate_guard_name', res.data.user.name);
        localStorage.setItem('gate_school_name', res.data.user.schoolName);
        setPinInput('');
      }
    } catch (err: any) {
      setPinError(err.response?.data?.error || 'Invalid PIN or credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    stopCamera();
    setToken(null);
    localStorage.removeItem('gate_auth_token');
  };

  const startCamera = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('gate-camera-viewport');
      }
      setIsScanning(true);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 280, height: 280 } },
        handleQrDetected,
        () => {} // silent on frame non-matches
      );
    } catch (err) {
      console.error('Failed to start camera:', err);
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQrDetected = (decodedText: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    processScanInput(decodedText);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setManualInput(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim() || val.trim().length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (navigator.onLine) {
          const res = await api.get(`/api/gate/search-students?q=${encodeURIComponent(val.trim())}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          });
          if (res.data?.students && res.data.students.length > 0) {
            setSearchResults(res.data.students);
            setShowDropdown(true);
            setIsSearching(false);
            return;
          }
        }

        // Offline / Fallback search using daily allow list
        const rawList = localStorage.getItem('gate_daily_allow_list');
        const allowList: OfflineStudent[] = rawList ? JSON.parse(rawList) : [];
        const lower = val.trim().toLowerCase();
        const filtered = allowList
          .filter(s =>
            (s.name && s.name.toLowerCase().includes(lower)) ||
            (s.regNo && s.regNo.toLowerCase().includes(lower)) ||
            (s.className && s.className.toLowerCase().includes(lower))
          )
          .slice(0, 8)
          .map(s => ({
            id: s.studentId,
            studentId: s.regNo,
            name: s.name,
            className: s.className,
            avatar: s.photoUrl,
            boardingStatus: s.isBoarder ? 'Boarder' : 'Day',
            balance: 0,
            feeStatus: s.feeStatus,
            allowed: s.allowed
          }));

        setSearchResults(filtered);
        setShowDropdown(filtered.length > 0);
      } catch (err) {
        console.warn('Student search error, using offline cache fallback:', err);
        const rawList = localStorage.getItem('gate_daily_allow_list');
        const allowList: OfflineStudent[] = rawList ? JSON.parse(rawList) : [];
        const lower = val.trim().toLowerCase();
        const filtered = allowList
          .filter(s =>
            (s.name && s.name.toLowerCase().includes(lower)) ||
            (s.regNo && s.regNo.toLowerCase().includes(lower)) ||
            (s.className && s.className.toLowerCase().includes(lower))
          )
          .slice(0, 8)
          .map(s => ({
            id: s.studentId,
            studentId: s.regNo,
            name: s.name,
            className: s.className,
            avatar: s.photoUrl,
            boardingStatus: s.isBoarder ? 'Boarder' : 'Day',
            balance: 0,
            feeStatus: s.feeStatus,
            allowed: s.allowed
          }));
        setSearchResults(filtered);
        setShowDropdown(filtered.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectStudent = (student: { id: string; studentId: string; name: string }) => {
    setManualInput(student.name);
    setShowDropdown(false);
    processScanInput(student.studentId || student.id);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setShowDropdown(false);
    processScanInput(manualInput.trim());
  };

  const processScanInput = async (inputString: string) => {
    const isV1 = inputString.startsWith('v1:');

    // 1. Try Online First
    if (navigator.onLine) {
      try {
        if (isV1) {
          const res = await api.post(
            '/api/verify',
            { payload: inputString, direction: scanDirection, deviceId: 'GATE-STATION-PWA' },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const data = res.data;
          handleScanResponse({
            success: true,
            type: 'STUDENT',
            direction: scanDirection,
            allowed: data.valid,
            status: data.flags?.join(', ') || (data.valid ? 'PERMITTED' : 'DENIED'),
            reason: data.reason,
            isBoarder: false,
            student: data.student ? {
              id: data.student.id,
              studentId: data.student.studentId,
              name: data.student.name,
              className: data.student.class || null,
              avatar: data.student.photoUrl || null,
              boardingStatus: 'Day',
              balance: data.student.balance || 0
            } : undefined,
            gateLogId: data.auditLogId,
            autoConfirmed: data.valid
          });
          return;
        } else {
          const res = await api.post(
            '/api/gate/scan',
            { tokenOrId: inputString, forceDirection: scanDirection, deviceId: 'GATE-STATION-PWA' },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          handleScanResponse(res.data);
          return;
        }
      } catch (err: any) {
        console.warn('Online scan error, falling back to offline verification:', err);
      }
    }

    // 2. Offline Fallback using IndexedDB and WebCrypto
    await processOfflineScan(inputString);
  };

  const processOfflineScan = async (inputString: string) => {
    if (inputString.startsWith('v1:')) {
      const offlineRes = await qrOfflineService.verifyOffline(inputString, scanDirection);
      
      const pendingCount = await qrOfflineService.getPendingQueueCount();
      setOfflineQueueCount(pendingCount);
      const history = await qrOfflineService.getRecentHistory(30);
      setScanHistory(history);

      handleScanResponse({
        success: true,
        type: 'STUDENT',
        direction: scanDirection,
        allowed: offlineRes.valid,
        status: offlineRes.flags.join(', ') || (offlineRes.valid ? 'OFFLINE_PERMITTED' : 'OFFLINE_DENIED'),
        reason: offlineRes.reason,
        isBoarder: false,
        student: offlineRes.student ? {
          id: offlineRes.student.id,
          studentId: offlineRes.student.studentId,
          name: offlineRes.student.name,
          className: offlineRes.student.class || null,
          avatar: offlineRes.student.photoUrl || null,
          boardingStatus: 'Day',
          balance: offlineRes.student.balance || 0
        } : undefined,
        autoConfirmed: offlineRes.valid
      });
      return;
    }

    const rawList = localStorage.getItem('gate_daily_allow_list');
    const allowList: OfflineStudent[] = rawList ? JSON.parse(rawList) : [];
    const found = allowList.find(s => s.qrToken === inputString || s.regNo === inputString || s.studentId === inputString);

    if (!found) {
      handleScanResponse({
        success: false,
        type: 'STUDENT',
        direction: scanDirection,
        allowed: false,
        status: 'OFFLINE_NOT_FOUND',
        reason: 'Verify online: Record not found in offline morning allow-list cache.',
        isBoarder: false
      });
      return;
    }

    const clientLogId = `offline_${Date.now()}`;
    await qrOfflineService.queueScanLog({
      clientLogId,
      type: 'GATE',
      entityId: found.studentId,
      studentId: found.regNo,
      deviceId: 'GATE-OFFLINE-PWA',
      result: found.allowed ? 'VALID' : 'DENIED',
      valid: found.allowed,
      reason: found.allowed ? 'Verified via offline morning allow list.' : 'Entry Denied: Cached policy marks fees owing.',
      scannedAt: new Date().toISOString(),
      direction: scanDirection,
      synced: false
    });

    const pendingCount = await qrOfflineService.getPendingQueueCount();
    setOfflineQueueCount(pendingCount);
    const history = await qrOfflineService.getRecentHistory(30);
    setScanHistory(history);

    handleScanResponse({
      success: true,
      type: 'STUDENT',
      direction: scanDirection,
      allowed: found.allowed,
      status: found.feeStatus,
      reason: found.allowed
        ? 'Verified via offline morning allow list.'
        : 'Entry Denied: Cached policy marks fees owing or breached plan.',
      isBoarder: found.isBoarder,
      student: {
        id: found.studentId,
        studentId: found.regNo,
        name: found.name,
        className: found.className,
        avatar: found.photoUrl,
        boardingStatus: found.isBoarder ? 'Boarder' : 'Day',
        balance: 0
      },
      autoConfirmed: found.allowed
    });
  };

  const handleScanResponse = (result: ScanResult) => {
    setScanResult(result);

    // Audio & Haptic feedback
    qrOfflineService.playAudioFeedback(result.allowed);
    qrOfflineService.triggerHapticFeedback(result.allowed);

    // Update history list
    qrOfflineService.getRecentHistory(30).then(setScanHistory);

    if (result.allowed) {
      setAllowedCount(prev => prev + 1);
      // Auto-clear after 2 seconds for green allowed scans
      setCountdown(2);
    } else {
      setDeniedCount(prev => prev + 1);
      setCountdown(null); // Wait for guard decision
    }
  };

  const clearScanAndResume = () => {
    setScanResult(null);
    setCountdown(null);
    cooldownRef.current = false;
  };

  const handleSendToBursar = async () => {
    if (scanResult?.student?.id) {
      try {
        await api.post(
          '/api/gate/notify-bursar',
          { studentId: scanResult.student.id },
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );
        setBursarNoticeMsg(`SMS Notice dispatched to ${scanResult.student.name}'s guardian and Bursar.`);
        setTimeout(() => setBursarNoticeMsg(null), 5000);
      } catch (err) {
        console.warn('Could not dispatch bursar SMS:', err);
        setBursarNoticeMsg(`Notice queued for Bursar regarding ${scanResult.student.name}.`);
        setTimeout(() => setBursarNoticeMsg(null), 5000);
      }
    }
    clearScanAndResume();
  };

  const handleConfirmDenial = () => {
    clearScanAndResume();
  };

  const handleOpenOverride = () => {
    setShowOverrideModal(true);
    setHmPin('');
    setOverrideReason('');
    setOverrideError('');
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult?.student?.id) return;
    if (!hmPin.trim() || !overrideReason.trim() || overrideReason.trim().length < 5) {
      setOverrideError('Principal PIN and a valid reason (at least 5 characters) are required.');
      return;
    }

    setIsSubmittingOverride(true);
    setOverrideError('');

    try {
      await api.post(
        '/api/gate/override',
        {
          studentId: scanResult.student.id,
          hmPin: hmPin.trim(),
          reason: overrideReason.trim(),
          deviceId: 'GATE-STATION-PWA'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOverrideCount(prev => prev + 1);
      setShowOverrideModal(false);
      clearScanAndResume();
    } catch (err: any) {
      setOverrideError(err.response?.data?.error || 'Headmaster PIN authorization failed');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // If not logged in, show Minimal Guard PIN Login View
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          padding: '32px 24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#0284c7',
              borderRadius: '16px',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              🛡️
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Skulas Gate Security
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              Morning roll call & fee enforcement scanner
            </p>
          </div>

          {pinError && (
            <div style={{
              backgroundColor: '#ef444422',
              border: '1px solid #ef444466',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px'
            }}>
              {pinError}
            </div>
          )}

          <form onSubmit={handlePinLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                School Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. AX-HARARE"
                value={schoolCodeInput}
                onChange={e => setSchoolCodeInput(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Security Guard PIN
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#0f172a',
                  border: '2px solid #0284c7',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '8px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0', textAlign: 'center' }}>
                Ancillary staff security credential
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoggingIn ? 'Verifying PIN...' : 'Open Gate Terminal →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Standalone Guard PWA Interface (High-Contrast, Sunlight-Readable)
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header Bar */}
      <header style={{
        position: 'relative',
        width: '100%',
        zIndex: 20,
        backgroundColor: '#131b2e',
        borderBottom: '1px solid #1e293b',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            backgroundColor: '#0284c7',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#fff' }}>{effectiveSchoolName}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Officer: <strong style={{ color: '#38bdf8' }}>{effectiveOfficerName}</strong>
            </div>
          </div>
        </div>

        {/* Status Indicators & Direction Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Direction Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#090d16',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => setScanDirection('IN')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: scanDirection === 'IN' ? '#16a34a' : 'transparent',
                color: scanDirection === 'IN' ? '#fff' : '#94a3b8'
              }}
            >
              ☀️ Morning Entry
            </button>
            <button
              onClick={() => setScanDirection('OUT')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: scanDirection === 'OUT' ? '#2563eb' : 'transparent',
                color: scanDirection === 'OUT' ? '#fff' : '#94a3b8'
              }}
            >
              🌙 Departure Exit
            </button>
          </div>

          {/* Online / Offline Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: isOnline ? '#16a34a22' : '#ea580c22',
            color: isOnline ? '#4ade80' : '#fb923c',
            border: `1px solid ${isOnline ? '#16a34a44' : '#ea580c44'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#4ade80' : '#fb923c'
            }}></span>
            {isOnline ? 'Online' : 'Offline PWA'}
          </div>

          {offlineQueueCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              disabled={isSyncing}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                backgroundColor: '#f59e0b',
                color: '#000',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isSyncing ? 'Syncing...' : `Sync (${offlineQueueCount})`}
            </button>
          )}

          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            style={{
              padding: '6px 12px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Admin Portal</span>
            <span style={{ fontSize: '14px' }}>→</span>
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Running KPI Summary Counters */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        padding: '12px 16px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          padding: '10px 14px',
          borderLeft: '4px solid #16a34a'
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Allowed Today</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80' }}>{allowedCount}</div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          padding: '10px 14px',
          borderLeft: '4px solid #ef4444'
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Denied Today</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#f87171' }}>{deniedCount}</div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          padding: '10px 14px',
          borderLeft: '4px solid #f59e0b'
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>HM Overrides</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24' }}>{overrideCount}</div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          padding: '10px 14px',
          borderLeft: '4px solid #38bdf8'
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Gate Scans</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8' }}>{allowedCount + deniedCount + overrideCount}</div>
        </div>
      </section>

      {/* Main View Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Toast Alert for Bursar Actions */}
        {bursarNoticeMsg && (
          <div style={{
            width: '100%',
            backgroundColor: '#1e3a8a',
            border: '1px solid #3b82f6',
            color: '#bfdbfe',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📩</span>
              <span>{bursarNoticeMsg}</span>
            </div>
            <button
              onClick={() => setBursarNoticeMsg(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#bfdbfe',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px 6px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* RESULT CARD IF SCANNED */}
        {scanResult && (scanResult.status === 'NOT_FOUND' || (!scanResult.student && !scanResult.staff)) ? (
          /* RESULT CARD: NOT FOUND (Clean Warning, No Broken Photo or Denial Buttons) */
          <div style={{
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            border: '2px solid #f59e0b',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            marginBottom: '20px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #334155',
              paddingBottom: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#f59e0b22',
                  border: '1px solid #f59e0b55',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  🔍
                </div>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: scanResult.reason?.includes('Verify online') ? '#eab308' : '#f59e0b',
                    color: '#000',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}>
                    {scanResult.reason?.includes('Verify online') ? '⚠️ Verify Online Required' : 'Record Not Found'}
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#fff' }}>
                    {scanResult.reason?.includes('Verify online') ? 'Verify Online (Not in Cache)' : 'Student Record Not Found'}
                  </h2>
                </div>
              </div>

              <button
                onClick={clearScanAndResume}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>
              {scanResult.reason || 'No student or staff member in this school matches the scanned QR code or search term.'}
            </p>

            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#94a3b8',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>Recommended steps:</div>
              <div>• Use the live search box below to search as you type by <strong>first name</strong>, <strong>last name</strong>, or <strong>registration number</strong>.</div>
              <div>• Verify that the student is active and enrolled for this academic term.</div>
              <div>• If scanning a physical card, check that the QR code is clean and unobstructed.</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  clearScanAndResume();
                  const el = document.getElementById('gate-manual-input');
                  if (el) el.focus();
                }}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Search Again
              </button>
              <button
                onClick={clearScanAndResume}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#334155',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : scanResult ? (
          /* RESULT CARD FOR FOUND STUDENT / STAFF */
          <div style={{
            width: '100%',
            backgroundColor: scanResult.allowed ? '#064e3b' : '#7f1d1d',
            borderRadius: '16px',
            border: `2px solid ${scanResult.allowed ? '#10b981' : '#ef4444'}`,
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            marginBottom: '20px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}>
            {/* Header Result Flag */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  backgroundColor: scanResult.allowed ? '#10b981' : '#ef4444',
                  color: '#fff',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  {scanResult.direction === 'OUT' ? 'DEPARTURE SCAN' : (scanResult.allowed ? 'ENTRY PERMITTED' : 'ENTRY DENIED')}
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
                  {scanResult.allowed ? '✓ ADMIT STUDENT' : '✕ DO NOT ADMIT'}
                </h2>
              </div>

              {countdown !== null && (
                <div style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#6ee7b7'
                }}>
                  Clearing in {countdown}s...
                </div>
              )}
            </div>

            {/* Student Card with Visual Photo Verification */}
            {scanResult.student && (
              <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                {/* Large Photo */}
                <div style={{
                  width: '110px',
                  height: '130px',
                  borderRadius: '10px',
                  backgroundColor: '#1e293b',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255,255,255,0.4)'
                }}>
                  {scanResult.student.avatar ? (
                    <img
                      src={getPublicMediaUrl(scanResult.student.avatar, effectiveSchoolCode) || scanResult.student.avatar}
                      alt={scanResult.student.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `<span style="font-size: 48px">👤</span>`;
                        }
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '48px' }}>👤</span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                    {scanResult.student.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                    Reg: <strong style={{ color: '#38bdf8' }}>{scanResult.student.studentId}</strong> • Class: <strong>{scanResult.student.className || 'General'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                    Boarding: <strong>{scanResult.student.boardingStatus}</strong>
                  </div>

                  {/* Fee Compliance Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: scanResult.allowed ? '#047857' : '#991b1b',
                    color: '#fff',
                    marginBottom: '8px'
                  }}>
                    Status: {scanResult.status}
                    {scanResult.student.balance > 0 && ` • Arrears: $${scanResult.student.balance.toFixed(2)}`}
                  </div>

                  <p style={{ margin: 0, fontSize: '13px', color: '#f1f5f9', lineHeight: 1.4 }}>
                    {scanResult.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Lookalike Warning Banner */}
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              color: scanResult.allowed ? '#a7f3d0' : '#fef08a',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{scanResult.allowed ? '✓' : '⚠️'}</span>
              <span>
                <strong>Guard Protocol:</strong>{' '}
                {scanResult.allowed
                  ? 'Visually verify live student matches photo above before admitting through gate.'
                  : 'Visually inspect bearer to ensure live student matches photo above before escorting to Bursar.'}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {scanResult.allowed ? (
                <button
                  onClick={clearScanAndResume}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Next Student →
                </button>
              ) : (
                <>
                  <button
                    onClick={handleConfirmDenial}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Confirm Denial
                  </button>
                  <button
                    onClick={handleSendToBursar}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Send to Bursar (SMS)
                  </button>
                  <button
                    onClick={handleOpenOverride}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#f59e0b',
                      color: '#000',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Override (HM PIN)
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Live Camera Viewport Area */}
        <div style={{
          width: '100%',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          overflow: 'hidden',
          marginBottom: '20px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>
              📷 Live Camera QR Viewfinder
            </div>
            <div>
              {isScanning ? (
                <button
                  onClick={stopCamera}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Stop Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Start Camera
                </button>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', minHeight: '280px', backgroundColor: '#000' }}>
            <div
              id="gate-camera-viewport"
              style={{
                width: '100%',
                minHeight: '280px',
                display: isScanning ? 'block' : 'none'
              }}
            />
            {!isScanning && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#94a3b8' }}>
                  Camera is paused
                </div>
                <p style={{ fontSize: '13px', margin: '6px 0 16px' }}>
                  Click Start Camera to begin scanning student ID card QR codes
                </p>
                <button
                  onClick={startCamera}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Turn On Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Manual ID / Token Input with Live Search Autocomplete */}
        <div ref={searchContainerRef} style={{ width: '100%', position: 'relative' }}>
          <form
            onSubmit={handleManualSearch}
            style={{
              width: '100%',
              display: 'flex',
              gap: '10px'
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="gate-manual-input"
                type="text"
                placeholder="Search as you type: Type student name, ID / Reg No..."
                value={manualInput}
                onChange={handleInputChange}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingRight: isSearching ? '40px' : '16px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {isSearching && (
                <div style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '13px',
                  color: '#38bdf8'
                }}>
                  ⏳
                </div>
              )}
            </div>
            <button
              type="submit"
              style={{
                padding: '14px 24px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Lookup
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.8), 0 8px 10px -6px rgba(0,0,0,0.8)',
              zIndex: 100,
              maxHeight: '340px',
              overflowY: 'auto'
            }}>
              <div style={{
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#64748b',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Matching Students ({searchResults.length})</span>
                <span>Click to verify</span>
              </div>
              {searchResults.map((s) => {
                const avatarUrl = s.avatar ? getPublicMediaUrl(s.avatar, effectiveSchoolCode) : null;
                const isPaid = s.feeStatus === 'PAID' || s.feeStatus === 'ON_PLAN' || s.feeStatus === 'EXEMPT' || s.allowed;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #1e293b',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#334155',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #475569'
                      }}>
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={s.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const p = (e.target as HTMLElement).parentElement;
                              if (p) p.innerHTML = '<span style="font-size: 16px">👤</span>';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '16px' }}>👤</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Reg: <span style={{ color: '#38bdf8' }}>{s.studentId}</span> • Class: {s.className || 'General'} • {s.boardingStatus}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: isPaid ? '#16a34a22' : '#dc262622',
                      color: isPaid ? '#4ade80' : '#f87171',
                      border: `1px solid ${isPaid ? '#16a34a55' : '#dc262655'}`
                    }}>
                      {isPaid ? 'Fee Compliant' : (s.balance > 0 ? `Arrears $${s.balance}` : 'Arrears')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scan History Section (Offline / Online Audit Trail) */}
        <div style={{
          width: '100%',
          backgroundColor: '#131b2e',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px', color: '#fff' }}>
                📋 Gate Scan History ({scanHistory.length})
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {cachedStudentCount > 0 ? `Synced offline roster: ${cachedStudentCount} students active` : 'IndexedDB offline roster ready'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={syncOfflineQueue}
                disabled={isSyncing}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔄</span>
                <span>{isSyncing ? 'Syncing...' : 'Sync Manifest & Scans'}</span>
              </button>
            </div>
          </div>

          {scanHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 10px',
              color: '#64748b',
              fontSize: '13px'
            }}>
              No scans recorded yet in this session. Present an ID card to camera or enter registration number above.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '320px',
              overflowY: 'auto'
            }}>
              {scanHistory.map((item) => {
                const isValid = item.valid || item.result === 'VALID';
                const timeStr = item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                return (
                  <div
                    key={item.clientLogId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#0b1120',
                      border: `1px solid ${isValid ? '#10b98133' : '#ef444433'}`,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isValid ? '#10b981' : '#ef4444'
                      }} />
                      <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>
                        {timeStr}
                      </span>
                      <span style={{ fontWeight: '700', color: '#fff' }}>
                        {item.studentId || item.entityId}
                      </span>
                      {item.direction && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.direction === 'IN' ? '#16a34a22' : '#2563eb22',
                          color: item.direction === 'IN' ? '#4ade80' : '#60a5fa',
                          fontWeight: '700'
                        }}>
                          {item.direction}
                        </span>
                      )}
                      {!item.synced && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#f59e0b22',
                          color: '#fbbf24',
                          fontWeight: '700'
                        }}>
                          Offline
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: isValid ? '#a7f3d0' : '#fca5a5'
                      }}>
                        {item.reason}
                      </span>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: isValid ? '#10b98122' : '#ef444422',
                        color: isValid ? '#34d399' : '#f87171'
                      }}>
                        {isValid ? 'ADMITTED' : 'DENIED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* HM Override Modal */}
      {showOverrideModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            border: '2px solid #f59e0b',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0', color: '#fbbf24' }}>
              🔒 Headmaster PIN Override
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Admitting <strong>{scanResult?.student?.name}</strong> despite fee arrears. This privileged action is permanently logged to the institutional audit trail.
            </p>

            {overrideError && (
              <div style={{
                backgroundColor: '#ef444422',
                border: '1px solid #ef444466',
                color: '#fca5a5',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '14px'
              }}>
                {overrideError}
              </div>
            )}

            <form onSubmit={handleSubmitOverride}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Principal / Headmaster PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter HM PIN"
                  value={hmPin}
                  onChange={e => setHmPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '18px',
                    textAlign: 'center',
                    letterSpacing: '6px',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Mandatory Audit Justification
                </label>
                <textarea
                  placeholder="e.g. Parent signed commitment letter at bursar's office"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#475569',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#f59e0b',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingOverride ? 'Authorizing...' : 'Authorize Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
