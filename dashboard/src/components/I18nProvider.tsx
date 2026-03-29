'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';
import { getUserInfo } from '@/lib/api';
import ptMessages from '../../messages/pt.json';

type Messages = Record<string, unknown>;

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const userInfo = typeof window !== 'undefined' ? getUserInfo() : null;
  const initialLocale = (userInfo?.language ?? 'pt') as string;

  const [locale, setLocale] = useState(initialLocale);
  const [messages, setMessages] = useState<Messages>(
    initialLocale === 'pt' ? (ptMessages as Messages) : {}
  );

  useEffect(() => {
    const info = getUserInfo();
    const lang = info?.language ?? 'pt';
    if (lang === 'pt') {
      setLocale('pt');
      setMessages(ptMessages as Messages);
    } else {
      import(`../../messages/${lang}.json`).then((mod) => {
        setLocale(lang);
        setMessages(mod.default as Messages);
      });
    }
  }, []);

  if (Object.keys(messages).length === 0) return null;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
