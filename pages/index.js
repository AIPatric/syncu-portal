// pages/index.js
import Image from 'next/image'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  return (
    <main style={{ textAlign: 'center', padding: '4rem' }}>
      <Image src="/logo_syncu.svg" alt="Syncu Logo" width={150} height={50} />
      <h1>Willkommen bei Syncu</h1>
      <button
        style={{ marginTop: '2rem', padding: '1rem 2rem', fontSize: '1.2rem' }}
        onClick={() => router.push('/login')}
      >
        Zum Login
      </button>
    </main>
  )
}
