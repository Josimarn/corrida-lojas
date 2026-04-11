import './globals.css'

export const metadata = {
  title: 'Corrida das Lojas',
  description: 'Sistema de metas e desempenho de vendedores',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
