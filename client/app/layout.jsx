import './globals.css';

export const metadata = {
  title: 'SwachhGrid — Smart Waste Collection',
  description: 'Real-time smart city waste collection dashboard with live bin monitoring and dynamic truck route optimization.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          background: '#030712',
          color: '#f1f5f9',
          fontFamily: "'Inter', sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </body>
    </html>
  );
}
