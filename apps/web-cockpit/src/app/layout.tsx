import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { UiModeProvider } from '@/context/UiModeContext';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'AegisPay 🛡️ — Autonomous Agentic Cockpit & Arbitration Clearinghouse',
  description: 'PayPal Agentic Cockpit, AG Grid Enterprise Clearinghouse & Multi-Modal Dispute Arbiter',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('aegispay-theme') || 'system';
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (saved === 'system' && prefersDark)) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className="bg-slate-50 dark:bg-[#060b14] text-slate-900 dark:text-slate-100 antialiased h-full min-h-screen flex flex-col transition-colors duration-200">
        <ThemeProvider>
          <UiModeProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1 flex flex-col min-h-0">
                {children}
              </main>
            </AuthProvider>
          </UiModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
