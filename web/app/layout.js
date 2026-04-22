import "./globals.css";

export const metadata = {
  title: "Tracing MVP",
  description: "Local dashboard for TikTok, Instagram, and Facebook Marketplace scraping",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
