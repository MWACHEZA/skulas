import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface QuestionPaper {
  id: string;
  title: string;
  description?: string;
  subject: { name: string; code: string };
  teacher: { name: string };
  createdAt: string;
}

export default function QuestionPapersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const { data } = await api.get('/api/academic-tools/question-papers');
      setPapers(data);
    } catch (error) {
      showToast('Failed to load question papers', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question paper?')) return;
    try {
      await api.delete(`/api/academic-tools/question-papers/${id}`);
      setPapers(p => p.filter(item => item.id !== id));
      showToast('Paper deleted', 'success');
    } catch (error) {
      showToast('Failed to delete paper', 'error');
    
    }
  };

  const filteredPapers = papers.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="portal-content">
      <div className="portal-header">
        <div className="header-title">
          <h1>Question Paper Designer</h1>
          <p>Author and manage institutional examination papers.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('new')}>
          <i className="fas fa-magic mr-2"></i> Design New Paper
        </button>
      </div>

      <div className="filters-bar glass" style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '12px' }}>
        <div className="search-input" style={{ maxWidth: '400px', position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}></i>
          <input 
            type="text" 
            placeholder="Search by title or subject..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your papers...</p>
        </div>
      ) : (
        <div className="papers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredPapers.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
              <i className="fas fa-file-invoice" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem', display: 'block' }}></i>
              <p style={{ color: 'var(--gray-400)' }}>No question papers found. Start designing one!</p>
            </div>
          ) : (
            filteredPapers.map(paper => (
              <div key={paper.id} className="portal-card glass animate-in" style={{ borderLeft: '4px solid var(--blue)' }}>
                <div className="card-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="badge" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--blue)' }}>{paper.subject.code}</span>
                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => navigate(`edit/${paper.id}`)}><i className="fas fa-edit"></i></button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(paper.id)}><i className="fas fa-trash"></i></button>
                    </div>
                  </div>
                  <h3 style={{ marginTop: '12px', marginBottom: '4px' }}>{paper.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>{paper.subject.name}</p>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: '0.9rem', color: 'var(--gray-300)', minHeight: '40px' }}>{paper.description || 'No description provided.'}</p>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                    <span>By: {paper.teacher.name}</span>
                    <span>{new Date(paper.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
