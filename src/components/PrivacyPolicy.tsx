import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Trash2, Download, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  const lastUpdated = 'January 2025';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <img src="/tradesync-logo.png" alt="TradeSync" className="h-8 rounded-lg" />
            <h1 className="text-xl font-semibold text-white">Privacy Policy</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-800/50 rounded-2xl p-6 md:p-8 border border-slate-700">
          <p className="text-slate-400 text-sm mb-8">Last updated: {lastUpdated}</p>

          {/* Introduction */}
          <section className="mb-8">
            <p className="text-slate-300 leading-relaxed">
              TradeSync ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and safeguard your information when you use our job management and accounting
              application.
            </p>
          </section>

          {/* What we collect */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-teal-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">What Data We Collect</h2>
            </div>
            <div className="space-y-3 text-slate-300">
              <p><strong className="text-white">Account Information:</strong> Email address and name when you create an account.</p>
              <p><strong className="text-white">Business Data:</strong> Jobs, quotes, invoices, customers, expenses, and materials you enter into the app.</p>
              <p><strong className="text-white">Photos & Documents:</strong> Receipt images, job site photos, and documents you upload.</p>
              <p><strong className="text-white">Usage Data:</strong> Basic analytics to improve the app experience.</p>
            </div>
          </section>

          {/* How we use it */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">How We Use Your Data</h2>
            </div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                To provide the TradeSync service and all its features
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                To sync your data across your devices
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                To send important service updates and notifications
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                To improve and develop new features
              </li>
            </ul>
            <p className="mt-4 text-slate-300 font-medium">
              We <span className="text-teal-400">never</span> sell your data to third parties.
            </p>
          </section>

          {/* Data storage */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Data Storage & Security</h2>
            </div>
            <div className="space-y-3 text-slate-300">
              <p>Your data is stored securely on Supabase servers with enterprise-grade security.</p>
              <p>All connections are encrypted using HTTPS/TLS.</p>
              <p>We use row-level security to ensure you can only access your own data.</p>
              <p>Photos and documents are stored in secure cloud storage with access controls.</p>
            </div>
          </section>

          {/* Your rights */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Download className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Your Rights</h2>
            </div>
            <div className="space-y-3 text-slate-300">
              <p><strong className="text-white">Data Export:</strong> You can export all your data at any time from the app settings.</p>
              <p><strong className="text-white">Data Deletion:</strong> You can delete your account and all associated data by contacting us.</p>
              <p><strong className="text-white">Data Access:</strong> You can request a copy of all data we hold about you.</p>
              <p><strong className="text-white">Correction:</strong> You can update or correct your information at any time within the app.</p>
            </div>
          </section>

          {/* Data retention */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Data Retention</h2>
            </div>
            <div className="space-y-3 text-slate-300">
              <p>We retain your data for as long as your account is active.</p>
              <p>If you delete your account, we will delete all your data within 30 days.</p>
              <p>We may retain anonymised, aggregated data for analytics purposes.</p>
            </div>
          </section>

          {/* Third parties */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Third-Party Services</h2>
            <div className="space-y-3 text-slate-300">
              <p>We use the following third-party services to provide our app:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-1">•</span>
                  <strong className="text-white">Supabase:</strong> Database and authentication
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-1">•</span>
                  <strong className="text-white">Google AI:</strong> Receipt scanning and AI features
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-1">•</span>
                  <strong className="text-white">Vercel:</strong> Web hosting
                </li>
              </ul>
              <p>These services have their own privacy policies and are GDPR compliant.</p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Contact Us</h2>
            </div>
            <div className="space-y-3 text-slate-300">
              <p>If you have any questions about this Privacy Policy or your data, please contact us:</p>
              <p className="text-teal-400 font-medium">support@tradesync.app</p>
            </div>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
            <p className="text-slate-300">
              We may update this Privacy Policy from time to time. We will notify you of any significant changes
              by posting the new Privacy Policy in the app and updating the "Last updated" date.
            </p>
          </section>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </main>
    </div>
  );
};
