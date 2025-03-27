import './globals.css';
import { WalletProvider } from '@/lib/wallet';
import LayoutShell from '@/components/LayoutShell';

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
      </body>
    </html>
  );
}
