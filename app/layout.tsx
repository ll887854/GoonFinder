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
        {/* ExoClick Ad Provider Loader */}
        <script async type="application/javascript" src="https://a.magsrv.com/ad-provider.js"></script>

        {/* Your verification tags if you have them */}
        <meta name="6a97888e-site-verification" content="be2f66aa3a2612f2fec6d8f68b8f1eea" />
      </head>
      <body>{children}</body>
    </html>
  );
}
