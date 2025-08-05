import Image from 'next/image'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 lg:p-16 max-w-2xl w-full text-center">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo_syncu.png" alt="Syncu Logo" width={180} height={60} />
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-[#111] mb-4">
          Willkommen bei Syncu
        </h1>
        <p className="text-lg text-[#333] mb-8">
          Ihre intelligente Lösung für automatisierte Unternehmensprozesse.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push('/login')}
          className="bg-[#2d9cdb] hover:bg-[#5cb682] text-white font-medium py-3 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
        >
          Zum Login
        </button>
      </div>
    </div>
  )
}
