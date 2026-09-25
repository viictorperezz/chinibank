/*
 * ChiniBank – datos de prueba
 * ---------------------------------------------------------------
 * Este es el ÚNICO archivo que necesitas tocar para cambiar el partido.
 *
 *  - match.status:  'upcoming' (por jugar) | 'live' (en directo) | 'finished'
 *  - match.score:   solo se muestra con 'live' o 'finished'
 *      sets:    [[juegos jugador 1, juegos jugador 2], ...]
 *      points:  puntos del juego actual, ej. ['30', '15']
 *      serving: 0 o 1 (quién saca)
 *  - match.winner:  0 o 1 cuando el partido está 'finished'
 *
 *  - Cada mercado tiene: id único, tab ('partido' | 'sets' | 'juegos' | 'estadisticas' | 'especiales'),
 *    name, cols (1 o 2) y outcomes. El mercado con `main: true` es el único
 *    que se ve fuera del partido; el resto solo al entrar en él.
 *  - Cada outcome: id único, label, odds (cuota decimal).
 *      side: 0 (a favor de Chini -> vuela un cigarro) | 1 (a favor de Palo -> vuela un palo)
 *      Opcionales: pct (% de apostantes), hot (nº de apuestas, se marca en rojo).
 */
window.CHINIBANK = {
  site: {
    name: 'ChiniBank'
  },

  competition: {
    id: 'atp-san-roque',
    name: 'ATP San Roque',
    sport: 'Tenis',
    country: 'es',
    surface: 'Pista dura'
  },

  match: {
    id: 'chini-palo',
    round: 'Final',
    startTime: '2026-10-01T19:00:00+02:00',
    status: 'upcoming',
    court: 'Pista Central',
    bestOf: 3,
    players: [
      { name: 'Chini', flag: 'es', seed: 1 },
      { name: 'Palo', flag: 'es', seed: 2 }
    ],
    score: { sets: [[0, 0]], points: ['0', '0'], serving: 0 },
    winner: null,

    markets: [
      /* ---------- PARTIDO ---------- */
      {
        id: 'winner', tab: 'partido', name: 'Ganador del partido', cols: 2, main: true,
        outcomes: [
          { id: 'winner-1', label: 'Chini', odds: 1.44, side: 0, pct: 1, hot: 4 },
          { id: 'winner-2', label: 'Palo', odds: 2.05, side: 1, pct: 99, hot: 805 }
        ]
      },

      /* ---------- SETS ---------- */
      {
        id: 'oneset', tab: 'sets', name: 'Gana al menos un set', cols: 2,
        outcomes: [
          { id: 'oneset-1', label: 'Chini', odds: 1.18, side: 0 },
          { id: 'oneset-2', label: 'Palo', odds: 1.50, side: 1 }
        ]
      },
      {
        id: 'set1score', tab: 'sets', name: 'Resultado exacto del 1er set', cols: 1,
        outcomes: [
          { id: 'set1score-2-60', label: 'Palo gana 6-0', odds: 9.50, side: 1 }
        ]
      },

      /* ---------- JUEGOS ---------- */
      {
        id: 'handicap', tab: 'juegos', name: 'Hándicap de juegos', cols: 1,
        outcomes: [
          { id: 'handicap-2-45', label: 'Palo +4,5 juegos', odds: 1.40, side: 1 }
        ]
      },

      /* ---------- ACES ---------- */
      {
        id: 'aces-palo', tab: 'estadisticas', name: 'Aces de Palo', cols: 1,
        outcomes: [
          { id: 'aces-palo-o', label: 'Palo más de 2,5 aces', odds: 2.00, side: 1 }
        ]
      },

      /* ---------- ESPECIALES ---------- */
      {
        id: 'pucho', tab: 'especiales', name: 'Chini pucho prepartido', cols: 2,
        outcomes: [
          { id: 'pucho-si', label: 'Sí', odds: 1.20, side: 0 },
          { id: 'pucho-no', label: 'No', odds: 4.20 }
        ]
      }
    ]
  }
};
