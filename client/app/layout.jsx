import './globals.css';

export const metadata = {
  title: 'SwachhGrid',
  description: 'Smart Waste Collection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}

