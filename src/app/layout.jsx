import './globals.css';
import { PwaStatusBanner } from '@/components/pwa-status';

export const metadata = {
  title: 'Sharma Dairy — Multi-Tenant Dairy ERP & SaaS Platform',
  description: 'Enterprise multi-tenant dairy operations, milk collection, billing, inventory, and accounting SaaS platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaStatusBanner />
      </body>
    </html>
  );
}
