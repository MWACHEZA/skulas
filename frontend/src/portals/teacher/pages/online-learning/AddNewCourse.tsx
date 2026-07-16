import React, { useState, useEffect } from 'react';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

interface AddNewCourseProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AddNewCourse({ isModal, onClose, onSuccess }: AddNewCourseProps) {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    courseType: 'General',
    level: 'Beginner',
    language: 'English',
    category: '',
    shortDescription: '',
    fullDescription: ''
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Error fetching classes', error);
    
    }
  };

  const handleSave = async () => {
    if (!formData.classId || !formData.title || !formData.category || !formData.shortDescription) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/courses', formData);
      showToast('Course added successfully', 'success');
      setFormData({
        classId: '', title: '', courseType: 'General', level: 'Beginner',
        language: 'English', category: '', shortDescription: '', fullDescription: ''
      });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      showToast('Failed to save course', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const formBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div className="portal-form-group">
        <label>Class <span style={{ color: 'red' }}>*</span></label>
        <select className="portal-input" value={formData.classId} onChange={e => setFormData({ ...formData, classId: e.target.value })}>
          <option value="">Select</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="portal-form-group">
          <label>Course type <span style={{ color: 'red' }}>*</span></label>
          <select className="portal-input" value={formData.courseType} onChange={e => setFormData({ ...formData, courseType: e.target.value })}>
            <option value="General">General</option>
            <option value="Specialized">Specialized</option>
          </select>
        </div>
        <div className="portal-form-group">
          <label>Title <span style={{ color: 'red' }}>*</span></label>
          <input type="text" className="portal-input" placeholder="Course title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div className="portal-form-group">
          <label>Level <span style={{ color: 'red' }}>*</span></label>
          <select className="portal-input" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <div className="portal-form-group">
          <label>Language <span style={{ color: 'red' }}>*</span></label>
          <select className="portal-input" value={formData.language} onChange={e => setFormData({ ...formData, language: e.target.value })}>
            <option value="English">English</option>
            <option value="French">French</option>
          </select>
        </div>
        <div className="portal-form-group">
          <label>Category <span style={{ color: 'red' }}>*</span></label>
          <select className="portal-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
            <option value="">Select</option>
            <option value="Science">Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Arts">Arts</option>
          </select>
        </div>
      </div>

      <div className="portal-form-group">
        <label>Short description <span style={{ color: 'red' }}>*</span></label>
        <input type="text" className="portal-input" placeholder="Short description" value={formData.shortDescription} onChange={e => setFormData({ ...formData, shortDescription: e.target.value })} />
      </div>

      <div className="portal-form-group">
        <label>Full description <span style={{ color: 'red' }}>*</span></label>
        <div style={{ border: '1px solid #cbd5e0', borderRadius: 4 }}>
          <div style={{ borderBottom: '1px solid #cbd5e0', padding: 8, background: '#f7fafc', display: 'flex', gap: 10, fontSize: '0.8rem' }}>
            <span>File ▼</span><span>Edit ▼</span><span>Insert ▼</span><span>View ▼</span><span>Format ▼</span><span>Table ▼</span><span>Tools ▼</span>
          </div>
          <div style={{ borderBottom: '1px solid #cbd5e0', padding: 8, display: 'flex', gap: 15, background: '#f7fafc' }}>
            <i className="fas fa-undo"></i> <i className="fas fa-redo"></i>
            <i className="fas fa-bold"></i> <i className="fas fa-italic"></i> <i className="fas fa-align-left"></i> <i className="fas fa-align-center"></i> <i className="fas fa-list-ul"></i> <i className="fas fa-list-ol"></i>
            <i className="fas fa-link"></i> <i className="fas fa-image"></i>
          </div>
          <textarea 
            style={{ width: '100%', height: 120, border: 'none', padding: 10, outline: 'none', resize: 'vertical' }}
            value={formData.fullDescription}
            onChange={e => setFormData({ ...formData, fullDescription: e.target.value })}
            placeholder="Full course description details..."
          ></textarea>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        {isModal && (
          <button className="portal-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        )}
        <button className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)' }} onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="portal-modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: 20 }}>
        <div className="portal-modal-content" style={{ background: 'white', borderRadius: 16, maxWidth: 700, width: '100%', padding: '30px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
          >
            <i className="fas fa-times"></i>
          </button>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fas fa-plus mr-2" style={{ color: 'var(--portal-success)' }}></i> Add New Course
          </h2>
          {formBody}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Courses</h1>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-plus"></i> ADD COURSE</h2>
        </div>
        <div className="portal-card-body">
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: 'var(--school-primary, #3182ce)', fontWeight: 'bold', borderBottom: '3px solid #38a169', cursor: 'pointer' }}>Overview</div>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: '#718096', cursor: 'pointer' }}>Objective</div>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: '#718096', cursor: 'pointer' }}>Pricing</div>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: '#718096', cursor: 'pointer' }}>Preview</div>
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: '#718096', cursor: 'pointer' }}>Finish</div>
          </div>
          {formBody}
        </div>
      </div>
    </>
  );
}
