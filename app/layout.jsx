import './globals.css';
import './support.css';
import './admin.css';
import './payments.css';
import './card-transfer.css';
import './maps.css';
import './receipts.css';
import './payment-decisions.css';
import 'leaflet/dist/leaflet.css';
import { Toaster } from 'sonner';
import Header from '@/components/site/header';
import Footer from '@/components/site/footer';
import SupportWidget from '@/components/site/support-widget';

export const metadata = {
  metadataBase: new URL('https://uzticket-tashkent.sappycob2.chatgpt.site'),
  title: { default: 'UZTICKET — Unutilmas lahzalarga chipta', template: '%s | UZTICKET' },
  description: 'O‘zbekiston bo‘ylab konsert, teatr va sport tadbirlarini kashf eting. Joy tanlang va kassada naqd to‘lang.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }) {
  return <html lang="uz" data-scroll-behavior="smooth"><body><Header />{children}<Footer /><SupportWidget /><Toaster richColors position="top-center" /></body></html>;
}
