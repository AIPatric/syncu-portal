// pages/login.js
import { useRouter } from 'next/router'
import { useState } from 'react'
import Image from 'next/image'
import { FaUser, FaLock, FaArrowLeft } from 'react-icons/fa'

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full animate-fade-in">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src="/logo_syncu.png" alt="Syncu Logo" width={120} height={40} />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Login</h2>
        <p className="text-sm text-center text-gray-500 mb-6">Melde dich bei deinem Syncu-Konto an</p>

        {/* Username */}
        <div className="mb-4 relative">
          <FaUser className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Benutzername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Password */}
        <div className="mb-6 relative">
          <FaLock className="absolute left-3 top-3 text-gray-400" />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md transition"
        >
          Anmelden
        </button>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-blue-500 text-sm inline-flex items-center"
          >
            <FaArrowLeft className="mr-1" />
            Zurück zur Startseite
          </button>
        </div>
      </div>
    </div>
  )
}
