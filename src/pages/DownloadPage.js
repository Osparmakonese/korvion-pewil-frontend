import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InstallDesktopButton from '../components/InstallDesktopButton';

/**
 * DownloadPage — explains how to install Pewil as a desktop app.
 *
 * Strategy: Pewil installs via PWA (progressive web app). Chrome, Edge,
 * Brave, Opera, and Arc all support a one-click install that puts a
 * native window + dock/taskbar/start-menu icon on the user's machine.
 * Safari and Firefox don't support PWA install on desktop yet, so we
 * show instructions for those visitors instead.
 *
 * No `.exe`, no `.dmg` to download today — the browser does the install.
 * The download page is the canonical "how do I get this on my desktop"
 * destination linked from the landing pages and footer.
 *
 * Future: when the Electron installers (in `pewil-desktop/`) ship via
 * GitHub Releases, this page gets a "Native installer (Windows/Mac/Linux)"
 * section above the PWA path.
 */

const COLORS = {
  ink: '#111827', muted: '#6b7280', line: '#e5e7eb',
  farm: '#1a6b3a', farmDark: '#0d4a22', farmSoft: '#e8f5ee',
  retail: '#c77700', retailSoft: '#fff4e1',
};
const SERIF = "'Playfair Display', Georgia, serif";
const SANS  = "'Inter', system-ui, -apple-system, sans-serif";

const CSS = `
  .dl-root{font-family:${SANS};color:${COLORS.ink};background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100vh}
  .dl-root *{box-sizing:border-box}
  .dl-root a{color:${COLORS.ink};text-decoration:none}
  .dl-serif{font-family:${SERIF};letter-spacing:-0.02em}

  /* nav */
  .dl-nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.94);backdrop-filter:blur(12px);border-bottom:1px solid ${COLORS.line}}
  .dl-nav-in{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:16px 32px}
  .dl-brand{font-family:${SERIF};font-weight:800;font-size:22px;display:inline-flex;align-items:center;gap:10px;color:${COLORS.ink}}
  .dl-brand-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,${COLORS.farm} 40%,${COLORS.retail} 60%);box-shadow:0 0 0 3px rgba(26,107,58,0.12)}
  .dl-nav-back{font-size:13px;color:${COLORS.muted};font-weight:500}
  .dl-nav-back:hover{color:${COLORS.ink}}

  /* hero */
  .dl-hero{padding:80px 32px 56px;text-align:center;background:radial-gradient(ellipse 60% 40% at 30% 20%,${COLORS.farmSoft},transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,${COLORS.retailSoft},transparent 60%),#fff}
  .dl-hero-in{max-width:780px;margin:0 auto}
  .dl-eye{font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:${COLORS.farm};margin-bottom:14px}
  .dl-hero h1{font-family:${SERIF};font-size:54px;line-height:1.06;font-weight:700;margin:0 0 22px;color:${COLORS.ink};letter-spacing:-0.02em}
  .dl-hero h1 em{font-style:normal;color:${COLORS.farm}}
  .dl-hero p{font-size:18px;color:#374151;line-height:1.6;max-width:640px;margin:0 auto 36px}

  .dl-cta-row{display:inline-flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center}
  .dl-cta{padding:15px 28px;border-radius:999px;background:${COLORS.farm};color:#fff;border:none;cursor:pointer;font-family:${SANS};font-size:15px;font-weight:700;box-shadow:0 10px 24px -8px rgba(26,107,58,0.45);transition:transform .15s,background .15s}
  .dl-cta:hover{transform:translateY(-2px);background:${COLORS.farmDark}}
  .dl-os-hint{font-size:13px;color:${COLORS.muted}}

  /* body sections */
  .dl-section{max-width:1040px;margin:0 auto;padding:56px 32px}
  .dl-section h2{font-family:${SERIF};font-size:32px;font-weight:700;margin:0 0 12px;color:${COLORS.ink};letter-spacing:-0.02em}
  .dl-section p.lead{font-size:15.5px;color:${COLORS.muted};margin:0 0 32px;line-height:1.65;max-width:680px}

  /* browser grid */
  .dl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
  .dl-card{background:#fff;border:1px solid ${COLORS.line};border-radius:18px;padding:26px 28px;transition:transform .25s,box-shadow .25s,border-color .25s}
  .dl-card:hover{transform:translateY(-3px);box-shadow:0 14px 32px rgba(0,0,0,0.06);border-color:${COLORS.farm}}
  .dl-card-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  .dl-card-icon{font-size:24px;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;background:${COLORS.farmSoft};color:${COLORS.farm}}
  .dl-card h3{font-family:${SERIF};font-weight:700;font-size:20px;margin:0;color:${COLORS.ink}}
  .dl-card-sub{font-size:11.5px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-top:2px}
  .dl-card ol{margin:0;padding:0 0 0 20px;font-size:14px;line-height:1.7;color:#374151}
  .dl-card ol li{margin-bottom:4px}
  .dl-card kbd{background:#f3f4f6;border:1px solid ${COLORS.line};border-bottom-width:2px;padding:1px 6px;border-radius:4px;font-family:${SANS};font-size:12px;font-weight:600;color:${COLORS.ink}}

  /* faq */
  .dl-faq{display:flex;flex-direction:column;gap:14px;max-width:780px}
  .dl-faq-item{background:#f9fafb;border:1px solid ${COLORS.line};border-radius:14px;padding:18px 22px}
  .dl-faq-q{font-family:${SERIF};font-weight:700;font-size:16px;color:${COLORS.ink};margin:0 0 6px}
  .dl-faq-a{font-size:14px;color:#374151;line-height:1.65;margin:0}

  /* footer */
  .dl-foot{background:#f9fafb;border-top:1px solid ${COLORS.line};padding:32px;text-align:center;font-size:13px;color:${COLORS.muted}}
  .dl-foot a{color:${COLORS.ink};font-weight:600;border-bottom:1px solid ${COLORS.line}}

  @media (max-width:760px){
    .dl-hero{padding:48px 22px 40px}
    .dl-hero h1{font-size:36px}
    .dl-hero p{font-size:15px}
    .dl-section{padding:36px 22px}
    .dl-section h2{font-size:24px}
    .dl-grid{grid-template-columns:1fr}
    .dl-cta{padding:13px 22px;font-size:14px}
  }
`;

function detectOS() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  return 'your device';
}

export default function DownloadPage() {
  const [os, setOs] = useState('your device');

  useEffect(() => {
    setOs(detectOS());
    const prev = document.title;
    document.title = 'Install Pewil for Desktop — Korvion Solution';
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="dl-root">
      <style>{CSS}</style>

      <nav className="dl-nav">
        <div className="dl-nav-in">
          <Link to="/" className="dl-brand">
            <span className="dl-brand-dot" />
            Pewil
          </Link>
          <Link to="/" className="dl-nav-back">&larr; Back to home</Link>
        </div>
      </nav>

      <section className="dl-hero">
        <div className="dl-hero-in">
          <div className="dl-eye">Install Pewil for Desktop</div>
          <h1 className="dl-serif">
            Pewil, in its <em>own window</em> on {os}.
          </h1>
          <p>
            Install Pewil as a desktop app and get a dedicated window, a dock or
            taskbar icon, and the same fast POS + farm experience &mdash; no browser tabs,
            no distractions. One click on Chrome, Edge, Brave, or Arc.
          </p>
          <div className="dl-cta-row">
            <InstallDesktopButton className="dl-cta" label="Install Pewil for Desktop" />
            <span className="dl-os-hint">Detected: <strong>{os}</strong></span>
          </div>
        </div>
      </section>

      <section className="dl-section">
        <h2 className="dl-serif">How to install &mdash; pick your browser</h2>
        <p className="lead">
          The install button above works automatically on Chrome, Edge, Brave, and Arc.
          For Safari and Firefox, follow the manual steps below.
        </p>
        <div className="dl-grid">
          <div className="dl-card">
            <div className="dl-card-head">
              <span className="dl-card-icon">🌐</span>
              <div>
                <h3>Chrome / Edge / Brave</h3>
                <div className="dl-card-sub">Windows · Mac · Linux · ChromeOS</div>
              </div>
            </div>
            <ol>
              <li>Click <strong>Install Pewil for Desktop</strong> above (or look for the install icon in the URL bar).</li>
              <li>Confirm in the browser dialog.</li>
              <li>Pewil opens in its own window with a dock/taskbar icon.</li>
            </ol>
          </div>

          <div className="dl-card">
            <div className="dl-card-head">
              <span className="dl-card-icon">🍎</span>
              <div>
                <h3>Safari on Mac</h3>
                <div className="dl-card-sub">macOS Sonoma or newer</div>
              </div>
            </div>
            <ol>
              <li>Open <strong>pewil.org</strong> in Safari.</li>
              <li>From the menu bar choose <strong>File &rarr; Add to Dock&hellip;</strong></li>
              <li>Name it &quot;Pewil&quot; and click <strong>Add</strong>.</li>
              <li>Launch Pewil from your dock like any native app.</li>
            </ol>
          </div>

          <div className="dl-card">
            <div className="dl-card-head">
              <span className="dl-card-icon">🦊</span>
              <div>
                <h3>Firefox</h3>
                <div className="dl-card-sub">Workaround &mdash; PWA install is limited</div>
              </div>
            </div>
            <ol>
              <li>Firefox desktop doesn&apos;t natively support PWA install.</li>
              <li>Install <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer">Chrome</a> or <a href="https://www.microsoft.com/edge" target="_blank" rel="noopener noreferrer">Edge</a> and open pewil.org &mdash; one click installs.</li>
              <li>Or keep using pewil.org in Firefox &mdash; everything works in the browser too.</li>
            </ol>
          </div>

          <div className="dl-card">
            <div className="dl-card-head">
              <span className="dl-card-icon">📱</span>
              <div>
                <h3>Phone or tablet</h3>
                <div className="dl-card-sub">iOS · Android</div>
              </div>
            </div>
            <ol>
              <li><strong>iPhone/iPad:</strong> Open in Safari &rarr; tap the Share button &rarr; <strong>Add to Home Screen</strong>.</li>
              <li><strong>Android:</strong> Open in Chrome &rarr; tap the three-dot menu &rarr; <strong>Install app</strong>.</li>
              <li>Pewil appears on your home screen like any other app.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="dl-section">
        <h2 className="dl-serif">Common questions</h2>
        <div className="dl-faq">
          <div className="dl-faq-item">
            <p className="dl-faq-q">Do I need an internet connection?</p>
            <p className="dl-faq-a">
              Yes &mdash; the desktop version of Pewil today is the same web app in a dedicated window, so it needs internet
              to talk to the Pewil servers. A fully offline-capable cashier mode is on the Korvion Solution roadmap.
            </p>
          </div>
          <div className="dl-faq-item">
            <p className="dl-faq-q">Is this a real installer?</p>
            <p className="dl-faq-a">
              It&apos;s a Progressive Web App (PWA) install &mdash; the browser packages Pewil so it gets its own window, icon,
              and start-menu entry. No <code>.exe</code> or <code>.dmg</code> file to download. You can uninstall it
              from your OS just like any other application.
            </p>
          </div>
          <div className="dl-faq-item">
            <p className="dl-faq-q">Does it auto-update?</p>
            <p className="dl-faq-a">
              Yes. When Pewil releases a new version, the installed app picks it up the next time it&apos;s opened &mdash; no
              manual upgrade step.
            </p>
          </div>
          <div className="dl-faq-item">
            <p className="dl-faq-q">Can I install it on a shared workstation?</p>
            <p className="dl-faq-a">
              Yes &mdash; install it under each cashier&apos;s OS account. Each install keeps its own session, so cashiers sign in
              to their own Pewil and don&apos;t see each other&apos;s till.
            </p>
          </div>
        </div>
      </section>

      <footer className="dl-foot">
        <p>
          Pewil is a <Link to="/">Korvion Solution</Link> product. Still on a phone?
          {' '}<Link to="/">Open pewil.org</Link> in your mobile browser and tap &quot;Add to Home Screen&quot;.
        </p>
      </footer>
    </div>
  );
}
