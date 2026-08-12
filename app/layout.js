import './styles.css';

export const metadata = {
  title: 'MJM Social Bot',
  description: 'Panel para conectar, programar y gestionar contenido en redes sociales.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
