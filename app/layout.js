import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Rhino Performance",
  description: "Strength training met de RPE methode",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <main style={{ flex: 1, padding: "16px 16px 80px" }}>
            {children}
          </main>
          <Nav />
        </div>
      </body>
    </html>
  );
}
