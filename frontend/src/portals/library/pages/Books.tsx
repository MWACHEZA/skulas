import React, { useEffect, useState, useRef } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface AuthorEntry {
  surname: string;
  firstName: string;
}

interface BookRecord {
  id: string;
  title: string;
  author: string;
  authors?: string[];
  isbn: string;
  isbn10?: string;
  isbn13?: string;
  categoryId: string;
  categoryName: string;
  totalCopies: number;
  available: number;
  shelfLocation?: string;
  barcode?: string;
  accessionNumber?: string;
  language?: string;
  keywords?: string[];
  source?: string;
  condition?: string;
  publisher?: string;
  edition?: string;
  price?: number;
  publishedDate?: string;
  description?: string;
  status?: string;
  coverImage?: string;
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
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBook, setEditBook] = useState<BookRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Form state
  const [authorList, setAuthorList] = useState<AuthorEntry[]>([{ surname: '', firstName: '' }]);
  const [formData, setFormData] = useState({
    title: '',
    isbn10: '',
    isbn13: '',
    categoryId: '',
    subjectId: '',
    totalCopies: 1,
    availableCopies: 1,
    shelfLocation: '',
    barcode: '',
    accessionNumber: '',
    edition: '',
    publisher: '',
    price: '',
    publishedDate: new Date().toISOString().split('T')[0],
    description: '',
    language: 'English',
    source: 'Purchased',
    condition: 'Good',
    keywords: '',
    status: 'Available',
    cover: null as File | null
  });

  // Edit Form state
  const [editAuthorList, setEditAuthorList] = useState<AuthorEntry[]>([{ surname: '', firstName: '' }]);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    fetchCategories();
    fetchSubjects();
    fetchBooks();
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchBooks();
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, selectedCategory, availableOnly]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (availableOnly) params.append('available', 'true');

      const res = await api.get(`/api/library/books?${params.toString()}`);
      if (res.data?.books) {
        setBooks(res.data.books);
        setSuggestions(res.data.suggestions || []);
        setDidYouMean(res.data.didYouMean || null);
      } else if (Array.isArray(res.data)) {
        setBooks(res.data);
      }
    } catch (err) {
      showToast('Failed to load library catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/library/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      setSubjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load subjects');
    }
  };

  // Helper to format authors
  const formatAuthorsArray = (list: AuthorEntry[]): string[] => {
    return list
      .filter(a => a.surname.trim() || a.firstName.trim())
      .map(a => {
        if (a.surname.trim() && a.firstName.trim()) return `${a.surname.trim()}, ${a.firstName.trim()}`;
        return a.surname.trim() || a.firstName.trim();
      });
  };

  const handleAddAuthor = () => {
    setAuthorList(prev => [...prev, { surname: '', firstName: '' }]);
  };

  const handleRemoveAuthor = (idx: number) => {
    if (authorList.length <= 1) return;
    setAuthorList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAuthorChange = (idx: number, field: 'surname' | 'firstName', val: string) => {
    const updated = [...authorList];
    updated[idx][field] = val;
    setAuthorList(updated);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const formattedAuthors = formatAuthorsArray(authorList);
    const primaryAuthor = formattedAuthors.length > 0 ? formattedAuthors[0] : 'Unknown';

    // Strip hyphens from ISBNs
    const cleanIsbn10 = formData.isbn10.replace(/[^0-9X]/gi, '');
    const cleanIsbn13 = formData.isbn13.replace(/[^0-9]/g, '');

    const data = new FormData();
    data.append('title', formData.title.trim());
    data.append('author', primaryAuthor);
    data.append('authors', JSON.stringify(formattedAuthors));
    data.append('isbn', cleanIsbn13 || cleanIsbn10 || '');
    data.append('isbn10', cleanIsbn10);
    data.append('isbn13', cleanIsbn13);
    data.append('categoryId', formData.categoryId);
    data.append('subjectId', formData.subjectId || '');
    data.append('totalCopies', String(formData.totalCopies));
    data.append('availableCopies', String(formData.availableCopies));
    data.append('shelfLocation', formData.shelfLocation.trim());
    data.append('barcode', formData.barcode.trim());
    data.append('accessionNumber', formData.accessionNumber.trim());
    data.append('edition', formData.edition.trim());
    data.append('publisher', formData.publisher.trim());
    data.append('price', formData.price ? String(formData.price) : '');
    data.append('publishedDate', formData.publishedDate);
    data.append('description', formData.description.trim());
    data.append('language', formData.language);
    data.append('source', formData.source);
    data.append('condition', formData.condition);
    data.append('status', formData.status);
    data.append('keywords', formData.keywords);

    if (formData.cover) {
      data.append('cover', formData.cover);
    }

    setSubmitting(true);
    try {
      await api.post('/api/library/books', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Book successfully cataloged', 'success');
      setShowAddModal(false);
      resetAddForm();
      fetchBooks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to catalog book', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setAuthorList([{ surname: '', firstName: '' }]);
    setFormData({
      title: '',
      isbn10: '',
      isbn13: '',
      categoryId: '',
      subjectId: '',
      totalCopies: 1,
      availableCopies: 1,
      shelfLocation: '',
      barcode: '',
      accessionNumber: '',
      edition: '',
      publisher: '',
      price: '',
      publishedDate: new Date().toISOString().split('T')[0],
      description: '',
      language: 'English',
      source: 'Purchased',
      condition: 'Good',
      keywords: '',
      status: 'Available',
      cover: null
    });
  };

  // Open edit modal
  const openEditModal = (book: BookRecord) => {
    setEditBook(book);
    let authors: AuthorEntry[] = [];
    if (book.authors && book.authors.length > 0) {
      authors = book.authors.map(a => {
        const parts = a.split(',');
        if (parts.length > 1) {
          return { surname: parts[0].trim(), firstName: parts.slice(1).join(',').trim() };
        }
        return { surname: a.trim(), firstName: '' };
      });
    } else if (book.author) {
      const parts = book.author.split(',');
      if (parts.length > 1) {
        authors = [{ surname: parts[0].trim(), firstName: parts.slice(1).join(',').trim() }];
      } else {
        authors = [{ surname: book.author.trim(), firstName: '' }];
      }
    } else {
      authors = [{ surname: '', firstName: '' }];
    }
    setEditAuthorList(authors);

    setEditFormData({
      title: book.title || '',
      isbn10: book.isbn10 || '',
      isbn13: book.isbn13 || (book.isbn?.length === 13 ? book.isbn : ''),
      categoryId: book.categoryId || '',
      totalCopies: book.totalCopies ?? 1,
      available: book.available ?? 1,
      shelfLocation: book.shelfLocation || '',
      barcode: book.barcode || '',
      accessionNumber: book.accessionNumber || '',
      edition: book.edition || '',
      publisher: book.publisher || '',
      language: book.language || 'English',
      source: book.source || 'Purchased',
      condition: book.condition || 'Good',
      status: book.status || 'Available',
      description: book.description || ''
    });
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBook) return;

    const formattedAuthors = formatAuthorsArray(editAuthorList);
    const primaryAuthor = formattedAuthors.length > 0 ? formattedAuthors[0] : 'Unknown';

    setSubmitting(true);
    try {
      await api.patch(`/api/library/books/${editBook.id}`, {
        ...editFormData,
        author: primaryAuthor,
        authors: formattedAuthors,
        isbn10: editFormData.isbn10 ? editFormData.isbn10.replace(/[^0-9X]/gi, '') : '',
        isbn13: editFormData.isbn13 ? editFormData.isbn13.replace(/[^0-9]/g, '') : '',
        totalCopies: parseInt(editFormData.totalCopies) || 1,
        available: parseInt(editFormData.available) || 0
      });
      showToast('Book details updated', 'success');
      setEditBook(null);
      fetchBooks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update book', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the catalog?`)) return;
    try {
      await api.delete(`/api/library/books/${id}`);
      showToast('Book removed from catalog', 'success');
      fetchBooks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove book', 'error');
    }
  };

  return (
    <div className="library-portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Clean ERP Header */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-book-reader mr-3 text-primary" style={{ color: '#2563eb' }}></i>
            Book Catalog
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Catalog, track physical volumes, shelf coordinates, and copy availability.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="no-print">
          <button 
            onClick={() => {
              const headers = ['Title', 'Authors', 'ISBN-10', 'ISBN-13', 'Shelf Location', 'Barcode', 'Category', 'Total Copies', 'Available'];
              const rows = books.map(b => [
                b.title,
                (b.authors && b.authors.length > 0) ? b.authors.join('; ') : b.author,
                b.isbn10 || '',
                b.isbn13 || b.isbn || '',
                b.shelfLocation || '',
                b.barcode || '',
                b.categoryName,
                (b.totalCopies ?? 0).toString(),
                (b.available ?? 0).toString()
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
              const headers = ['Title', 'Authors', 'ISBN-10', 'ISBN-13', 'Shelf Location', 'Barcode', 'Category', 'Total Copies', 'Available'];
              const rows = books.map(b => [
                b.title,
                (b.authors && b.authors.length > 0) ? b.authors.join('; ') : b.author,
                b.isbn10 || '',
                b.isbn13 || b.isbn || '',
                b.shelfLocation || '',
                b.barcode || '',
                b.categoryName,
                (b.totalCopies ?? 0).toString(),
                (b.available ?? 0).toString()
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
            style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-plus"></i> Add New Book
          </button>
        </div>
      </div>

      {/* Forgiving Fuzzy Search & Filters Bar */}
      <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Autocomplete Fuzzy Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
            <input 
              type="text" 
              placeholder="Search by title, author, ISBN-10/13, barcode, or shelf..." 
              className="portal-input"
              style={{ width: '100%', paddingLeft: 44, paddingRight: 32, height: 46, borderRadius: 10, fontSize: '0.95rem' }}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
            />
            {searchTerm && (
              <button 
                onClick={() => { setSearchTerm(''); setDidYouMean(null); }} 
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            )}

            {/* Autocomplete Suggestions Box */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                {suggestions.map((sug, idx) => (
                  <div 
                    key={idx} 
                    onMouseDown={() => { setSearchTerm(sug); setShowSuggestions(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: idx < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                    className="hover:bg-blue-50"
                  >
                    <i className="fas fa-search mr-2 text-muted" style={{ fontSize: '0.75rem', color: '#94a3b8' }}></i>
                    {sug}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ width: '220px' }}>
            <select 
              className="portal-input" 
              style={{ height: 46, borderRadius: 10, width: '100%' }}
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.category}</option>
              ))}
            </select>
          </div>

          {/* Availability Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={availableOnly} 
              onChange={e => setAvailableOnly(e.target.checked)} 
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            Available in Stock Only
          </label>

          {/* Total Counter Badge */}
          <div style={{ marginLeft: 'auto', background: '#f1f5f9', padding: '6px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
            {books.length} {books.length === 1 ? 'Book' : 'Books'}
          </div>
        </div>

        {/* Typo Tolerance Suggestion Banner ("Did you mean...?") */}
        {didYouMean && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-info-circle"></i>
            <span>
              Did you mean{' '}
              <button 
                onClick={() => { setSearchTerm(didYouMean); setDidYouMean(null); }}
                style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                {didYouMean}
              </button>
              ?
            </span>
          </div>
        )}
      </div>

      {/* Book Catalog Table */}
      <div className="portal-card" style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin mr-2"></i> Loading catalog records...
          </div>
        ) : books.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-book-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
            <p style={{ fontWeight: 600, margin: 0 }}>No books matching your query found.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Try clearing filters or checking for typo variations.</p>
          </div>
        ) : (
          <table className="portal-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#334155' }}>
                <th>Title & Authors</th>
                <th>ISBN & Identifiers</th>
                <th>Classification</th>
                <th>Shelf Location</th>
                <th>Stock / Availability</th>
                <th>Condition</th>
                <th style={{ textAlign: 'center', width: 90 }} className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => {
                const authorDisplay = (book.authors && book.authors.length > 0)
                  ? book.authors.join('; ')
                  : (book.author || 'Unknown');

                return (
                  <tr key={book.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{book.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        <i className="fas fa-user-edit mr-1 text-muted"></i> {authorDisplay}
                      </div>
                      {book.publisher && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Pub: {book.publisher} {book.edition ? `(${book.edition})` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        {book.isbn13 ? <div>ISBN-13: {book.isbn13}</div> : null}
                        {book.isbn10 ? <div>ISBN-10: {book.isbn10}</div> : (!book.isbn13 && book.isbn ? <div>ISBN: {book.isbn}</div> : null)}
                      </div>
                      {(book.accessionNumber || book.barcode) && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                          {book.accessionNumber ? `Acc: ${book.accessionNumber}` : ''}
                          {book.barcode ? ` | Barcode: ${book.barcode}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="portal-badge" style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {book.categoryName}
                      </span>
                    </td>
                    <td>
                      {book.shelfLocation ? (
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-map-marker-alt text-primary" style={{ fontSize: '0.75rem' }}></i>
                          {book.shelfLocation}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 60, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${book.totalCopies > 0 ? (book.available / book.totalCopies) * 100 : 0}%`, 
                              height: '100%', 
                              background: book.available > 0 ? '#10b981' : '#ef4444' 
                            }}
                          ></div>
                        </div>
                        <span style={{ fontWeight: 700, color: book.available > 0 ? '#059669' : '#dc2626', fontSize: '0.85rem' }}>
                          {book.available} / {book.totalCopies}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`portal-badge ${book.condition === 'Fair' ? 'warning' : book.condition === 'Poor' ? 'danger' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                        {book.condition || 'Good'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} className="no-print">
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button 
                          className="portal-link-btn" 
                          onClick={() => openEditModal(book)} 
                          title="Edit Book Details"
                          style={{ color: '#2563eb', padding: 4 }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="portal-link-btn" 
                          onClick={() => handleDeleteBook(book.id, book.title)} 
                          title="Remove Book"
                          style={{ color: '#ef4444', padding: 4 }}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 840, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  <i className="fas fa-book mr-2" style={{ color: '#2563eb' }}></i>
                  Catalog New Book
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Register a physical volume into the school library inventory.
                </p>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleAddBook} style={{ padding: '20px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Book Title */}
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Official Book Title *</label>
                  <input 
                    type="text" 
                    required 
                    className="portal-input" 
                    placeholder="e.g. Principles of Modern Physics" 
                    value={formData.title} 
                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  />
                </div>

                {/* Multiple Authors Section */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                      <i className="fas fa-users mr-1"></i> Authors (Surname, First Name format) *
                    </label>
                    <button 
                      type="button" 
                      onClick={handleAddAuthor} 
                      className="portal-btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 6 }}
                    >
                      <i className="fas fa-plus mr-1"></i> Add Author
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {authorList.map((auth, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 10, alignItems: 'center' }}>
                        <input 
                          type="text" 
                          placeholder={`Author ${idx + 1} Surname (e.g. Hawking)`} 
                          className="portal-input" 
                          value={auth.surname} 
                          onChange={e => handleAuthorChange(idx, 'surname', e.target.value)} 
                          style={{ fontSize: '0.85rem' }}
                        />
                        <input 
                          type="text" 
                          placeholder={`Author ${idx + 1} First Name (e.g. Stephen)`} 
                          className="portal-input" 
                          value={auth.firstName} 
                          onChange={e => handleAuthorChange(idx, 'firstName', e.target.value)} 
                          style={{ fontSize: '0.85rem' }}
                        />
                        {authorList.length > 1 ? (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAuthor(idx)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'center' }}
                            title="Remove Author"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        ) : <div></div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ISBN Identifiers (without hyphens) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>ISBN-10 (10 digits, no hyphens)</label>
                    <input 
                      type="text" 
                      maxLength={10} 
                      placeholder="e.g. 0140449132" 
                      className="portal-input" 
                      value={formData.isbn10} 
                      onChange={e => setFormData({ ...formData, isbn10: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>ISBN-13 (13 digits, no hyphens)</label>
                    <input 
                      type="text" 
                      maxLength={13} 
                      placeholder="e.g. 9780140449136" 
                      className="portal-input" 
                      value={formData.isbn13} 
                      onChange={e => setFormData({ ...formData, isbn13: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Shelf Location, Barcode & Accession Number */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Shelf Location / Coordinate</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Aisle 4, Stack B, Shelf 3" 
                      className="portal-input" 
                      value={formData.shelfLocation} 
                      onChange={e => setFormData({ ...formData, shelfLocation: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Barcode</label>
                    <input 
                      type="text" 
                      placeholder="e.g. BC-99482" 
                      className="portal-input" 
                      value={formData.barcode} 
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Accession Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ACC-2026-004" 
                      className="portal-input" 
                      value={formData.accessionNumber} 
                      onChange={e => setFormData({ ...formData, accessionNumber: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Classification & Subject (NO Class Link) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Category *</label>
                    <select 
                      required 
                      className="portal-input" 
                      value={formData.categoryId} 
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.category}</option>)}
                    </select>
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Subject Area</label>
                    <select 
                      className="portal-input" 
                      value={formData.subjectId} 
                      onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                    >
                      <option value="">Select Subject Area (Optional)</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Copies (Total & Available) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Total Copies *</label>
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      className="portal-input" 
                      value={formData.totalCopies} 
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        setFormData({ 
                          ...formData, 
                          totalCopies: val,
                          availableCopies: Math.min(val, formData.availableCopies)
                        });
                      }} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Available Copies *</label>
                    <input 
                      type="number" 
                      min="0" 
                      max={formData.totalCopies}
                      required 
                      className="portal-input" 
                      value={formData.availableCopies} 
                      onChange={e => setFormData({ ...formData, availableCopies: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Condition</label>
                    <select 
                      className="portal-input" 
                      value={formData.condition} 
                      onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>

                {/* Publisher, Edition, Language, Source */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Publisher</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Oxford University Press" 
                      className="portal-input" 
                      value={formData.publisher} 
                      onChange={e => setFormData({ ...formData, publisher: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Edition</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 4th Edition" 
                      className="portal-input" 
                      value={formData.edition} 
                      onChange={e => setFormData({ ...formData, edition: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Language</label>
                    <select 
                      className="portal-input" 
                      value={formData.language} 
                      onChange={e => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Swahili">Swahili</option>
                      <option value="Portuguese">Portuguese</option>
                    </select>
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Acquisition Source</label>
                    <select 
                      className="portal-input" 
                      value={formData.source} 
                      onChange={e => setFormData({ ...formData, source: e.target.value })}
                    >
                      <option value="Purchased">Purchased</option>
                      <option value="Donated">Donated</option>
                      <option value="Government Grant">Government Grant</option>
                      <option value="Inter-Library Loan">Inter-Library Loan</option>
                    </select>
                  </div>
                </div>

                {/* Keywords & Description */}
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Keywords (Comma-separated for search discovery)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. quantum, mechanics, wave particle duality, physics" 
                    className="portal-input" 
                    value={formData.keywords} 
                    onChange={e => setFormData({ ...formData, keywords: e.target.value })} 
                  />
                </div>

                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Summary / Description</label>
                  <textarea 
                    rows={2} 
                    className="portal-input" 
                    placeholder="Brief description or synopsis of the resource..." 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>

                {/* Cover Image Upload */}
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Book Cover Image (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="portal-input" 
                    onChange={e => setFormData({ ...formData, cover: e.target.files?.[0] || null })} 
                  />
                </div>
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ background: '#2563eb' }}>
                  {submitting ? 'Cataloging...' : 'Catalog Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {editBook && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  Edit Catalog Entry: {editBook.title}
                </h2>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setEditBook(null)}>&times;</button>
            </div>

            <form onSubmit={handleEditBook} style={{ padding: '20px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Official Book Title *</label>
                  <input 
                    type="text" 
                    required 
                    className="portal-input" 
                    value={editFormData.title || ''} 
                    onChange={e => setEditFormData({ ...editFormData, title: e.target.value })} 
                  />
                </div>

                {/* Multiple Authors */}
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Authors</label>
                    <button 
                      type="button" 
                      onClick={() => setEditAuthorList(prev => [...prev, { surname: '', firstName: '' }])}
                      className="portal-btn-secondary" 
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    >
                      + Add Author
                    </button>
                  </div>
                  {editAuthorList.map((auth, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 8, marginBottom: 6 }}>
                      <input 
                        type="text" 
                        placeholder="Surname" 
                        className="portal-input" 
                        value={auth.surname} 
                        onChange={e => {
                          const updated = [...editAuthorList];
                          updated[idx].surname = e.target.value;
                          setEditAuthorList(updated);
                        }} 
                      />
                      <input 
                        type="text" 
                        placeholder="First Name" 
                        className="portal-input" 
                        value={auth.firstName} 
                        onChange={e => {
                          const updated = [...editAuthorList];
                          updated[idx].firstName = e.target.value;
                          setEditAuthorList(updated);
                        }} 
                      />
                      {editAuthorList.length > 1 ? (
                        <button 
                          type="button" 
                          onClick={() => setEditAuthorList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      ) : <div></div>}
                    </div>
                  ))}
                </div>

                {/* ISBNs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>ISBN-10</label>
                    <input 
                      type="text" 
                      maxLength={10} 
                      className="portal-input" 
                      value={editFormData.isbn10 || ''} 
                      onChange={e => setEditFormData({ ...editFormData, isbn10: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>ISBN-13</label>
                    <input 
                      type="text" 
                      maxLength={13} 
                      className="portal-input" 
                      value={editFormData.isbn13 || ''} 
                      onChange={e => setEditFormData({ ...editFormData, isbn13: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Shelf Location, Barcode & Accession */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Shelf Location</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      value={editFormData.shelfLocation || ''} 
                      onChange={e => setEditFormData({ ...editFormData, shelfLocation: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Barcode</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      value={editFormData.barcode || ''} 
                      onChange={e => setEditFormData({ ...editFormData, barcode: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Accession Number</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      value={editFormData.accessionNumber || ''} 
                      onChange={e => setEditFormData({ ...editFormData, accessionNumber: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Copies */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Total Copies</label>
                    <input 
                      type="number" 
                      min="1" 
                      className="portal-input" 
                      value={editFormData.totalCopies || 1} 
                      onChange={e => setEditFormData({ ...editFormData, totalCopies: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Available Copies</label>
                    <input 
                      type="number" 
                      min="0" 
                      className="portal-input" 
                      value={editFormData.available || 0} 
                      onChange={e => setEditFormData({ ...editFormData, available: e.target.value })} 
                    />
                  </div>
                  <div className="portal-form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Condition</label>
                    <select 
                      className="portal-input" 
                      value={editFormData.condition || 'Good'} 
                      onChange={e => setEditFormData({ ...editFormData, condition: e.target.value })}
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setEditBook(null)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ background: '#2563eb' }}>
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
