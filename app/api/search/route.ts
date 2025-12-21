import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Goon Finder',
  description: 'Free NSFW Reverse Image Search Tool',
  other: {
    'google-site-verification':
      'Ky-6wCy-Vr5BmW7Q77GZzzDOJGnVHS_3_nuhy8MqWP0',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
