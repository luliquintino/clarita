'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';
import { getUserInfo } from '@/lib/api';

type Messages = Record<string, unknown>;

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('pt');
  const [messages, setMessages] = useState<Messages>({});

  useEffect(() => {
    const userInfo = getUserInfo();
    const lang = userInfo?.language ?? 'pt';
    setLocale(lang);
    import(`../../messages/${lang}.json`).then((mod) => setMessages(mod.default));
  }, []);

  if (Object.keys(messages).length === 0) return null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
