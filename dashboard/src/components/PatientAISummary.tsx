'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { isAfter, parseISO, subDays } from 'date-fns';
import {
  patientsApi,
  symptomsApi,
  lifeEventsApi,
  goalsApi,
  summariesApi,
  type EmotionalLog,
  type PatientSymptom,
  type LifeEvent,
  type Goal,
} from '@/lib/api';

interface PatientAISummaryProps {
  patientId: string;
}

type PeriodPreset = 7 | 30;

export default function PatientAISummary({ patientId }: PatientAISummaryProps) {
  const [preset, setPreset] = useState<PeriodPreset | null>(7);
  const [customDays, setCustomDays] = useState('');

  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [symptoms, setSymptoms] = useState<PatientSymptom[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [summaryText, setSummaryText] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [logsRes, symptomsRes, eventsRes, goalsRes] = await Promise.allSettled([
        patientsApi.getEmotionalLogs(patientId, 90),
        symptomsApi.listForPatient(patientId),
        lifeEventsApi.listForPatient(patientId),
        goalsApi.list(patientId),
      ]);

      if (logsRes.status === 'fulfilled') {
        const raw = logsRes.value as any;
        setEmotionalLogs(Array.isArray(raw) ? raw : []);
      }
      if (symptomsRes.status === 'fulfilled') {
        const raw = symptomsRes.value as any;
        setSymptoms(raw?.patient_symptoms ?? []);
      }
      if (eventsRes.status === 'fulfilled') {
        const raw = eventsRes.value as any;
        setLifeEvents(raw?.life_events ?? []);
      }
      if (goalsRes.status === 'fulfilled') {
        const raw = goalsRes.value as any;
        setGoals(Array.isArray(raw) ? raw : (raw?.goals ?? []));
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  const activeDays = useMemo(() => {
    if (preset !== null) return preset;
    const n = parseInt(customDays, 10);
    return isNaN(n) || n <= 0 ? 7 : n;
  }, [preset, customDays]);

  const cutoff = useMemo(() => subDays(new Date(), activeDays), [activeDays]);

  const filteredLogs = useMemo(
    () => emotionalLogs.filter((l) => isAfter(parseISO(l.timestamp), cutoff)),
    [emotionalLogs, cutoff]
  );
  const filteredSymptoms = useMemo(
    () => symptoms.filter((s) => s.reported_at && isAfter(parseISO(s.reported_at), cutoff)),
    [symptoms, cutoff]
  );
  const filteredEvents = useMemo(
    () => lifeEvents.filter((e) => isAfter(parseISO(e.event_date), cutoff)),
    [lifeEvents, cutoff]
  );
  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === 'in_progress' && g.patient_status === 'accepted'),
    [goals]
  );

  const avgMood = filteredLogs.length
    ? (filteredLogs.reduce((s, l) => s + l.mood, 0) / filteredLogs.length).toFixed(1)
    : null;
  const avgAnxiety = filteredLogs.length
    ? (filteredLogs.reduce((s, l) => s + l.anxiety, 0) / filteredLogs.length).toFixed(1)
    : null;
  const avgEnergy = filteredLogs.length
    ? (filteredLogs.reduce((s, l) => s + l.energy, 0) / filteredLogs.length).toFixed(1)
    : null;

  const handleGenerate = async () => {
    setGenerating(true);
    setSummaryText('');
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, activeDays);
      const res = await summariesApi.generate(patientId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      const raw = res as any;
      setSummaryText(raw?.summary?.summary_text ?? 'Não foi possível gerar o resumo.');
    } catch {
      setSummaryText('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-clarita-purple-500" />
          <p className="text-sm font-semibold text-gray-700">Resumo IA</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {([7, 30] as PeriodPreset[]).map((d) => (
            <button
              key={d}
              onClick={() => { setPreset(d); setCustomDays(''); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                preset === d
                  ? 'bg-clarita-purple-500 text-white border-clarita-purple-500 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-clarita-purple-300'
              }`}
            >
              {d}d
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => { setCustomDays(e.target.value); setPreset(null); }}
              placeholder="N"
              className={`w-14 text-xs px-2 py-1.5 rounded-full border text-center transition-all ${
                preset === null && customDays
                  ? 'border-clarita-purple-400 bg-clarita-purple-50 font-medium'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            />
            <span className="text-xs text-gray-400">dias</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {generating ? 'Gerando...' : summaryText ? 'Regenerar' : 'Gerar Resumo'}
          </button>
        </div>
      </div>

      {/* Chips */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
          <Loader2 size={12} className="animate-spin" /> Carregando dados...
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {avgMood !== null && (
            <Chip
              label={`😊 Humor ${avgMood}`}
              warning={parseFloat(avgMood) <= 4}
            />
          )}
          {avgAnxiety !== null && (
            <Chip
              label={`😰 Ansiedade ${avgAnxiety}`}
              warning={parseFloat(avgAnxiety) >= 7}
            />
          )}
          {avgEnergy !== null && (
            <Chip label={`⚡ Energia ${avgEnergy}`} />
          )}
          <Chip label={`📋 ${filteredLogs.length} check-ins`} />
          {filteredSymptoms.length > 0 && (
            <Chip label={`🔴 ${filteredSymptoms.length} sintoma${filteredSymptoms.length !== 1 ? 's' : ''}`} />
          )}
          {filteredEvents.length > 0 && (
            <Chip label={`🌟 ${filteredEvents.length} evento${filteredEvents.length !== 1 ? 's' : ''}`} />
          )}
          {activeGoals.length > 0 && (
            <Chip label={`🎯 ${activeGoals.length} meta${activeGoals.length !== 1 ? 's' : ''}`} />
          )}
          {filteredLogs.length === 0 && filteredSymptoms.length === 0 && filteredEvents.length === 0 && (
            <span className="text-xs text-gray-400">Sem dados registrados neste período</span>
          )}
        </div>
      )}

      {/* AI text */}
      {generating && (
        <div className="space-y-2 pt-1">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
        </div>
      )}
      {!generating && summaryText && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summaryText}</p>
        </div>
      )}
      {!generating && !summaryText && (
        <p className="text-xs text-gray-400">
          Clique em &quot;Gerar Resumo&quot; para um resumo clínico do período gerado pela IA.
        </p>
      )}
    </div>
  );
}

function Chip({ label, warning = false }: { label: string; warning?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${
        warning
          ? 'bg-orange-50 border-orange-200 text-orange-700'
          : 'bg-gray-50 border-gray-200 text-gray-600'
      }`}
    >
      {warning && <AlertTriangle size={10} className="text-orange-400" />}
      {label}
    </span>
  );
}
