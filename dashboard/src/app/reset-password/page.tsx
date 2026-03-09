"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, CheckCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!token) {
      setError("Token inválido. Solicite um novo link de recuperação.");
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao redefinir senha. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 text-center animate-scale-in">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-full mb-4">
          <ShieldAlert size={32} className="text-red-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Link inválido
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Este link de recuperação é inválido ou expirou. Solicite um novo.
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8">
      {success ? (
        <div className="text-center py-4 animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-clarita-green-100 to-clarita-green-200 rounded-full mb-4">
            <CheckCircle size={32} className="text-clarita-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Senha redefinida!
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Sua senha foi alterada com sucesso. Redirecionando para o login...
          </p>
          <Loader2 size={20} className="animate-spin text-clarita-green-500 mx-auto" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-clarita-green-100 to-clarita-purple-100 rounded-2xl">
              <Lock size={22} className="text-clarita-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Redefinir senha
              </h2>
              <p className="text-xs text-gray-400">Escolha uma senha segura</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6 mt-4">
            Digite sua nova senha abaixo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl text-sm text-red-600 animate-fade-in flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field py-3.5 pr-11"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoFocus
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field py-3.5"
                placeholder="Digite novamente"
                required
                minLength={8}
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
                "Redefinir senha"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-clarita-purple-500 hover:text-clarita-purple-600 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={14} />
              Voltar ao login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-clarita-green-200/30 blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-clarita-purple-200/30 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <Image src="/logo-clarita.png" alt="Clarita" width={120} height={96} className="mx-auto mb-3 drop-shadow-lg" priority />
          <p className="text-gray-500 text-sm font-light">Plataforma de Saúde Mental</p>
        </div>

        <Suspense fallback={
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 text-center">
            <Loader2 size={24} className="animate-spin text-clarita-green-500 mx-auto" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
