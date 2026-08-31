import { useState } from 'react';

export default function PublicSchoolLibrary() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  const books = [
    { title: 'Advanced Physics Principles', category: 'Science', year: '2024 Edition', format: 'Physical & E-Book' },
    { title: 'The Sun Will Rise Again (Setwork)', category: 'Literature', year: 'Form 3-4', format: 'Physical Book' },
    { title: 'Financial Accounting Standards', category: 'Commercials', year: 'O-Level', format: 'E-Book PDF' },
    { title: 'Zimbabwean History & Civic Culture', category: 'Humanities', year: 'Form 1-6', format: 'Physical Book' },
    { title: 'Organic Chemistry & Lab Manual', category: 'Science', year: 'A-Level', format: 'Physical & E-Book' },
  ];

  const filteredBooks = books.filter(b => {
    const matchesCat = activeCategory === 'ALL' || b.category === activeCategory;
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="portal-public-library-container">
      <div className="portal-public-library-header">
        <h1 className="portal-public-library-title">School Resource & Digital Library</h1>
        <p className="portal-public-library-desc">
          Explore our extensive catalog of academic textbooks, research papers, e-books, and study archives available to students and staff.
        </p>
      </div>

      {/* Search & Categories */}
      <div className="portal-public-search-box">
        <div className="portal-flex-center-gap12 portal-card-mb20">
          <input
            type="text"
            className="portal-input portal-public-search-input"
            placeholder="Search catalog by book title or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="portal-categories-row">
          {['ALL', 'Science', 'Literature', 'Commercials', 'Humanities'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`portal-public-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="portal-public-catalog-grid">
        {filteredBooks.map((b, idx) => (
          <div key={idx} className="portal-public-book-card">
            <div className="portal-public-book-header">
              <div className="portal-public-book-icon-wrapper">
                <i className="fas fa-book-open"></i>
              </div>
              <div>
                <span className="portal-public-book-category">{b.category}</span>
                <h3 className="portal-public-book-title">{b.title}</h3>
              </div>
            </div>
            <div className="portal-public-book-footer">
              <span>{b.year}</span>
              <span className="portal-public-book-format">{b.format}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
