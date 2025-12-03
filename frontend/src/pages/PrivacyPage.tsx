/**
 * Privacy Policy Page for InvestGhanaHub
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-ghana-gold-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-ghana-gold-500" />
          </div>
          <h1 className="text-4xl font-display font-bold">Privacy Policy</h1>
        </div>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-dark-400 mb-8">
            Last updated: December 2024
          </p>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">1. Introduction</h2>
            <p className="text-dark-300">
              InvestGhanaHub ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our platform.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">2. Information We Collect</h2>
            <p className="text-dark-300 mb-4">We collect the following types of information:</p>
            
            <h3 className="text-lg font-medium mb-2 text-dark-200">Personal Information</h3>
            <ul className="list-disc list-inside text-dark-300 space-y-2 mb-4">
              <li>Full name and date of birth</li>
              <li>Ghana Card number (encrypted)</li>
              <li>Email address and phone number</li>
              <li>Residential address</li>
              <li>Occupation and source of funds</li>
              <li>Profile photograph and ID documents</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 text-dark-200">Financial Information</h3>
            <ul className="list-disc list-inside text-dark-300 space-y-2 mb-4">
              <li>Investment history and portfolio</li>
              <li>Transaction records</li>
              <li>Mobile money account details (for payments)</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 text-dark-200">Technical Information</h3>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Usage patterns and preferences</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">3. How We Use Your Information</h2>
            <p className="text-dark-300 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Verify your identity (KYC compliance)</li>
              <li>Process investments and transactions</li>
              <li>Send important account notifications</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal and regulatory requirements</li>
              <li>Improve our services and user experience</li>
              <li>Provide customer support</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">4. Data Security</h2>
            <div className="bg-ghana-green-500/10 border border-ghana-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-ghana-green-400">
                🔒 Your Ghana Card number is encrypted using AES-256 encryption and never stored in plain text.
              </p>
            </div>
            <p className="text-dark-300 mb-4">We implement security measures including:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>SSL/TLS encryption for all data transmission</li>
              <li>AES-256 encryption for sensitive data at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication protocols</li>
              <li>Secure data centers with 24/7 monitoring</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">5. Data Sharing</h2>
            <p className="text-dark-300 mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Payment processors (Paystack) for transaction processing</li>
              <li>Regulatory authorities when required by law</li>
              <li>Business partners (with your consent)</li>
              <li>Service providers who assist our operations</li>
            </ul>
            <p className="text-dark-300 mt-4">
              We do NOT sell your personal information to third parties.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">6. Your Rights</h2>
            <p className="text-dark-300 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account</li>
              <li>Withdraw consent for marketing communications</li>
              <li>Lodge a complaint with the Data Protection Commission</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">7. Data Retention</h2>
            <p className="text-dark-300">
              We retain your personal information for as long as your account is active or as needed 
              to provide services. Financial records are retained for 7 years as required by Ghana's 
              financial regulations. You may request deletion of your account, subject to legal 
              retention requirements.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">8. Cookies</h2>
            <p className="text-dark-300">
              We use cookies and similar technologies to enhance your experience, analyze usage, 
              and assist in our marketing efforts. You can control cookie settings through your 
              browser preferences.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">9. Children's Privacy</h2>
            <p className="text-dark-300">
              Our services are not intended for users under 18 years of age. We do not knowingly 
              collect information from children. If you believe we have collected information from 
              a minor, please contact us immediately.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">10. Changes to This Policy</h2>
            <p className="text-dark-300">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes via email or through the Platform. Your continued use after 
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">11. Contact Us</h2>
            <p className="text-dark-300">
              For privacy-related questions or to exercise your rights, contact our Data Protection Officer:<br /><br />
              Email: privacy@investghanahub.com<br />
              Address: Accra, Ghana<br />
              Phone: +233 XX XXX XXXX
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">12. Regulatory Compliance</h2>
            <p className="text-dark-300">
              This policy complies with Ghana's Data Protection Act, 2012 (Act 843) and other 
              applicable data protection regulations.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

