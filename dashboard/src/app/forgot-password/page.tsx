'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-clarita-blue-200/30 blur-3xl animate-float" />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-clarita-purple-200/30 blur-3xl animate-float"
        style={{ animationDelay: '1.5s' }}
      />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Image
            src="/logo-clarita.png"
            alt="Clarita"
            width={120}
            height={96}
            className="mx-auto mb-3 drop-shadow-lg"
            priority
          />
          <p className="text-gray-500 text-sm font-light">{t('auth.mental_health_platform')}</p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8">
          {sent ? (
            <div className="text-center py-4 animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-clarita-green-100 to-clarita-green-200 rounded-full mb-4">
                <CheckCircle size={32} className="text-clarita-green-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('auth.email_sent_title')}</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {t('auth.email_sent_desc')}
              </p>
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl"
              >
                <ArrowLeft size={16} />
                {t('auth.back_to_login')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-clarita-blue-100 to-clarita-purple-100 rounded-2xl">
                  <Mail size={22} className="text-clarita-purple-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{t('auth.forgot_password')}</h2>
                  <p className="text-xs text-gray-400">{t('auth.forgot_password_subtitle')}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6 mt-4">
                {t('auth.forgot_password_desc')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl text-sm text-red-600 animate-fade-in flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
                    {t('auth.email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field py-3.5"
                    placeholder={t('auth.email_placeholder')}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base rounded-xl"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    t('auth.send_reset_link')
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-clarita-purple-500 hover:text-clarita-purple-600 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft size={14} />
                  {t('auth.back_to_login')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
