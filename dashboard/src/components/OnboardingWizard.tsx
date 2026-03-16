'use client';
import { useState } from 'react';
import { ChevronRight, User, Briefcase, UserPlus, CheckCircle } from 'lucide-react';

interface OnboardingWizardProps {
  userName: string;
  onComplete: () => void;
  token: string;
  apiUrl: string;
}

export default function OnboardingWizard({ userName, onComplete, token, apiUrl }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const totalSteps = 4;

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      await fetch(`${apiUrl}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_email: inviteEmail, relationship_type: 'therapy' }),
      });
    } catch {
      // Don't block onboarding if invite fails
    }
    setInviteSent(true);
  };

  const handleComplete = async () => {
    await fetch(`${apiUrl}/auth/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header with progress */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Passo {step} de {totalSteps}</span>
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Bem-vindo(a), {userName}! 👋</h2>
              <p className="text-gray-500 mb-6">
                Você está a poucos passos de ter seus primeiros pacientes monitorados no Clarita.
              </p>
              <button type="button" onClick={() => setStep(2)} className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                Começar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Como você vai usar o Clarita?</h2>
              <p className="text-gray-500 mb-4">Isso ajusta as funcionalidades disponíveis para você.</p>
              <div className="space-y-3 mb-6">
                {['Psicólogo(a)', 'Psiquiatra', 'Ambos'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Convide seu primeiro paciente</h2>
              <p className="text-gray-500 mb-4">
                Ele receberá um e-mail com o link para criar a conta.
              </p>
              {!inviteSent ? (
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="email@paciente.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={!inviteEmail}
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Enviar convite
                  </button>
                  <button type="button" onClick={() => setStep(4)} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
                    Pular por agora
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-4">Convite enviado!</p>
                  <button type="button" onClick={() => setStep(4)} className="py-3 px-6 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Tudo pronto! 🎉</h2>
              <p className="text-gray-500 mb-6">
                Seu paciente receberá o convite por e-mail. Quando ele criar a conta, você verá os dados no painel.
              </p>
              <button type="button" onClick={handleComplete} className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
                Ir para o painel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
