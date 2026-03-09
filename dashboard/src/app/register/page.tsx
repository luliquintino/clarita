"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Stethoscope, Brain, Heart } from "lucide-react";
import Image from "next/image";
import { authApi, setToken } from "@/lib/api";
import type { RegisterData } from "@/lib/api";

type Role = "psychologist" | "psychiatrist" | "patient";

const roles = [
  { value: "psychologist" as Role, label: "Psicólogo(a)", icon: Brain, color: "clarita-green" },
  { value: "psychiatrist" as Role, label: "Psiquiatra", icon: Stethoscope, color: "clarita-purple" },
  { value: "patient" as Role, label: "Paciente", icon: Heart, color: "clarita-pink" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "psychologist" as Role,
    licenseNumber: "",
    specialization: "",
    institution: "",
    dateOfBirth: "",
    gender: "",
  });

  const isPatient = form.role === "patient";

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!isPatient && !form.licenseNumber.trim()) {
      setError("O número de registro profissional é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterData = isPatient
        ? {
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email,
            password: form.password,
            role: "patient",
            date_of_birth: form.dateOfBirth || undefined,
            gender: form.gender || undefined,
          }
        : {
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email,
            password: form.password,
            role: form.role as "psychologist" | "psychiatrist",
            license_number: form.licenseNumber,
            specialization: form.specialization || undefined,
            institution: form.institution || undefined,
          };

      const response = await authApi.register(payload);
      setToken(response.token);
      router.push(isPatient ? "/onboarding" : "/patients");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Decorative circles */}
      <div className="absolute top-[-8%] right-[-5%] w-[400px] h-[400px] rounded-full bg-clarita-green-200/30 blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] left-[-8%] w-[500px] h-[500px] rounded-full bg-clarita-purple-200/30 blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-6">
          <Image src="/logo-clarita.png" alt="Clarita" width={120} height={96} className="mx-auto mb-3 drop-shadow-lg" priority />
          <p className="text-gray-500 text-sm font-light">
            {isPatient ? "Portal do Paciente" : "Painel Profissional"}
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">
            Criar sua conta
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isPatient
              ? "Cadastre-se para acompanhar sua saúde mental."
              : "Cadastre-se para acessar o painel de pacientes."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl text-sm text-red-600 animate-fade-in flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3">
                Tipo de conta
              </label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  const isSelected = form.role === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => update("role", role.value)}
                      className={`p-4 rounded-2xl border-2 text-sm font-medium transition-all duration-300 flex flex-col items-center gap-2 ${
                        isSelected
                          ? role.value === "psychologist"
                            ? "border-clarita-green-400 bg-clarita-green-50/70 text-clarita-green-700 shadow-glow-green"
                            : role.value === "psychiatrist"
                            ? "border-clarita-purple-400 bg-clarita-purple-50/70 text-clarita-purple-700 shadow-glow-purple"
                            : "border-pink-400 bg-pink-50/70 text-pink-700"
                          : "border-gray-200/60 text-gray-500 hover:border-gray-300 bg-white/40"
                      }`}
                    >
                      <Icon size={22} className={isSelected ? "" : "text-gray-400"} />
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-600 mb-2">
                  Nome
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="input-field"
                  placeholder="Ana"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-600 mb-2">
                  Sobrenome
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="input-field"
                  placeholder="Silva"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
                {isPatient ? "Email" : "Email profissional"}
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="input-field"
                placeholder={isPatient ? "voce@exemplo.com" : "voce@clinica.com"}
                required
                autoComplete="email"
              />
            </div>

            {/* Professional fields */}
            {!isPatient && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label htmlFor="license" className="block text-sm font-medium text-gray-600 mb-2">
                    {form.role === "psychiatrist" ? "CRM" : "CRP"}
                  </label>
                  <input
                    id="license"
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => update("licenseNumber", e.target.value)}
                    className="input-field"
                    placeholder={form.role === "psychiatrist" ? "CRM-00000" : "CRP 00/00000"}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="specialization" className="block text-sm font-medium text-gray-600 mb-2">
                      Especialização
                    </label>
                    <input
                      id="specialization"
                      type="text"
                      value={form.specialization}
                      onChange={(e) => update("specialization", e.target.value)}
                      className="input-field"
                      placeholder="Psicologia clínica"
                    />
                  </div>
                  <div>
                    <label htmlFor="institution" className="block text-sm font-medium text-gray-600 mb-2">
                      Instituição
                    </label>
                    <input
                      id="institution"
                      type="text"
                      value={form.institution}
                      onChange={(e) => update("institution", e.target.value)}
                      className="input-field"
                      placeholder="Clínica Clarita"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Patient fields */}
            {isPatient && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-600 mb-2">
                    Data de nascimento
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => update("dateOfBirth", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-600 mb-2">
                    Gênero
                  </label>
                  <select
                    id="gender"
                    value={form.gender}
                    onChange={(e) => update("gender", e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="non_binary">Não-binário</option>
                    <option value="other">Outro</option>
                    <option value="prefer_not_to_say">Prefiro não dizer</option>
                  </select>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="input-field pr-11"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 mb-2">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="input-field"
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
                "Criar conta"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-sm text-gray-500">Já tem uma conta? </span>
            <Link
              href="/login"
              className="text-sm text-clarita-purple-500 hover:text-clarita-purple-600 font-semibold transition-colors"
            >
              Entrar
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
