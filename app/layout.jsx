import './globals.css';
import { Toaster } from 'sonner';
import Header from '@/components/site/header';
import Footer from '@/components/site/footer';

export const metadata = {
  metadataBase: new URL('https://uzticket-tashkent.sappycob2.chatgpt.site'),
  title: { default: 'UZTICKET — Unutilmas lahzalarga chipta', template: '%s | UZTICKET' },
  description: 'O‘zbekiston bo‘ylab konsert, teatr va sport tadbirlarini kashf eting. Joy tanlang va kassada naqd to‘lang.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }) {
  return <html lang="uz"><body><Header />{children}<Footer /><Toaster richColors position="top-center" /></body></html>;
}
