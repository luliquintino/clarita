'use client';

interface PatientCircleProps {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    mood_score?: number | null;
  };
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function getMoodRingColor(score: number | null | undefined): string {
  if (score == null) return 'ring-clarita-beige-300';
  if (score >= 7) return 'ring-clarita-green-400';
  if (score >= 4) return 'ring-yellow-400';
  return 'ring-red-400';
}

export default function PatientCircle({
  patient,
  isActive,
  collapsed,
  onClick,
}: PatientCircleProps) {
  const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();
  const moodRing = getMoodRingColor(patient.mood_score);

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 w-full rounded-xl transition-all duration-200
        ${collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'}
        ${isActive ? 'bg-white/40 backdrop-blur-sm' : 'hover:bg-white/40 hover:backdrop-blur-sm'}`}
      title={collapsed ? `${patient.first_name} ${patient.last_name}` : undefined}
    >
      {/* Avatar circle with mood-colored ring */}
      <div
        className={`flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold transition-all
          ${collapsed ? 'w-9 h-9' : 'w-8 h-8'}
          ring-2 ${moodRing}
          ${
            isActive
              ? 'bg-clarita-green-400 text-white ring-offset-2'
              : 'bg-clarita-beige-200 text-gray-600 group-hover:bg-clarita-green-200 group-hover:text-clarita-green-700'
          }`}
      >
        {patient.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={patient.avatar_url}
            alt={initials}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name (hidden when collapsed) */}
      {!collapsed && (
        <span
          className={`text-sm truncate animate-fade-in
            ${isActive ? 'text-clarita-green-700 font-medium' : 'text-gray-600'}`}
        >
          {patient.first_name} {patient.last_name}
        </span>
      )}
    </button>
  );
}
