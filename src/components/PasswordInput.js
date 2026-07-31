import React, { useState } from 'react';

/* Drop-in replacement for <input type="password" ... />.
   Accepts every prop a normal <input> would (value, onChange, style,
   className, placeholder, required, minLength, autoComplete, id, etc.)
   and renders an eye toggle to reveal/hide the value. Wraps in a
   position:relative span so it drops into existing layouts (flex rows,
   grids, block forms) without needing changes to the parent. */
export default function PasswordInput({ style, wrapperStyle, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: style?.width || '100%', ...wrapperStyle }}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        style={{ ...style, width: '100%', paddingRight: 34, boxSizing: 'border-box' }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 2,
          fontSize: 15, lineHeight: 1, color: '#6b7280',
        }}
      >
        {show ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}
      </button>
    </span>
  );
}