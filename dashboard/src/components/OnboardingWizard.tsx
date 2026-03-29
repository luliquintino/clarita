'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, User, UserPlus, CheckCircle } from 'lucide-react';

interface OnboardingWizardProps {
  userName: string;
  onComplete: () => void;
  apiUrl: string;
}

export default function OnboardingWizard({ userName, onComplete, apiUrl }: OnboardingWizardProps) {
  const t = useTranslations('onboarding');
  const [step, setStep] = useState(1);
  const [inviteDisplayId, setInviteDisplayId] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [completing, setCompleting] = useState(false);

  const totalSteps = 3;

  const handleInvite = async () => {
    if (!inviteDisplayId) return;
    try {
      await fetch(`${apiUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_id: inviteDisplayId }),
      });
    } catch {
      // Don't block onboarding if invite fails
    }
    setInviteSent(true);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await fetch(`${apiUrl}/auth/onboarding/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      onComplete();
    } catch {
      // Still complete on error — the wizard should not be stuck
      onComplete();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header with progress */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">{t('step_of', { step, total: totalSteps })}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6">
          {step === 1 && (
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('welcome_title', { name: userName })}</h2>
              <p className="text-gray-500 mb-6">
                {t('welcome_desc')}
              </p>
              <button type="button" onClick={() => setStep(2)} className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                {t('start')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('invite_title')}</h2>
              <p className="text-gray-500 mb-4">
                {t('invite_desc')}
              </p>
              {!inviteSent ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={t('invite_placeholder')}
                    value={inviteDisplayId}
                    onChange={e => setInviteDisplayId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={!inviteDisplayId}
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {t('invite_btn')}
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                    {t('skip_for_now')}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-4">{t('invite_sent')}</p>
                  <button type="button" onClick={() => setStep(3)} className="py-3 px-6 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                    {t('continue')} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('done_title')}</h2>
              <p className="text-gray-500 mb-6">
                {t('done_desc')}
              </p>
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {completing ? t('saving') : t('go_to_dashboard')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
