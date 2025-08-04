import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      {user ? (
        <>
          <p>Willkommen, {user.email}</p>
          <button onClick={handleLogout}>Abmelden</button>
        </>
      ) : (
        <p>Lade Benutzerdaten...</p>
      )}
    </main>
  )
}
