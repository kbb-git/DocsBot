'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '../lib/ThemeContext';

export default function ClientThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
} 