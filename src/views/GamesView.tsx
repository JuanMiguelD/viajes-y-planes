import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Palabritas } from '../games/palabritas/Palabritas'

type GameId = 'palabritas'

const GAMES: { id: GameId; name: string; description: string; preview: string }[] = [
  {
    id: 'palabritas',
    name: 'Palabritas',
    description: 'Nuestro Wordle: uno elige la palabra, el otro la adivina, y en cada ronda se cambian los papeles.',
    preview: 'amor',
  },
]

/** Rincón secreto de juegos (se descubre tocando tres veces el corazón de la cabecera). */
export function GamesView() {
  const [playing, setPlaying] = useState<GameId | null>(() =>
    window.location.hash === '#juegos/palabritas' ? 'palabritas' : null,
  )

  const open = (id: GameId | null) => {
    window.history.replaceState(null, '', id ? `#juegos/${id}` : '#juegos')
    setPlaying(id)
  }

  if (playing === 'palabritas') return <Palabritas onBack={() => open(null)} />

  return (
    <div className="page">
      <h1 className="page-title">Nuestro rincón de juegos</h1>
      <p className="page-intro">Lo encontraste. Aquí guardamos los juegos que hicimos para los dos.</p>
      <ul className="games-list">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button className="game-card" onClick={() => open(g.id)}>
              <span className="game-preview" aria-hidden>
                {g.preview.split('').map((l, i) => (
                  <span key={i} className={`pw-tile is-${['correct', 'present', 'absent', 'correct'][i % 4]}`}>
                    {l}
                  </span>
                ))}
              </span>
              <span className="game-text">
                <strong>{g.name}</strong>
                <span>{g.description}</span>
              </span>
              <ChevronRight size={20} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
