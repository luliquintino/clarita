"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface DisplayIdBadgeProps {
  displayId: string;
  label?: string;
  size?: "sm" | "md";
}

export default function DisplayIdBadge({
  displayId,
  label,
  size = "md",
}: DisplayIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = displayId;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSmall = size === "sm";

  return (
    <div className="inline-flex items-center gap-2">
      {label && (
        <span
          className={`font-medium text-gray-400 ${isSmall ? "text-xs" : "text-sm"}`}
        >
          {label}
        </span>
      )}
      <button
        onClick={handleCopy}
        className={`group inline-flex items-center gap-2
          bg-white/60 backdrop-blur-sm rounded-full border border-white/40 shadow-soft
          hover:bg-white/80 hover:shadow-soft-lg hover:border-white/60
          transition-all duration-300 ease-out cursor-pointer
          ${isSmall ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"}
          ${copied ? "border-clarita-green-300/60 bg-clarita-green-50/60 shadow-glow-green" : ""}`}
        title="Clique para copiar"
      >
        <span className="font-mono text-xs text-gray-500 tracking-wide">
          {displayId}
        </span>
        <span
          className={`inline-flex items-center justify-center rounded-full transition-all duration-300 ease-out
            ${isSmall ? "w-5 h-5" : "w-6 h-6"}
            ${
              copied
                ? "bg-gradient-to-br from-clarita-green-400 to-clarita-green-600 text-white shadow-glow-green"
                : "bg-gradient-to-br from-clarita-purple-100 to-clarita-purple-200 text-clarita-purple-500 group-hover:from-clarita-purple-400 group-hover:to-clarita-green-400 group-hover:text-white group-hover:shadow-glow-purple"
            }`}
        >
          {copied ? (
            <Check size={isSmall ? 10 : 12} />
          ) : (
            <Copy size={isSmall ? 10 : 12} />
          )}
        </span>
      </button>
      {copied && (
        <span
          className={`text-clarita-green-600 font-medium animate-scale-in ${isSmall ? "text-xs" : "text-sm"}`}
        >
          Copiado!
        </span>
      )}
    </div>
  );
}
