import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Sin configuración de Firebase la app funciona en modo local (localStorage, sin fotos). */
export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

const app = firebaseEnabled ? initializeApp(config) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

/*
 * Solo para pruebas locales (VITE_FIREBASE_EMULATORS=true): usa los emuladores de Firebase en
 * vez del proyecto real y permite entrar con cuentas de prueba. En producción esta rama no
 * existe (la variable se reemplaza al compilar) y scripts/check-deploy.mjs impide publicarla.
 */
if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true' && auth && db && storage) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  Object.assign(window, {
    __testSignIn: (email: string, name: string) =>
      signInWithCredential(auth!, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, name, email_verified: true }))),
    __testIdToken: () => auth!.currentUser?.getIdToken(),
  })
}

