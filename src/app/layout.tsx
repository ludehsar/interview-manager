import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const bootScript = `try{var d=document.documentElement;d.classList.toggle('dark',window.matchMedia('(prefers-color-scheme: dark)').matches);if(localStorage.getItem('sidebar:collapsed')==='true')d.setAttribute('data-sidebar','collapsed')}catch(e){}`

export const metadata: Metadata = {
  title: {
    default: 'Remote Jobs & AI Resumes',
    template: '%s · Remote Jobs & AI Resumes',
  },
  description:
    'Remote jobs from reliable sources worldwide, APAC and Bangladesh, with AI-generated resumes tailored to each role.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  )
}
