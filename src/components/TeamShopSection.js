import React from 'react';

/**
 * TeamShopSection — one shop's block on the Team & Users screen.
 *
 * Why this exists
 * ---------------
 * The team screen used to be a single flat table. For a one-shop tenant that
 * is fine; the moment an owner opens a second branch it stops describing the
 * business at all — you cannot see who is at Avondale and who is at Msasa,
 * and a shop that has just been created is *invisible* until somebody happens
 * to be assigned to it.
 *
 * So the sections are driven by the SHOP list, not by the people list: a shop
 * with nobody in it still gets a block, with an empty state that asks the
 * owner to put someone in it.
 *
 * Purely presentational — the page owns the data and every mutation. Inline
 * styles only (house rule: no Tailwind).
 */

const shell = {
  background: '#fff',
  border: '1px solid #e3e8e4',
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)',
  marginBottom: 14,
};

const tag = (bg, color) => ({
  fontSize: 8,
  fontWeight: 700,
  padding: '3px 7px',
  borderRadius: 20,
  display: 'inline-block',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  background: bg,
  color,
});

export default function TeamShopSection({
  title,
  code = '',
  isHQ = false,
  managerName = '',
  note = '',
  count = 0,
  isMobile = false,
  emptyText = 'No one assigned yet.',
  emptyAction = null,
  accent = '#1a6b3a',
  children,
}) {
  const hasMeta = !!(managerName || note);

  return (
    <div style={{ ...shell, padding: isMobile ? '14px 14px 16px' : '16px 18px' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: hasMeta ? 5 : 12,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 3, background: accent, flexShrink: 0,
        }} />
        <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#111827' }}>
          {title}
        </span>
        {code ? <span style={tag('#f3f4f6', '#6b7280')}>{code}</span> : null}
        {isHQ ? <span style={tag('#e8f5ee', '#1a6b3a')}>HQ</span> : null}
        <span style={{
          marginLeft: isMobile ? 0 : 'auto',
          fontSize: 11,
          fontWeight: 600,
          color: '#6b7280',
        }}>
          {count === 1 ? '1 person' : `${count} people`}
        </span>
      </div>

      {hasMeta && (
        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55, marginBottom: 12 }}>
          {managerName ? (
            <span>Manager: <strong style={{ color: '#374151', fontWeight: 600 }}>{managerName}</strong></span>
          ) : null}
          {managerName && note ? <span> {'·'} </span> : null}
          {note}
        </div>
      )}

      {count === 0 ? (
        <div style={{
          border: '1px dashed #d7e0d9',
          borderRadius: 10,
          background: '#fafbfa',
          padding: '18px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: emptyAction ? 12 : 0 }}>
            {emptyText}
          </div>
          {emptyAction}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 10,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
