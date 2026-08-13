/**
 * ManagerPinPage.js — manager/owner-facing page to set or rotate the PIN
 * used for the in-POS approval gate (cash drop, variance close, void,
 * refund, price override, reprint).
 *
 * Without a PIN, the cashier's "Mgr ID + PIN" approval modal cannot succeed
 * for this manager — they'd need the password method instead. This page
 * fills that gap so managers can self-serve a numeric PIN that they can
 * quickly type on the POS screen when a cashier summons them.
 *
 * Backend: POST /retail/manager-pin/set/   (ManagerPinViewSet.set_pin)
 *          GET  /retail/manager-pin/status/ (ManagerPinViewSet.pin_status)
 *
 * Only users with role owner | manager can create a PIN (the backend
 * enforces this; we mirror the check on the client so the form doesn't
 * tease unprivileged users with a disabled submit).
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getManagerPinStatus,
  setManagerPin,
  getManagerApprovalCapabilities,
} from '../api/retailApi';

const MANAGER_ROLES = new Set(['owner', 'manager']);
const MIN_PIN = 4;
const MAX_PIN = 10;

const card = {
  background: '#fff',
  border: '1px solid #e3e8e4',
  borderRadius: 12,
  padding: 24,
  maxWidth: 560,
  boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)',
};

const label = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
  letterSpacing: 0.2,
};

const input = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 16,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  letterSpacing: '0.25em',
  boxSizing: 'border-box',
};

const btn = {
  padding: '10px 18px',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#065f46',
  color: '#fff',
};

const btnDisabled = { ...btn, background: '#9ca3af', cursor: 'not-allowed' };

export default function ManagerPinPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isManager = MANAGER_ROLES.has(user?.role);

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [flash, setFlash] = useState(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['retail-manager-pin-status'],
    queryFn: getManagerPinStatus,
    enabled: isManager,
  });

  // Show which approval methods the tenant has enabled so the manager knows
  // whether cashiers can currently use password OR just PIN.
  const { data: caps } = useQuery({
    queryKey: ['retail-manager-approval-capabilities'],
    queryFn: getManagerApprovalCapabilities,
    enabled: isManager,
  });

  const mut = useMutation({
    mutationFn: setManagerPin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retail-manager-pin-status'] });
      qc.invalidateQueries({ queryKey: ['retail-manager-approval-capabilities'] });
      setPin('');
      setConfirm('');
      setFlash({ ok: true, msg: 'PIN saved. Cashiers can now gate approvals with it.' });
      setTimeout(() => setFlash(null), 4000);
    },
    onError: (e) => {
      setFlash({ ok: false, msg: e?.response?.data?.detail || e?.message || 'Could not save PIN.' });
    },
  });

  if (!isManager) {
    return (
      <div style={{ padding: 24 }}>
        <div style={card}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Manager PIN</h2>
          <p style={{ color: '#6b7280', marginTop: 12 }}>
            Only owners and managers can set a PIN. Ask an owner to promote your
            account if you need to approve cashier-sensitive actions.
          </p>
        </div>
      </div>
    );
  }

  const numeric = /^\d*$/.test(pin) && /^\d*$/.test(confirm);
  const lengthOk = pin.length >= MIN_PIN && pin.length <= MAX_PIN;
  const match = pin === confirm;
  const valid = numeric && lengthOk && match;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    mut.mutate(pin);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={card}>
        <h2 style={{ margin: 0, fontSize: 20 }}>🔐 Your Manager PIN</h2>
        <p style={{ color: '#6b7280', marginTop: 8, marginBottom: 20, fontSize: 14 }}>
          Cashiers type your Manager ID + this PIN to unlock cash drops, voids,
          refunds, price overrides, and over-threshold variance closes. The PIN
          is hashed server-side. Five wrong attempts lock it for 15 minutes —
          password still works as a fallback.
        </p>

        {isLoading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : (
          <>
            <div style={{
              padding: 12,
              background: status?.has_pin ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${status?.has_pin ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 14,
            }}>
              {status?.has_pin ? (
                <>✅ You have a PIN set. Setting a new one below will replace it.</>
              ) : (
                <>⚠️ You don't have a PIN yet. Cashiers can only approve via your password until you set one.</>
              )}
            </div>

            <form onSubmit={submit}>
              <div style={{ marginBottom: 16 }}>
                <label style={label} htmlFor="new-pin">New PIN ({MIN_PIN}–{MAX_PIN} digits)</label>
                <input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={MAX_PIN}
                  placeholder="••••"
                  style={input}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={label} htmlFor="confirm-pin">Confirm PIN</label>
                <input
                  id="confirm-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  maxLength={MAX_PIN}
                  placeholder="••••"
                  style={input}
                />
              </div>

              {pin && !numeric && (
                <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                  PIN must be digits only.
                </div>
              )}
              {pin && numeric && !lengthOk && (
                <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                  PIN must be {MIN_PIN}–{MAX_PIN} digits.
                </div>
              )}
              {pin && confirm && !match && (
                <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
                  PINs don't match.
                </div>
              )}

              <button
                type="submit"
                style={valid && !mut.isPending ? btn : btnDisabled}
                disabled={!valid || mut.isPending}
              >
                {mut.isPending ? 'Saving…' : status?.has_pin ? 'Replace PIN' : 'Save PIN'}
              </button>

              {flash && (
                <div
                  role="status"
                  style={{
                    marginTop: 14,
                    padding: 10,
                    borderRadius: 8,
                    fontSize: 14,
                    background: flash.ok ? '#ecfdf5' : '#fef2f2',
                    color: flash.ok ? '#065f46' : '#991b1b',
                    border: `1px solid ${flash.ok ? '#a7f3d0' : '#fecaca'}`,
                  }}
                >
                  {flash.msg}
                </div>
              )}
            </form>
          </>
        )}

        {caps && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>
            <strong style={{ color: '#374151' }}>Tenant approval methods:</strong>{' '}
            Password {caps.methods?.password ? '✓' : '✗'} ·{' '}
            PIN {caps.methods?.pin ? '✓' : '✗'} ·{' '}
            WebAuthn {caps.methods?.webauthn ? '✓' : '✗ (coming soon)'}
            <div style={{ marginTop: 4 }}>
              Approval tokens expire after {caps.token_ttl_seconds}s and are one-shot.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
