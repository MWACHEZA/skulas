import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { generateShortCode } from '../../../lib/utils';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';

export default function AdminDepartments() {
  const { user } = useAuth();
  const currentCode = user?.schoolCode || 'global';

  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<any>({ 
    name: '', 
    code: '', 
    headId: '', 
    deptCode: '', 
    duration: '4',
    services: '',
    facilities: '',
    pictures: [] as string[]
  });
  const [staffList, setStaffList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { showToast } = useToast();
  const { isUniversity } = useTerminology();

  useEffect(() => {
    fetchDepartments();
    fetchStaff();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch (err) {
      showToast('Failed to load departments', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/api/users');
      // Filter for staff roles
      const staff = data.users.filter((u: any) => 
        ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'].includes(u.role)
      );
      setStaffList(staff);
    } catch (err) {
      console.error('Failed to load staff');
    
    }
  };

  const handleOpenModal = (dept: any = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ 
        name: dept.name, 
        code: dept.code || '', 
        headId: dept.headId || '',
        deptCode: dept.deptCode || '',
        duration: dept.duration?.toString() || '4',
        services: dept.services || '',
        facilities: dept.facilities || '',
        pictures: Array.isArray(dept.pictures) 
          ? dept.pictures 
          : (typeof dept.pictures === 'string' && dept.pictures ? JSON.parse(dept.pictures) : [])
      });
    } else {
      setEditingDept(null);
      setFormData({ 
        name: '', 
        code: '', 
        headId: '', 
        deptCode: '', 
        duration: '4',
        services: '',
        facilities: '',
        pictures: [] as string[]
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPics = [...formData.pictures];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadData = new FormData();
        uploadData.append('file', file);
        const res = await api.post('/api/website-settings/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newPics.push(res.data.filename);
      }
      setFormData((prev: any) => ({ ...prev, pictures: newPics }));
      showToast('Files uploaded successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('File upload failed', 'error');
    
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = (idx: number) => {
    setFormData((prev: any) => ({
      ...prev,
      pictures: prev.pictures.filter((_: any, i: number) => i !== idx)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        pictures: Array.isArray(formData.pictures) ? JSON.stringify(formData.pictures) : formData.pictures
      };
      if (editingDept) {
        await api.put(`/api/departments/${editingDept.id}`, payload);
        showToast('Department updated!', 'success');
      } else {
        await api.post('/api/departments', payload);
        showToast('Department created!', 'success');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      showToast('Action failed', 'error');
    
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this department? This may affect linked subjects and teachers.'))) return;
    try {
      await api.delete(`/api/departments/${id}`);
      showToast('Department deleted', 'success');
      fetchDepartments();
    } catch (err) {
      showToast('Failed to delete department', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Department Management</h1>
        <p>Organize your school into departments for better management of subjects and faculty.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 400 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }}></i>
          <input
            type="text"
            className="portal-input"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-building" style={{ marginRight: 8, color: '#ed8936' }}></i>All Departments</h2>
          <button 
            onClick={() => handleOpenModal()}
            className="portal-btn-primary"
            style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <i className="fas fa-plus-circle"></i> ADD DEPARTMENT
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Dept Code</th>
                  {isUniversity && <th>Admin Prefix</th>}
                  {isUniversity && <th>Duration</th>}
                  <th>Department Name</th>
                  <th>Picture</th>
                  <th>Department Head</th>
                  <th>Subjects</th>
                  <th>Teachers</th>
                  <th>Staff</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = departments.filter(d => 
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    d.code.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filtered.length > 0) setCurrentPage(1);
                  return filtered.length > 0 ? currentItems.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'monospace', color: '#718096' }}>{d.code}</td>
                    {isUniversity && <td style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{d.deptCode || '---'}</td>}
                    {isUniversity && <td>{d.duration} Years</td>}
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>
                      {(() => {
                        let pics: string[] = [];
                        try {
                          if (Array.isArray(d.pictures)) pics = d.pictures;
                          else if (typeof d.pictures === 'string' && d.pictures) pics = JSON.parse(d.pictures);
                        } catch (err) {}
                        
                        const firstPic = pics[0];
                        return firstPic ? (
                          <img 
                            src={`${api.defaults.baseURL}/api/storage/media/${currentCode}/${firstPic}`} 
                            style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/global/${firstPic}`;
                            }}
                          />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <i className="fas fa-image"></i>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {d.head ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                            {d.head.name.charAt(0)}
                          </div>
                          <span>{d.head.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#a0aec0', fontSize: 12 }}>Unassigned</span>
                      )}
                    </td>
                    <td><span className="portal-badge info">{d._count?.subjects || 0}</span></td>
                    <td><span className="portal-badge success">{d._count?.teachers || 0}</span></td>
                    <td><span className="portal-badge" style={{ background: '#fef3c7', color: '#92400e' }}>{d._count?.users || 0}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                        <button 
                          className="portal-btn-ghost" 
                          title="Edit"
                          style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleOpenModal(d)}
                        >
                          <i className="fas fa-edit" style={{ color: '#eab308' }}></i>
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          title="Delete"
                          style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleDelete(d.id)}
                        >
                          <i className="fas fa-trash-alt" style={{ color: '#dc2626' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: '#718096' }}>No departments found.</td></tr>
                );
                })()}
              </tbody>
            </table>
          )}
          
          {(() => {
            const filtered = departments.filter(d => 
              d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              d.code.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return filtered.length > 0 && !loading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filtered.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filtered.length / itemsPerPage) || filtered.length === 0}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          );
          })()}
        </div>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 450, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{editingDept ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Department Name</label>
                <input 
                  className="form-control" 
                  value={formData.name} 
                  required
                  placeholder="e.g. Science, Humanities"
                  onChange={e => {
                    const name = e.target.value;
                    setFormData({
                      ...formData, 
                      name,
                      code: generateShortCode(name)
                    });
                  }} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Head of Department (HOD)</label>
                <select 
                  className="form-control" 
                  value={formData.headId}
                  onChange={e => setFormData({ ...formData, headId: e.target.value })}
                >
                  <option value="">No HOD Assigned</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              {isUniversity && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                  <div className="form-group">
                    <label>Department Admin Code</label>
                    <input 
                      className="form-control" 
                      value={formData.deptCode}
                      maxLength={3}
                      placeholder="e.g. SCS"
                      style={{ textTransform: 'uppercase' }}
                      onChange={e => setFormData({ ...formData, deptCode: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Program Duration (Years)</label>
                    <select 
                      className="form-control" 
                      value={formData.duration}
                      onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    >
                      {[3, 4, 5, 6, 7].map(num => (
                        <option key={num} value={num}>{num} Years</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!isUniversity && (
                <>
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label>Services (Comma-separated)</label>
                    <textarea 
                      className="form-control" 
                      value={formData.services}
                      placeholder="e.g. Academic counseling, Extra tuition, Lab accessibility"
                      onChange={e => setFormData({ ...formData, services: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label>Facilities (Comma-separated)</label>
                    <textarea 
                      className="form-control" 
                      value={formData.facilities}
                      placeholder="e.g. Physics Lab, Biology Greenhouse, Computer Center"
                      onChange={e => setFormData({ ...formData, facilities: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label>Department Pictures</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {formData.pictures.map((pic: string, idx: number) => (
                        <div key={idx} style={{ position: 'relative', width: 60, height: 60, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                          <img 
                            src={`${api.defaults.baseURL}/api/storage/media/${currentCode}/${pic}`} 
                            alt="preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/global/${pic}`;
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRemovePicture(idx)}
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(229, 62, 62, 0.85)', color: 'white', border: 'none', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 0 4px' }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleFileUpload} 
                      disabled={uploading}
                      style={{ fontSize: 12, display: 'block', width: '100%' }}
                    />
                    {uploading && <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}><i className="fas fa-spinner fa-spin"></i> Uploading images...</div>}
                  </div>
                </>
              )}

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Department Code (System Generated)</label>
                <input 
                  className="form-control" 
                  value={formData.code}
                  readOnly
                  placeholder="Generated from name"
                  style={{ background: '#f7fafc', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
