import type { Metadata } from 'next';
import './styles/globals.css';
import ClientThemeProvider from './components/ClientThemeProvider';

export const metadata: Metadata = {
  title: 'Checkout Docs Helper',
  description: 'AI Agent to help with Checkout.com documentation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientThemeProvider>
          <main>{children}</main>
        </ClientThemeProvider>
      </body>
    </html>
  );
} 