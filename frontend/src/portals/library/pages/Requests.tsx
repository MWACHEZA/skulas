import React from 'react';

export default function LibraryRequests() {
  return (
    <>
      <div className="portal-page-header">
        <h1>Book Requests</h1>
        <p>Manage requests from students and staff for books that are currently unavailable.</p>
      </div>

      <div className="portal-card" style={{ padding: 60, textAlign: 'center' }}>
        <i className="fas fa-hand-holding" style={{ fontSize: '4rem', color: '#e2e8f0', marginBottom: 20 }}></i>
        <h3>No active requests</h3>
        <p style={{ color: '#718096' }}>When users request books, they will appear here.</p>
      </div>
    </>
  );
}
