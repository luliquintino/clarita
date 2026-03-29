'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { authApi, getUserInfo, setUserInfo } from '@/lib/api';

const LANGUAGES = [
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

export default function LanguageSelector() {
  const t = useTranslations('profile');
  const userInfo = getUserInfo();
  const currentLang = userInfo?.language ?? 'pt';
  const [saving, setSaving] = useState(false);

  const handleChange = async (lang: string) => {
    if (lang === currentLang || saving) return;
    setSaving(true);
    try {
      await authApi.updateMe({ language: lang });
      const info = getUserInfo();
      if (info) setUserInfo({ ...info, language: lang });
      window.location.reload();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{t('language')}</p>
      <p className="text-xs text-gray-400 mb-3">{t('language_subtitle')}</p>
      <div className="flex gap-2">
        {LANGUAGES.map(({ code, flag, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleChange(code)}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
              currentLang === code
                ? 'border-clarita-green-500 bg-clarita-green-50 text-clarita-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-clarita-green-300'
            }`}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
