import React, { useState, useEffect } from 'react';

const TeacherAwards = () => {
  const [activeTab, setActiveTab] = useState('nominate');
  const [awards, setAwards] = useState([]);

  useEffect(() => {
    // fetch awards, etc
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'nominate':
        return <div>Nominate Student Form (limit 3 per class per week)</div>;
      case 'my-awards':
        return <div>My Awards Given</div>;
      case 'hall-of-fame':
        return <div>Hall of Fame Leaderboard</div>;
      case 'pending':
        return <div>Pending Approvals</div>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teacher Awards</h1>
      <div className="flex space-x-4 mb-4 border-b">
        <button className={`py-2 ${activeTab === 'nominate' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('nominate')}>Nominate Student</button>
        <button className={`py-2 ${activeTab === 'my-awards' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('my-awards')}>My Awards Given</button>
        <button className={`py-2 ${activeTab === 'hall-of-fame' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('hall-of-fame')}>Hall of Fame</button>
        <button className={`py-2 ${activeTab === 'pending' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setActiveTab('pending')}>Pending Approvals</button>
      </div>
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default TeacherAwards;
