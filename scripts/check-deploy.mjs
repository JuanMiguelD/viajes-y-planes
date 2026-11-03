// Se ejecuta antes de cada `firebase deploy` (predeploy en firebase.json).
// Evita publicar una versión rota o en "modo local": nunca imprime los valores, solo los nombres.
import { readFileSync } from 'node:fs'
import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), 'VITE_')
const fail = (msg) => {
  console.error(`\n✖ No se puede publicar: ${msg}\n`)
  process.exit(1)
}

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_MAPS_API_KEY',
]
const missing = required.filter((key) => !env[key]?.trim())
if (missing.length > 0) {
  fail(`faltan variables en .env.local (${missing.join(', ')}). Sin ellas la app publicada no tendría login, fotos o mapa.`)
}

// El build debe apuntar al mismo proyecto al que se va a desplegar
const target = process.env.GCLOUD_PROJECT || JSON.parse(readFileSync('.firebaserc', 'utf8')).projects?.default
if (target && env.VITE_FIREBASE_PROJECT_ID !== target) {
  fail(`el .env.local es del proyecto "${env.VITE_FIREBASE_PROJECT_ID}" pero se está desplegando a "${target}".`)
}

// El login con Google abre un iframe del authDomain: si la CSP no lo permite, nadie puede entrar
const csp = JSON.stringify(JSON.parse(readFileSync('firebase.json', 'utf8')).hosting.headers)
if (!csp.includes(`https://${env.VITE_FIREBASE_AUTH_DOMAIN}`)) {
  fail(`la CSP de firebase.json no permite https://${env.VITE_FIREBASE_AUTH_DOMAIN} en frame-src; el login con Google fallaría.`)
}

console.log('✔ Configuración completa para publicar.')
