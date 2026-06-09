import './globals.css'
import { AuthGroupProvider } from '@/components/AuthGroupProvider'
import { Toaster } from 'react-hot-toast'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans">
        <AuthGroupProvider>
          {children}
          <Toaster position="bottom-right" />
        </AuthGroupProvider>
      </body>
    </html>
  )
}