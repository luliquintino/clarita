'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  MapPin,
  Activity,
  Baby,
  ClipboardList,
  Check,
  Shield,
  Mail,
  Droplets,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import { onboardingApi, isAuthenticated, getUserRoleFromToken } from '@/lib/api';

// Brazilian states for select
const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  cpf: string;
  rg: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  weight_kg: string;
  height_cm: string;
  current_symptoms: string;
  allergies: string;
  chronic_conditions: string;
  last_menstruation_date: string;
  pregnancy_history: string;
  abortion_history: string;
  family_history: string;
  current_treatments: string;
  blood_type: string;
}

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const INITIAL_FORM: FormData = {
  full_name: '',
  email: '',
  phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  cpf: '',
  rg: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip: '',
  weight_kg: '',
  height_cm: '',
  current_symptoms: '',
  allergies: '',
  chronic_conditions: '',
  last_menstruation_date: '',
  pregnancy_history: '',
  abortion_history: '',
  family_history: '',
  current_treatments: '',
  blood_type: '',
};

interface StepDef {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ALL_STEPS: StepDef[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo(a) ao Clarita',
    description: 'Vamos completar seu perfil de saúde',
    icon: <Sparkles size={22} />,
  },
  {
    id: 'personal',
    title: 'Dados Pessoais',
    description: 'Informações de contato e identificação',
    icon: <User size={22} />,
  },
  {
    id: 'address',
    title: 'Endereço',
    description: 'Seu endereço residencial',
    icon: <MapPin size={22} />,
  },
  {
    id: 'health',
    title: 'Saúde',
    description: 'Informações sobre sua saúde física',
    icon: <Activity size={22} />,
  },
  {
    id: 'gynecological',
    title: 'Saúde Feminina',
    description: 'Informações ginecológicas',
    icon: <Baby size={22} />,
  },
  {
    id: 'history',
    title: 'Histórico & Tratamentos',
    description: 'Informações complementares de saúde',
    icon: <FileText size={22} />,
  },
  {
    id: 'review',
    title: 'Revisão',
    description: 'Confira suas informações e finalize',
    icon: <ClipboardList size={22} />,
  },
];

// ---------------------------------------------------------------------------
// CPF Mask: 123.456.789-00
// ---------------------------------------------------------------------------
function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// ---------------------------------------------------------------------------
// Phone Mask: (11) 99999-9999
// ---------------------------------------------------------------------------
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ---------------------------------------------------------------------------
// CEP Mask: 01310-100
// ---------------------------------------------------------------------------
function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  // Compute active steps based on gender
  const steps = ALL_STEPS.filter(
    (s) => s.id !== 'gynecological' || gender === 'female' || gender === 'feminino'
  );

  const totalSteps = steps.length;
  const currentStep = steps[step];
  const isLastStep = step === totalSteps - 1;

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const role = getUserRoleFromToken();
    if (role !== 'patient') {
      router.replace('/patients');
      return;
    }

    (async () => {
      try {
        const { profile } = await onboardingApi.get();
        if (profile.onboarding_completed) {
          router.replace('/patient-home');
          return;
        }
        // Pre-fill from existing data
        if (profile.gender) setGender(profile.gender);
        if (profile.phone) update('phone', profile.phone);
        if (profile.emergency_contact_name)
          update('emergency_contact_name', profile.emergency_contact_name);
        if (profile.emergency_contact_phone)
          update('emergency_contact_phone', profile.emergency_contact_phone);

        // Pre-fill from onboarding_data if partially saved
        const d = profile.onboarding_data;
        if (d?.personal) {
          if (d.personal.cpf) update('cpf', d.personal.cpf);
          if (d.personal.rg) update('rg', d.personal.rg);
          if (d.personal.address) {
            const a = d.personal.address;
            setForm((prev) => ({
              ...prev,
              street: a.street || '',
              number: a.number || '',
              complement: a.complement || '',
              neighborhood: a.neighborhood || '',
              city: a.city || '',
              state: a.state || '',
              zip: a.zip || '',
            }));
          }
        }
        if (d?.physical) {
          setForm((prev) => ({
            ...prev,
            weight_kg: d.physical?.weight_kg || '',
            height_cm: d.physical?.height_cm || '',
          }));
        }
        if (d?.gynecological) {
          setForm((prev) => ({
            ...prev,
            last_menstruation_date: d.gynecological?.last_menstruation_date || '',
            pregnancy_history: d.gynecological?.pregnancy_history || '',
            abortion_history: d.gynecological?.abortion_history || '',
          }));
        }
        if (d?.medical) {
          setForm((prev) => ({
            ...prev,
            current_symptoms: d.medical?.current_symptoms || '',
            allergies: d.medical?.allergies || '',
            chronic_conditions: d.medical?.chronic_conditions || '',
            blood_type: d.medical?.blood_type || prev.blood_type,
          }));
        }
        if (d?.family_history) update('family_history', d.family_history);
        if (d?.current_treatments) update('current_treatments', d.current_treatments);

        // Get user name and email from auth
        try {
          const { authApi } = await import('@/lib/api');
          const meRes = await authApi.me();
          const fullName = [meRes.user.first_name, meRes.user.last_name].filter(Boolean).join(' ');
          setUserName(meRes.user.first_name);
          setForm((prev) => ({
            ...prev,
            full_name: prev.full_name || fullName,
            email: prev.email || meRes.user.email || '',
          }));
        } catch {
          /* ignore */
        }
      } catch {
        // If onboarding endpoint fails, still show form
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
      setError('');
    }
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setError('');
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await onboardingApi.submit({
        personal: {
          cpf: form.cpf,
          rg: form.rg,
          address: {
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            zip: form.zip,
          },
        },
        physical: {
          weight_kg: form.weight_kg,
          height_cm: form.height_cm,
        },
        gynecological: {
          last_menstruation_date: form.last_menstruation_date,
          pregnancy_history: form.pregnancy_history,
          abortion_history: form.abortion_history,
        },
        medical: {
          current_symptoms: form.current_symptoms,
          allergies: form.allergies,
          chronic_conditions: form.chronic_conditions,
          blood_type: form.blood_type,
        },
        family_history: form.family_history,
        current_treatments: form.current_treatments,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
      });
      router.push('/patient-home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-clarita-green-500" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const progressPercent = Math.round((step / (totalSteps - 1)) * 100);

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8">
      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-clarita-green-200/30 blur-3xl animate-float" />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-clarita-purple-200/30 blur-3xl animate-float"
        style={{ animationDelay: '1.5s' }}
      />

      <div className="w-full max-w-2xl mx-auto relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Image
            src="/logo-clarita.png"
            alt="Clarita"
            width={80}
            height={64}
            className="mx-auto mb-2 drop-shadow-md"
            priority
          />
          <p className="text-gray-400 text-xs font-light">Perfil de Saúde</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-xs font-medium text-gray-500">
              Etapa {step + 1} de {totalSteps}
            </span>
            <span className="text-xs font-semibold text-gradient">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-white/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/40">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)',
              }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-0 mb-8 mt-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? 'w-7 h-7 text-white shadow-md'
                    : i === step
                      ? 'w-9 h-9 text-white shadow-lg ring-4 ring-white/50'
                      : 'w-7 h-7 bg-white/60 text-gray-400 border border-white/60'
                }`}
                style={
                  i <= step
                    ? { background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)' }
                    : undefined
                }
              >
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="w-5 sm:w-8 h-0.5 transition-all duration-300"
                  style={
                    i < step
                      ? { background: 'linear-gradient(90deg, #14b8a6, #8b5cf6)' }
                      : { background: 'rgba(255,255,255,0.5)' }
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Card */}
        <div
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 animate-slide-up"
          key={currentStep?.id}
        >
          {/* Step Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)' }}
            >
              {currentStep?.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{currentStep?.title}</h2>
              <p className="text-sm text-gray-500">{currentStep?.description}</p>
            </div>
          </div>

          {/* Step Content */}
          {currentStep?.id === 'welcome' && <WelcomeStep userName={userName} />}

          {currentStep?.id === 'personal' && <PersonalStep form={form} update={update} />}

          {currentStep?.id === 'address' && <AddressStep form={form} update={update} />}

          {currentStep?.id === 'health' && <HealthStep form={form} update={update} />}

          {currentStep?.id === 'gynecological' && <GynecologicalStep form={form} update={update} />}

          {currentStep?.id === 'history' && <HistoryStep form={form} update={update} />}

          {currentStep?.id === 'review' && <ReviewStep form={form} gender={gender} />}

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl text-sm text-red-600 animate-fade-in flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={goBack}
                className="btn-ghost flex items-center gap-2"
                disabled={saving}
              >
                <ChevronLeft size={16} />
                Voltar
              </button>
            )}
            <div className="flex-1" />
            {currentStep?.id === 'welcome' ? (
              <button onClick={goNext} className="btn-primary flex items-center gap-2 px-8">
                Começar
                <ChevronRight size={16} />
              </button>
            ) : isLastStep ? (
              <button
                onClick={goNext}
                className="btn-primary flex items-center gap-2 px-8"
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Salvando...' : 'Concluir'}
              </button>
            ) : (
              <button onClick={goNext} className="btn-primary flex items-center gap-2">
                Próximo
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Skip hint */}
          {currentStep?.id !== 'welcome' && currentStep?.id !== 'review' && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Todos os campos são opcionais. Preencha o que quiser agora — você pode atualizar
              depois.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Informações protegidas &middot; Conformidade LGPD
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// Step Components
// ===========================================================================

function WelcomeStep({ userName }: { userName: string }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {userName ? `Olá, ${userName}!` : 'Olá!'}
        </h3>
        <p className="text-gray-500 leading-relaxed max-w-md mx-auto">
          Estamos felizes em ter você aqui. Para oferecer o melhor cuidado, vamos coletar algumas
          informações sobre você.
        </p>
      </div>

      <div className="grid gap-3">
        {[
          {
            icon: <Shield size={20} className="text-clarita-green-500" />,
            title: 'Dados protegidos',
            desc: 'Suas informações são criptografadas e protegidas pela LGPD',
            bg: 'bg-clarita-green-50/60',
          },
          {
            icon: <User size={20} className="text-clarita-purple-500" />,
            title: 'Você no controle',
            desc: 'Apenas profissionais autorizados por você terão acesso',
            bg: 'bg-clarita-purple-50/60',
          },
          {
            icon: <Activity size={20} className="text-clarita-blue-400" />,
            title: 'Cuidado personalizado',
            desc: 'Ajuda seus profissionais a oferecer um acompanhamento melhor',
            bg: 'bg-clarita-blue-50/60',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30"
          >
            <div
              className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}
            >
              {item.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400 text-center italic">
        Todos os campos são opcionais — preencha o que puder agora e complete depois, se preferir.
      </p>
    </div>
  );
}

function PersonalStep({
  form,
  update,
}: {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Nome completo</label>
        <input
          type="text"
          className="input-field"
          placeholder="Seu nome completo"
          value={form.full_name}
          onChange={(e) => update('full_name', e.target.value)}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            className="input-field pl-10"
            placeholder="seu@email.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Telefone</label>
        <input
          type="tel"
          className="input-field"
          placeholder="(11) 99999-9999"
          value={form.phone}
          onChange={(e) => update('phone', maskPhone(e.target.value))}
        />
      </div>

      {/* Emergency Contact */}
      <div className="p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 space-y-3">
        <p className="text-sm font-medium text-gray-600">Contato de Emergência</p>
        <input
          type="text"
          className="input-field"
          placeholder="Nome do contato"
          value={form.emergency_contact_name}
          onChange={(e) => update('emergency_contact_name', e.target.value)}
        />
        <input
          type="tel"
          className="input-field"
          placeholder="(11) 99999-9999"
          value={form.emergency_contact_phone}
          onChange={(e) => update('emergency_contact_phone', maskPhone(e.target.value))}
        />
      </div>

      {/* CPF & RG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">CPF</label>
          <input
            type="text"
            className="input-field"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => update('cpf', maskCPF(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">RG</label>
          <input
            type="text"
            className="input-field"
            placeholder="Número do RG"
            value={form.rg}
            onChange={(e) => update('rg', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function AddressStep({
  form,
  update,
}: {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
}) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [cepSuccess, setCepSuccess] = useState(false);

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setCepLoading(true);
    setCepError('');
    setCepSuccess(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        return;
      }
      if (data.logradouro) update('street', data.logradouro);
      if (data.bairro) update('neighborhood', data.bairro);
      if (data.localidade) update('city', data.localidade);
      if (data.uf) update('state', data.uf);
      setCepSuccess(true);
      setTimeout(() => setCepSuccess(false), 3000);
    } catch {
      setCepError('Erro ao buscar CEP. Preencha manualmente.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (value: string) => {
    const masked = maskCEP(value);
    update('zip', masked);
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      fetchCep(digits);
    }
  };

  return (
    <div className="space-y-4">
      {/* CEP - primeiro campo */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">CEP</label>
        <div className="relative">
          <input
            type="text"
            className={`input-field ${cepSuccess ? '!border-clarita-green-400 !ring-clarita-green-200' : ''} ${cepError ? '!border-red-300 !ring-red-200' : ''}`}
            placeholder="00000-000"
            value={form.zip}
            onChange={(e) => handleCepChange(e.target.value)}
          />
          {cepLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="animate-spin text-clarita-green-500" />
            </div>
          )}
          {cepSuccess && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check size={16} className="text-clarita-green-500" />
            </div>
          )}
        </div>
        {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
        {cepSuccess && (
          <p className="text-xs text-clarita-green-600 mt-1">
            Endereço preenchido automaticamente!
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Digite o CEP para preencher automaticamente, ou preencha manualmente abaixo.
        </p>
      </div>

      {/* Rua + Número */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-2">Rua</label>
          <input
            type="text"
            className="input-field"
            placeholder="Nome da rua"
            value={form.street}
            onChange={(e) => update('street', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Número</label>
          <input
            type="text"
            className="input-field"
            placeholder="Nº"
            value={form.number}
            onChange={(e) => update('number', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Complemento</label>
        <input
          type="text"
          className="input-field"
          placeholder="Apartamento, bloco, etc."
          value={form.complement}
          onChange={(e) => update('complement', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Bairro</label>
        <input
          type="text"
          className="input-field"
          placeholder="Bairro"
          value={form.neighborhood}
          onChange={(e) => update('neighborhood', e.target.value)}
        />
      </div>

      {/* Cidade + Estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Cidade</label>
          <input
            type="text"
            className="input-field"
            placeholder="Cidade"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Estado</label>
          <select
            className="input-field"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
          >
            <option value="">UF</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function HealthStep({
  form,
  update,
}: {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Peso (kg)</label>
          <input
            type="number"
            className="input-field"
            placeholder="Ex: 70"
            value={form.weight_kg}
            onChange={(e) => update('weight_kg', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Altura (cm)</label>
          <input
            type="number"
            className="input-field"
            placeholder="Ex: 170"
            value={form.height_cm}
            onChange={(e) => update('height_cm', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Sintomas atuais</label>
        <textarea
          className="input-field min-h-[80px] resize-none"
          placeholder="Descreva quaisquer sintomas que esteja sentindo..."
          value={form.current_symptoms}
          onChange={(e) => update('current_symptoms', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Alergias</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ex: Penicilina, Dipirona..."
          value={form.allergies}
          onChange={(e) => update('allergies', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Condições crônicas</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ex: Hipertensão, diabetes..."
          value={form.chronic_conditions}
          onChange={(e) => update('chronic_conditions', e.target.value)}
        />
      </div>
    </div>
  );
}

function GynecologicalStep({
  form,
  update,
}: {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-clarita-purple-50/60 backdrop-blur-sm rounded-2xl border border-clarita-purple-100/40 text-sm text-clarita-purple-700">
        Estas informações ajudam seus profissionais a oferecer um acompanhamento mais completo. Tudo
        é confidencial.
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Data da última menstruação
        </label>
        <input
          type="date"
          className="input-field"
          value={form.last_menstruation_date}
          onChange={(e) => update('last_menstruation_date', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Histórico gestacional
        </label>
        <textarea
          className="input-field min-h-[70px] resize-none"
          placeholder="Ex: 2 gestações, 2 partos normais..."
          value={form.pregnancy_history}
          onChange={(e) => update('pregnancy_history', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Histórico de abortos</label>
        <textarea
          className="input-field min-h-[70px] resize-none"
          placeholder="Se aplicável, descreva..."
          value={form.abortion_history}
          onChange={(e) => update('abortion_history', e.target.value)}
        />
      </div>
    </div>
  );
}

function HistoryStep({
  form,
  update,
}: {
  form: FormData;
  update: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tipo de sangue */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Tipo sanguíneo</label>
        <div className="relative">
          <Droplets
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            className="input-field pl-10"
            value={form.blood_type}
            onChange={(e) => update('blood_type', e.target.value)}
          >
            <option value="">Selecione seu tipo sanguíneo</option>
            {BLOOD_TYPE_OPTIONS.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
            <option value="Não sei">Não sei</option>
          </select>
        </div>
      </div>

      {/* Histórico familiar */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Histórico familiar</label>
        <textarea
          className="input-field min-h-[90px] resize-none"
          placeholder="Doenças na família (depressão, ansiedade, cardíacas, diabetes...)"
          value={form.family_history}
          onChange={(e) => update('family_history', e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          Relate doenças relevantes de familiares próximos (pais, irmãos, avós).
        </p>
      </div>

      {/* Tratamentos atuais */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Tratamentos atuais</label>
        <textarea
          className="input-field min-h-[90px] resize-none"
          placeholder="Medicamentos ou terapias em andamento..."
          value={form.current_treatments}
          onChange={(e) => update('current_treatments', e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">
          Inclua medicamentos, dosagens e terapias que está realizando atualmente.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({ form, gender }: { form: FormData; gender: string | null }) {
  const sectionThemes: Record<string, { border: string; bg: string; icon: string }> = {
    'Dados Pessoais': {
      border: 'border-l-clarita-green-400',
      bg: 'bg-clarita-green-50/50',
      icon: 'text-clarita-green-500',
    },
    Endereço: {
      border: 'border-l-clarita-blue-400',
      bg: 'bg-clarita-blue-50/50',
      icon: 'text-clarita-blue-400',
    },
    Saúde: {
      border: 'border-l-clarita-purple-400',
      bg: 'bg-clarita-purple-50/50',
      icon: 'text-clarita-purple-500',
    },
    'Saúde Feminina': {
      border: 'border-l-clarita-pink-300',
      bg: 'bg-clarita-pink-50/50',
      icon: 'text-clarita-pink-300',
    },
    'Histórico & Tratamentos': {
      border: 'border-l-clarita-orange-400',
      bg: 'bg-clarita-orange-50/50',
      icon: 'text-clarita-orange-500',
    },
  };

  const sections = [
    {
      title: 'Dados Pessoais',
      items: [
        { label: 'Nome', value: form.full_name },
        { label: 'Email', value: form.email },
        { label: 'Telefone', value: form.phone },
        { label: 'Contato de emergência', value: form.emergency_contact_name },
        { label: 'Tel. emergência', value: form.emergency_contact_phone },
        { label: 'CPF', value: form.cpf },
        { label: 'RG', value: form.rg },
      ],
    },
    {
      title: 'Endereço',
      items: [
        {
          label: 'Endereço',
          value: [form.street, form.number, form.complement].filter(Boolean).join(', '),
        },
        {
          label: 'Local',
          value: [form.neighborhood, form.city, form.state].filter(Boolean).join(' - '),
        },
        { label: 'CEP', value: form.zip },
      ],
    },
    {
      title: 'Saúde',
      items: [
        {
          label: 'Peso / Altura',
          value:
            [
              form.weight_kg ? `${form.weight_kg} kg` : '',
              form.height_cm ? `${form.height_cm} cm` : '',
            ]
              .filter(Boolean)
              .join(' · ') || '',
        },
        { label: 'Tipo sanguíneo', value: form.blood_type },
        { label: 'Sintomas', value: form.current_symptoms },
        { label: 'Alergias', value: form.allergies },
        { label: 'Condições crônicas', value: form.chronic_conditions },
      ],
    },
    ...(gender === 'female' || gender === 'feminino'
      ? [
          {
            title: 'Saúde Feminina',
            items: [
              { label: 'Última menstruação', value: form.last_menstruation_date },
              { label: 'Hist. gestacional', value: form.pregnancy_history },
              { label: 'Hist. abortos', value: form.abortion_history },
            ],
          },
        ]
      : []),
    {
      title: 'Histórico & Tratamentos',
      items: [
        { label: 'Histórico familiar', value: form.family_history },
        { label: 'Tratamentos atuais', value: form.current_treatments },
      ],
    },
  ];

  const hasAnyData = sections.some((s) => s.items.some((i) => i.value?.trim()));

  return (
    <div className="space-y-4">
      {!hasAnyData && (
        <div className="p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30 text-sm text-gray-500 text-center">
          Nenhuma informação preenchida. Você pode completar seu perfil depois no menu de
          configurações.
        </div>
      )}

      {sections.map((section) => {
        const filledItems = section.items.filter((i) => i.value?.trim());
        if (filledItems.length === 0) return null;
        const theme = sectionThemes[section.title] || sectionThemes['Dados Pessoais'];
        return (
          <div
            key={section.title}
            className={`rounded-2xl border-l-4 ${theme.border} ${theme.bg} backdrop-blur-sm p-4`}
          >
            <h4 className="text-sm font-semibold text-gray-700 mb-2.5">{section.title}</h4>
            <div className="space-y-1.5">
              {filledItems.map((item) => (
                <div key={item.label} className="flex gap-2 text-sm">
                  <span className="text-gray-400 shrink-0 w-32">{item.label}:</span>
                  <span className="text-gray-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-start gap-3 p-4 bg-clarita-green-50/60 backdrop-blur-sm rounded-2xl border border-clarita-green-100/40 mt-2">
        <Shield size={18} className="text-clarita-green-600 mt-0.5 shrink-0" />
        <p className="text-sm text-clarita-green-700">
          Ao concluir, seus dados serão salvos de forma segura. Você poderá editar essas informações
          a qualquer momento.
        </p>
      </div>
    </div>
  );
}
