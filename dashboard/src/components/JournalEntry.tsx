'use client';

import { useState } from 'react';
import { Send, Smile, Frown, Meh, Zap, Moon, Heart, CheckCircle2, XCircle, Pill } from 'lucide-react';
import type { PatientMedication } from '@/lib/api';

interface JournalEntryProps {
  onSubmit: (data: {
    mood_score: number;
    anxiety_score: number;
    energy_score: number;
    sleep_hours?: number;
    journal_entry?: string;
    medication_logs?: Array<{ patient_medication_id: string; skipped: boolean }>;
  }) => Promise<void>;
  saving?: boolean;
  medications?: PatientMedication[];
}

const moodEmojis = [
  { min: 1, max: 3, icon: Frown, color: 'text-red-400', label: 'Difícil' },
  { min: 4, max: 6, icon: Meh, color: 'text-yellow-400', label: 'Neutro' },
  { min: 7, max: 10, icon: Smile, color: 'text-clarita-green-500', label: 'Bem' },
];

function SliderField({
  label,
  value,
  onChange,
  icon,
  lowEmoji,
  highEmoji,
  lowLabel,
  highLabel,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
  lowEmoji?: string;
  highEmoji?: string;
  lowLabel: string;
  highLabel: string;
  color: string;
}) {
  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-xl font-bold ${color}`}>{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-400">
          {lowEmoji ? `${lowEmoji} ` : ''}
          {lowLabel}
        </span>
        <span className="text-xs text-gray-400">
          {highLabel}
          {highEmoji ? ` ${highEmoji}` : ''}
        </span>
      </div>
    </div>
  );
}

export default function JournalEntry({ onSubmit, saving = false, medications }: JournalEntryProps) {
  const [mood, setMood] = useState(5);
  const [anxiety, setAnxiety] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [journalText, setJournalText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [medAnswers, setMedAnswers] = useState<Record<string, boolean>>({});

  const moodConfig = moodEmojis.find((e) => mood >= e.min && mood <= e.max) || moodEmojis[1];
  const MoodIcon = moodConfig.icon;

  const handleSubmit = async () => {
    const medication_logs = Object.entries(medAnswers).map(([id, taken]) => ({
      patient_medication_id: id,
      skipped: !taken,
    }));

    await onSubmit({
      mood_score: mood,
      anxiety_score: anxiety,
      energy_score: energy,
      sleep_hours: sleepHours,
      journal_entry: journalText || undefined,
      medication_logs: medication_logs.length > 0 ? medication_logs : undefined,
    });

    setSubmitted(true);
    setMedAnswers({});
    setTimeout(() => setSubmitted(false), 3000);
    setJournalText('');
  };

  return (
    <div className="card section-green space-y-5 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-0.5 flex items-center gap-2">
          <Smile size={20} className="text-clarita-green-500" />
          Como você está se sentindo?
        </h3>
        <p className="text-sm text-gray-400 ml-7">
          Registre seus sentimentos e acompanhe sua evolução.
        </p>
      </div>

      {/* Emotional sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SliderField
          label="Humor"
          value={mood}
          onChange={setMood}
          icon={<MoodIcon size={18} className={moodConfig.color} />}
          lowEmoji="😔"
          highEmoji="😊"
          lowLabel="Muito triste"
          highLabel="Muito feliz"
          color="text-clarita-green-600"
        />
        <SliderField
          label="Ansiedade"
          value={anxiety}
          onChange={setAnxiety}
          icon={<Zap size={18} className="text-orange-400" />}
          lowEmoji="😌"
          highEmoji="😰"
          lowLabel="Calmo(a)"
          highLabel="Muito ansioso(a)"
          color="text-orange-500"
        />
        <SliderField
          label="Energia"
          value={energy}
          onChange={setEnergy}
          icon={<Zap size={18} className="text-clarita-blue-400" />}
          lowEmoji="😴"
          highEmoji="⚡"
          lowLabel="Sem energia"
          highLabel="Muita energia"
          color="text-clarita-blue-500"
        />
        <SliderField
          label="Horas de sono"
          value={sleepHours}
          onChange={setSleepHours}
          icon={<Moon size={18} className="text-clarita-purple-400" />}
          lowEmoji="🌙"
          highEmoji="☀️"
          lowLabel="0h"
          highLabel="10h+"
          color="text-clarita-purple-500"
        />
      </div>

      {/* Journal text */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          Conte mais sobre seu dia...
        </label>
        <textarea
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          placeholder="Como foi seu dia? O que te deixou feliz ou triste?"
          className="input-field min-h-[100px] resize-y"
          maxLength={10000}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{journalText.length}/10000</p>
      </div>

      {/* Medication check */}
      {medications && medications.length > 0 && (
        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-3">
          <div className="flex items-center gap-2">
            <Pill size={16} className="text-indigo-500" />
            <p className="text-sm font-medium text-gray-700">Você tomou sua medicação hoje?</p>
          </div>
          <div className="space-y-2">
            {medications.map((med) => {
              const answer = medAnswers[med.id];
              return (
                <div
                  key={med.id}
                  className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2.5 border border-white/60"
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{med.medication_name}</p>
                    <p className="text-xs text-gray-400">{med.dosage} · {med.frequency}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setMedAnswers((prev) => ({ ...prev, [med.id]: true }))}
                      aria-label={`Sim, tomei ${med.medication_name}`}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        answer === true
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      <CheckCircle2 size={13} /> Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedAnswers((prev) => ({ ...prev, [med.id]: false }))}
                      aria-label={`Não tomei ${med.medication_name}`}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        answer === false
                          ? 'bg-red-100 text-red-600 border-red-300'
                          : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'
                      }`}
                    >
                      <XCircle size={13} /> Não
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>Registrando...</>
          ) : (
            <>
              <Heart size={16} />
              Registrar check-in
            </>
          )}
        </button>
        {submitted && (
          <span className="text-sm text-clarita-green-500 animate-fade-in font-medium">
            Registrado com sucesso!
          </span>
        )}
      </div>
    </div>
  );
}
