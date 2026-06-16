import './globals.css'
import type { Metadata } from 'next'
import { AuthGroupProvider } from '@/components/AuthGroupProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Boardgame Tracker',
  description: 'Manage your master library, track pre-orders, and log game night scores with friends.',
  
  // Open Graph configuration (Facebook, Discord, LinkedIn, etc.)
  openGraph: {
    title: 'Boardgame Tracker',
    description: 'Manage your master library, track pre-orders, and log game night scores with friends.',
    url: 'https://boardgame-tracker-app.vercel.app/', // Replace with your actual live production URL
    siteName: 'Boardgame Tracker',
    locale: 'en_US',
    type: 'website',
  }
}

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