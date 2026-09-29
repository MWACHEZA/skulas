import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Tooltip
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

export interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  change?: {
    value: number; // e.g. 5.4 for +5.4%
    label?: string; // e.g. "vs last term"
    isPositiveGood?: boolean; // default true (false for e.g. expenses, arrears)
  };
  icon?: LucideIcon | React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  chartType?: 'line' | 'bar' | 'area' | 'none';
  chartData?: any[];
  dataKey?: string;
  chartColor?: string;
  footer?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  value,
  change,
  icon: Icon,
  iconColor = '#3b82f6',
  iconBg = '#eff6ff',
  badge,
  badgeColor = 'blue',
  chartType = 'none',
  chartData = [],
  dataKey = 'value',
  chartColor = '#3b82f6',
  footer,
  loading = false,
  onClick,
  className = ''
}) => {
  const badgeColors: Record<string, { bg: string; text: string }> = {
    blue: { bg: '#dbeafe', text: '#1e40af' },
    green: { bg: '#dcfce7', text: '#15803d' },
    red: { bg: '#fee2e2', text: '#b91c1c' },
    amber: { bg: '#fef3c7', text: '#b45309' },
    purple: { bg: '#f3e8ff', text: '#6b21a8' }
  };

  const isPositiveGood = change?.isPositiveGood ?? true;
  const isUp = (change?.value ?? 0) > 0;
  const isDown = (change?.value ?? 0) < 0;
  const isGood = isPositiveGood ? isUp : isDown;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative'
      }}
      className={`analytics-card ${className}`}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {title}
            </span>
            {badge && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: badgeColors[badgeColor]?.bg || '#f1f5f9',
                  color: badgeColors[badgeColor]?.text || '#475569'
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
              {subtitle}
            </span>
          )}
        </div>

        {Icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {typeof Icon === 'function' ? (
              <Icon size={20} color={iconColor} />
            ) : (
              Icon
            )}
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div style={{ margin: '8px 0 12px' }}>
        {loading ? (
          <div style={{ width: '120px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
        ) : (
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {value}
          </div>
        )}

        {/* Change Indicator */}
        {change && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', fontWeight: 600 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                color: isGood ? '#16a34a' : isDown || isUp ? '#dc2626' : '#64748b',
                backgroundColor: isGood ? '#f0fdf4' : isDown || isUp ? '#fef2f2' : '#f8fafc',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : <Minus size={13} />}
              {Math.abs(change.value)}%
            </span>
            {change.label && <span style={{ color: '#94a3b8', fontWeight: 500 }}>{change.label}</span>}
          </div>
        )}
      </div>

      {/* Embedded Chart */}
      {chartType !== 'none' && chartData.length > 0 && !loading && (
        <div style={{ height: '56px', width: '100%', marginTop: '6px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', padding: '4px 8px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Line type="monotone" dataKey={dataKey} stroke={chartColor} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <defs>
                  <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', padding: '4px 8px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey={dataKey} stroke={chartColor} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${title.replace(/\s+/g, '')})`} isAnimationActive={false} />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', padding: '4px 8px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Bar dataKey={dataKey} fill={chartColor} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Optional Custom Footer */}
      {footer && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default AnalyticsCard;
