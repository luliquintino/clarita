'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Heart, Brain, ClipboardList, Search, Shield } from 'lucide-react';
import Image from 'next/image';
import { authApi, setToken } from '@/lib/api';

const features = [
  {
    icon: Brain,
    iconClass: 'text-clarita-purple-500 bg-clarita-purple-50',
    title: 'Linha do Tempo com IA',
    description: 'Analisa padrões emocionais e comportamentais entre consultas.',
  },
  {
    icon: Search,
    iconClass: 'text-clarita-blue-500 bg-clarita-blue-50',
    title: 'Do sintoma ao diagnóstico em segundos',
    description: 'Browser completo da CID-11 integrado ao prontuário — busca por palavras-chave.',
  },
  {
    icon: Shield,
    iconClass: 'text-clarita-orange-500 bg-clarita-orange-50',
    title: 'Privacidade que pertence ao paciente',
    description: 'Controle granular por LGPD — o paciente decide quem acessa e pode revogar a qualquer momento.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      setToken(response.token);
      if (response.user.role === 'patient') {
        router.push('/patient-home');
      } else {
        router.push('/patients');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-3/5 relative flex-col justify-between p-14 bg-gradient-to-br from-clarita-green-50 via-white to-clarita-purple-50 overflow-hidden">

        {/* Decorative blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[480px] h-[480px] rounded-full bg-clarita-green-200/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-8%] w-[560px] h-[560px] rounded-full bg-clarita-purple-200/25 blur-3xl pointer-events-none" />
        <div className="absolute top-[45%] left-[40%] w-[280px] h-[280px] rounded-full bg-clarita-pink-200/20 blur-3xl pointer-events-none" />

        {/* Top: logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-clarita.png"
              alt="Clarita"
              width={40}
              height={40}
              className="drop-shadow"
              style={{ height: 'auto' }}
            />
            <span className="text-xl font-bold text-gray-800 tracking-tight">Clarita</span>
          </div>
        </div>

        {/* Middle: headline + features */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <span className="inline-block text-xs font-semibold tracking-widest text-clarita-green-600 uppercase">
              Saúde Mental Digital
            </span>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight tracking-tight">
              A plataforma clínica<br />
              <span className="bg-gradient-to-r from-clarita-green-500 to-clarita-purple-500 bg-clip-text text-transparent">
                que entende seus pacientes
              </span>
            </h1>
            <p className="text-gray-500 text-base leading-relaxed max-w-md">
              Prontuário longitudinal, avaliações psicológicas e análise por IA — tudo em um único sistema para psicólogos e psiquiatras.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-md">
            {features.map(({ icon: Icon, iconClass, title, description }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-soft">
                <div className={`flex-shrink-0 p-2.5 rounded-xl ${iconClass}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: trust footer */}
        <div className="relative z-10">
          <p className="text-xs text-gray-400">
            Conformidade LGPD &middot; Open source &middot; Feito no Brasil
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-6 py-12 bg-white relative overflow-hidden">

        {/* Mobile-only decorative blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-clarita-green-200/40 blur-3xl lg:hidden pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-clarita-purple-200/40 blur-3xl lg:hidden pointer-events-none" />

        <div className="w-full max-w-sm relative z-10 animate-slide-up">

          {/* Logo — visible only on mobile */}
          <div className="text-center mb-8 lg:hidden">
            <Image
              src="/logo-clarita.png"
              alt="Clarita"
              width={140}
              height={112}
              className="mx-auto drop-shadow-lg"
              priority
            />
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight mt-2">Clarita</h1>
          </div>

          {/* Login Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-8 flex items-center gap-2">
              Que bom te ver por aqui{' '}
              <Heart size={20} className="text-clarita-purple-400 fill-clarita-purple-400" />
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl text-sm text-red-600 animate-fade-in flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
                  Endereço de email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field py-3.5"
                  placeholder="voce@exemplo.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field py-3.5 pr-11"
                    placeholder="Digite sua senha"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-clarita-purple-500 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-clarita-purple-500 hover:text-clarita-purple-600 font-medium transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base rounded-xl"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Entrar'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <span className="text-sm text-gray-500">Não tem uma conta? </span>
              <Link
                href="/register"
                className="text-sm text-clarita-purple-500 hover:text-clarita-purple-600 font-semibold transition-colors"
              >
                Cadastre-se
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Informações protegidas &middot; Conformidade LGPD
          </p>
        </div>
      </div>

    </div>
  );
}
