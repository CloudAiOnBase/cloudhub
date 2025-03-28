import './globals.css';
import { WalletProvider } from '@/lib/wallet';
import LayoutShell from '@/components/LayoutShell';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'CloudHub',
  description: 'Staking and governance app for CloudAI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50">
        <WalletProvider>
          <LayoutShell>{children}</LayoutShell>
        </WalletProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937', // Tailwind gray-800
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
            },
            error: {
              style: {
                background: '#dc2626', // Tailwind red-600
              },
            },
            success: {
              style: {
                background: '#16a34a', // Tailwind green-600
              },
            },
          }}
        />
      </body>
    </html>
  );
}
