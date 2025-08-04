// pages/dashboard.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Image from 'next/image'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    })
  }, [])

  if (!user) return null

  return (
    <main style={{ textAlign: 'center', padding: '4rem' }}>
      <Image src="/logo_mikaeli.svg" alt="Mikaeli Logo" width={150} height={50} />
      <h1>Willkommen, {user.email}</h1>
      <p>Dies ist dein Dashboard für Mikaeli.</p>
    </main>
  )
}
