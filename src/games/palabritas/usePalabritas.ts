import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import {
  finishVoting,
  GameError,
  grantAttempt,
  heartbeat,
  joinTable,
  readSecretWord,
  readyNextRound,
  resetTable,
  revealAfterSurrender,
  revealPending,
  roomRef,
  setSecretWord,
  submitGuess,
  surrender,
  vote,
  VOTE_REVEAL_MS,
  type Me,
  type Room,
} from './room'

const HEARTBEAT_MS = 30_000
/** Sin señal en este tiempo, mostramos a la otra persona como desconectada */
export const ONLINE_WINDOW_MS = 75_000

function meFrom(user: User): Me {
  const name = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Yo'
  return { uid: user.uid, name }
}

function messageOf(e: unknown): string {
  if (e instanceof GameError) return e.message
  if ((e as { code?: string }).code === 'permission-denied') return 'Esta cuenta no tiene permiso para jugar.'
  return 'No se pudo conectar con la mesa. Revisa la conexión e inténtalo de nuevo.'
}

/** Estado de la mesa en tiempo real y acciones del jugador que está en este dispositivo. */
export function usePalabritas() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null)
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<{ word: string; round: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const revealing = useRef<string | null>(null)
  const me = user ? meFrom(user) : null

  useEffect(() => (auth ? onAuthStateChanged(auth, setUser) : undefined), [])

  // Sentarse a la mesa y escuchar sus cambios
  useEffect(() => {
    if (!db || !me) return
    let alive = true
    joinTable(db, me).catch((e) => alive && setError(messageOf(e)))
    const stop = onSnapshot(
      roomRef(db),
      (snap) => {
        setRoom(snap.exists() ? (snap.data() as Room) : null)
        setLoading(false)
      },
      (e) => {
        setError(messageOf(e))
        setLoading(false)
      },
    )
    return () => {
      alive = false
      stop()
    }
  }, [me?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // "Estoy aquí" cada 30 s, y un reloj para saber si el otro sigue conectado
  useEffect(() => {
    if (!db || !me) return
    const beat = () => {
      setNow(Date.now())
      if (document.visibilityState === 'visible') heartbeat(db!, me).catch(() => undefined)
    }
    const id = window.setInterval(beat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [me?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  // Al terminar la animación de la votación, pasamos a elegir la palabra
  useEffect(() => {
    if (!db || room?.phase !== 'voting' || !room.votingDoneAt) return
    const wait = Math.max(0, room.votingDoneAt + VOTE_REVEAL_MS - Date.now())
    const id = window.setTimeout(() => finishVoting(db!).catch(() => undefined), wait)
    return () => window.clearTimeout(id)
  }, [room?.phase, room?.votingDoneAt])

  const iAmSetter = Boolean(me && room?.setterUid === me.uid)

  // Quien puso la palabra la tiene a mano durante su ronda (solo su cuenta puede leerla)
  useEffect(() => {
    if (!db || !iAmSetter || !room || (room.phase !== 'playing' && room.phase !== 'finished')) return
    if (secret?.round === room.round) return
    readSecretWord(db)
      .then((s) => s && s.round === room.round && setSecret(s))
      .catch(() => undefined)
  }, [iAmSetter, room?.phase, room?.round, secret?.round]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dispositivo de quien puso la palabra: revela cada intento pendiente y la palabra si el otro se rinde
  useEffect(() => {
    if (!db || !me || !iAmSetter || !room || secret?.round !== room.round) return
    if (room.phase === 'playing' && room.pending && revealing.current !== room.pending.id) {
      revealing.current = room.pending.id
      revealPending(db, me, secret.word, room.pending.id).catch(() => (revealing.current = null))
    }
    if (room.phase === 'finished' && room.surrendered && !room.revealedWord) {
      revealAfterSurrender(db, me, secret.word).catch(() => undefined)
    }
  }, [iAmSetter, room, secret]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setError(null)
      try {
        await action()
        return true
      } catch (e) {
        setError(messageOf(e))
        return false
      }
    },
    [],
  )

  const isOnline = (uid: string) => Boolean(room?.players[uid] && now - room.players[uid].lastSeen < ONLINE_WINDOW_MS)

  return {
    enabled: Boolean(db),
    me,
    room,
    loading: loading && Boolean(db && me),
    error,
    clearError: () => setError(null),
    secretWord: iAmSetter && secret?.round === room?.round ? secret!.word : null,
    isOnline,
    actions: me && db
      ? {
          vote: (forUid: string) => run(() => vote(db!, me, forUid)),
          setWord: (word: string) => run(() => setSecretWord(db!, me, word)),
          guess: (word: string) => run(() => submitGuess(db!, me, word)),
          grantAttempt: () => run(() => grantAttempt(db!, me)),
          surrender: () => run(() => surrender(db!, me)),
          ready: () => run(() => readyNextRound(db!, me)),
          reset: () => run(() => resetTable(db!)),
        }
      : null,
  }
}
