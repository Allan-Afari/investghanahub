/**
 * Terms of Service Page for InvestGhanaHub
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-display font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-dark-400 mb-8">
            Last updated: December 2024
          </p>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">1. Acceptance of Terms</h2>
            <p className="text-dark-300">
              By accessing and using InvestGhanaHub ("the Platform"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Platform.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">2. Eligibility</h2>
            <p className="text-dark-300 mb-4">To use InvestGhanaHub, you must:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Be a legal resident of Ghana or have valid documentation</li>
              <li>Complete KYC (Know Your Customer) verification</li>
              <li>Have a valid Ghana Card or equivalent identification</li>
              <li>Not be prohibited from using financial services under applicable law</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">3. Account Registration</h2>
            <p className="text-dark-300 mb-4">
              You agree to provide accurate, current, and complete information during registration. 
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities under your account.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">4. Investment Risks</h2>
            <div className="bg-ghana-red-500/10 border border-ghana-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-ghana-red-400 font-semibold">
                ⚠️ IMPORTANT: All investments carry risk. You may lose some or all of your invested capital.
              </p>
            </div>
            <p className="text-dark-300 mb-4">By using InvestGhanaHub, you acknowledge that:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Past performance is not indicative of future results</li>
              <li>Investment returns are not guaranteed</li>
              <li>You should only invest money you can afford to lose</li>
              <li>You should seek independent financial advice if needed</li>
              <li>Agricultural investments are subject to weather and market conditions</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">5. KYC Requirements</h2>
            <p className="text-dark-300 mb-4">
              In compliance with Ghana's Anti-Money Laundering regulations, all users must complete 
              KYC verification before making investments. This includes:
            </p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Valid Ghana Card number</li>
              <li>Proof of address</li>
              <li>Source of funds declaration</li>
              <li>Selfie verification (if required)</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">6. Fees and Charges</h2>
            <p className="text-dark-300 mb-4">The following fees may apply:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Deposit fees: Varies by payment method (Mobile Money, Card)</li>
              <li>Withdrawal fees: 1% of withdrawal amount</li>
              <li>Platform fees: Disclosed on each investment opportunity</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">7. Prohibited Activities</h2>
            <p className="text-dark-300 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Use the Platform for money laundering or fraudulent activities</li>
              <li>Provide false or misleading information</li>
              <li>Attempt to manipulate or game the system</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Access others' accounts without authorization</li>
            </ul>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">8. Dispute Resolution</h2>
            <p className="text-dark-300">
              Any disputes arising from use of the Platform shall be resolved through arbitration 
              in Accra, Ghana, in accordance with the laws of the Republic of Ghana.
            </p>
          </section>

          <section className="card mb-6">
            <h2 className="text-xl font-semibold mb-4 text-ghana-gold-500">9. Contact Us</h2>
            <p className="text-dark-300">
              For questions about these Terms, contact us at:<br />
              Email: legal@investghanahub.com<br />
              Address: Accra, Ghana
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

