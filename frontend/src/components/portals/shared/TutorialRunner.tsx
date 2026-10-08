import React, { useState, useEffect, useRef } from 'react';
import type { TutorialStep } from '../../../tutorials/types';

interface TutorialRunnerProps {
  activeStep: TutorialStep | null;
  onCompleteStep: (stepId: string) => void;
  onCloseTooltip: () => void;
}

export const TutorialRunner: React.FC<TutorialRunnerProps> = ({
  activeStep,
  onCompleteStep,
  onCloseTooltip
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!activeStep || !activeStep.target) {
      setTargetRect(null);
      return;
    }

    setIsSearching(true);
    let attempts = 0;
    const maxAttempts = 15; // 15 attempts * 200ms = 3.0 seconds

    const pollElement = () => {
      const element = document.querySelector(`[data-tour="${activeStep.target}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        setIsSearching(false);
      } else if (attempts < maxAttempts) {
        attempts++;
        timeoutRef.current = setTimeout(pollElement, 200);
      } else {
        // 3 seconds timeout expired: skip gracefully without blocking
        console.warn(`[TutorialRunner] Target [data-tour="${activeStep.target}"] not found after 3 seconds. Skipping step gracefully.`);
        setIsSearching(false);
        setTargetRect(null);
        onCloseTooltip();
      }
    };

    pollElement();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeStep]);

  // Recalculate rect on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!activeStep?.target) return;
      const element = document.querySelector(`[data-tour="${activeStep.target}"]`);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [activeStep]);

  if (!activeStep || !targetRect) return null;

  // Tooltip positioning: below target by default, or bottom overlay on mobile
  const isMobile = window.innerWidth <= 768;
  const tooltipStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 99999
      }
    : {
        position: 'fixed',
        top: Math.min(window.innerHeight - 200, Math.max(10, targetRect.bottom + 12)),
        left: Math.max(20, Math.min(window.innerWidth - 340, targetRect.left)),
        width: 320,
        zIndex: 99999
      };

  return (
    <>
      {/* Target Focus Ring / Highlight Box */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          borderRadius: 8,
          border: '3px solid #2563eb',
          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
          pointerEvents: 'none',
          zIndex: 99998,
          transition: 'all 0.2s ease-out'
        }}
      />

      {/* Interactive Tooltip Card */}
      <div
        style={{
          ...tooltipStyle,
          background: '#ffffff',
          borderRadius: 12,
          padding: '18px 20px',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          color: '#1e293b'
        }}
        role="dialog"
        aria-labelledby="tour-tooltip-title"
        aria-describedby="tour-tooltip-desc"
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
            <h4 id="tour-tooltip-title" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
              {activeStep.title}
            </h4>
          </div>
          <button
            type="button"
            onClick={onCloseTooltip}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
            aria-label="Close step tooltip"
          >
            &times;
          </button>
        </div>

        {activeStep.description && (
          <p id="tour-tooltip-desc" style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.45 }}>
            {activeStep.description}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="portal-btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 800 }}
            onClick={() => onCompleteStep(activeStep.id)}
          >
            <i className="fas fa-check mr-1" /> Mark Step Complete
          </button>
        </div>
      </div>
    </>
  );
};

export default TutorialRunner;
