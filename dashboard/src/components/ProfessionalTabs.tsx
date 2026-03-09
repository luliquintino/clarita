'use client';

import { useState } from 'react';
import {
  Brain,
  Stethoscope,
  Lock,
  Activity,
  Apple,
  Microscope,
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { ProfessionalInfo, Invitation } from '@/lib/api';
import { patientProfileApi } from '@/lib/api';
import SharingControls from './SharingControls';
import DisplayIdBadge from './DisplayIdBadge';
import InvitationDialog from './InvitationDialog';
import PendingInvitations from './PendingInvitations';

interface ProfessionalTabsProps {
  professionals: ProfessionalInfo[];
  patientId: string;
  onPermissionChange: (
    professionalId: string,
    permissions: Array<{ permission_type: string; granted: boolean }>
  ) => Promise<void>;
  pendingInvitations?: Invitation[];
  sentInvitations?: Invitation[];
  onInvitationsUpdate?: () => void;
  currentUserId?: string;
}

const roleConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  psychologist: {
    label: 'Psic\u00f3logo(a)',
    icon: <Brain size={18} />,
    color: 'text-clarita-purple-500',
    bgColor: 'bg-clarita-purple-50',
  },
  psychiatrist: {
    label: 'Psiquiatra',
    icon: <Stethoscope size={18} />,
    color: 'text-clarita-green-500',
    bgColor: 'bg-clarita-green-50',
  },
};

const futureSpecialties = [
  { label: 'Neurologista', icon: <Microscope size={18} /> },
  { label: 'Nutricionista', icon: <Apple size={18} /> },
  { label: 'Endocrinologista', icon: <Activity size={18} /> },
];

export default function ProfessionalTabs({
  professionals,
  patientId,
  onPermissionChange,
  pendingInvitations = [],
  sentInvitations = [],
  onInvitationsUpdate,
  currentUserId,
}: ProfessionalTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  return (
    <div className="space-y-4">
      {/* Pending Invitations */}
      {(pendingInvitations.length > 0 || sentInvitations.length > 0) && currentUserId && (
        <PendingInvitations
          received={pendingInvitations}
          sent={sentInvitations}
          onUpdate={onInvitationsUpdate || (() => {})}
          currentUserId={currentUserId}
        />
      )}

      <div className="card section-orange">
        {/* Header with orange accent icon and invite button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-clarita-orange-100 to-clarita-orange-50 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-clarita-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Meus Profissionais</h3>
          </div>
          <button
            onClick={() => setShowInviteDialog(true)}
            className="btn-primary text-sm px-3 py-1.5"
          >
            <UserPlus size={16} className="mr-1.5" />
            Convidar
          </button>
        </div>

        {professionals.length > 0 && (
          <>
            {/* Orange-themed tabs */}
            <div className="flex items-center gap-1 bg-clarita-orange-50/60 rounded-xl p-1 mb-6 overflow-x-auto border border-clarita-orange-100/50">
              {professionals.map((prof, idx) => {
                const config =
                  roleConfig[prof.relationship_type] ||
                  roleConfig[prof.role] ||
                  roleConfig.psychologist;
                const isActive = activeTab === idx;

                return (
                  <button
                    key={prof.id}
                    onClick={() => setActiveTab(idx)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                      ${
                        isActive
                          ? 'tab-orange-active'
                          : 'text-gray-500 hover:text-clarita-orange-600 hover:bg-clarita-orange-50/50'
                      }`}
                  >
                    <span className={isActive ? 'text-clarita-orange-500' : ''}>{config.icon}</span>
                    {prof.first_name} {prof.last_name}
                  </button>
                );
              })}

              {/* Future specialties */}
              {futureSpecialties.map((spec) => (
                <button
                  key={spec.label}
                  disabled
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-300 cursor-not-allowed whitespace-nowrap"
                >
                  {spec.icon}
                  {spec.label}
                  <span className="badge-orange text-[9px] opacity-60">
                    <Lock size={8} />
                    Em breve
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            {professionals[activeTab] && (
              <ProfessionalTabContent
                professional={professionals[activeTab]}
                patientId={patientId}
                onPermissionChange={onPermissionChange}
                onRevokeAccess={async () => {
                  if (onInvitationsUpdate) onInvitationsUpdate();
                }}
              />
            )}
          </>
        )}

        {professionals.length === 0 && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-14 h-14 bg-gradient-to-br from-clarita-orange-100 to-clarita-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <UserPlus size={24} className="text-clarita-orange-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhum profissional vinculado ainda.</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Convide um profissional usando o ID Clarita dele.
            </p>
            <button onClick={() => setShowInviteDialog(true)} className="btn-primary text-sm">
              <UserPlus size={16} className="mr-1.5" />
              Convidar Profissional
            </button>
          </div>
        )}
      </div>

      {/* Invitation Dialog */}
      <InvitationDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvitationSent={() => {
          if (onInvitationsUpdate) onInvitationsUpdate();
        }}
        senderRole="patient"
      />
    </div>
  );
}

function ProfessionalTabContent({
  professional,
  patientId,
  onPermissionChange,
  onRevokeAccess,
}: {
  professional: ProfessionalInfo;
  patientId: string;
  onPermissionChange: (
    professionalId: string,
    permissions: Array<{ permission_type: string; granted: boolean }>
  ) => Promise<void>;
  onRevokeAccess: () => void;
}) {
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const config =
    roleConfig[professional.relationship_type] ||
    roleConfig[professional.role] ||
    roleConfig.psychologist;

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await patientProfileApi.revokeAccess(professional.id);
      onRevokeAccess();
    } catch {
      // Could show error toast
    } finally {
      setRevoking(false);
      setShowRevokeConfirm(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Professional info */}
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${config.bgColor}`}>
          <span className={`text-lg font-bold ${config.color}`}>
            {professional.first_name[0]}
            {professional.last_name[0]}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800">
            {professional.first_name} {professional.last_name}
          </h4>
          <p className="text-sm text-gray-500">{config.label}</p>
          {professional.specialization && (
            <p className="text-xs text-gray-400 mt-0.5">{professional.specialization}</p>
          )}
          {professional.institution && (
            <p className="text-xs text-gray-400">{professional.institution}</p>
          )}
          {professional.display_id && (
            <div className="mt-1.5">
              <DisplayIdBadge displayId={professional.display_id} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Sharing controls */}
      <div className="border-t border-clarita-beige-200/50 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Compartilhamento de dados</h4>
        <p className="text-xs text-gray-400 mb-4">
          Escolha quais informações deseja compartilhar com este profissional.
        </p>
        <SharingControls
          professional={professional}
          patientId={patientId}
          onPermissionChange={onPermissionChange}
        />
      </div>

      {/* Revoke access */}
      <div className="border-t border-clarita-beige-200/50 pt-4">
        {showRevokeConfirm ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-scale-in">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Remover acesso de {professional.first_name}?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  O profissional perder\u00e1 toda a visibilidade dos seus dados. Seus dados
                  permanecem seguros e podem ser restaurados se voc\u00ea reconectar no futuro.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="btn-danger text-xs px-3 py-1.5"
              >
                {revoking ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserMinus size={14} />
                )}
                Confirmar Remo\u00e7\u00e3o
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowRevokeConfirm(true)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            <UserMinus size={16} />
            Remover acesso deste profissional
          </button>
        )}
      </div>
    </div>
  );
}
