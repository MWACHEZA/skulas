import React, { useState, useEffect, useRef } from 'react';
import type { TutorialStep } from '../../../tutorials/types';

interface TutorialRunnerProps {
  activeStep: TutorialStep | null;
  stepNumber?: number;
  totalSteps?: number;
  onCompleteStep: (stepId: string) => void;
  onCloseTooltip: () => void;
  onSkipStep?: () => void;
}

export const TutorialRunner: React.FC<TutorialRunnerProps> = ({
  activeStep,
  stepNumber = 1,
  totalSteps = 1,
  onCompleteStep,
  onCloseTooltip,
  onSkipStep
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

  const isMobile = window.innerWidth <= 768;
  const isLastStep = stepNumber >= totalSteps;

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
        top: Math.min(window.innerHeight - 220, Math.max(10, targetRect.bottom + 12)),
        left: Math.max(20, Math.min(window.innerWidth - 360, targetRect.left)),
        width: 340,
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
          borderRadius: 14,
          padding: '18px 20px',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          color: '#1e293b'
        }}
        role="dialog"
        aria-labelledby="tour-tooltip-title"
        aria-describedby="tour-tooltip-desc"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>
              Step {stepNumber} of {totalSteps}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseTooltip}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
            aria-label="Close tutorial"
          >
            &times;
          </button>
        </div>

        <h4 id="tour-tooltip-title" style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
          {activeStep.title}
        </h4>

        {activeStep.description && (
          <p id="tour-tooltip-desc" style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.45 }}>
            {activeStep.description}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onSkipStep || onCloseTooltip}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 6px'
            }}
          >
            Skip for now
          </button>

          <button
            type="button"
            onClick={() => onCompleteStep(activeStep.id)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: isLastStep ? '#16a34a' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isLastStep ? '0 2px 8px rgba(22, 163, 74, 0.3)' : '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            {isLastStep ? (
              <><i className="fas fa-check-circle" /> Complete Tutorial</>
            ) : (
              <><i className="fas fa-arrow-right" /> Next Step</>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default TutorialRunner;
