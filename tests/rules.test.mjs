// Tests de firestore.rules y storage.rules contra los emuladores de Firebase.
// Ejecutar con: npm run test:rules (nunca toca el proyecto real: usa un proyecto "demo-").
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage'

const ALLOWED = ['nosotros@example.com', 'novia@example.com']
const PHOTO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])

let env
const as = (email, verified = true) =>
  env.authenticatedContext(email, { email, email_verified: verified })

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-viajesyplanes',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), 'config/acceso'), { correos: ALLOWED })
    await setDoc(doc(admin.firestore(), 'plans/p1'), { title: 'Plan' })
    await uploadBytes(ref(admin.storage(), 'plans/p1/foto.jpg'), PHOTO, { contentType: 'image/jpeg' })
  })
})

after(() => env?.cleanup())

for (const email of ALLOWED) {
  describe(`acceso permitido: ${email}`, () => {
    test('lee, crea y borra planes', async () => {
      const db = as(email).firestore()
      await assertSucceeds(getDocs(collection(db, 'plans')))
      await assertSucceeds(setDoc(doc(db, 'plans/p2'), { title: 'Otro' }))
      await assertSucceeds(deleteDoc(doc(db, 'plans/p2')))
    })
    test('lee y cambia los ajustes compartidos (config/settings)', async () => {
      const db = as(email).firestore()
      await assertSucceeds(setDoc(doc(db, 'config/settings'), { theme: 'cafe' }))
      await assertSucceeds(getDoc(doc(db, 'config/settings')))
    })
    test('pasa la comprobación de acceso del login', () =>
      assertSucceeds(getDoc(doc(as(email).firestore(), 'access/check'))))
    test('ve, sube y borra fotos', async () => {
      const storage = as(email).storage()
      await assertSucceeds(getBytes(ref(storage, 'plans/p1/foto.jpg')))
      await assertSucceeds(uploadBytes(ref(storage, 'plans/p1/nueva.png'), PHOTO, { contentType: 'image/png' }))
      await assertSucceeds(deleteObject(ref(storage, 'plans/p1/nueva.png')))
    })
  })
}

describe('límites aun teniendo acceso', () => {
  const email = ALLOWED[0]
  test('no puede leer ni cambiar la lista de correos', async () => {
    const db = as(email).firestore()
    await assertFails(getDoc(doc(db, 'config/acceso')))
    await assertFails(setDoc(doc(db, 'config/acceso'), { correos: [email, 'otro@example.com'] }))
  })
  test('no puede escribir fuera de plans', () =>
    assertFails(setDoc(doc(as(email).firestore(), 'otra/x'), { a: 1 })))
  test('no puede subir SVG (puede llevar scripts)', () =>
    assertFails(uploadBytes(ref(as(email).storage(), 'plans/p1/x.svg'), PHOTO, { contentType: 'image/svg+xml' })))
  test('no puede subir archivos que no son fotos', () =>
    assertFails(uploadBytes(ref(as(email).storage(), 'plans/p1/x.txt'), PHOTO, { contentType: 'text/plain' })))
  test('no puede subir fotos de 15 MB o más', () =>
    assertFails(
      uploadBytes(ref(as(email).storage(), 'plans/p1/grande.jpg'), new Uint8Array(15 * 1024 * 1024), {
        contentType: 'image/jpeg',
      }),
    ))
  test('no puede subir fuera de plans/{plan}/', () =>
    assertFails(uploadBytes(ref(as(email).storage(), 'otra/foto.jpg'), PHOTO, { contentType: 'image/jpeg' })))
})

const outsiders = {
  'cuenta ajena': () => as('intruso@example.com'),
  'correo permitido sin verificar': () => as(ALLOWED[0], false),
  'sin iniciar sesión': () => env.unauthenticatedContext(),
}
for (const [who, ctx] of Object.entries(outsiders)) {
  describe(`acceso denegado: ${who}`, () => {
    test('no lee ni escribe planes', async () => {
      const db = ctx().firestore()
      await assertFails(getDocs(collection(db, 'plans')))
      await assertFails(getDoc(doc(db, 'plans/p1')))
      await assertFails(setDoc(doc(db, 'plans/p2'), { title: 'x' }))
      await assertFails(deleteDoc(doc(db, 'plans/p1')))
    })
    test('no lee ni cambia los ajustes compartidos', async () => {
      const db = ctx().firestore()
      await assertFails(getDoc(doc(db, 'config/settings')))
      await assertFails(setDoc(doc(db, 'config/settings'), { theme: 'x' }))
    })
    test('falla la comprobación de acceso del login', () => assertFails(getDoc(doc(ctx().firestore(), 'access/check'))))
    test('no ve, sube ni borra fotos', async () => {
      const storage = ctx().storage()
      await assertFails(getBytes(ref(storage, 'plans/p1/foto.jpg')))
      await assertFails(uploadBytes(ref(storage, 'plans/p1/b.jpg'), PHOTO, { contentType: 'image/jpeg' }))
      await assertFails(deleteObject(ref(storage, 'plans/p1/foto.jpg')))
    })
  })
}

describe('Palabritas: la mesa y la palabra secreta', () => {
  const [setter, guesser] = ALLOWED
  const room = (db) => doc(db, 'games/palabritas')
  const secret = (db) => doc(db, 'games/palabritas/private/secret')
  const seedSecret = () =>
    env.withSecurityRulesDisabled((admin) =>
      setDoc(doc(admin.firestore(), 'games/palabritas/private/secret'), { word: 'gato', setterUid: setter, round: 1 }),
    )

  beforeEach(() =>
    env.withSecurityRulesDisabled((admin) =>
      setDoc(doc(admin.firestore(), 'games/palabritas'), { phase: 'setup', setterUid: setter, guesserUid: guesser }),
    ),
  )

  test('los dos leen y actualizan la mesa', async () => {
    await assertSucceeds(getDoc(room(as(guesser).firestore())))
    await assertSucceeds(updateDoc(room(as(guesser).firestore()), { phase: 'playing' }))
  })
  test('quien elige guarda y lee su palabra', async () => {
    const db = as(setter).firestore()
    await assertSucceeds(setDoc(secret(db), { word: 'gato', setterUid: setter, round: 1 }))
    await assertSucceeds(getDoc(secret(db)))
  })
  test('quien adivina no puede leer la palabra', async () => {
    await seedSecret()
    await assertFails(getDoc(secret(as(guesser).firestore())))
  })
  test('ni haciéndose pasar en la mesa por quien elige', async () => {
    await seedSecret()
    const db = as(guesser).firestore()
    await assertSucceeds(updateDoc(room(db), { setterUid: guesser }))
    await assertFails(getDoc(secret(db)))
  })
  test('quien adivina no puede escribir la palabra si no le toca elegir', () =>
    assertFails(setDoc(secret(as(guesser).firestore()), { word: 'perro', setterUid: guesser, round: 1 })))
  test('nadie puede guardar la palabra a nombre del otro', () =>
    assertFails(setDoc(secret(as(setter).firestore()), { word: 'perro', setterUid: guesser, round: 1 })))
  test('alguien de fuera no ve la mesa ni la palabra', async () => {
    await seedSecret()
    const db = as('intruso@example.com').firestore()
    await assertFails(getDoc(room(db)))
    await assertFails(getDoc(secret(db)))
  })
})

describe('sin el documento config/acceso', () => {
  test('nadie entra, ni siquiera ustedes (crear config/acceso antes de publicar las reglas)', async () => {
    await env.withSecurityRulesDisabled((admin) => deleteDoc(doc(admin.firestore(), 'config/acceso')))
    await assertFails(getDocs(collection(as(ALLOWED[0]).firestore(), 'plans')))
    await assertFails(getBytes(ref(as(ALLOWED[0]).storage(), 'plans/p1/foto.jpg')))
  })
})
