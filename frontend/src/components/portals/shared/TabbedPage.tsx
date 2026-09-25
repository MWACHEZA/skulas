import React, { useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  content: React.ReactNode;
}

interface TabbedPageProps {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  tabs: TabItem[];
  defaultTab?: string;
  paramName?: string;
}

export default function TabbedPage({
  title,
  subtitle,
  headerAction,
  tabs,
  defaultTab,
  paramName = 'tab'
}: TabbedPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // 1. Resolve initial active tab from URL query param (?tab=...), hash (#...), or defaultTab
  const getInitialTab = () => {
    const queryTab = searchParams.get(paramName);
    if (queryTab && tabs.some(t => t.id === queryTab)) return queryTab;

    const hashTab = location.hash ? location.hash.replace('#', '') : null;
    if (hashTab && tabs.some(t => t.id === hashTab)) return hashTab;

    if (defaultTab && tabs.some(t => t.id === defaultTab)) return defaultTab;

    return tabs[0]?.id || '';
  };

  const [activeTab, setActiveTab] = React.useState<string>(getInitialTab);

  // 2. Sync if URL query or hash changes externally (e.g. forward/back button, notification link)
  useEffect(() => {
    const currentQuery = searchParams.get(paramName);
    const currentHash = location.hash ? location.hash.replace('#', '') : null;
    const target = currentQuery || currentHash;

    if (target && target !== activeTab && tabs.some(t => t.id === target)) {
      setActiveTab(target);
    }
  }, [searchParams, location.hash, paramName, tabs]);

  // 3. User tab switch handler
  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(paramName, tabId);
    setSearchParams(nextParams, { replace: true });
  };

  const activeContent = tabs.find(t => t.id === activeTab)?.content || tabs[0]?.content;

  return (
    <div className="tabbed-page-container">
      {/* Header */}
      <div 
        className="portal-page-header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 12, 
          marginBottom: 18 
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{subtitle}</p>
          )}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Tabs Navigation Bar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 2
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--school-primary, #2563eb)' : '#64748b',
                background: isActive ? '#eff6ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--school-primary, #2563eb)' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              {tab.icon && <i className={tab.icon}></i>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span 
                  style={{
                    background: isActive ? 'var(--school-primary, #2563eb)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="tabbed-page-content">
        {activeContent}
      </div>
    </div>
  );
}
