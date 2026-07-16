import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface BookRecord {
  id: string;
  title: string;
  author: string;
  isbn: string;
  categoryId: string;
  categoryName: string;
  totalCopies: number;
  available: number;
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

export default function LibraryBooks() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [categories, setCategories] = useState<{id: string, category: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({
    title: '',
    author: '',
    isbn: '',
    categoryId: '',
    totalCopies: '',
    edition: '',
    publisher: '',
    price: '',
    publishedDate: new Date().toISOString().split('T')[0],
    description: '',
    status: 'Available',
    subjectId: '',
    classId: '',
    cover: null
  });

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchBooks();
    fetchCategories();
    fetchSubjects();
    fetchClasses();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      setSubjects(res.data);
    } catch (err) { console.error(err); 
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data);
    } catch (err) { console.error(err); 
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await api.get('/api/library/books');
      setBooks(res.data);
    } catch (err) {
      showToast('Failed to load library catalog', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/library/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories');
    
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) data.append(key, formData[key]);
    });

    try {
      await api.post('/api/library/books', data);
      showToast('New book registered in catalog', 'success');
      setShowAddModal(false);
      fetchBooks();
      setFormData({
        title: '', author: '', isbn: '', categoryId: '', totalCopies: '',
        edition: '', publisher: '', price: '', publishedDate: new Date().toISOString().split('T')[0],
        description: '', status: 'Available', subjectId: '', classId: '', cover: null
      });
    } catch (err) {
      showToast('Failed to register book', 'error');
    
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.isbn.includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-center text-blue-600 font-bold">Accessing main stacks...</div>;

  return (
    <div className="library-portal-container" style={{ padding: '30px', minHeight: '100vh', background: 'white' }}>
      <div className="portal-page-header" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ color: '#1e3a8a', fontSize: '2.8rem', fontWeight: 900, marginBottom: 5 }}>Principal Catalog</h1>
          <p style={{ color: '#475569', fontSize: '1.1rem' }}>Manage the academic treasury. Track thousands of resources with precision.</p>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex gap-6 mb-10 items-center">
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
          <input 
            type="text" 
            placeholder="Search by title, author, or ISBN..." 
            className="portal-input w-full"
            style={{ paddingLeft: 60, height: 65, borderRadius: 24, border: '2px solid #f1f5f9', background: '#f8fafc', fontSize: '1.1rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ padding: '15px 30px', background: '#f8fafc', borderRadius: 24, border: '2px solid #f1f5f9', whiteSpace: 'nowrap' }}>
           <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>CATALOG SIZE:</span>
           <span style={{ color: '#1e3a8a', fontWeight: 900, fontSize: '1.2rem', marginLeft: 10 }}>{books.length} VOLUMES</span>
        </div>
      </div>

      <div className="portal-card" style={{ borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-book mr-2"></i>Resource Catalog Inventory
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Title', 'Author', 'ISBN', 'Category', 'Total Copies', 'Available'];
                const rows = filteredBooks.map(b => [
                  b.title,
                  b.author,
                  b.isbn,
                  b.categoryName,
                  b.totalCopies.toString(),
                  b.available.toString()
                ]);
                exportToCSV('Book_Catalog', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Title', 'Author', 'ISBN', 'Category', 'Total Copies', 'Available'];
                const rows = filteredBooks.map(b => [
                  b.title,
                  b.author,
                  b.isbn,
                  b.categoryName,
                  b.totalCopies.toString(),
                  b.available.toString()
                ]);
                exportToWord('Book_Catalog', headers, rows);
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
              onClick={() => setShowAddModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#1e3a8a' }}
            >
              <i className="fas fa-plus mr-1"></i> Catalog New Resource
            </button>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr style={{ background: '#f8fafc', color: '#1e3a8a' }}>
              <th style={{ padding: '25px 30px' }}>Title & Author</th>
              <th>Catalog Identity</th>
              <th>Classification</th>
              <th>Availability Logic</th>
              <th style={{ textAlign: 'center' }}>Ops</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.map(book => (
              <tr key={book.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '30px' }}>
                  <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.1rem' }}>{book.title}</div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>by {book.author}</div>
                </td>
                <td style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>{book.isbn}</td>
                <td>
                  <span className="portal-badge" style={{ background: '#eff6ff', color: '#1e40af', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {book.categoryName}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                     <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', maxWidth: 100 }}>
                        <div style={{ width: `${(book.available/book.totalCopies)*100}%`, height: '100%', background: book.available > 0 ? '#10b981' : '#f43f5e' }}></div>
                     </div>
                     <span style={{ fontWeight: 800, color: book.available > 0 ? '#10b981' : '#f43f5e', fontSize: '0.9rem' }}>
                        {book.available} / {book.totalCopies} IN STOCK
                     </span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="text-blue-600 hover:text-blue-800 font-bold p-2" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-edit"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-modal-card" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>Library Registration</h2>
                <span>Enter formal details for the new catalog acquisition.</span>
              </div>
              <button className="close-panel" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            
            <div className="portal-modal-body" style={{ padding: '30px' }}>
              <form onSubmit={handleAddBook}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-label">Official Book Title *</label>
                    <input 
                      type="text" required className="portal-input"
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Lead Author *</label>
                    <input 
                      type="text" required className="portal-input"
                      value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">ISBN Code</label>
                    <input 
                      type="text" className="portal-input"
                      value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Edition</label>
                    <input 
                      type="text" className="portal-input"
                      value={formData.edition} onChange={e => setFormData({...formData, edition: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Publisher *</label>
                    <input 
                      type="text" required className="portal-input"
                      value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Target Class</label>
                    <select className="portal-input" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}>
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Related Subject</label>
                    <select className="portal-input" value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})}>
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Resource Category *</label>
                    <select 
                      className="portal-input" required
                      value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Price</label>
                    <input 
                      type="number" step="0.01" className="portal-input"
                      value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Quantity *</label>
                    <input 
                      type="number" required className="portal-input"
                      value={formData.totalCopies} onChange={e => setFormData({...formData, totalCopies: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Book Status *</label>
                    <select className="portal-input" required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Available">Available</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Date *</label>
                    <input 
                      type="date" required className="portal-input"
                      value={formData.publishedDate} onChange={e => setFormData({...formData, publishedDate: e.target.value})}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-label">Description</label>
                    <textarea 
                      className="portal-input" style={{ minHeight: '80px' }}
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-label">Cover Image</label>
                    <input 
                      type="file" accept="image/*" className="portal-input"
                      onChange={e => setFormData({...formData, cover: e.target.files?.[0]})}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-ghost" style={{ flex: 1 }}>Abort</button>
                   <button type="submit" className="portal-btn-primary" style={{ flex: 2 }}>Finalize Entry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
