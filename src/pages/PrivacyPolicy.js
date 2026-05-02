import { Link } from 'react-router-dom';
import BackLink from '../components/BackLink';

const S = {
  wrapper: { minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { background: '#0D4A22', color: '#c97d1a', fontWeight: 800, fontSize: 16, padding: '8px 14px', borderRadius: 8, textDecoration: 'none', letterSpacing: 1 },
  body: { maxWidth: 780, margin: '0 auto', padding: '48px 24px 80px' },
  h1: { fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 8 },
  updated: { fontSize: 13, color: '#6b7280', marginBottom: 36 },
  h2: { fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 36, marginBottom: 10 },
  p: { fontSize: 14, lineHeight: 1.75, color: '#374151', marginBottom: 14 },
};

export default function PrivacyPolicy() {
  return (
    <div style={S.wrapper}>
      <nav style={S.nav}>
        <Link to="/" style={S.logo}>PEWIL</Link>
        <BackLink to="/" label="Back to home" />
      </nav>
      <div style={S.body}>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.updated}>Last updated: 15 April 2026</p>

        <h2 style={S.h2}>1. Introduction</h2>
        <p style={S.p}>At Pewil, we take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our farm management and retail POS platform. By using Pewil, you consent to the practices described in this policy.</p>

        <h2 style={S.h2}>2. Information We Collect</h2>
        <p style={S.p}>We collect information you provide directly: your name, email address, phone number, and business details during registration. We also collect operational data you enter into the platform, including farm records, livestock data, sales transactions, inventory records, financial entries, and employee information. We automatically collect technical data such as IP address, browser type, device information, and usage patterns to improve our Service.</p>

        <h2 style={S.h2}>3. How We Use Your Information</h2>
        <p style={S.p}>We use your information to provide and maintain the Service, process payments and manage subscriptions, send transactional emails (password resets, verification, receipts), provide AI-powered insights and recommendations based on your farm or business data, generate reports and analytics, and communicate important updates about the Service. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

        <h2 style={S.h2}>4. Data Storage and Security</h2>
        <p style={S.p}>Your data is stored securely on encrypted servers. We implement industry-standard security measures including HTTPS encryption for all data in transit, encrypted database storage, JWT-based authentication with role-based access control, optional two-factor authentication (TOTP), regular security audits, and automated backups. We retain your data for the duration of your active subscription and for 30 days after account termination to allow for data export.</p>

        <h2 style={S.h2}>5. Cookies</h2>
        <p style={S.p}>We use essential cookies to maintain your login session and ensure the Service functions correctly. We do not set tracking cookies unless you explicitly opt in via our cookie consent banner. If you opt in to analytics cookies, we use PostHog with memory-only persistence (no localStorage tracking) to understand usage patterns and improve the Service.</p>

        <h2 style={S.h2}>6. Third-Party Services</h2>
        <p style={S.p}>We integrate with the following third-party services to provide our Service: Pesepay for secure payment processing, PostHog for anonymized analytics (opt-in only), WhatsApp Business API for optional notification delivery, and email providers for transactional communications. Each of these services has its own privacy policy, and we encourage you to review them.</p>

        <h2 style={S.h2}>7. Data Export and Portability</h2>
        <p style={S.p}>You can export all your data at any time in CSV or JSON format using the Data Export feature in your account settings. This ensures you always have full control over your information and are not locked into our platform.</p>

        <h2 style={S.h2}>8. Your Rights</h2>
        <p style={S.p}>You have the right to access, correct, or delete your personal information at any time. You can update your profile through the Settings page, request data export, or contact us to request account deletion. We will respond to all data-related requests within 30 days.</p>

        <h2 style={S.h2}>9. Children's Privacy</h2>
        <p style={S.p}>Pewil is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete such information promptly.</p>

        <h2 style={S.h2}>10. Changes to This Policy</h2>
        <p style={S.p}>We may update this Privacy Policy from time to time. We will notify you of any material changes via email or in-app notification at least 14 days before they take effect. The "Last updated" date at the top of this page indicates when the policy was last revised.</p>

        <h2 style={S.h2}>11. Contact Us</h2>
        <p style={S.p}>If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us at privacy@pewil.org or support@pewil.org.</p>
      </div>
    </div>
  );
}
