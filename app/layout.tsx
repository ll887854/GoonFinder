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
        {/* ExoClick Site Verification */}
        <meta name="6a97888e-site-verification" content="be2f66aa3a2612f2fec6d8f68b8f1eea" />

        {/* Google verification if you added it earlier */}
        {/* <meta name="google-site-verification" content="your-google-code" /> */}
      </head>
      <body>{children}</body>
    </html>
  );
}
