"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Bell,
  User,
  Filter,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { Alert } from "@/lib/api";

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string) => Promise<void>;
  showPatientName?: boolean;
}

const severityConfig: Record<
  string,
  {
    icon: React.ReactNode;
    iconSmall: React.ReactNode;
    badgeClass: string;
    borderColor: string;
    glowShadow: string;
    cardGradient: string;
    summaryGradient: string;
    summaryBorder: string;
    summaryIconBg: string;
    counterColor: string;
    pillActive: string;
    pillText: string;
    label: string;
  }
> = {
  critical: {
    icon: <AlertTriangle size={20} />,
    iconSmall: <AlertTriangle size={14} />,
    badgeClass: "badge-red",
    borderColor: "border-l-red-500",
    glowShadow: "shadow-glow-red",
    cardGradient: "bg-gradient-to-r from-red-50/40 to-transparent",
    summaryGradient: "bg-gradient-to-br from-red-50 via-red-100/60 to-white/50",
    summaryBorder: "border-red-200/50 hover:border-red-300/60",
    summaryIconBg: "bg-red-100/80 text-red-500",
    counterColor: "text-red-600",
    pillActive: "bg-gradient-to-r from-red-500 to-red-400 text-white shadow-md",
    pillText: "text-red-600",
    label: "Critico",
  },
  high: {
    icon: <AlertCircle size={20} />,
    iconSmall: <AlertCircle size={14} />,
    badgeClass: "badge-orange",
    borderColor: "border-l-orange-500",
    glowShadow: "shadow-glow-orange",
    cardGradient: "bg-gradient-to-r from-orange-50/30 to-transparent",
    summaryGradient: "bg-gradient-to-br from-orange-50 via-orange-100/60 to-white/50",
    summaryBorder: "border-orange-200/50 hover:border-orange-300/60",
    summaryIconBg: "bg-orange-100/80 text-orange-500",
    counterColor: "text-orange-600",
    pillActive: "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-md",
    pillText: "text-orange-600",
    label: "Alto",
  },
  medium: {
    icon: <Bell size={20} />,
    iconSmall: <Bell size={14} />,
    badgeClass: "badge-yellow",
    borderColor: "border-l-yellow-500",
    glowShadow: "shadow-glow-yellow",
    cardGradient: "bg-gradient-to-r from-yellow-50/30 to-transparent",
    summaryGradient: "bg-gradient-to-br from-yellow-50 via-yellow-100/60 to-white/50",
    summaryBorder: "border-yellow-200/50 hover:border-yellow-300/60",
    summaryIconBg: "bg-yellow-100/80 text-yellow-600",
    counterColor: "text-yellow-600",
    pillActive: "bg-gradient-to-r from-yellow-500 to-yellow-400 text-white shadow-md",
    pillText: "text-yellow-600",
    label: "Medio",
  },
  low: {
    icon: <Info size={20} />,
    iconSmall: <Info size={14} />,
    badgeClass: "badge-blue",
    borderColor: "border-l-clarita-blue-400",
    glowShadow: "shadow-glow-blue",
    cardGradient: "bg-gradient-to-r from-clarita-blue-50/30 to-transparent",
    summaryGradient: "bg-gradient-to-br from-clarita-blue-50 via-clarita-blue-100/60 to-white/50",
    summaryBorder: "border-clarita-blue-200/50 hover:border-clarita-blue-300/60",
    summaryIconBg: "bg-clarita-blue-100/80 text-clarita-blue-500",
    counterColor: "text-clarita-blue-500",
    pillActive: "bg-gradient-to-r from-clarita-blue-500 to-clarita-blue-400 text-white shadow-md",
    pillText: "text-clarita-blue-500",
    label: "Baixo",
  },
};

type SeverityKey = "critical" | "high" | "medium" | "low";
type FilterKey = "all" | SeverityKey;

export default function AlertsPanel({
  alerts,
  onAcknowledge,
  onResolve,
  showPatientName = true,
}: AlertsPanelProps) {
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await onAcknowledge(alertId);
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setAcknowledging(null);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged");

  const groupedAlerts = {
    critical: activeAlerts.filter((a) => a.severity === "critical"),
    high: activeAlerts.filter((a) => a.severity === "high"),
    medium: activeAlerts.filter((a) => a.severity === "medium"),
    low: activeAlerts.filter((a) => a.severity === "low"),
  };

  // Determine which severity groups to display based on filter
  const severitiesToShow: SeverityKey[] =
    activeFilter === "all"
      ? (["critical", "high", "medium", "low"] as const).filter(
          (s) => groupedAlerts[s].length > 0
        )
      : groupedAlerts[activeFilter].length > 0
      ? [activeFilter]
      : [];

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "critical", label: "Critico" },
    { key: "high", label: "Alto" },
    { key: "medium", label: "Medio" },
    { key: "low", label: "Baixo" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary counters — glassmorphism cards with severity glow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(["critical", "high", "medium", "low"] as const).map((severity, idx) => {
          const config = severityConfig[severity];
          const count = groupedAlerts[severity].length;

          return (
            <button
              key={severity}
              onClick={() =>
                setActiveFilter(activeFilter === severity ? "all" : severity)
              }
              className={`
                relative bg-white/70 backdrop-blur-xl rounded-3xl p-5 text-center
                border transition-all duration-300 group cursor-pointer
                ${activeFilter === severity ? `${config.glowShadow} ${config.summaryBorder} ring-1 ring-white/50` : `border-white/40 hover:${config.glowShadow} ${config.summaryBorder}`}
                animate-fade-in
              `}
              style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "backwards" }}
            >
              {/* Severity gradient tint overlay */}
              <div className={`absolute inset-0 rounded-3xl ${config.summaryGradient} opacity-40 pointer-events-none`} />

              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl ${config.summaryIconBg} mb-3 mx-auto transition-transform duration-300 group-hover:scale-110`}>
                  {config.icon}
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-0.5">{count}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{config.label}</p>
              </div>

              {/* Active indicator ring */}
              {activeFilter === severity && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-gradient-to-br from-clarita-green-400 to-clarita-purple-400 border-2 border-white animate-scale-in" />
              )}
            </button>
          );
        })}
      </div>

      {/* Pill-style filter bar */}
      <div className="bg-white/50 backdrop-blur-md rounded-2xl p-2 border border-white/30 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 text-gray-400">
            <Filter size={14} />
            <span className="text-xs font-medium hidden sm:inline">Filtrar:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.key;
              const severityConf = opt.key !== "all" ? severityConfig[opt.key] : null;
              return (
                <button
                  key={opt.key}
                  onClick={() => setActiveFilter(opt.key)}
                  className={`
                    px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300
                    ${isActive
                      ? opt.key === "all"
                        ? "bg-gradient-to-r from-clarita-green-500 to-clarita-purple-500 text-white shadow-md"
                        : severityConf!.pillActive
                      : "text-gray-500 hover:bg-white/60 hover:text-gray-700"
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
                    {opt.key !== "all" && severityConf && (
                      <span className={isActive ? "text-white/90" : severityConf.pillText}>
                        {severityConf.iconSmall}
                      </span>
                    )}
                    {opt.label}
                    {opt.key !== "all" && (
                      <span className={`
                        inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold
                        ${isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 text-gray-500"
                        }
                      `}>
                        {groupedAlerts[opt.key as SeverityKey].length}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active alerts by severity */}
      {severitiesToShow.map((severity) => {
        const alertsInGroup = groupedAlerts[severity];
        const config = severityConfig[severity];

        return (
          <div key={severity} className="animate-fade-in">
            <h4 className={`text-sm font-semibold ${config.counterColor} mb-3 flex items-center gap-2`}>
              {config.icon}
              {config.label} ({alertsInGroup.length})
            </h4>
            <div className="space-y-3">
              {alertsInGroup.map((alert, alertIdx) => (
                <div
                  key={alert.id}
                  className={`
                    bg-white/70 backdrop-blur-xl rounded-3xl p-5
                    border border-white/40 border-l-4 ${config.borderColor}
                    ${config.cardGradient}
                    transition-all duration-300
                    hover:shadow-lg hover:bg-white/80 hover:-translate-y-0.5
                    ${severity === "critical" ? config.glowShadow : "shadow-soft"}
                    animate-slide-up
                  `}
                  style={{ animationDelay: `${alertIdx * 60}ms`, animationFillMode: "backwards" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <h5 className="font-semibold text-gray-800 text-sm leading-snug">
                          {alert.title}
                        </h5>
                        <span className={`${config.badgeClass} text-[10px]`}>
                          {alert.type}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        {alert.description}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        {showPatientName && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white/50 rounded-full px-2.5 py-1">
                            <User size={12} className="text-gray-400" />
                            {alert.patient_name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Acknowledge button — gradient with check icon */}
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledging === alert.id}
                      className="btn-primary text-xs flex-shrink-0 flex items-center gap-1.5 py-2.5 px-5 rounded-2xl"
                    >
                      <CheckCircle size={14} />
                      {acknowledging === alert.id
                        ? "..."
                        : "Reconhecer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state — when no alerts match filter or no active alerts */}
      {activeAlerts.length === 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-soft py-16 text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-clarita-green-100/60 mb-4">
            <CheckCircle size={32} className="text-clarita-green-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">Nenhum alerta ativo</p>
          <p className="text-xs text-gray-400 mt-1">
            Todos os pacientes estao dentro dos parametros normais
          </p>
        </div>
      )}

      {activeFilter !== "all" && severitiesToShow.length === 0 && activeAlerts.length > 0 && (
        <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-white/30 py-12 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100/60 mb-3">
            <Filter size={20} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Nenhum alerta com severidade &ldquo;{filterOptions.find(f => f.key === activeFilter)?.label}&rdquo;</p>
          <button
            onClick={() => setActiveFilter("all")}
            className="mt-3 text-xs font-medium text-clarita-purple-500 hover:text-clarita-purple-600 transition-colors"
          >
            Mostrar todos os alertas
          </button>
        </div>
      )}

      {/* Acknowledged alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="animate-fade-in">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-clarita-green-400" />
            Reconhecidos Recentemente ({acknowledgedAlerts.length})
          </h4>
          <div className="space-y-2">
            {acknowledgedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="bg-white/40 backdrop-blur-sm rounded-2xl py-3 px-4 border border-white/20 opacity-60 hover:opacity-80 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-clarita-green-100/60">
                      <CheckCircle size={13} className="text-clarita-green-500" />
                    </div>
                    <span className="text-sm text-gray-600">{alert.title}</span>
                    {showPatientName && (
                      <span className="text-xs text-gray-400">
                        &middot; {alert.patient_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {alert.acknowledged_by &&
                      `por ${alert.acknowledged_by}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
