import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { analyzeAI, getAIBudget } from '../api/aiApi';

/**
 * Reusable AI Insight Card — drop this into any page to add AI analysis.
 *
 * Usage:
 *   <AIInsightCard
 *     feature="retail_eod_analysis"
 *     params={{ date: '2026-04-13' }}
 *     title="AI Daily Analysis"
 *   />
 *
 * Props:
 *   feature  — AI feature key (from features registry)
 *   params   — optional params object for the feature
 *   title    — card title (default: "AI Insights")
 *   autoRun  — if true, runs analysis on mount (default: false)
 *   compact  — if true, uses smaller card style
 */
export default function AIInsightCard({
  feature,
  params = {},
  title = 'AI Insights',
  autoRun = false,
  compact = false,
}) {
  const [analysis, setAnalysis] = useState(null);

  const { data: budget } = useQuery({
    queryKey: ['ai-budget'],
    queryFn: getAIBudget,
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: () => analyzeAI(feature, params),
    onSuccess: (data) => setAnalysis(data),
  });

  const hasCredits = budget?.credits_remaining > 0;
  const isLoading = mutation.isPending;
  const isError = mutation.isError;

  // Auto-run on mount if requested and has credits
  useState(() => {
    if (autoRun && hasCredits && !analysis) {
      mutation.mutate();
    }
  }, [autoRun, hasCredits]);

  const cardStyle = {
    background: '#fff',
    border: '1px solid #e3e8e4',
    borderRadius: 12,
    padding: compact ? '12px 14px' : '16px 18px',
    boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: analysis ? 12 : 0,
  };

  const titleStyle = {
    fontSize: compact ? 13 : 15,
    fontWeight: 700,
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const badgeStyle = {
    fontSize: 9,
    fontWeight: 700,
    color: '#2563eb',
    background: '#eff6ff',
    padding: '2px 6px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const btnStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: hasCredits ? '#2563eb' : '#9ca3af',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: hasCredits ? 'pointer' : 'not-allowed',
    opacity: isLoading ? 0.7 : 1,
  };

  const analysisStyle = {
    fontSize: 13,
    lineHeight: '1.6',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    marginTop: 8,
  };

  const creditStyle = {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 8,
    display: 'flex',
    justifyContent: 'space-between',
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          {'\u2728'} {title}
          <span style={badgeStyle}>AI</span>
        </div>
        {!analysis && (
          <button
            style={btnStyle}
            onClick={() => mutation.mutate()}
            disabled={!hasCredits || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        )}
        {analysis && (
          <button
            style={{ ...btnStyle, background: '#6b7280', fontSize: 11 }}
            onClick={() => {
              setAnalysis(null);
              mutation.mutate();
            }}
            disabled={!hasCredits || isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {isError && (
        <div style={{ ...analysisStyle, color: '#c0392b' }}>
          {mutation.error?.response?.data?.error ||
            'Analysis failed. Please try again.'}
          {mutation.error?.response?.status === 402 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#c97d1a' }}>
              {'\u26A0'} AI credits exhausted.{' '}
              {budget?.credits_total <= 50
                ? 'Upgrade your plan for more analyses.'
                : 'Credits reset on the 1st of the month.'}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <>
          <div style={analysisStyle}>{analysis.analysis}</div>
          <div style={creditStyle}>
            <span>
              {analysis.credits_remaining} / {analysis.credits_total} credits
              remaining
            </span>
            <span>{analysis.tokens_used} tokens used</span>
          </div>
        </>
      )}

      {!analysis && !isError && !isLoading && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
          {hasCredits
            ? 'Click Analyze to get AI-powered insights on this data.'
            : 'No AI credits remaining. Upgrade your plan for more analyses.'}
        </div>
      )}
    </div>
  );
}
