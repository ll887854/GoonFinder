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
        {/* ExoClick provider */}
        <script
          async
          src="https://a.magsrv.com/ad-provider.js"
        ></script>

        {/* ExoClick popunder */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var adConfig = {
                  ads_host: "a.pemsrv.com",
                  syndication_host: "s.pemsrv.com",
                  idzone: 5806370,
                  frequency_period: 720,
                  frequency_count: 1,
                  trigger_method: 3,
                  capping_enabled: true
                };

                if (window.popMagic) {
                  window.popMagic.init(adConfig);
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}