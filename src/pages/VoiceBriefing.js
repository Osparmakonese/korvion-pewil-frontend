/**
 * Pewil Farm — Trilingual Voice Briefing
 *
 * Magic: one tap and Claude generates a 45-60s morning briefing spoken in
 * English, Shona, or Ndebele — tailored to YOUR yesterday (harvest, water,
 * expenses, revenue) and today's workers. Use the Play button to hear it,
 * or Copy-to-WhatsApp to send the translation to your foreman.
 *
 * Browser TTS (Web Speech API) plays whichever version has a matching voice
 * installed locally. Real Shona/Ndebele audio will arrive once we wire
 * Cartesia in a follow-up (see docs/Pewil_Voice_Briefing_Spec.md).
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVoiceBriefing, getAIBudget } from '../api/aiApi';

const GREEN = '#1a6b3a';
const GREEN_TINT = '#e8f5ee';
const AMBER = '#c97d1a';
const RED = '#c0392b';
const INK = '#111827';
const INK_3 = '#6b7280';
const BORDER = '#e3e8e4';
const SURFACE = '#f6f8f6';

const card = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)',
};
const label = {
  fontSize: 11, fontWeight: 700, color: INK_3,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
};
const btn = {
  padding: '10px 18px', borderRadius: 8, border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
};

const LANGS = [
  { key: 'english', label: 'English', flag: '\u{1F1FA}\u{1F1F8}', bcp: 'en-ZW' },
  { key: 'shona',   label: 'Shona',   flag: '\u{1F1FF}\u{1F1FC}', bcp: 'sn-ZW' },
  { key: 'ndebele', label: 'Ndebele', flag: '\u{1F1FF}\u{1F1FC}', bcp: 'nr-ZW' },
];

const fmtMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : '—';
};
const fmtKg = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `${v.toFixed(0)} kg` : '—';
};

function pickVoice(bcp) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  // Exact match first
  const exact = voices.find((v) => v.lang && v.lang.toLowerCase() === bcp.toLowerCase());
  if (exact) return exact;
  // Prefix match (e.g. en-US when we asked for en-ZW)
  const prefix = bcp.split('-')[0].toLowerCase();
  const pref = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
  if (pref) return pref;
  // Fall back to English so the user still hears SOMETHING
  return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en')) || null;
}

export default function VoiceBriefing({ onTabChange }) {
  const qc = useQueryClient();
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);

  const { data: budget } = useQuery({
    queryKey: ['aiBudget'],
    queryFn: getAIBudget,
    staleTime: 60_000,
  });

  // Some browsers populate voices async — subscribe once
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const check = () => setVoicesReady((window.speechSynthesis.getVoices() || []).length > 0);
    check();
    window.speechSynthesis.addEventListener?.('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', check);
  }, []);

  const generate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await getVoiceBriefing();
      if (!r.parsed) {
        setError('AI returned a response we could not parse. Tap Generate to try again.');
      } else {
        setResult(r);
      }
      qc.invalidateQueries({ queryKey: ['aiBudget'] });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to generate briefing.');
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const play = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Your browser does not support speech playback. Copy the text to WhatsApp instead.');
      return;
    }
    const text = result?.parsed?.[language];
    if (!text) return;
    stop();
    const utter = new window.SpeechSynthesisUtterance(text);
    const lang = LANGS.find((l) => l.key === language);
    utter.lang = lang?.bcp || 'en-ZW';
    const voice = pickVoice(utter.lang);
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const copyToClipboard = async () => {
    const text = result?.parsed?.[language];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_e) {
      // Fallback — ignore; most browsers will have allowed the write above
    }
  };

  const waShare = () => {
    const text = result?.parsed?.[language];
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const parsed = result?.parsed || null;
  const kpis = parsed?.kpis || null;
  const tone = parsed?.tone || 'calm';
  const toneStyle = useMemo(() => {
    if (tone === 'alert') return { bg: '#fde8e8', fg: RED, label: 'Alert briefing' };
    if (tone === 'celebrate') return { bg: GREEN_TINT, fg: GREEN, label: 'Celebrate' };
    return { bg: SURFACE, fg: INK_3, label: 'Calm morning briefing' };
  }, [tone]);

  return (
    <div style={{ padding: 24, background: SURFACE, minHeight: '100%' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 30, fontWeight: 700, color: INK }}>
            Morning Voice Briefing
          </div>
          <div style={{ color: INK_3, fontSize: 14, marginTop: 4 }}>
            45-60 seconds of your farm's state in English, Shona, or Ndebele — powered by AI.
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          {/* LEFT — briefing area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Generate card */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={label}>Step 1 — generate</div>
                  <div style={{ fontSize: 14, color: INK_3, marginTop: 4 }}>
                    Tap once. Claude reads yesterday's activity and composes your briefing.
                  </div>
                </div>
                <button
                  style={{ ...btn, background: GREEN, color: '#fff', opacity: loading ? 0.6 : 1 }}
                  onClick={generate}
                  disabled={loading}
                >
                  {loading ? 'Composing\u2026' : '\u{1F3A4} Generate briefing'}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 12, padding: 10, background: '#fde8e8', color: RED, borderRadius: 8, fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Result */}
            {parsed && (
              <>
                {/* KPI strip */}
                {kpis && (
                  <div style={{ ...card, padding: 14 }}>
                    <div style={label}>Yesterday at a glance</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 8 }}>
                      <Metric label="Revenue" value={fmtMoney(kpis.yesterday_revenue)} color={GREEN} />
                      <Metric label="Expenses" value={fmtMoney(kpis.yesterday_expense)} color={RED} />
                      <Metric label="Harvest" value={fmtKg(kpis.yesterday_harvest_kg)} color={INK} />
                      <Metric label="Week net" value={fmtMoney(kpis.week_net)} color={Number(kpis.week_net) >= 0 ? GREEN : RED} />
                    </div>
                  </div>
                )}

                {/* Language tabs + transcript */}
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={label}>Step 2 — listen or share</div>
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: toneStyle.bg, color: toneStyle.fg,
                    }}>
                      {toneStyle.label}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
                    {LANGS.map((lg) => (
                      <button
                        key={lg.key}
                        onClick={() => setLanguage(lg.key)}
                        style={{
                          padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          background: 'none', border: 'none',
                          borderBottom: language === lg.key ? `3px solid ${GREEN}` : '3px solid transparent',
                          color: language === lg.key ? GREEN : INK_3,
                        }}
                      >
                        <span style={{ marginRight: 6 }}>{lg.flag}</span>{lg.label}
                      </button>
                    ))}
                  </div>

                  {/* Transcript */}
                  <div style={{
                    padding: 18, background: SURFACE, borderRadius: 10,
                    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 17, lineHeight: 1.55,
                    color: INK, whiteSpace: 'pre-wrap', minHeight: 120,
                  }}>
                    {parsed[language] || '—'}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    {!speaking ? (
                      <button style={{ ...btn, background: GREEN, color: '#fff' }} onClick={play}>
                        {'\u25B6\uFE0F'}  Play
                      </button>
                    ) : (
                      <button style={{ ...btn, background: RED, color: '#fff' }} onClick={stop}>
                        {'\u23F9'}  Stop
                      </button>
                    )}
                    <button style={{ ...btn, background: '#fff', color: INK, border: `1px solid ${BORDER}` }} onClick={copyToClipboard}>
                      {'\u{1F4CB}'}  Copy text
                    </button>
                    <button style={{ ...btn, background: '#25D366', color: '#fff' }} onClick={waShare}>
                      {'\u{1F4AC}'}  Send to WhatsApp
                    </button>
                  </div>

                  {!voicesReady && (
                    <div style={{ marginTop: 10, fontSize: 12, color: INK_3 }}>
                      Tip: if Play is silent, your browser has no voice installed for {LANGS.find((l) => l.key === language)?.label}.
                      Try Chrome on Android for the widest language support, or use "Send to WhatsApp" to forward the text.
                    </div>
                  )}
                </div>

                {/* Priority */}
                {parsed.priority && (
                  <div style={{ ...card, background: GREEN_TINT, borderColor: GREEN }}>
                    <div style={{ ...label, color: GREEN }}>Today's priority</div>
                    <div style={{ fontSize: 15, color: INK, marginTop: 4 }}>{parsed.priority}</div>
                  </div>
                )}
              </>
            )}

            {!parsed && !loading && (
              <div style={{ ...card, textAlign: 'center', color: INK_3, padding: 40 }}>
                Tap <strong style={{ color: GREEN }}>Generate briefing</strong> to hear your morning update.
              </div>
            )}
          </div>

          {/* RIGHT sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* AI credits */}
            <div style={card}>
              <div style={label}>AI credits</div>
              <div style={{ fontSize: 28, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontWeight: 700, color: GREEN }}>
                {budget?.credits_remaining ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: INK_3 }}>
                remaining of {budget?.credits_total ?? '—'} this month
              </div>
              <div style={{ fontSize: 12, color: INK_3, marginTop: 8 }}>
                Each briefing costs 2 credits.
              </div>
            </div>

            {/* How it works */}
            <div style={card}>
              <div style={label}>How it works</div>
              <ol style={{ paddingLeft: 16, fontSize: 13, color: INK_3, lineHeight: 1.6 }}>
                <li>We pull yesterday's harvest, water, expenses, revenue.</li>
                <li>Claude composes a 45-60s briefing in three languages.</li>
                <li>Tap Play or forward the text to WhatsApp.</li>
              </ol>
            </div>

            <div style={{ ...card, background: GREEN_TINT, borderColor: GREEN }}>
              <div style={{ ...label, color: GREEN }}>Why this is magic</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>
                No other farm app speaks Shona or Ndebele. Your foreman gets
                the brief in the language they think in — no translation
                friction.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label: lbl, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: INK_3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{lbl}</div>
      <div style={{ fontSize: 20, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontWeight: 700, color, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
