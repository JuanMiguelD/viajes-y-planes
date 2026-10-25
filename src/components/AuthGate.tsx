import { useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth } from '../firebase'

/** Con Firebase activo, exige iniciar sesión con Google. Las reglas de Firestore y Storage limitan quién entra. */
export function AuthGate({ children }: { children: (logout: (() => void) | null) => ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(auth ? undefined : null)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), [])

  if (!auth) return <>{children(null)}</>
  if (user === undefined) return <div className="splash" aria-busy="true" />

  if (!user) {
    const signIn = async () => {
      setSigningIn(true)
      setError(null)
      try {
        await signInWithPopup(auth!, new GoogleAuthProvider())
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
          setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
      } finally {
        setSigningIn(false)
      }
    }
    return (
      <div className="splash">
        <div className="splash-inner">
          <h1 className="splash-title">Nuestros planes</h1>
          <p>Lo que queremos hacer juntos, los lugares que ya conocimos y las fotos de cada momento.</p>
          <button className="btn btn-primary" onClick={signIn} disabled={signingIn}>
            {signingIn ? 'Abriendo Google…' : 'Entrar con Google'}
          </button>
          {error && <p className="field-error">{error}</p>}
        </div>
      </div>
    )
  }

  return <>{children(() => signOut(auth!))}</>
}
