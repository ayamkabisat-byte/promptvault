import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });

export const metadata = {
  title: {
    default: "PromptVault — Curated AI Prompt Library",
    template: "%s · PromptVault",
  },
  description: "Discover, copy, save, and share curated AI visual prompts for photography, graphic design, illustration, and generative workflows.",
  metadataBase: new URL("https://promptkeren.vercel.app"),
  openGraph: {
    title: "PromptVault — Curated AI Prompt Library",
    description: "A dynamic visual library for discovering and reusing AI prompts.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${dmSans.variable} ${dmSerif.variable}`}>{children}</body>
    </html>
  );
}
