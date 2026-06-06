import type { Metadata } from "next";
import {
  Inter,
  Instrument_Serif,
  Noto_Serif_Devanagari,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const notoDeva = Noto_Serif_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mind Mirage · Admin", template: "%s · Mind Mirage Admin" },
  description: "Team portal for Mind Mirage.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${notoDeva.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
