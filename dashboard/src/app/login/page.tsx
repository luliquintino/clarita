'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Heart } from 'lucide-react';
import Image from 'next/image';
import { authApi, setToken } from '@/lib/api';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-clarita-green-200/40 blur-3xl animate-float" />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-clarita-purple-200/40 blur-3xl animate-float"
        style={{ animationDelay: '1.5s' }}
      />
      <div
        className="absolute top-[40%] right-[15%] w-[300px] h-[300px] rounded-full bg-clarita-pink-200/30 blur-3xl animate-float"
        style={{ animationDelay: '0.8s' }}
      />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block p-2 mb-4">
            <Image
              src="/logo-clarita.png"
              alt="Clarita"
              width={140}
              height={112}
              className="mx-auto drop-shadow-lg"
              priority
            />
          </div>
          <p className="text-gray-500 text-sm font-light">Plataforma de Saúde Mental</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-gray-500 mb-8 flex items-center gap-1.5">
            Que bom te ver por aqui{' '}
            <Heart size={14} className="text-clarita-purple-400 fill-clarita-purple-400" />
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
  );
}
