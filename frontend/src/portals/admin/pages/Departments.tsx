import { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { generateShortCode } from '../../../lib/utils';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAuth } from '../../../contexts/AuthContext';
import { SearchInput, ExportButton } from '../../../components/shared';

export interface Department {
  id: string;
  name: string;
  code: string;
  headId?: string;
  deptCode?: string;
  duration?: number | string;
  services?: string;
  facilities?: string;
  pictures?: string | string[];
  head?: { name: string };
  _count?: {
    subjects?: number;
    teachers?: number;
    users?: number;
  };
}

export interface Staff {
  id: string;
  name: string;
  role: string;
}

export interface DepartmentFormData {
  name: string;
  code: string;
  headId: string;
  deptCode: string;
  duration: string;
  services: string;
  facilities: string;
  pictures: string[];
}

export default function AdminDepartments() {
  const { user } = useAuth();
  const currentCode = user?.schoolCode || 'global';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<DepartmentFormData>({ 
    name: '', 
    code: '', 
    headId: '', 
    deptCode: '', 
    duration: '4',
    services: '',
    facilities: '',
    pictures: []
  });
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { showToast } = useToast();
  const { isUniversity } = useTerminology();

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch {
      showToast('Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users');
      // Filter for staff roles
      const staff = data.users.filter((u: Staff) => 
        ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'].includes(u.role)
      );
      setStaffList(staff);
    } catch {
      console.error('Failed to load staff');
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchStaff();
  }, [fetchDepartments, fetchStaff]);

  const handleOpenModal = (dept: Department | null = null) => {
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
      setFormData(prev => ({ ...prev, pictures: newPics }));
      showToast('Files uploaded successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('File upload failed', 'error');
    
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== idx)
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
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this department? This may affect linked subjects and teachers.'))) return;
    try {
      await api.delete(`/api/departments/${id}`);
      showToast('Department deleted', 'success');
      fetchDepartments();
    } catch {
      showToast('Failed to delete department', 'error');
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Department Management</h1>
        <p>Organize your school into departments for better management of subjects and faculty.</p>
      </div>

      {(() => {
        const filtered = departments.filter(d => {
          const term = searchQuery.toLowerCase();
          return (
            d.name.toLowerCase().includes(term) || 
            d.code.toLowerCase().includes(term) ||
            (d.deptCode || '').toLowerCase().includes(term) ||
            (d.head?.name || '').toLowerCase().includes(term)
          );
        });

        const exportColumns = [
          { header: 'Dept Code', key: 'code', width: 14 },
          { header: 'Admin Prefix', key: 'deptCode', width: 16 },
          { header: 'Department Name', key: 'name', width: 28 },
          { header: 'Duration (Yrs)', key: 'duration', width: 14 },
          { header: 'Department Head', key: 'headName', width: 24 },
          { header: 'Subjects', key: 'subjectsCount', width: 12 },
          { header: 'Teachers', key: 'teachersCount', width: 12 },
          { header: 'Staff', key: 'staffCount', width: 12 },
        ];

        const exportData = filtered.map(d => ({
          code: d.code,
          deptCode: d.deptCode || '---',
          name: d.name,
          duration: `${d.duration || '---'} Years`,
          headName: d.head?.name || 'Unassigned',
          subjectsCount: d._count?.subjects || 0,
          teachersCount: d._count?.teachers || 0,
          staffCount: d._count?.users || 0,
        }));

        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, maxWidth: 450 }}>
              <SearchInput
                value={searchQuery}
                onChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
                placeholder="Search departments by name, code, head..."
              />
            </div>
            <ExportButton
              data={exportData}
              columns={exportColumns}
              filename="departments-register"
              title="Academic & Operational Departments Register"
              subtitle={`Generated on ${new Date().toLocaleDateString()}`}
            />
          </div>
        );
      })()}

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
                  <th>Admin Prefix</th>
                  <th>Duration</th>
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
                  const filtered = departments.filter(d => {
                    const term = searchQuery.toLowerCase();
                    return (
                      d.name.toLowerCase().includes(term) || 
                      d.code.toLowerCase().includes(term) ||
                      (d.deptCode || '').toLowerCase().includes(term) ||
                      (d.head?.name || '').toLowerCase().includes(term)
                    );
                  });
                  const indexOfLastItem = currentPage * itemsPerPage;
                  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
                  if (currentItems.length === 0 && filtered.length > 0) setCurrentPage(1);
                  return filtered.length > 0 ? currentItems.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'monospace', color: '#718096' }}>{d.code}</td>
                    <td style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{d.deptCode || '---'}</td>
                    <td>{d.duration} Years</td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>
                      {(() => {
                        let pics: string[] = [];
                        try {
                          if (Array.isArray(d.pictures)) pics = d.pictures;
                          else if (typeof d.pictures === 'string' && d.pictures) pics = JSON.parse(d.pictures);
                        } catch {
                          // Ignore parse errors for invalid picture arrays
                        }
                        
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
            const filtered = departments.filter(d => {
              const term = searchQuery.toLowerCase();
              return (
                d.name.toLowerCase().includes(term) || 
                d.code.toLowerCase().includes(term) ||
                (d.deptCode || '').toLowerCase().includes(term) ||
                (d.head?.name || '').toLowerCase().includes(term)
              );
            });
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
          <div className="portal-modal" style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-sitemap" style={{ color: '#0284c7' }} />
                {editingDept ? 'Edit Academic Department' : 'Create Academic Department'}
              </h2>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="portal-modal-close"
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 2-Column row: Name & HOD */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Department Name *
                    </label>
                    <input 
                      className="portal-input" 
                      style={{ width: '100%' }}
                      value={formData.name} 
                      required
                      placeholder="e.g. Sciences & Mathematics"
                      onChange={e => {
                        const name = e.target.value;
                        const generateAdminCode = (str: string) => {
                          if (!str) return '';
                          const words = str.trim().split(/\s+/);
                          if (words.length === 1) return str.substring(0, 3).toUpperCase();
                          return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
                        };
                        setFormData({
                          ...formData, 
                          name,
                          code: generateShortCode(name),
                          deptCode: generateAdminCode(name)
                        });
                      }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Head of Department (HOD)
                    </label>
                    <select 
                      className="portal-select" 
                      style={{ width: '100%' }}
                      value={formData.headId}
                      onChange={e => setFormData({ ...formData, headId: e.target.value })}
                    >
                      <option value="">No HOD Assigned</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role.replace('_', ' ')})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2-Column row: Dept Admin Code & System Code / Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Department Admin Code
                    </label>
                    <input 
                      className="portal-input" 
                      style={{ width: '100%', textTransform: 'uppercase', background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                      value={formData.deptCode}
                      readOnly
                      placeholder="Auto-generated"
                    />
                  </div>

                  {isUniversity ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                        Program Duration (Years)
                      </label>
                      <select 
                        className="portal-select" 
                        style={{ width: '100%' }}
                        value={formData.duration}
                        onChange={e => setFormData({ ...formData, duration: e.target.value })}
                      >
                        {[3, 4, 5, 6, 7].map(num => (
                          <option key={num} value={num}>{num} Years</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                        System Short Code
                      </label>
                      <input 
                        className="portal-input" 
                        style={{ width: '100%', background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                        value={formData.code}
                        readOnly
                        placeholder="Generated from name"
                      />
                    </div>
                  )}
                </div>

                {/* Services */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Services Offered (Comma-separated)
                  </label>
                  <textarea 
                    className="portal-textarea" 
                    style={{ width: '100%', resize: 'vertical' }}
                    value={formData.services}
                    placeholder="e.g. Academic counseling, Extra tuition, Lab practicals, STEM clubs"
                    onChange={e => setFormData({ ...formData, services: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Facilities */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Department Facilities (Comma-separated)
                  </label>
                  <textarea 
                    className="portal-textarea" 
                    style={{ width: '100%', resize: 'vertical' }}
                    value={formData.facilities}
                    placeholder="e.g. Physics Laboratory, Biology Greenhouse, Computer Center"
                    onChange={e => setFormData({ ...formData, facilities: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Pictures Upload */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Department Gallery & Pictures
                  </label>
                  {formData.pictures.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      {formData.pictures.map((pic: string, idx: number) => (
                        <div key={idx} style={{ position: 'relative', width: 68, height: 68, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
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
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(220, 38, 38, 0.9)', color: 'white', border: 'none', width: 20, height: 20, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 0 6px' }}
                            title="Remove picture"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleFileUpload} 
                    disabled={uploading}
                    style={{ fontSize: '0.85rem', display: 'block', width: '100%' }}
                  />
                  {uploading && (
                    <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-spinner fa-spin"></i> Uploading images to media storage...
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="portal-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc', borderRadius: '0 0 8px 8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="portal-btn-primary"
                  style={{ padding: '8px 20px', background: '#0284c7', color: '#fff', fontWeight: 600 }}
                >
                  <i className="fas fa-save mr-2" style={{ marginRight: 6 }}></i>
                  {editingDept ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
