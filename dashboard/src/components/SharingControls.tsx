'use client';

import { useState } from 'react';
import {
  Activity,
  BookOpen,
  Pill,
  ClipboardCheck,
  Calendar,
  FileText,
  Heart,
  Stethoscope,
} from 'lucide-react';
import type { ProfessionalInfo } from '@/lib/api';

interface SharingControlsProps {
  professional: ProfessionalInfo;
  patientId: string;
  onPermissionChange: (
    professionalId: string,
    permissions: Array<{ permission_type: string; granted: boolean }>
  ) => Promise<void>;
}

const permissionGroups = [
  {
    title: 'Bem-estar di\u00e1rio',
    icon: <Heart size={15} />,
    color: 'text-clarita-green-500',
    items: [
      {
        type: 'emotional_logs',
        label: 'Registros emocionais',
        description: 'Humor, ansiedade, energia e sono',
        icon: <Activity size={16} />,
      },
      {
        type: 'journal_entries',
        label: 'Di\u00e1rio emocional',
        description: 'Textos escritos no check-in di\u00e1rio',
        icon: <BookOpen size={16} />,
      },
      {
        type: 'life_events',
        label: 'Eventos de vida',
        description: 'Acontecimentos importantes',
        icon: <Calendar size={16} />,
      },
    ],
  },
  {
    title: 'Cl\u00ednico',
    icon: <Stethoscope size={15} />,
    color: 'text-clarita-purple-500',
    items: [
      {
        type: 'medications',
        label: 'Medicamentos',
        description: 'Prescri\u00e7\u00f5es e ades\u00e3o',
        icon: <Pill size={16} />,
      },
      {
        type: 'assessments',
        label: 'Avalia\u00e7\u00f5es',
        description: 'Resultados de PHQ-9, GAD-7',
        icon: <ClipboardCheck size={16} />,
      },
      {
        type: 'clinical_notes',
        label: 'Notas cl\u00ednicas',
        description: 'Notas dos profissionais',
        icon: <FileText size={16} />,
      },
    ],
  },
];

export default function SharingControls({
  professional,
  patientId,
  onPermissionChange,
}: SharingControlsProps) {
  const [saving, setSaving] = useState<string | null>(null);

  // Build permission state from professional.permissions
  const permState: Record<string, boolean | undefined> = {};
  for (const perm of professional.permissions || []) {
    permState[perm.permission_type] = perm.granted;
  }
  // If 'all' permission exists and is granted, use as default
  const allGranted = permState['all'] === true;

  // Individual explicit permission takes precedence over 'all'
  const isGranted = (type: string) => {
    if (permState[type] !== undefined) return permState[type] === true;
    return allGranted;
  };

  const handleToggle = async (permType: string) => {
    const newGranted = !isGranted(permType);
    setSaving(permType);
    try {
      await onPermissionChange(professional.id, [
        { permission_type: permType, granted: newGranted },
      ]);
    } catch {
      // Silently fail - state will refresh on next load
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      {permissionGroups.map((group) => (
        <div key={group.title}>
          {/* Group header */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className={group.color}>{group.icon}</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.title}
            </span>
          </div>

          {/* Group items */}
          <div className="space-y-1 bg-white/40 backdrop-blur-sm rounded-2xl p-2 border border-white/30">
            {group.items.map((perm) => {
              const granted = isGranted(perm.type);
              const isSaving = saving === perm.type;

              return (
                <div
                  key={perm.type}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-clarita-beige-50 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">{perm.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{perm.label}</p>
                      <p className="text-xs text-gray-400">{perm.description}</p>
                    </div>
                  </div>

                  {/* Gradient toggle */}
                  <button
                    onClick={() => handleToggle(perm.type)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300
                      ${isSaving ? 'opacity-50' : ''}
                      ${granted ? '' : 'bg-gray-200'}`}
                    style={
                      granted
                        ? {
                            background: 'linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)',
                          }
                        : undefined
                    }
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm
                        ${granted ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
