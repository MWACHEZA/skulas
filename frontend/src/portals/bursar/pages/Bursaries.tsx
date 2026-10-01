import React, { useState, useEffect } from 'react';

const Bursaries = () => {
  const [activeTab, setActiveTab] = useState('applications');
  
  useEffect(() => {
    // fetch bursaries
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'applications':
        return <div>Bursary Applications (Pending / Suggested)</div>;
      case 'rules':
        return <div>Auto-discount Rules Config</div>;
      case 'sponsors':
        return <div>Sponsors Tab</div>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bursaries & Scholarships</h1>
      <div className="flex space-x-4 mb-4 border-b">
        <button className={`py-2 ${activeTab === 'applications' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('applications')}>Applications</button>
        <button className={`py-2 ${activeTab === 'rules' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('rules')}>Auto-discount Rules</button>
        <button className={`py-2 ${activeTab === 'sponsors' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('sponsors')}>Sponsors</button>
      </div>
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Bursaries;
