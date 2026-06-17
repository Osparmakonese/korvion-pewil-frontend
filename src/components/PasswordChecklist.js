import { evaluatePassword } from '../utils/passwordPolicy';

// Live requirement checklist shown under a "new password" field.
// Renders nothing until the user has typed something.
export default function PasswordChecklist({ value, policy, show = true }) {
  if (!show || !value) return null;
  const items = evaluatePassword(value, policy);
  return (
    <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
      {items.map((it, i) => (
        <li
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11.5, lineHeight: 1.8,
            color: it.ok ? '#1a6b3a' : '#6b7280',
          }}
        >
          <span style={{ fontWeight: 700, width: 12, display: 'inline-block' }}>
            {it.ok ? '✓' : '○'}
          </span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}
