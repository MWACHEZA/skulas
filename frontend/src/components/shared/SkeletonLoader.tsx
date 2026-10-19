import React from 'react';

export interface SkeletonLoaderProps {
  type?: 'table' | 'card' | 'profile' | 'stats' | 'form' | 'text' | 'custom';
  count?: number;
  rows?: number;
  columns?: number;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBox: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = '20px', borderRadius = '8px', className = '', style = {} }) => {
  return (
    <div
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  lineHeight?: string | number;
  gap?: number;
  lastLineWidth?: string;
  style?: React.CSSProperties;
}> = ({ lines = 3, lineHeight = '16px', gap = 8, lastLineWidth = '70%', style = {} }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ style?: React.CSSProperties }> = ({ style = {} }) => (
  <div
    style={{
      background: '#ffffff',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      ...style
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonBox width="52px" height="52px" borderRadius="50%" />
      <SkeletonBox width="80px" height="24px" borderRadius="6px" />
    </div>
    <SkeletonBox width="65%" height="20px" borderRadius="6px" />
    <SkeletonBox width="45%" height="14px" borderRadius="6px" />
    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
      <SkeletonBox width="30%" height="22px" borderRadius="6px" />
      <SkeletonBox width="30%" height="22px" borderRadius="6px" />
    </div>
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '8px', display: 'flex', gap: '10px' }}>
      <SkeletonBox width="100%" height="38px" borderRadius="8px" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 5 }) => (
  <div
    style={{
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}
  >
    {/* Header */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        padding: '16px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        gap: '16px'
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBox key={i} height="16px" width={i === 0 ? '70%' : '50%'} borderRadius="4px" />
      ))}
    </div>
    {/* Rows */}
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            padding: '18px 20px',
            borderBottom: r === rows - 1 ? 'none' : '1px solid #f1f5f9',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {c === 0 && <SkeletonBox width="32px" height="32px" borderRadius="50%" />}
              <SkeletonBox
                height="16px"
                width={c === 0 ? '60%' : c === columns - 1 ? '70%' : '80%'}
                borderRadius="4px"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
      gap: '16px'
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBox width="45%" height="14px" borderRadius="4px" />
          <SkeletonBox width="34px" height="34px" borderRadius="8px" />
        </div>
        <SkeletonBox width="55%" height="32px" borderRadius="6px" />
      </div>
    ))}
  </div>
);

export const SkeletonProfile: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {/* Header / Hero */}
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}
    >
      <SkeletonBox width="96px" height="96px" borderRadius="50%" />
      <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <SkeletonBox width="40%" height="28px" borderRadius="6px" />
        <SkeletonBox width="25%" height="16px" borderRadius="4px" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <SkeletonBox width="90px" height="24px" borderRadius="12px" />
          <SkeletonBox width="90px" height="24px" borderRadius="12px" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <SkeletonBox width="110px" height="42px" borderRadius="10px" />
        <SkeletonBox width="110px" height="42px" borderRadius="10px" />
      </div>
    </div>

    {/* Quick Stats */}
    <SkeletonStats count={4} />

    {/* Body Content Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <SkeletonBox width="35%" height="20px" borderRadius="6px" style={{ marginBottom: '18px' }} />
        <SkeletonText lines={5} gap={14} />
      </div>
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <SkeletonBox width="35%" height="20px" borderRadius="6px" style={{ marginBottom: '18px' }} />
        <SkeletonText lines={5} gap={14} />
      </div>
    </div>
  </div>
);

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 3,
  rows = 5,
  columns = 5,
  width,
  height,
  borderRadius,
  className,
  style
}) => {
  switch (type) {
    case 'custom':
      return (
        <SkeletonBox
          width={width}
          height={height}
          borderRadius={borderRadius}
          className={className}
          style={style}
        />
      );
    case 'text':
      return <SkeletonText lines={count} style={style} />;
    case 'stats':
      return <SkeletonStats count={count} />;
    case 'table':
      return <SkeletonTable rows={rows} columns={columns} />;
    case 'profile':
      return <SkeletonProfile />;
    case 'form':
      return (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            ...style
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonBox width="40%" height="14px" borderRadius="4px" />
              <SkeletonBox width="100%" height="42px" borderRadius="8px" />
            </div>
          ))}
        </div>
      );
    case 'card':
    default:
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '18px',
            ...style
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
  }
};

export default SkeletonLoader;
