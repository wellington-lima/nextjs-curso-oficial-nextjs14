import '@/app/ui/global.css'
import localFont from 'next/font/local'
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Dashboard',
    default: 'Acme Dashboard',
  },
  description: 'The official Next.js Course Dashboard, built with App Router.',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
};

const FreightSansLightRegular = localFont({
  src: '../public/fonts/FreightSansLightRegular.ttf',
  display: 'swap'
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${FreightSansLightRegular.className}`} >{children}</body>
    </html>
  );
}
