import { useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Lock } from 'lucide-react'
import { auth, db } from '../firebase'

type Access = 'checking' | 'allowed'

/**
 * Con Firebase activo, exige iniciar sesión con Google y comprueba que la cuenta sea una de las dos
 * permitidas. La lista vive solo en las reglas de Firebase (no en el código público): si las reglas
 * niegan el acceso, la cuenta se expulsa y su usuario se borra de Firebase.
 */
export function AuthGate({ children }: { children: (logout: (() => void) | null) => ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(auth ? undefined : null)
  const [access, setAccess] = useState<Access>('checking')
  const [rejected, setRejected] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      auth
        ? onAuthStateChanged(auth, async (u) => {
            setAccess('checking')
            setUser(u)
            if (!u || !db) return
            try {
              await getDoc(doc(db, 'access', 'check'))
              setAccess('allowed')
            } catch (e) {
              if ((e as { code?: string }).code !== 'permission-denied') {
                // Sin conexión u otro fallo: dejamos pasar; las reglas siguen protegiendo los datos
                setAccess('allowed')
                return
              }
              setRejected(u.email)
              // Borrar el usuario evita que cuentas ajenas queden registradas en el proyecto
              await u.delete().catch(() => signOut(auth!))
            }
          })
        : undefined,
    [],
  )

  if (!auth) return <>{children(null)}</>
  if (user === undefined || (user && access === 'checking')) return <div className="splash" aria-busy="true" />

  if (!user) {
    const signIn = async () => {
      setSigningIn(true)
      setError(null)
      setRejected(null)
      try {
        const provider = new GoogleAuthProvider()
        // Siempre pregunta qué cuenta usar, para poder cambiarla tras un rechazo
        provider.setCustomParameters({ prompt: 'select_account' })
        await signInWithPopup(auth!, provider)
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
          {rejected ? (
            <p className="splash-denied">
              <Lock size={18} strokeWidth={2} aria-hidden />
              <span>
                Este es un espacio privado y la cuenta <strong>{rejected}</strong> no tiene acceso.
              </span>
            </p>
          ) : (
            <p>Lo que queremos hacer juntos, los lugares que ya conocimos y las fotos de cada momento.</p>
          )}
          <button className="btn btn-primary" onClick={signIn} disabled={signingIn}>
            {signingIn ? 'Abriendo Google…' : rejected ? 'Entrar con otra cuenta' : 'Entrar con Google'}
          </button>
          {error && <p className="field-error">{error}</p>}
        </div>
      </div>
    )
  }

  return <>{children(() => signOut(auth!))}</>
}
