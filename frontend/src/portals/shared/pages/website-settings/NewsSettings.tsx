import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '../../../../lib/api';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image: string | null;
  category?: string | null;
  publishedAt: string;
}

interface NewsFormValues {
  title: string;
  content: string;
  publishedAt: string;
  image: string;
  category?: string;
}

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function NewsSettings() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<NewsFormValues>();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const imageVal = watch('image');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/website-settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValue('image', res.data.filename);
      toast.success('News cover image uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload cover image.');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await api.get('/api/website-settings/news');
      setNews(response.data);
    } catch (error) {
      console.error('Failed to fetch news', error);
    
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: NewsFormValues) => {
    try {
      if (editingNews) {
        await api.put(`/api/website-settings/news/${editingNews.id}`, data);
        toast.success('News updated successfully!');
      } else {
        await api.post('/api/website-settings/news', data);
        toast.success('News added successfully!');
      }
      reset();
      setEditingNews(null);
      setIsCreateModalOpen(false);
      fetchNews();
    } catch (error) {
      console.error('Failed to save news', error);
      toast.error('Failed to save news');
    }
  };

  const deleteNews = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this news item?'))) return;
    try {
      await api.delete(`/api/website-settings/news/${id}`);
      setNews(news.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete news', error);
    
    }
  };

  const filteredNews = news.filter(item => {
    const titleText = item.title || '';
    const contentText = item.content || '';
    return titleText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contentText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      {/* List News Table */}
      <div className="portal-card" style={{ width: '100%', borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-list mr-2"></i>News Entries
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Title', 'Publish Date'];
                const rows = filteredNews.map(item => [
                  item.title,
                  format(new Date(item.publishedAt), 'dd/MM/yyyy')
                ]);
                exportToCSV('News_Entries', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Title', 'Publish Date'];
                const rows = filteredNews.map(item => [
                  item.title,
                  format(new Date(item.publishedAt), 'dd/MM/yyyy')
                ]);
                exportToWord('News_Entries', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
            <button 
              onClick={() => {
              setEditingNews(null);
              reset({
                title: '',
                content: '',
                publishedAt: new Date().toISOString().split('T')[0],
                image: '',
                category: ''
              });
              setIsCreateModalOpen(true);
            }}
              className="portal-btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-plus mr-1"></i> Create News
            </button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 10 }}>Search:</span>
              <input 
                type="text" 
                className="portal-input" 
                style={{ width: 200, padding: '5px 10px' }} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <table className="portal-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>DATE</th>
                <th style={{ textAlign: 'center' }}>OPTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>Loading news...</td>
                </tr>
              ) : filteredNews.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <i className="fas fa-folder-open fa-2x" style={{ color: '#ecc94b' }}></i>
                      <span>No news entries found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNews.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td>{format(new Date(item.publishedAt), 'dd/MM/yyyy')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setEditingNews(item);
                          setIsCreateModalOpen(true);
                          setValue('title', item.title);
                          setValue('content', item.content);
                          setValue('publishedAt', new Date(item.publishedAt).toISOString().split('T')[0]);
                          setValue('image', item.image || '');
                          setValue('category', item.category || '');
                        }}
                        className="portal-btn-secondary"
                        style={{ padding: '4px 8px', color: 'white', background: 'var(--portal-primary)', border: 'none', marginRight: '8px' }}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => deleteNews(item.id)}
                        className="portal-btn-secondary"
                        style={{ padding: '4px 8px', color: 'white', background: 'var(--portal-danger)', border: 'none' }}
                        title="Delete"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: '600px', width: '95%', padding: '24px', position: 'relative', background: 'white', color: '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-edit"></i> {editingNews ? 'Edit News Entry' : 'Add News Entry'}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Title <span style={{ color: 'red' }}>*</span></label>
                <input
                  {...register('title', { required: true })}
                  type="text"
                  placeholder="Title"
                  className="portal-input"
                />
              </div>
              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Category</label>
                <input
                  {...register('category')}
                  type="text"
                  placeholder="e.g. Academic, Sports, Events, Announcement"
                  className="portal-input"
                />
              </div>
              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Content</label>
                <textarea
                  {...register('content', { required: true })}
                  rows={8}
                  placeholder="Content details..."
                  className="portal-input"
                ></textarea>
              </div>
              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Date <span style={{ color: 'red' }}>*</span></label>
                <input
                  {...register('publishedAt', { required: true })}
                  type="date"
                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  className="portal-input"
                />
              </div>
              <div className="portal-form-group" style={{ marginBottom: '20px' }}>
                <label className="portal-label">Image <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="file"
                  className="portal-input"
                  style={{ padding: '8px' }}
                  onChange={handleImageUpload}
                />
                <input type="hidden" {...register('image', { required: true })} />
                {uploadingImage && <p style={{ fontSize: '0.8rem', color: 'var(--school-primary, #3182ce)', marginTop: '6px' }}><i className="fas fa-spinner fa-spin mr-1"></i> Uploading image...</p>}
                {imageVal && !uploadingImage && <p style={{ fontSize: '0.75rem', color: '#48bb78', marginTop: '6px' }}><i className="fas fa-check-circle mr-1"></i> Ready: {imageVal}</p>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="portal-btn-ghost"
                  style={{ padding: '10px 20px', fontWeight: 800 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fas fa-save"></i> Save News
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
