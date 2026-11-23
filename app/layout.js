import './globals.css';

export const metadata = {
  title: 'Atha Inn · Guesthouse in Kanditheemu, Maldives',
  description: 'Rooms at Atha Inn, Sh. Kanditheemu, Maldives. Check availability and request a booking online.',
  icons: { icon: '/logo.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b4f5c' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
