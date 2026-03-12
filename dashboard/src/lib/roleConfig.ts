// dashboard/src/lib/roleConfig.ts

export const ROLE_CONFIG = {
  psychiatrist: {
    can_prescribe: true,
    can_request_exams: true,
    medications_access: 'full' as const,
    exams_access: 'full' as const,
    assessment_filter: 'clinical' as const,
  },
  psychologist: {
    can_prescribe: false,
    can_request_exams: false,
    medications_access: 'readonly' as const,
    exams_access: 'readonly' as const,
    assessment_filter: 'psychological' as const,
  },
} as const;

export type RoleKey = keyof typeof ROLE_CONFIG;
export type RoleCapabilities = typeof ROLE_CONFIG[RoleKey];

/** Retorna config de capacidades para o role, com fallback seguro para 'psychologist' */
export function getRoleCapabilities(role: string): RoleCapabilities {
  return ROLE_CONFIG[role as RoleKey] ?? ROLE_CONFIG.psychologist;
}
