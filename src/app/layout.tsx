import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "@/lib/swr-provider";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMC CRM · Strategic Mind Chess",
  description: "Chess Academy Management System for Strategic Mind Chess.",
};

// Inline script to set the dark class before React hydrates — prevents flash
const themeScript = `
  (function(){
    try {
      var t = localStorage.getItem('smc-theme');
      if (t !== 'light') document.documentElement.classList.add('dark');
    } catch(e){}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <SWRProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}


