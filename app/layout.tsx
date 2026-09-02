import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Applied Mathematics at the University of Waterloo, specializing in scientific machine learning. Projects in constrained multi-agent RL, counterfactual evaluation and overfit detection, on a portfolio you play like a CD deck.";

export const metadata: Metadata = {
  // The tab title is the charming one; the OG/search title leads with the name,
  // because that is the string someone scans for in a list of applications.
  title: "Yousuf's CDs",
  description: DESCRIPTION,
  // Relative OG/Twitter image URLs are resolved against this. Without it they
  // are dropped, and the card renders with no image at all.
  metadataBase: new URL("https://yousufrashid.com"),
  openGraph: {
    type: "website",
    title: "Yousuf Rashid | Applied Math @ Waterloo",
    description: DESCRIPTION,
    siteName: "Yousuf's CDs",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yousuf Rashid | Applied Math @ Waterloo",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* main, not a bare div: it gives screen readers a content landmark to
          jump to, which matters more here than usual because the page opens
          with a large decorative WebGL canvas. */}
      <body className="min-h-full flex flex-col">
        <main className="flex min-h-full flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
