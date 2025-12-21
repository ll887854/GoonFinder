import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goon Finder',
  description: 'Free NSFW Reverse Image Search Tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* ExoClick Ad Provider */}
       <script async type="application/javascript" src="https://a.magsrv.com/ad-provider.js"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
