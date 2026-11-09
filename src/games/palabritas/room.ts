import { doc, getDoc, runTransaction, updateDoc, type Firestore } from 'firebase/firestore'
import {
  DEFAULT_ATTEMPTS,
  evaluateGuess,
  isCorrectGuess,
  isValidWord,
  MAX_LENGTH,
  MIN_LENGTH,
  normalizeWord,
  type GuessRecord,
} from './logic'

/*
 * La mesa de Palabritas vive en Firestore (games/palabritas), compartida en tiempo real entre los
 * dos. La palabra secreta va aparte (games/palabritas/private/secret) y las reglas solo dejan
 * leerla a quien la eligió: por eso es su dispositivo el que revela los colores de cada intento.
 */

export type Phase = 'lobby' | 'voting' | 'setup' | 'playing' | 'finished'

export interface Player {
  name: string
  lastSeen: number
}

export interface RoundRecord {
  round: number
  winnerUid: string | null
  word: string
  attemptsUsed: number
  maxAttempts: number
  surrendered: boolean
  at: number
}

export interface Room {
  phase: Phase
  players: Record<string, Player>
  round: number
  setterUid: string | null
  guesserUid: string | null
  wordLength: number | null
  maxAttempts: number
  attemptsLeft: number
  guesses: GuessRecord[]
  /** Intento enviado que todavía no revisa el dispositivo de quien puso la palabra */
  pending: { id: string; word: string } | null
  winnerUid: string | null
  surrendered: boolean
  revealedWord: string | null
  score: Record<string, number>
  history: RoundRecord[]
  votes: Record<string, string>
  voteResult: string | null
  votingDoneAt: number | null
  ready: string[]
}

export interface Me {
  uid: string
  name: string
}

/** Cuánto dura la animación de la votación antes de pasar a elegir la palabra */
export const VOTE_REVEAL_MS = 3800
const HISTORY_LIMIT = 30

export const roomRef = (db: Firestore) => doc(db, 'games', 'palabritas')
export const secretRef = (db: Firestore) => doc(db, 'games', 'palabritas', 'private', 'secret')

const freshRound = {
  wordLength: null,
  maxAttempts: DEFAULT_ATTEMPTS,
  attemptsLeft: DEFAULT_ATTEMPTS,
  guesses: [],
  pending: null,
  winnerUid: null,
  surrendered: false,
  revealedWord: null,
  ready: [],
} satisfies Partial<Room>

function emptyRoom(me: Me): Room {
  return {
    phase: 'lobby',
    players: { [me.uid]: { name: me.name, lastSeen: Date.now() } },
    round: 0,
    setterUid: null,
    guesserUid: null,
    ...freshRound,
    score: { [me.uid]: 0 },
    history: [],
    votes: {},
    voteResult: null,
    votingDoneAt: null,
  }
}

export class GameError extends Error {}

/** Cada acción lee la mesa y la reescribe dentro de una transacción, para que nunca se pisen. */
async function change(db: Firestore, fn: (room: Room) => Partial<Room> | null): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(db))
    if (!snap.exists()) throw new GameError('La mesa todavía no existe.')
    const patch = fn(snap.data() as Room)
    if (patch) tx.update(roomRef(db), patch)
  })
}

/** Sentarse a la mesa: la crea si no existe; con los dos sentados, empieza la votación. */
export async function joinTable(db: Firestore, me: Me): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(db))
    if (!snap.exists()) {
      tx.set(roomRef(db), emptyRoom(me))
      return
    }
    const room = snap.data() as Room
    const players = { ...room.players }
    const already = Boolean(players[me.uid])
    if (!already && Object.keys(players).length >= 2) throw new GameError('La mesa ya tiene a sus dos jugadores.')
    players[me.uid] = { name: me.name, lastSeen: Date.now() }
    const patch: Partial<Room> = { players }
    if (!already) patch.score = { ...room.score, [me.uid]: room.score?.[me.uid] ?? 0 }
    if (room.phase === 'lobby' && Object.keys(players).length === 2) {
      Object.assign(patch, { phase: 'voting', votes: {}, voteResult: null, votingDoneAt: null })
    }
    tx.update(roomRef(db), patch)
  })
}

/** Señal de "estoy en el juego" para mostrar si el otro está conectado. */
export function heartbeat(db: Firestore, me: Me): Promise<void> {
  return updateDoc(roomRef(db), { [`players.${me.uid}.lastSeen`]: Date.now() })
}

/** Cada uno vota quién adivina primero; si no coinciden, decide el azar. */
export function vote(db: Firestore, me: Me, forUid: string): Promise<void> {
  return change(db, (room) => {
    if (room.phase !== 'voting' || room.votes[me.uid]) return null
    const votes = { ...room.votes, [me.uid]: forUid }
    const uids = Object.keys(room.players)
    if (Object.keys(votes).length < uids.length) return { votes }
    const chosen = new Set(Object.values(votes))
    const guesser = chosen.size === 1 ? forUid : uids[Math.floor(Math.random() * uids.length)]
    const setter = uids.find((u) => u !== guesser)!
    return { votes, voteResult: guesser, guesserUid: guesser, setterUid: setter, votingDoneAt: Date.now() }
  })
}

/** Tras la animación de la votación, quien pone la palabra pasa a escribirla. */
export function finishVoting(db: Firestore): Promise<void> {
  return change(db, (room) => (room.phase === 'voting' && room.votingDoneAt ? { phase: 'setup' } : null))
}

export function checkSecretWord(raw: string): { word: string } | { error: string } {
  const word = normalizeWord(raw)
  if (word.length < MIN_LENGTH) return { error: `La palabra debe tener al menos ${MIN_LENGTH} letras.` }
  if (word.length > MAX_LENGTH) return { error: `La palabra puede tener hasta ${MAX_LENGTH} letras.` }
  if (!isValidWord(word)) return { error: 'Solo letras, sin espacios, números ni signos.' }
  return { word }
}

/** Quien pone la palabra la guarda (solo ella o él puede leerla) y empieza la ronda. */
export async function setSecretWord(db: Firestore, me: Me, raw: string): Promise<void> {
  const checked = checkSecretWord(raw)
  if ('error' in checked) throw new GameError(checked.error)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(db))
    const room = snap.data() as Room
    if (room.phase !== 'setup' || room.setterUid !== me.uid) throw new GameError('Ahora no te toca elegir la palabra.')
    tx.set(secretRef(db), { word: checked.word, setterUid: me.uid, round: room.round + 1 })
    tx.update(roomRef(db), {
      ...freshRound,
      phase: 'playing',
      round: room.round + 1,
      wordLength: checked.word.length,
    })
  })
}

export async function readSecretWord(db: Firestore): Promise<{ word: string; round: number } | null> {
  const snap = await getDoc(secretRef(db))
  return snap.exists() ? (snap.data() as { word: string; round: number }) : null
}

/** Quien adivina envía su intento; queda pendiente hasta que el otro dispositivo lo revise. */
export function submitGuess(db: Firestore, me: Me, raw: string): Promise<void> {
  const word = normalizeWord(raw)
  return change(db, (room) => {
    if (room.phase !== 'playing' || room.guesserUid !== me.uid) throw new GameError('Ahora no te toca adivinar.')
    if (room.pending) throw new GameError('Espera a que se revele tu intento anterior.')
    if (word.length !== room.wordLength) throw new GameError(`La palabra tiene ${room.wordLength} letras.`)
    return { pending: { id: crypto.randomUUID(), word } }
  })
}

function record(room: Room, word: string, winnerUid: string | null, surrendered: boolean): RoundRecord[] {
  const entry: RoundRecord = {
    round: room.round,
    winnerUid,
    word,
    attemptsUsed: room.guesses.length,
    maxAttempts: room.maxAttempts,
    surrendered,
    at: Date.now(),
  }
  return [...(room.history ?? []), entry].slice(-HISTORY_LIMIT)
}

/** Dispositivo de quien puso la palabra: revela los colores del intento pendiente. */
export function revealPending(db: Firestore, me: Me, secret: string, pendingId: string): Promise<void> {
  return change(db, (room) => {
    if (room.phase !== 'playing' || room.setterUid !== me.uid || room.pending?.id !== pendingId) return null
    const result = evaluateGuess(room.pending.word, secret)
    const guesses = [...room.guesses, { word: room.pending.word, result }]
    const attemptsLeft = room.attemptsLeft - 1
    const base = { guesses, attemptsLeft, pending: null }
    const ended = { ...room, guesses }
    if (isCorrectGuess(result)) {
      const winner = room.guesserUid!
      return {
        ...base,
        phase: 'finished',
        winnerUid: winner,
        revealedWord: secret,
        score: { ...room.score, [winner]: (room.score[winner] ?? 0) + 1 },
        history: record(ended, secret, winner, false),
      }
    }
    if (attemptsLeft <= 0) {
      return {
        ...base,
        phase: 'finished',
        winnerUid: me.uid,
        revealedWord: secret,
        score: { ...room.score, [me.uid]: (room.score[me.uid] ?? 0) + 1 },
        history: record(ended, secret, me.uid, false),
      }
    }
    return base
  })
}

/** Quien puso la palabra regala un intento más. */
export function grantAttempt(db: Firestore, me: Me): Promise<void> {
  return change(db, (room) =>
    room.phase === 'playing' && room.setterUid === me.uid
      ? { attemptsLeft: room.attemptsLeft + 1, maxAttempts: room.maxAttempts + 1 }
      : null,
  )
}

/** Quien adivina se rinde: gana la ronda quien puso la palabra. */
export function surrender(db: Firestore, me: Me): Promise<void> {
  return change(db, (room) => {
    if (room.phase !== 'playing' || room.guesserUid !== me.uid) return null
    const setter = room.setterUid!
    return {
      phase: 'finished',
      winnerUid: setter,
      surrendered: true,
      pending: null,
      score: { ...room.score, [setter]: (room.score[setter] ?? 0) + 1 },
    }
  })
}

/** Tras una rendición, el dispositivo de quien puso la palabra la muestra y la anota en el historial. */
export function revealAfterSurrender(db: Firestore, me: Me, secret: string): Promise<void> {
  return change(db, (room) =>
    room.phase === 'finished' && room.surrendered && !room.revealedWord && room.setterUid === me.uid
      ? { revealedWord: secret, history: record(room, secret, me.uid, true) }
      : null,
  )
}

/** Listos para la siguiente: cuando los dos lo están, los roles se intercambian solos. */
export function readyNextRound(db: Firestore, me: Me): Promise<void> {
  return change(db, (room) => {
    if (room.phase !== 'finished' || room.ready.includes(me.uid)) return null
    const ready = [...room.ready, me.uid]
    if (ready.length < Object.keys(room.players).length) return { ready }
    return { ...freshRound, phase: 'setup', setterUid: room.guesserUid, guesserUid: room.setterUid }
  })
}

/** Empezar de cero: marcador, historial y votación nuevos (los dos siguen sentados). */
export function resetTable(db: Firestore): Promise<void> {
  return change(db, (room) => {
    const uids = Object.keys(room.players)
    return {
      ...freshRound,
      phase: uids.length === 2 ? 'voting' : 'lobby',
      round: 0,
      setterUid: null,
      guesserUid: null,
      score: Object.fromEntries(uids.map((u) => [u, 0])),
      history: [],
      votes: {},
      voteResult: null,
      votingDoneAt: null,
    }
  })
}
