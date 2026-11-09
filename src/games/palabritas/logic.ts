/*
 * Palabritas: el Wordle para dos que hicimos aparte (wordle andrea), traído a la app.
 * La lógica de evaluación es la misma del juego original, incluidas las letras repetidas.
 */

export type LetterState = 'correct' | 'present' | 'absent' | 'empty'

export interface LetterResult {
  letter: string
  state: LetterState
}

export interface GuessRecord {
  word: string
  result: LetterResult[]
}

export const DEFAULT_ATTEMPTS = 5
export const MIN_LENGTH = 2
export const MAX_LENGTH = 30

/**
 * Minúsculas y sin tildes (la ñ se conserva): así una palabra con tilde se puede adivinar
 * desde el teclado del juego, que no tiene vocales acentuadas.
 */
export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/ñ/g, '\u0000')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0000/g, 'ñ')
}

/** Solo letras (incluida la ñ), sin espacios ni signos. */
export function isValidWord(word: string): boolean {
  return /^[a-zñ]+$/.test(word)
}

export function evaluateGuess(guess: string, secret: string): LetterResult[] {
  const guessArr = guess.split('')
  const secretArr = secret.split('')
  const result: LetterResult[] = guessArr.map((letter) => ({ letter, state: 'absent' as LetterState }))

  // Primera pasada: letras en su sitio (verde)
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i].state = 'correct'
      secretArr[i] = '\0'
      guessArr[i] = '\0'
    }
  }
  // Segunda pasada: letras que están pero en otro sitio (amarillo), sin contarlas dos veces
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === '\0') continue
    const idx = secretArr.indexOf(guessArr[i])
    if (idx !== -1) {
      result[i].state = 'present'
      secretArr[idx] = '\0'
    }
  }
  return result
}

export const isCorrectGuess = (result: LetterResult[]) => result.every((r) => r.state === 'correct')

/** Estado de cada tecla según los intentos: verde gana a amarillo, y amarillo a gris. */
export function buildKeyboardState(guesses: GuessRecord[]): Record<string, LetterState> {
  const priority: Record<LetterState, number> = { correct: 3, present: 2, absent: 1, empty: 0 }
  const state: Record<string, LetterState> = {}
  for (const guess of guesses) {
    for (const { letter, state: s } of guess.result) {
      if (!state[letter] || priority[s] > priority[state[letter]]) state[letter] = s
    }
  }
  return state
}
