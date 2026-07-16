import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/portal.css';

interface SchoolClass {
  id: string;
  name: string;
  level: string;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  part: number;
}

export default function ClassMigration() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const schoolType = user?.schoolType || 'Secondary';

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetPart, setTargetPart] = useState<number>(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'selected' | 'mapping'>('selected');
  const [bulkMappings, setBulkMappings] = useState<Record<string, { targetClassId: string, targetPart: number }>>({});

  const getYearLabel = (typeStr: string) => {
    const type = (typeStr || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college') || type.includes('poly') || type.includes('nursing') || type.includes('medical')) {
      return 'Academic Year (Part)';
    }
    if (type.includes('primary')) {
      return 'Grade';
    }
    if (type.includes('secondary') || type.includes('high')) {
      return 'Form';
    }
    return 'Class Year';
  };

  const getYearValueLabel = (typeStr: string, partValue: number | string | null | undefined) => {
    const part = partValue !== null && partValue !== undefined ? partValue : '1';
    const type = (typeStr || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college') || type.includes('poly') || type.includes('nursing') || type.includes('medical')) {
      return `Part ${part}`;
    }
    if (type.includes('primary')) {
      return `Grade ${part}`;
    }
    if (type.includes('secondary') || type.includes('high')) {
      return `Form ${part}`;
    }
    return `Year ${part}`;
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (Array.isArray(classes)) {
      const initial: Record<string, { targetClassId: string, targetPart: number }> = {};
      classes.forEach(c => {
        initial[c.id] = { targetClassId: '', targetPart: 1 };
      });
      setBulkMappings(initial);
    }
  }, [classes]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load classes', 'error');
    }
  };

  const loadStudents = async () => {
    if (!sourceClassId) {
      showToast('Please select a source class registry', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/students/by-class/${sourceClassId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setStudents(list);
      setSelectedStudentIds([]);
      if (list.length === 0) {
        showToast('No students found in the selected class', 'info');
      }
    } catch {
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMigrate = async () => {
    const mappingsToSend = Object.entries(bulkMappings)
      .filter(([_, value]) => !!value.targetClassId)
      .map(([sourceClassId, value]) => ({
        sourceClassId,
        targetClassId: value.targetClassId,
        targetPart: value.targetPart
      }));

    if (mappingsToSend.length === 0) {
      showToast('Please select at least one class destination mapping', 'warning');
      return;
    }

    if (!(await toastConfirm(`Are you sure you want to execute bulk class mapping for ${mappingsToSend.length} classes? All students in these classes will be updated.`))) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/students/bulk-migrate', {
        mappings: mappingsToSend
      });
      showToast(`Bulk migration successful! Updated ${res.data.count} students.`, 'success');
      fetchClasses();
      
      // Reset selected bulk mappings
      const resetMappings: Record<string, { targetClassId: string, targetPart: number }> = {};
      classes.forEach(c => {
        resetMappings[c.id] = { targetClassId: '', targetPart: 1 };
      });
      setBulkMappings(resetMappings);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Bulk migration failed', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const yearLabel = getYearLabel(schoolType);
    const sourceClass = classes.find(c => c.id === sourceClassId);
    const rows = students.map(s => `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; font-family: monospace;">${s.studentId}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: bold;">${s.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px;">${getYearValueLabel(schoolType, s.part)}</td>
      </tr>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Registry - Class Migration</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            h1 { font-size: 1.8rem; font-weight: 900; margin-bottom: 4px; color: #0f172a; }
            p { font-size: 1rem; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 10px; text-align: left; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: #475569; }
            td { font-size: 0.95rem; color: #334155; }
          </style>
        </head>
        <body>
          <h1>Student Registry for Migration</h1>
          <p><strong>Source Class:</strong> ${sourceClass ? `${sourceClass.name} (${sourceClass.level})` : 'N/A'}</p>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Current ${yearLabel}</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const yearLabel = getYearLabel(schoolType);
    const headers = ['Student ID', 'Name', `Current ${yearLabel}`];
    const rows = students.map(s => [
      s.studentId,
      s.name,
      getYearValueLabel(schoolType, s.part)
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_registry_migration_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = () => {
    const yearLabel = getYearLabel(schoolType);
    const sourceClass = classes.find(c => c.id === sourceClassId);
    const rows = students.map(s => `
      <tr>
        <td style="border: 1px solid #cccccc; padding: 8px; font-family: Courier New;">${s.studentId}</td>
        <td style="border: 1px solid #cccccc; padding: 8px; font-weight: bold;">${s.name}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${getYearValueLabel(schoolType, s.part)}</td>
      </tr>
    `).join('');
    
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Student Registry - Class Migration</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cccccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Student Registry for Migration</h2>
          <p><b>Source Class:</b> ${sourceClass ? `${sourceClass.name} (${sourceClass.level})` : 'N/A'}</p>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Current ${yearLabel}</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_registry_migration_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMigrate = async () => {
    if (selectedStudentIds.length === 0 || !targetClassId) {
      showToast('Please select students and target class', 'error');
      return;
    }

    try {
      await api.post('/api/students/migrate', {
        studentIds: selectedStudentIds,
        targetClassId,
        targetPart
      });
      showToast('Students migrated successfully', 'success');
      loadStudents();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Migration failed', 'error');
    
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Class Migration</h1>
          <p>Migrate your students to the next year or class.</p>
        </div>
        <div className="portal-tab-container">
          <button 
            onClick={() => setActiveTab('selected')}
            className={`portal-tab-item ${activeTab === 'selected' ? 'active' : ''}`}
          >
            Migrate By Selection
          </button>
          <button 
            onClick={() => setActiveTab('mapping')}
            className={`portal-tab-item ${activeTab === 'mapping' ? 'active' : ''}`}
          >
            Migrate All Classes
          </button>
        </div>
      </div>

      {activeTab === 'selected' ? (
        <div className="space-y-6">
          <div className="portal-card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="portal-label">Source Class</label>
              <select 
                value={sourceClassId}
                onChange={e => setSourceClassId(e.target.value)}
                className="portal-input"
                style={{ height: '56px', fontWeight: 700 }}
              >
                <option value="">-- Select Source Class Registry --</option>
                {(Array.isArray(classes) ? classes : []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
              </select>
            </div>
            <button 
              onClick={loadStudents}
              disabled={loading}
              className="portal-btn-primary"
              style={{ height: '56px', padding: '0 40px', fontWeight: 900 }}
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-search mr-2"></i>}
              Load Student Registry
            </button>
          </div>

          {(Array.isArray(students) ? students : []).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedStudentIds.length > 0 ? '1.2fr 0.8fr' : '1fr', gap: '24px', alignItems: 'start' }} className="animate-in fade-in duration-300">
              <div className="management-table-card" style={{ margin: 0 }}>
                <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Select Students to Migrate</h3>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      {selectedStudentIds.length} of {students.length} selected
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handlePrint} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-print"></i> Print / PDF
                    </button>
                    <button onClick={handleExportExcel} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-file-excel"></i> Excel
                    </button>
                    <button onClick={handleExportWord} className="portal-btn-neutral" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-file-word"></i> Word
                    </button>
                  </div>
                </div>
                <div className="table-responsive" style={{ maxHeight: '500px' }}>
                  <table className="management-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fff' }}>
                      <tr>
                        <th style={{ width: '48px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedStudentIds.length === students.length && students.length > 0}
                            onChange={(e) => setSelectedStudentIds(e.target.checked ? students.map(s => s.id) : [])}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </th>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Current {getYearLabel(schoolType)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(students) ? students : []).map(s => (
                        <tr key={s.id} onClick={() => toggleStudentSelection(s.id)} style={{ cursor: 'pointer', background: selectedStudentIds.includes(s.id) ? '#f0fdf4' : 'transparent' }}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedStudentIds.includes(s.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleStudentSelection(s.id);
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{s.studentId}</td>
                          <td style={{ fontWeight: 700 }}>{s.name}</td>
                          <td style={{ fontWeight: 600, color: '#64748b' }}>{getYearValueLabel(schoolType, s.part)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedStudentIds.length > 0 && (
                <div className="portal-card animate-in slide-in-from-right-4 duration-500" style={{ margin: 0, padding: '24px' }}>
                  <div className="portal-card-header" style={{ padding: '0 0 16px', borderBottom: '1px solid #edf2f7', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Finalize Destination</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Select destination class and target {getYearLabel(schoolType).toLowerCase()} for migration.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                      <label className="portal-label">Target Destination Class</label>
                      <select 
                        value={targetClassId}
                        onChange={e => setTargetClassId(e.target.value)}
                        className="portal-input"
                        style={{ height: '50px', fontWeight: 700 }}
                      >
                        <option value="">-- Select Destination --</option>
                        {(Array.isArray(classes) ? classes : []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Target {getYearLabel(schoolType)}</label>
                      <input 
                        type="number" 
                        min={1}
                        value={targetPart}
                        onChange={e => setTargetPart(parseInt(e.target.value) || 1)}
                        className="portal-input"
                        style={{ height: '50px', fontWeight: 700 }}
                      />
                    </div>
                    <button 
                      onClick={handleMigrate}
                      className="portal-btn-primary"
                      style={{ background: '#059669', height: '50px', width: '100%', fontWeight: 900, marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <i className="fas fa-exchange-alt mr-2" style={{ marginRight: '8px' }}></i>
                      Authorize Migration
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="portal-card animate-in fade-in duration-300">
          <div className="portal-card-header" style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Configure Class-to-Class Mapping</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
              Map current classes to their next year destinations to migrate all students in one click.
            </p>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Source Class</th>
                  <th>Level</th>
                  <th>Students Enrolled</th>
                  <th>Destination Class</th>
                  <th>Target {getYearLabel(schoolType)}</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(classes) ? classes : []).map(c => {
                  const mapping = bulkMappings[c.id] || { targetClassId: '', targetPart: 1 };
                  const studentCount = (c as any)._count?.students ?? 0;

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.name}</td>
                      <td style={{ fontWeight: 600, color: '#64748b' }}>{c.level}</td>
                      <td style={{ fontWeight: 700, color: studentCount > 0 ? '#059669' : '#64748b' }}>
                        {studentCount} {studentCount === 1 ? 'student' : 'students'}
                      </td>
                      <td>
                        <select
                          value={mapping.targetClassId}
                          onChange={e => setBulkMappings(prev => ({
                            ...prev,
                            [c.id]: { ...prev[c.id], targetClassId: e.target.value }
                          }))}
                          className="portal-input"
                          style={{ height: '40px', fontSize: '0.9rem', padding: '0 12px', width: '220px' }}
                        >
                          <option value="">-- Select Destination --</option>
                          {(Array.isArray(classes) ? classes : []).filter(tc => tc.id !== c.id).map(tc => (
                            <option key={tc.id} value={tc.id}>{tc.name} ({tc.level})</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={mapping.targetPart}
                          onChange={e => setBulkMappings(prev => ({
                            ...prev,
                            [c.id]: { ...prev[c.id], targetPart: parseInt(e.target.value) || 1 }
                          }))}
                          className="portal-input"
                          style={{ height: '40px', fontSize: '0.9rem', padding: '0 12px', width: '100px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="portal-card-footer" style={{ borderTop: '1px solid #edf2f7', padding: '20px 32px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleBulkMigrate}
              className="portal-btn-primary"
              style={{ background: '#059669', height: '50px', padding: '0 32px', fontWeight: 900 }}
              disabled={loading || Object.values(bulkMappings).every(m => !m.targetClassId)}
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-exchange-alt mr-2"></i>}
              Execute Bulk Class Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
