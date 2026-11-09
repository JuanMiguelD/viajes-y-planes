import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  ArrowLeftRight,
  ChevronLeft,
  Crown,
  Delete,
  Eye,
  EyeOff,
  Flag,
  Gift,
  Loader2,
  RotateCcw,
  Search,
  Shuffle,
  Trophy,
} from 'lucide-react'
import { buildKeyboardState, isCorrectGuess, MAX_LENGTH, normalizeWord, type LetterState } from './logic'
import { checkSecretWord, VOTE_REVEAL_MS, type Room } from './room'
import { usePalabritas } from './usePalabritas'

type Game = ReturnType<typeof usePalabritas>
type Actions = NonNullable<Game['actions']>

const FLIP_MS = 260

/* ---------- Tablero ---------- */

function Board({
  room,
  input,
  shake,
  revealFrom,
}: {
  room: Room
  input: string
  shake: boolean
  /** Desde qué fila se anima la revelación (las anteriores ya se vieron) */
  revealFrom: number
}) {
  const len = room.wordLength ?? 0
  const rows = Math.max(room.maxAttempts, room.guesses.length + (room.pending ? 1 : 0))
  return (
    <div className="pw-board" style={{ '--len': len } as CSSProperties} aria-label="Tablero">
      {Array.from({ length: rows }, (_, r) => {
        const guess = room.guesses[r]
        const isPending = !guess && r === room.guesses.length && room.pending
        const isInput = !guess && !room.pending && r === room.guesses.length && room.phase === 'playing'
        const revealing = guess && r >= revealFrom
        const win = guess && isCorrectGuess(guess.result) && r === room.guesses.length - 1
        return (
          <div key={r} className={`pw-row ${isInput && shake ? 'is-shaking' : ''} ${isPending ? 'is-pending' : ''}`}>
            {Array.from({ length: len }, (_, c) => {
              const letter = guess ? guess.word[c] : isPending ? room.pending!.word[c] : isInput ? (input[c] ?? '') : ''
              const state: LetterState = guess ? guess.result[c].state : 'empty'
              return (
                <span
                  key={c}
                  className={`pw-tile is-${state} ${letter && state === 'empty' ? 'is-filled' : ''} ${revealing ? 'is-revealing' : ''} ${win ? 'is-win' : ''}`}
                  style={{ '--i': c } as CSSProperties}
                >
                  {letter}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Teclado ---------- */

const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'borrar'],
]

function Keyboard({
  states,
  disabled,
  onKey,
}: {
  states: Record<string, LetterState>
  disabled: boolean
  onKey: (key: string) => void
}) {
  return (
    <div className="pw-keyboard" aria-label="Teclado">
      {KEY_ROWS.map((row, i) => (
        <div key={i} className="pw-keyrow">
          {row.map((k) => (
            <button
              key={k}
              type="button"
              className={`pw-key is-${states[k] ?? 'empty'} ${k.length > 1 ? 'is-wide' : ''}`}
              disabled={disabled}
              onClick={() => onKey(k)}
              aria-label={k === 'borrar' ? 'Borrar letra' : k === 'enter' ? 'Enviar' : k}
            >
              {k === 'borrar' ? <Delete size={20} aria-hidden /> : k === 'enter' ? 'Enviar' : k}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ---------- Votación ---------- */

function Voting({ room, game, actions }: { room: Room; game: Game; actions: Actions }) {
  const me = game.me!
  const uids = Object.keys(room.players)
  const other = uids.find((u) => u !== me.uid)
  const myVote = room.votes[me.uid]
  const done = Boolean(room.voteResult)
  const tie = done && new Set(Object.values(room.votes)).size > 1
  const name = (uid: string) => room.players[uid]?.name ?? '—'
  const [shown, setShown] = useState<string | null>(null)

  // Empate: una ruleta que alterna nombres y se detiene en el elegido
  useEffect(() => {
    if (!done || !tie) return
    const start = Date.now()
    let i = 0
    let timer = 0
    const tick = () => {
      const elapsed = Date.now() - start
      if (elapsed > VOTE_REVEAL_MS - 900) {
        setShown(room.voteResult)
        return
      }
      i = (i + 1) % uids.length
      setShown(uids[i])
      timer = window.setTimeout(tick, 70 + elapsed / 6)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [done, tie]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="pw-card pw-center">
      <h2 className="pw-title">¿Quién adivina primero?</h2>
      <p className="pw-sub">
        {done ? (tie ? 'Votaron distinto: decide el azar' : '¡Están de acuerdo!') : 'Cada uno vota. Si no coinciden, decide el azar.'}
      </p>

      {!myVote && !done && (
        <div className="pw-vote-options">
          {uids.map((uid) => (
            <button key={uid} type="button" className="pw-vote" onClick={() => actions.vote(uid)}>
              <strong>{uid === me.uid ? 'Yo' : name(uid)}</strong>
              <span>{uid === me.uid ? 'Quiero adivinar yo' : `Que adivine ${name(uid)}`}</span>
            </button>
          ))}
        </div>
      )}

      {myVote && !done && (
        <p className="pw-wait">
          <Loader2 size={15} className="spin" aria-hidden />
          Votaste por {myVote === me.uid ? 'ti' : name(myVote)}. Esperando el voto de {other ? name(other) : 'tu pareja'}…
        </p>
      )}

      {done && (
        <div className={`pw-verdict ${shown === room.voteResult || !tie ? 'is-final' : ''}`}>
          {tie && <Shuffle size={16} aria-hidden className={shown === room.voteResult ? '' : 'spin'} />}
          <strong>{name(tie ? (shown ?? uids[0]) : room.voteResult!)}</strong>
          {(!tie || shown === room.voteResult) && <span>adivina primero</span>}
        </div>
      )}
    </section>
  )
}

/* ---------- Elegir la palabra ---------- */

function Setup({ room, game, actions }: { room: Room; game: Game; actions: Actions }) {
  const [word, setWord] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const guesser = room.guesserUid ? room.players[room.guesserUid]?.name : 'tu pareja'

  if (room.setterUid !== game.me!.uid) {
    return (
      <section className="pw-card pw-center">
        <h2 className="pw-title">{room.players[room.setterUid!]?.name} está eligiendo la palabra</h2>
        <p className="pw-wait">
          <Loader2 size={15} className="spin" aria-hidden />
          Prepárate para adivinar…
        </p>
      </section>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const checked = checkSecretWord(word)
    if ('error' in checked) return setError(checked.error)
    setSending(true)
    const ok = await actions.setWord(checked.word)
    if (!ok) setSending(false)
  }

  const length = normalizeWord(word).length
  return (
    <section className="pw-card">
      <h2 className="pw-title">Te toca elegir la palabra</h2>
      <p className="pw-sub">La que {guesser} tendrá que adivinar. Puede tener el largo que quieras.</p>
      <form className="pw-setup" onSubmit={submit}>
        <div className="pw-secret">
          <input
            className="input"
            type={visible ? 'text' : 'password'}
            value={word}
            maxLength={MAX_LENGTH}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Palabra secreta"
            aria-label="Palabra secreta"
            onChange={(e) => {
              setWord(e.target.value.replace(/\s/g, ''))
              setError(null)
            }}
          />
          <button type="button" className="icon-btn" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar palabra' : 'Mostrar palabra'}>
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className={error ? 'field-error' : 'field-hint'}>
          {error ?? (length > 0 ? `${length} letras. Las tildes no cuentan, así se puede escribir desde el teclado del juego.` : 'Solo la verás tú.')}
        </p>
        <button className="btn btn-primary" disabled={!word.trim() || sending}>
          {sending ? 'Guardando…' : 'Que empiece el juego'}
        </button>
      </form>
    </section>
  )
}

/* ---------- Fin de ronda ---------- */

function RoundOver({ room, game, actions }: { room: Room; game: Game; actions: Actions }) {
  const me = game.me!
  const iWon = room.winnerUid === me.uid
  const iGuessed = room.guesserUid === me.uid
  const winner = room.winnerUid ? room.players[room.winnerUid]?.name : null
  const other = Object.keys(room.players).find((u) => u !== me.uid)
  const imReady = room.ready.includes(me.uid)
  const otherReady = other ? room.ready.includes(other) : false

  const headline = iWon
    ? iGuessed
      ? `¡La adivinaste en ${room.guesses.length} ${room.guesses.length === 1 ? 'intento' : 'intentos'}!`
      : room.surrendered
        ? `${room.players[room.guesserUid!]?.name} se rindió: ¡ganas la ronda!`
        : '¡No la adivinó! Ganas la ronda'
    : iGuessed
      ? room.surrendered
        ? `Te rendiste. Gana ${winner}`
        : `Se acabaron los intentos. Gana ${winner}`
      : `${winner} la adivinó`

  return (
    <section className="pw-card pw-center pw-over">
      <Trophy size={28} className={iWon ? 'pw-trophy is-mine' : 'pw-trophy'} aria-hidden />
      <h2 className="pw-title">{headline}</h2>
      {room.revealedWord ? (
        <>
          <p className="pw-sub">La palabra era</p>
          <div className="pw-reveal" style={{ '--len': room.revealedWord.length } as CSSProperties}>
            {room.revealedWord.split('').map((l, i) => (
              <span key={i} className="pw-tile is-correct">
                {l}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="pw-sub">La palabra se verá cuando {room.players[room.setterUid!]?.name} abra el juego.</p>
      )}
      <p className="pw-swap">
        <ArrowLeftRight size={14} aria-hidden />
        En la siguiente ronda se intercambian los papeles.
      </p>
      <button className="btn btn-primary" disabled={imReady} onClick={() => actions.ready()}>
        {imReady ? 'Esperando…' : 'Siguiente ronda'}
      </button>
      {other && <p className="pw-ready">{otherReady ? `${room.players[other]?.name} ya quiere seguir` : `Esperando a ${room.players[other]?.name}`}</p>}
    </section>
  )
}

/* ---------- Marcador ---------- */

function Score({ room, game }: { room: Room; game: Game }) {
  const uids = Object.keys(room.players)
  const played = room.history?.length ?? 0
  return (
    <section className="pw-score" aria-label="Marcador">
      <div className="pw-score-row">
        {uids.map((uid) => {
          const pts = room.score?.[uid] ?? 0
          return (
            <div key={uid} className={`pw-score-cell ${uid === game.me!.uid ? 'is-me' : ''}`}>
              <span>{room.players[uid].name}</span>
              <strong>{pts}</strong>
              <small>{played ? `${Math.round((pts / played) * 100)}% de ${played}` : '—'}</small>
            </div>
          )
        })}
      </div>
      {played > 0 && (
        <ol className="pw-history" reversed>
          {[...room.history].reverse().slice(0, 8).map((h) => (
            <li key={`${h.round}-${h.at}`}>
              <span className="pw-history-word">{h.word || '—'}</span>
              <span>
                {h.winnerUid ? room.players[h.winnerUid]?.name : 'Nadie'}
                {h.surrendered ? ' (rendición)' : ` · ${h.attemptsUsed}/${h.maxAttempts}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ---------- Juego ---------- */

export function Palabritas({ onBack }: { onBack: () => void }) {
  const game = usePalabritas()
  const { room, me, actions } = game
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [confirmSurrender, setConfirmSurrender] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  // Filas ya vistas en esta ronda: solo se anima la revelación de las nuevas
  const [seen, setSeen] = useState<{ round: number; count: number } | null>(null)
  const revealTimer = useRef<number | undefined>(undefined)

  const iGuess = Boolean(room && me && room.guesserUid === me.uid)
  const iSet = Boolean(room && me && room.setterUid === me.uid)
  const canType = Boolean(room?.phase === 'playing' && iGuess && !room.pending)
  const len = room?.wordLength ?? 0
  const guessCount = room?.guesses.length ?? 0

  useEffect(() => {
    if (!room) return
    if (!seen || seen.round !== room.round) {
      setSeen({ round: room.round, count: guessCount })
      return
    }
    if (guessCount > seen.count) {
      window.clearTimeout(revealTimer.current)
      revealTimer.current = window.setTimeout(() => setSeen({ round: room.round, count: guessCount }), len * FLIP_MS + 900)
    }
  }, [room?.round, guessCount]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(revealTimer.current), [])
  useEffect(() => setInput(''), [room?.round, guessCount])
  useEffect(() => {
    if (room?.phase !== 'playing') setConfirmSurrender(false)
  }, [room?.phase])

  const flash = (message: string) => {
    setHint(message)
    setShake(true)
    window.setTimeout(() => setShake(false), 450)
    window.setTimeout(() => setHint(null), 2400)
  }

  const onKey = async (key: string) => {
    if (!canType || !actions) return
    if (key === 'borrar') return setInput((v) => v.slice(0, -1))
    if (key === 'enter') {
      if (input.length !== len) return flash(`Faltan letras: la palabra tiene ${len}.`)
      const word = input
      setInput('')
      if (!(await actions.guess(word))) setInput(word)
      return
    }
    if (/^[a-zñ]$/.test(key) && input.length < len) setInput((v) => v + key)
  }

  // Teclado físico
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (e.key === 'Enter') onKey('enter')
      else if (e.key === 'Backspace') onKey('borrar')
      else {
        const k = normalizeWord(e.key)
        if (k.length === 1) onKey(k)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const head = (
    <header className="pw-head">
      <button className="text-btn" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden />
        Juegos
      </button>
      <h1 className="pw-logo" aria-label="Palabritas">
        {'palabritas'.split('').map((l, i) => (
          <span key={i} className={`pw-logo-tile is-${['correct', 'present', 'absent'][i % 3]}`}>
            {l}
          </span>
        ))}
      </h1>
      {room && room.round > 0 ? <span className="pw-round">Ronda {room.round}</span> : <span />}
    </header>
  )

  if (!game.enabled) {
    return (
      <div className="page pw-page">
        {head}
        <p className="empty">Palabritas se juega entre los dos con la app conectada a Firebase; en modo local no está disponible.</p>
      </div>
    )
  }
  if (game.loading || !room || !me || !actions) {
    return (
      <div className="page pw-page">
        {head}
        {game.error ? <p className="field-error">{game.error}</p> : <p className="pw-wait"><Loader2 size={16} className="spin" aria-hidden /> Sentándonos a la mesa…</p>}
      </div>
    )
  }

  const uids = Object.keys(room.players)
  const setterName = room.setterUid ? room.players[room.setterUid]?.name : ''
  const guesserName = room.guesserUid ? room.players[room.guesserUid]?.name : ''
  const turnOf = room.phase === 'setup' ? room.setterUid : room.phase === 'playing' ? room.guesserUid : null

  return (
    <div className="page pw-page">
      {head}

      <div className="pw-players">
        {uids.map((uid) => (
          <div key={uid} className={`pw-player ${turnOf === uid ? 'is-turn' : ''}`}>
            <span className={`pw-dot ${game.isOnline(uid) ? 'is-online' : ''}`} title={game.isOnline(uid) ? 'Conectado' : 'No está en el juego'} />
            <span className="pw-player-name">
              {room.players[uid].name}
              {uid === me.uid && <small> (tú)</small>}
            </span>
            {room.setterUid === uid && <Crown size={14} aria-label="Elige la palabra" />}
            {room.guesserUid === uid && <Search size={14} aria-label="Adivina" />}
            {turnOf === uid && <span className="pw-turn">{uid === me.uid ? 'tu turno' : 'su turno'}</span>}
          </div>
        ))}
        {uids.length < 2 && (
          <div className="pw-player is-missing">
            <span className="pw-dot" />
            <span className="pw-player-name">Esperando a tu pareja</span>
          </div>
        )}
      </div>

      {(game.error || hint) && (
        <p className="pw-alert" role="alert">
          {game.error ?? hint}
        </p>
      )}

      {room.phase === 'lobby' && (
        <section className="pw-card pw-center">
          <h2 className="pw-title">La mesa está lista</h2>
          <p className="pw-sub">Cuando tu pareja abra Palabritas desde su cuenta, empieza la votación.</p>
          <p className="pw-wait">
            <Loader2 size={15} className="spin" aria-hidden />
            Esperando…
          </p>
        </section>
      )}

      {room.phase === 'voting' && <Voting room={room} game={game} actions={actions} />}
      {room.phase === 'setup' && <Setup key={room.round} room={room} game={game} actions={actions} />}

      {(room.phase === 'playing' || room.phase === 'finished') && (
        <>
          {iSet && game.secretWord && room.phase === 'playing' && (
            <p className="pw-mine">
              Tu palabra: <strong>{game.secretWord}</strong>
            </p>
          )}
          <div className="pw-status">
            <span>
              <strong>{room.attemptsLeft}</strong> de {room.maxAttempts} intentos
            </span>
            <span>
              <strong>{len}</strong> letras
            </span>
          </div>

          <Board room={room} input={input} shake={shake} revealFrom={seen?.round === room.round ? seen.count : guessCount} />

          {room.phase === 'playing' && room.pending && (
            <p className="pw-wait">
              <Loader2 size={15} className="spin" aria-hidden />
              {iGuess
                ? game.isOnline(room.setterUid!)
                  ? 'Revelando tu intento…'
                  : `Tu intento se revelará cuando ${setterName} abra el juego.`
                : 'Revelando…'}
            </p>
          )}

          {room.phase === 'finished' && <RoundOver room={room} game={game} actions={actions} />}

          {room.phase === 'playing' && iGuess && (
            <>
              <Keyboard states={buildKeyboardState(room.guesses)} disabled={!canType} onKey={onKey} />
              <div className="pw-surrender">
                {confirmSurrender ? (
                  <p>
                    ¿Seguro? {setterName} gana la ronda.
                    <button className="btn btn-quiet btn-small" onClick={() => setConfirmSurrender(false)}>
                      No
                    </button>
                    <button className="btn btn-danger btn-small" onClick={() => actions.surrender()}>
                      Me rindo
                    </button>
                  </p>
                ) : (
                  <button className="text-btn" onClick={() => setConfirmSurrender(true)}>
                    <Flag size={14} aria-hidden />
                    Rendirme
                  </button>
                )}
              </div>
            </>
          )}

          {room.phase === 'playing' && iSet && (
            <section className="pw-card pw-center">
              <p className="pw-sub">{guesserName} está intentando adivinar tu palabra.</p>
              <button className="btn btn-secondary" onClick={() => actions.grantAttempt()}>
                <Gift size={16} aria-hidden />
                Regalarle un intento
              </button>
            </section>
          )}
        </>
      )}

      {room.round > 0 && uids.length === 2 && <Score room={room} game={game} />}

      <footer className="pw-foot">
        {confirmReset ? (
          <p>
            ¿Empezar de cero? Se borran el marcador y el historial.
            <button className="btn btn-quiet btn-small" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-danger btn-small"
              onClick={async () => {
                setConfirmReset(false)
                await actions.reset()
              }}
            >
              Empezar de cero
            </button>
          </p>
        ) : (
          <button className="text-btn" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={14} aria-hidden />
            Empezar de cero
          </button>
        )}
      </footer>
    </div>
  )
}
