import "./globals.css";

export const metadata = {
  title: "Tracing Dashboard",
  description: "Dashboard scraping lintas platform untuk TikTok, Instagram, dan Facebook Marketplace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
