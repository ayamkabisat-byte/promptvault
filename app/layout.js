import "./globals.css";

export const metadata = {
  title: "PromptVault - AI Gallery",
  description: "Galeri prompt AI terbaik",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}