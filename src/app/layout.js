import { Poppins } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getCanonicalUrl, siteConfig } from "@/lib/site-config";
import { AuthProvider } from "@/lib/context/AuthProvider";
// import AntiInspectGuard from "@/components/security/AntiInspectGuard";
import NavigationProgress from "@/components/ui/NavigationProgress";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // choose what you need
});

export const metadata = {
  metadataBase: new URL(getCanonicalUrl('/')),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: '/',
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: getCanonicalUrl('/'),
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: siteConfig.name,
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': siteConfig.name,
  },

};

export const viewport = {
  themeColor: siteConfig.themeColor,
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={` ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>

      <Script
        src="https://pl30523146.profitableratecpmnetwork.com/e8/d6/91/e8d69195a93273058c3692daaf810072.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://pl30523336.profitableratecpmnetwork.com/49/d1/5e/49d15ef820cd00dcd37dbbe8cbe15ed1.js"
        strategy="afterInteractive"
      />
      
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* <AntiInspectGuard /> */}
        <AuthProvider>
          <NavigationProgress />
          {children}
        </AuthProvider>
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
    </html>
  );
}
