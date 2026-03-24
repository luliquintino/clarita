'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CalendarDays, Sparkles, Target, Star, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  clinicalNotesApi,
  lifeEventsApi,
  goalsApi,
  summariesApi,
  patientsApi,
  type LifeEvent,
  type Goal,
  type EmotionalLog,
} from '@/lib/api';
import EmotionalChart from '@/components/EmotionalChart';

interface PsychologistSessionPrepProps {
  patientId: string;
  onStartNote?: () => void;
}

export default function PsychologistSessionPrep({
  patientId,
  onStartNote,
}: PsychologistSessionPrepProps) {
  const [loading, setLoading] = useState(true);
  const [lastNoteDate, setLastNoteDate] = useState<Date | null>(null);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [summary, setSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [noteRes, eventsRes, goalsRes, logsRes] = await Promise.allSettled([
          clinicalNotesApi.list(patientId, { limit: 1 }),
          lifeEventsApi.listForPatient(patientId),
          goalsApi.list(patientId),
          patientsApi.getEmotionalLogs(patientId, 90),
        ]);

        if (noteRes.status === 'fulfilled') {
          const raw = noteRes.value as any;
          const notes = raw?.clinical_notes ?? [];
          if (notes[0]) {
            const note = notes[0];
            setLastNoteDate(parseISO(note.session_date || note.created_at));
          }
        }
        if (eventsRes.status === 'fulfilled') {
          const raw = eventsRes.value as any;
          setLifeEvents(raw?.life_events ?? []);
        }
        if (goalsRes.status === 'fulfilled') {
          const raw = goalsRes.value as any;
          setGoals(Array.isArray(raw) ? raw : (raw?.goals ?? []));
        }
        if (logsRes.status === 'fulfilled') {
          const raw = logsRes.value as any;
          setEmotionalLogs(Array.isArray(raw) ? raw : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  const daysSinceLastNote = lastNoteDate
    ? differenceInDays(new Date(), lastNoteDate)
    : null;

  const recentEvents = lastNoteDate
    ? lifeEvents.filter((e) => isAfter(parseISO(e.event_date), lastNoteDate))
    : lifeEvents.slice(0, 5);

  const activeGoals = goals.filter(
    (g) => g.status === 'in_progress' && g.patient_status === 'accepted'
  );
  const achievedGoals = goals.filter((g) => g.status === 'achieved');

  const handleGenerateBriefing = useCallback(async () => {
    setGeneratingSummary(true);
    try {
      const res = await summariesApi.generate(patientId, { periodDays: daysSinceLastNote ?? 30 });
      const raw = res as any;
      setSummary(raw?.summary?.summary_text ?? '');
    } catch {
      setSummary('Não foi possível gerar o briefing. Tente novamente.');
    } finally {
      setGeneratingSummary(false);
    }
  }, [patientId, daysSinceLastNote]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-clarita-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-clarita-purple-500" />
          <h2 className="text-lg font-semibold text-gray-800">Prep de Sessão</h2>
        </div>
        {onStartNote && (
          <button
            onClick={onStartNote}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            Iniciar Nota de Sessão
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Card 1 — Desde a última sessão */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-500 mb-1">Desde a última sessão</p>
        {lastNoteDate ? (
          <div className="flex flex-wrap gap-4 text-sm items-center">
            <span className="text-2xl font-bold text-clarita-purple-600">
              {daysSinceLastNote}d
            </span>
            <div className="flex flex-col gap-0.5 text-gray-600">
              <span>
                Última nota:{' '}
                {format(lastNoteDate, "dd 'de' MMMM", { locale: ptBR })}
              </span>
              <span className="text-xs text-gray-400">
                {recentEvents.length} evento{recentEvents.length !== 1 ? 's' : ''} de vida ·{' '}
                {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} ativa{activeGoals.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma nota clínica registrada ainda.</p>
        )}
      </div>

      {/* Card 2 — Tendência emocional */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-500 mb-3">Tendência Emocional</p>
        <EmotionalChart data={emotionalLogs} />
      </div>

      {/* Card 3 — Eventos de vida */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-amber-500" />
          <p className="text-sm font-semibold text-gray-500">
            Eventos de Vida {lastNoteDate ? 'no Período' : 'Recentes'}
          </p>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum evento registrado no período.</p>
        ) : (
          <ul className="space-y-2">
            {recentEvents.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-800">{e.title}</span>
                  <span className="text-gray-400 ml-2 text-xs">
                    {format(parseISO(e.event_date), 'dd MMM', { locale: ptBR })}
                  </span>
                  {e.impact_level >= 8 && (
                    <span className="ml-2 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                      Alto impacto
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Card 4 — Metas */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-clarita-purple-500" />
          <p className="text-sm font-semibold text-gray-500">Metas Terapêuticas</p>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma meta criada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-clarita-purple-50 text-clarita-purple-700">
              {activeGoals.length} em andamento
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              {achievedGoals.length} concluída{achievedGoals.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Card 5 — Briefing de IA */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-clarita-blue-500" />
            <p className="text-sm font-semibold text-gray-500">Briefing de IA</p>
          </div>
          <button
            onClick={handleGenerateBriefing}
            disabled={generatingSummary}
            className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
          >
            {generatingSummary ? <Loader2 size={12} className="animate-spin" /> : null}
            {generatingSummary ? 'Gerando...' : summary ? 'Regenerar' : 'Gerar briefing'}
          </button>
        </div>
        {summary ? (
          <p className="text-sm text-gray-700 italic leading-relaxed">{summary}</p>
        ) : (
          <p className="text-sm text-gray-400">
            Clique em &quot;Gerar briefing&quot; para um resumo do período gerado pela IA.
          </p>
        )}
      </div>
    </div>
  );
}
