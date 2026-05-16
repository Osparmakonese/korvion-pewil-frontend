import { Link } from 'react-router-dom';

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

export default function TermsOfService() {
  return (
    <div style={S.wrapper}>
      <nav style={S.nav}>
        <Link to="/" style={S.logo}>PEWIL</Link>
        <Link to="/" style={{ fontSize: 13, color: '#1a6b3a', textDecoration: 'none', fontWeight: 600 }}>Back to home</Link>
      </nav>
      <div style={S.body}>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.updated}>Last updated: 15 April 2026</p>

        <h2 style={S.h2}>1. Agreement to Terms</h2>
        <p style={S.p}>By accessing or using Pewil ("the Service"), a product of Korvion Solution (Pvt) Ltd ("Korvion Solution", "we", "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. These terms apply to all users, including farm owners, managers, workers, and retail operators.</p>

        <h2 style={S.h2}>2. Description of Service</h2>
        <p style={S.p}>Pewil is a multi-tenant software-as-a-service platform operated by Korvion Solution (Pvt) Ltd, providing farm management and retail point-of-sale tools. The Service includes, but is not limited to, field and livestock tracking, inventory management, financial reporting, AI-powered insights, billing and subscription management, and team collaboration features.</p>

        <h2 style={S.h2}>3. Account Registration</h2>
        <p style={S.p}>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>

        <h2 style={S.h2}>4. Subscription and Payment</h2>
        <p style={S.p}>Pewil offers a 30-day free trial for all new accounts. After the trial period, continued access requires a paid subscription. Payments are processed securely through Pesepay, supporting Visa, Mastercard, EcoCash, and OneMoney. Subscription fees are billed monthly and are non-refundable except where required by applicable law or at our sole discretion.</p>

        <h2 style={S.h2}>5. Data Ownership</h2>
        <p style={S.p}>You retain all ownership rights to the data you enter into the Service. We do not claim ownership of your farm records, sales data, financial information, or any other content you create within the platform. You may export your data at any time using the built-in export tools.</p>

        <h2 style={S.h2}>6. Acceptable Use</h2>
        <p style={S.p}>You agree not to use the Service for any unlawful purpose, to upload malicious code, to attempt to gain unauthorized access to other accounts or systems, to interfere with the Service's operation, or to resell access without our written permission.</p>

        <h2 style={S.h2}>7. Service Availability</h2>
        <p style={S.p}>We strive to maintain high availability but do not guarantee uninterrupted access. We may perform scheduled maintenance with reasonable notice. We are not liable for any downtime, data loss, or service interruptions caused by circumstances beyond our reasonable control.</p>

        <h2 style={S.h2}>8. Intellectual Property</h2>
        <p style={S.p}>The Service, including its design, code, branding, and documentation, is the property of Pewil and is protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Service for its intended purpose during your active subscription.</p>

        <h2 style={S.h2}>9. Limitation of Liability</h2>
        <p style={S.p}>To the maximum extent permitted by law, Pewil shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service.</p>

        <h2 style={S.h2}>10. Termination</h2>
        <p style={S.p}>Either party may terminate this agreement at any time. You may cancel your subscription through the Billing page. We may suspend or terminate your account if you violate these terms. Upon termination, you may export your data within 30 days, after which it may be permanently deleted.</p>

        <h2 style={S.h2}>11. Changes to Terms</h2>
        <p style={S.p}>We may update these terms from time to time. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Your continued use of the Service after changes take effect constitutes acceptance of the new terms.</p>

        <h2 style={S.h2}>12. Governing Law</h2>
        <p style={S.p}>These terms are governed by the laws of Zimbabwe. Any disputes arising from these terms shall be resolved in the courts of Harare, Zimbabwe.</p>

        <h2 style={S.h2}>13. Contact</h2>
        <p style={S.p}>If you have questions about these Terms of Service, please contact us at support@pewil.org. The Service is operated by Korvion Solution (Pvt) Ltd, registered in Zimbabwe, with its principal office in Harare.</p>
      </div>
    </div>
  );
}
