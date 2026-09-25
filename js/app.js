/* ==========================================================
   ChiniBank · app (vanilla JS, sin dependencias)
   Rutas por hash para que funcione en GitHub Pages:
   #/  #/competicion  #/partido[/tab]  #/directo
   #/mis-apuestas  #/promos  #/calendario
   ========================================================== */
(function () {
  'use strict';

  const D = window.CHINIBANK;
  const C = D.competition;
  const M = D.match;
  const STORE_KEY = 'chinibank:v2';
  const MIN_STAKE = 0.1;

  const ALL_TABS = [
    { id: 'partido', label: 'Partido' },
    { id: 'sets', label: 'Sets' },
    { id: 'juegos', label: 'Juegos' },
    { id: 'estadisticas', label: 'Aces' }
  ];

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round2 = (n) => Math.round(n * 100) / 100;
  const fmtOdds = (n) => n.toFixed(2).replace('.', ',');
  const moneyFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const fmtMoney = (n) => moneyFmt.format(n);
  const ico = (name, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const emote = (side, cls = '', key = '') => (side === 0 || side === 1)
    ? `<svg class="emote ${cls}" ${key ? `data-emote="${esc(key)}"` : ''} aria-hidden="true"><use href="#e-${side === 0 ? 'cig' : 'log'}"/></svg>` : '';
  const flag = (code, size = '') => `<span class="flag flag--${esc(code)} ${size}" aria-hidden="true"></span>`;
  const compIcons = () => `<span class="duo"><svg class="ball" aria-hidden="true"><use href="#i-ball"/></svg>${flag(C.country)}</span>`;
  const chev = ico('chev-r', 'chev');
  const P = M.players;
  const matchTitle = `${P[0].name} vs ${P[1].name}`;
  const start = new Date(M.startTime);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1100px)');

  function parseStake(v) {
    const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? round2(n) : 0;
  }

  function dayLabel(d) {
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((b - a) / 864e5);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';
    const s = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // "hoy", "mañana" o "el jueves 1 de octubre"
  const whenPhrase = (d) => {
    const l = dayLabel(d);
    if (l === 'Hoy' || l === 'Mañana') return l.toLowerCase();
    return `el ${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')}`;
  };
  const timeLabel = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const longDate = (d) => {
    const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  function countdown() {
    const ms = start - Date.now();
    if (ms <= 0) return 'A punto de empezar';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const pad = (n) => String(n).padStart(2, '0');
    const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    return d > 0 ? `${d}d ${hms}` : hms;
  }

  /* ---------- Índice de cuotas ---------- */
  const OUT = new Map();
  M.markets.forEach((mk) => mk.outcomes.forEach((o) => OUT.set(o.id, { o, mk })));
  const marketsOf = (tab) => M.markets.filter((mk) => mk.tab === tab);
  const TABS = ALL_TABS.filter((t) => marketsOf(t.id).length);
  const mainMarket = M.markets.find((mk) => mk.main) || M.markets[0];
  const isFinished = () => M.status === 'finished';
  const isLive = () => M.status === 'live';
  const isOpen = (mk) => !isFinished() && !mk.suspended;

  /* ---------- Estado persistente (solo la cesta) ---------- */
  const state = load();

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    return {
      slip: Array.isArray(s.slip) ? s.slip.filter((id) => OUT.has(id)) : [],
      stakes: s.stakes && typeof s.stakes === 'object' ? s.stakes : {},
      comboStake: typeof s.comboStake === 'string' ? s.comboStake : '',
      mode: s.mode === 'combo' ? 'combo' : 'simple'
    };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* modo privado */ }
  }

  /* ==========================================================
     Componentes
     ========================================================== */
  function oddBtn(o, mk) {
    const sel = state.slip.includes(o.id);
    const open = isOpen(mk);
    const row = mk.cols === 1;
    const top = o.hot && o.hot === Math.max(...mk.outcomes.map((x) => x.hot || 0));
    const cls = ['odd', row ? 'odd--row' : '', sel ? 'is-sel' : '', top && open ? 'is-hot' : ''].join(' ');
    const hot = o.hot && open ? `<span class="odd__hot">${o.hot}${ico('user')}</span>` : '';
    const label = esc(o.label);
    const inner = row
      ? `<span class="txt"><span class="odd__label">${label}</span></span><span class="odd__val">${fmtOdds(o.odds)}</span>`
      : `<span class="odd__label">${label}</span><span class="odd__val">${fmtOdds(o.odds)}</span>`;
    return `<button class="${cls}" data-out="${esc(o.id)}" aria-pressed="${sel}" ${open ? '' : 'disabled'} aria-label="${label}, cuota ${fmtOdds(o.odds)}">${hot}${inner}</button>`;
  }

  function oddsGrid(mk) {
    const cols = mk.cols || 2;
    const pcts = mk.outcomes.every((o) => typeof o.pct === 'number')
      ? `<div class="pcts" style="--cols:${cols}">${mk.outcomes.map((o) => {
          const top = o.pct === Math.max(...mk.outcomes.map((x) => x.pct));
          return `<div class="pct"><span>${o.pct}%</span><i style="--w:${o.pct}%;--c:${top ? 'var(--green)' : 'var(--orange)'}"></i></div>`;
        }).join('')}</div>`
      : '';
    return `<div class="odds" style="--cols:${cols}">${mk.outcomes.map((o) => oddBtn(o, mk)).join('')}</div>${pcts}`;
  }

  function setWinner(st) {
    const [a, b] = st;
    const done = (Math.max(a, b) >= 6 && Math.abs(a - b) >= 2) || Math.max(a, b) === 7;
    return done ? (a > b ? 0 : 1) : -1;
  }
  function setsWon() {
    const w = [0, 0];
    ((M.score && M.score.sets) || []).forEach((st) => { const x = setWinner(st); if (x >= 0) w[x]++; });
    return w;
  }

  function scoreRows() {
    const s = M.score || {};
    const sets = s.sets || [];
    const pts = s.points || [];
    return `<div class="srows">${P.map((p, i) => {
      const lose = isFinished() && M.winner != null && M.winner !== i;
      const serving = isLive() && s.serving === i ? '<i class="serve" title="Al saque"></i>' : '';
      const cells = sets.map((st, k) => {
        const w = setWinner(st);
        const cur = isLive() && k === sets.length - 1 && w < 0;
        return `<b class="${w === i ? 'w' : ''} ${cur ? 'cur' : ''}">${st[i]}</b>`;
      }).join('');
      return `<div class="srow ${lose ? 'is-lose' : ''}">${flag(p.flag)}<span class="srow__name">${esc(p.name)}${serving}</span><span class="srow__sets">${cells}${isLive() ? `<b class="pts">${esc(pts[i] ?? '0')}</b>` : ''}</span></div>`;
    }).join('')}</div>`;
  }

  function versus() {
    return `<div class="vs">
      <div class="vs__p">${flag(P[0].flag, 'flag--lg')}<span>${esc(P[0].name)}</span>${P[0].seed ? `<small>Cabeza de serie ${P[0].seed}</small>` : ''}</div>
      <div class="vs__mid"><small>${dayLabel(start)}</small><strong>${timeLabel(start)}</strong><span class="cd" data-countdown>${countdown()}</span></div>
      <div class="vs__p">${flag(P[1].flag, 'flag--lg')}<span>${esc(P[1].name)}</span>${P[1].seed ? `<small>Cabeza de serie ${P[1].seed}</small>` : ''}</div>
    </div>`;
  }

  function statusPill() {
    if (isLive()) return '<span class="live-pill">EN DIRECTO</span>';
    if (isFinished()) return '<span class="fin-pill">FINALIZADO</span>';
    return '';
  }

  // Fuera del partido solo se ve el mercado principal (ganador)
  function matchCard() {
    const extra = M.markets.length - 1;
    return `<article class="mcard ${isLive() ? 'is-live' : ''}">
      <a class="mcard__head" href="#/partido">${compIcons()}<span>${esc(C.name)} · ${esc(M.round)}</span>${statusPill()}</a>
      <div class="mcard__panel">
        <a href="#/partido" aria-label="Ver ${esc(matchTitle)}">${isLive() || isFinished() ? scoreRows() : versus()}</a>
        <div class="mk">${oddsGrid(mainMarket)}</div>
      </div>
      <a class="mcard__more" href="#/partido">${extra > 0 ? `+${extra} apuestas más en el partido` : 'Ver el partido'} ${ico('chev-r', 'ico--sm')}</a>
    </article>`;
  }

  const collapsedMarkets = new Set();
  function marketBlock(mk) {
    const collapsed = collapsedMarkets.has(mk.id);
    return `<section class="market ${collapsed ? 'is-collapsed' : ''}">
      <button class="market__head" data-toggle="${esc(mk.id)}" aria-expanded="${!collapsed}"><span>${esc(mk.name)}</span>${ico('chev-d')}</button>
      <div class="market__body">${oddsGrid(mk)}</div>
    </section>`;
  }

  function crumb(href, text) {
    return `<div class="crumb"><a class="back" href="${href}" aria-label="Volver">${ico('chev-l')}</a>${compIcons()}<span>${esc(text)}</span></div>`;
  }

  /* ==========================================================
     Vistas
     ========================================================== */
  const views = {
    home() {
      const hero = `<section class="hero">
        <span class="hero__tag">${compIcons()} ${esc(C.name)} · ${esc(M.round)}</span>
        <h1>La gran <em>${esc(M.round)}</em><br>${esc(C.name)}</h1>
        <p>${isLive() ? 'En directo ahora · ' : isFinished() ? 'Partido finalizado · ' : `${dayLabel(start)} a las ${timeLabel(start)} · `}${esc(M.court)} · ${esc(C.surface)}</p>
        <div class="hero__vs">
          <div class="p">${flag(P[0].flag, 'flag--xl')}${esc(P[0].name)}</div>
          <div class="x">VS</div>
          <div class="p">${flag(P[1].flag, 'flag--xl')}${esc(P[1].name)}</div>
        </div>
        <div class="hero__cta"><a class="btn btn--block" href="#/partido">Apostar ahora</a></div>
      </section>`;
      return `${hero}
        <div class="section-title"><h2>Partido destacado</h2><a href="#/competicion">${esc(C.name)} ${ico('chev-r', 'ico--sm')}</a></div>
        ${matchCard()}
        <div class="section-title"><h2>Competiciones</h2></div>
        <div class="comp-list"><a class="side-link" href="#/competicion">${compIcons()}<span>${esc(C.name)}</span><span class="count">1</span>${chev}</a></div>`;
    },

    competition() {
      return `${crumb('#/', C.name)}
        <div class="center-title"><h1>Partidos</h1><a class="stats-btn" href="#/partido" aria-label="Todas las apuestas del partido">${ico('stats')}</a></div>
        <div class="day-head">${longDate(start)}</div>
        ${matchCard()}`;
    },

    match(tab) {
      const active = TABS.some((t) => t.id === tab) ? tab : 'todas';
      const sw = setsWon();
      const mid = isLive() || isFinished()
        ? `<div class="board__mid">${statusPill()}<strong class="big">${sw[0]}-${sw[1]}</strong><small>sets</small></div>`
        : `<div class="board__mid"><small>${dayLabel(start)}</small><strong>${timeLabel(start)}</strong><span class="board__cd" data-countdown>${countdown()}</span></div>`;
      const board = `<section class="board">
        <div class="board__comp">${compIcons()} ${esc(C.name)} · ${esc(M.round)}</div>
        <div class="board__main">
          <div class="board__p">${flag(P[0].flag, 'flag--xl')}<span>${esc(P[0].name)}</span>${P[0].seed ? `<small>(${P[0].seed})</small>` : ''}</div>
          ${mid}
          <div class="board__p">${flag(P[1].flag, 'flag--xl')}<span>${esc(P[1].name)}</span>${P[1].seed ? `<small>(${P[1].seed})</small>` : ''}</div>
        </div>
        ${isLive() || isFinished() ? scoreRows() : ''}
        <div class="board__meta"><span>${ico('pin', 'ico--sm')}${esc(M.court)}</span><span>${esc(C.surface)}</span><span>Al mejor de ${M.bestOf} sets</span></div>
      </section>`;
      const chips = `<nav class="chips" aria-label="Mercados">
        <a class="chip ${active === 'todas' ? 'is-active' : ''}" href="#/partido">Todas <small>${M.markets.length}</small></a>
        ${TABS.map((t) => `<a class="chip ${active === t.id ? 'is-active' : ''}" href="#/partido/${t.id}">${t.label} <small>${marketsOf(t.id).length}</small></a>`).join('')}
      </nav>`;
      const list = (active === 'todas' ? M.markets : marketsOf(active)).map(marketBlock).join('');
      const info = `<section class="info"><h3>Información del partido</h3><dl>
        <div><dt>Competición</dt><dd>${esc(C.name)}</dd></div>
        <div><dt>Ronda</dt><dd>${esc(M.round)}</dd></div>
        <div><dt>Fecha</dt><dd>${longDate(start)}</dd></div>
        <div><dt>Hora</dt><dd>${timeLabel(start)}</dd></div>
        <div><dt>Pista</dt><dd>${esc(M.court)}</dd></div>
        <div><dt>Superficie</dt><dd>${esc(C.surface)}</dd></div>
        <div><dt>Formato</dt><dd>Al mejor de ${M.bestOf} sets</dd></div>
      </dl></section>`;
      return `${crumb('#/competicion', `${C.name} · ${M.round}`)}${board}${chips}${list}${info}`;
    },

    live() {
      if (isLive()) return `<div class="center-title"><h1>En directo</h1></div>${matchCard()}`;
      const msg = isFinished()
        ? `<h2>El partido ha terminado</h2><p>La ${esc(M.round)} de ${esc(C.name)} ya ha finalizado.</p>`
        : `<h2>Nada en directo ahora mismo</h2><p>La ${esc(M.round)} de ${esc(C.name)} empieza ${whenPhrase(start)} a las ${timeLabel(start)}.</p><div class="cd" data-countdown>${countdown()}</div><a class="btn" href="#/partido">Apostar antes del partido</a>`;
      return `<div class="center-title"><h1>En directo</h1></div>
        <div class="empty"><div class="big-ico">${ico('live')}</div>${msg}</div>
        <div class="section-title"><h2>Próximo partido</h2></div>
        ${matchCard()}`;
    },

    bets() {
      const n = state.slip.length;
      return `<div class="center-title"><h1>Mis apuestas</h1></div>
        <div class="empty"><div class="big-ico">${ico('user')}</div>
          <h2>Inicia sesión para ver tus apuestas</h2>
          <p>Conéctate a tu cuenta de ChiniBank para consultar tus apuestas en curso y finalizadas.</p>
          <button class="btn" data-act="login">Conectarse</button>
        </div>
        ${n ? `<div class="section-title"><h2>En tu cesta</h2><button class="btn btn--ghost btn--sm" data-act="open-slip">Ver cesta (${n})</button></div>` : ''}`;
    },

    promos() {
      return `<div class="center-title"><h1>Promos</h1></div>
        <article class="promo promo--red">
          <small>Bienvenida</small>
          <h2>Únete a ChiniBank</h2>
          <p>Crea tu cuenta y apuesta en la ${esc(M.round)} de ${esc(C.name)}: ${esc(matchTitle)}.</p>
          <button class="btn btn--sm" data-act="register">Registrarse</button>
        </article>
        <article class="promo promo--blue">
          <small>La gran ${esc(M.round)}</small>
          <h2>${esc(matchTitle)}</h2>
          <p>${M.markets.length} mercados disponibles: ganador, sets, hándicap y aces.</p>
          <a class="btn btn--sm" href="#/partido">Ver apuestas</a>
        </article>`;
    },

    calendar() {
      return `<div class="center-title"><h1>Próximos partidos</h1></div>
        <div class="day-head">${longDate(start)}</div>
        ${matchCard()}`;
    }
  };

  /* ==========================================================
     Cesta
     ========================================================== */
  const emptyBag = `<svg viewBox="0 0 220 130" aria-hidden="true">
    <ellipse cx="112" cy="116" rx="92" ry="10" fill="#000" opacity=".35"/>
    <path d="M38 64c0-14 12-26 26-26h96c14 0 26 12 26 26v28c0 12-10 22-22 22H60c-12 0-22-10-22-22z" fill="#c8201f"/>
    <path d="M38 76h148v10H38z" fill="#fff" opacity=".9"/>
    <path d="M70 40l-6 74M84 40l-6 74" stroke="#fff" stroke-width="6" opacity=".85"/>
    <path d="M40 70c10-22 40-30 72-30s62 8 72 30" fill="none" stroke="#8e1212" stroke-width="3" opacity=".6"/>
    <path d="M88 40c0-22 48-22 48 0" fill="none" stroke="#e7d7d7" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="170" cy="64" rx="10" ry="16" fill="#8e1212" opacity=".5"/>
    <circle cx="150" cy="30" r="9" fill="#d4ea37"/><path d="M143 24c4 4 4 9 0 13" stroke="#fff" stroke-width="1.6" fill="none"/>
  </svg>`;

  function selections() {
    return state.slip.map((id) => ({ id, ...OUT.get(id) })).filter((s) => s.o);
  }
  function effectiveMode() {
    return state.slip.length >= 2 ? state.mode : 'simple';
  }

  function slipTotals() {
    const sels = selections();
    const mode = effectiveMode();
    const odds = round2(sels.reduce((a, s) => a * s.o.odds, 1));
    let stake = 0, potential = 0;
    if (mode === 'combo') {
      stake = parseStake(state.comboStake);
      potential = round2(stake * odds);
    } else {
      sels.forEach((s) => {
        const st = parseStake(state.stakes[s.id]);
        stake += st;
        potential += st * s.o.odds;
      });
      stake = round2(stake); potential = round2(potential);
    }
    const error = stake > 0 && stake < MIN_STAKE ? `La apuesta mínima es ${fmtMoney(MIN_STAKE)}.` : '';
    return { sels, mode, stake, potential, odds, error };
  }

  function stakeInput(key, value) {
    return `<div class="stake"><label for="st-${esc(key)}">Importe</label><div class="stake__in"><input id="st-${esc(key)}" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(value || '')}" data-stake="${esc(key)}"></div></div>
      <div class="quick">${[2, 5, 10, 20].map((v) => `<button type="button" data-quick="${v}" data-for="${esc(key)}">+${v} €</button>`).join('')}</div>`;
  }

  function renderSlip() {
    const el = $('#slip');
    const sels = selections();
    const n = sels.length;
    const mode = effectiveMode();
    const head = `<div class="slip__grab"></div>
      <div class="slip__head">
        <h2 id="slipCount"><b>${n}</b> ${n === 1 ? 'selección' : 'selecciones'}</h2>
        <button class="icon-btn" data-act="clear-slip" aria-label="Vaciar cesta" ${n ? '' : 'disabled'}>${ico('trash')}</button>
        <button class="icon-btn only-mobile" data-act="close-overlays" aria-label="Cerrar cesta">${ico('close')}</button>
      </div>`;

    if (!n) {
      el.innerHTML = `${head}<div class="slip__body"><div class="slip-empty">${emptyBag}<h3>¡Tu cesta está vacía!</h3><p>Añade selecciones haciendo clic en las cuotas</p></div></div>`;
      return;
    }

    const seg = `<div class="seg" role="tablist">
      <button role="tab" data-mode="simple" class="${mode === 'simple' ? 'is-active' : ''}" aria-selected="${mode === 'simple'}">Simple</button>
      <button role="tab" data-mode="combo" class="${mode === 'combo' ? 'is-active' : ''}" aria-selected="${mode === 'combo'}" ${n < 2 ? 'disabled title="Añade al menos 2 selecciones"' : ''}>Combinada</button>
    </div>`;

    const items = sels.map((s) => `<div class="sel">
      <div class="sel__top">
        <div class="sel__txt"><b class="who">${emote(s.o.side, 'emote--sm', s.id)}${esc(s.o.label)}</b><small>${esc(s.mk.name)}</small><small>${esc(matchTitle)}</small></div>
        <span class="sel__odd">${fmtOdds(s.o.odds)}</span>
        <button class="sel__x" data-remove="${esc(s.id)}" aria-label="Quitar selección">${ico('close', 'ico--sm')}</button>
      </div>
      ${mode === 'simple' ? `<div class="sel__stake">${stakeInput(s.id, state.stakes[s.id])}</div>` : ''}
    </div>`).join('');

    const combo = mode === 'combo' ? `<div class="sel">${stakeInput('combo', state.comboStake)}</div>` : '';

    el.innerHTML = `${head}
      <div class="slip__body">${seg}${items}${combo}</div>
      <div class="slip__foot"><div id="slipTotals"></div>
        <button class="btn btn--block" data-act="place-bet" id="placeBtn">Apostar</button>
        <p class="gate">${ico('user')}Necesitas iniciar sesión para confirmar la apuesta.</p>
      </div>`;
    updateTotals();
  }

  function updateTotals() {
    const box = $('#slipTotals');
    if (!box) return;
    const t = slipTotals();
    box.innerHTML = `<div class="totals">
        ${t.mode === 'combo' ? `<div><span>Cuota total</span><strong>${fmtOdds(t.odds)}</strong></div>` : ''}
        <div><span>Importe total</span><strong>${fmtMoney(t.stake)}</strong></div>
        <div class="win"><span>Ganancia potencial</span><strong>${fmtMoney(t.potential)}</strong></div>
      </div>${t.error ? `<p class="slip__err">${t.error}</p>` : ''}`;
    $('#placeBtn').textContent = t.stake > 0 ? `Apostar ${fmtMoney(t.stake)}` : 'Apostar';
  }

  function renderChrome() {
    const n = state.slip.length;
    document.body.classList.toggle('has-slip', n > 0);
    const badge = $('#navBadge');
    badge.hidden = n === 0;
    badge.textContent = n;
    if (n) {
      const t = slipTotals();
      const odds = n >= 2 ? t.odds : t.sels[0].o.odds;
      const last = t.sels[t.sels.length - 1];
      $('#slipbar').innerHTML = `<span class="n">${n}</span>${emote(last.o.side, 'emote--bar', 'bar')}<span class="t">Ver cesta<small>${n === 1 ? '1 selección' : `${n} selecciones`}${t.stake > 0 ? ` · ${fmtMoney(t.stake)}` : ''}</small></span><span class="o">${fmtOdds(odds)}</span>`;
    }
  }

  function toggleSelection(id, fromEl) {
    const hit = OUT.get(id);
    if (!hit || !isOpen(hit.mk)) return;
    if (state.slip.includes(id)) {
      state.slip = state.slip.filter((x) => x !== id);
      delete state.stakes[id];
      save(); refreshOdds(); renderSlip(); renderChrome();
      return;
    }
    const from = fromEl ? fromEl.getBoundingClientRect() : null;
    // Solo una selección por mercado: sustituye a la anterior
    const sameMarket = hit.mk.outcomes.map((o) => o.id);
    state.slip.filter((x) => sameMarket.includes(x)).forEach((x) => { delete state.stakes[x]; });
    state.slip = state.slip.filter((x) => !sameMarket.includes(x));
    state.slip.push(id);
    save(); refreshOdds(); renderSlip(); renderChrome();
    if (from) flyEmote(from, hit.o.side, id);
  }

  function refreshOdds() {
    $$('[data-out]').forEach((b) => {
      const sel = state.slip.includes(b.dataset.out);
      b.classList.toggle('is-sel', sel);
      b.setAttribute('aria-pressed', sel);
    });
  }

  /* ---------- Emote volando a la cesta ---------- */
  // Destino: el emote de la selección dentro de la cesta (o el de la barra roja en móvil)
  function cartTarget(id) {
    if (desktop.matches || document.body.classList.contains('slip-open')) {
      const em = $(`#slip [data-emote="${CSS.escape(id)}"]`);
      if (em) {
        const body = em.closest('.slip__body');
        if (body) {
          const r = em.getBoundingClientRect(), b = body.getBoundingClientRect();
          if (r.bottom > b.bottom || r.top < b.top) body.scrollTop += r.top - b.top - 12;
        }
        return em;
      }
      return $('#slipCount');
    }
    const bar = $('#slipbar [data-emote="bar"]');
    return bar && bar.getClientRects().length ? bar : $('.bottomnav [data-act="open-slip"]');
  }

  function pulse(el, cls = 'catch') {
    if (!el) return;
    el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
  }

  function flyEmote(from, side, id) {
    const target = cartTarget(id);
    const badge = $('#navBadge');
    if (side !== 0 && side !== 1 || reduceMotion.matches || !target || !Element.prototype.animate) {
      pulse(target); pulse(badge); return;
    }

    const size = 52;
    const to = target.getBoundingClientRect();
    const x0 = from.left + from.width / 2 - size / 2;
    const y0 = from.top + from.height / 2 - size / 2;
    const dx = to.left + to.width / 2 - size / 2 - x0;
    const dy = to.top + to.height / 2 - size / 2 - y0;
    const arc = Math.min(dy, 0) - 120;
    const endScale = Math.max(to.width, 1) / size;
    const isEmote = target.classList.contains('emote');

    const el = document.createElement('div');
    el.className = 'fly';
    el.innerHTML = emote(side);
    el.style.left = `${x0}px`;
    el.style.top = `${y0}px`;
    document.body.appendChild(el);
    // El emote de la cesta se oculta hasta que el volador "se funde" con él
    if (isEmote) target.style.visibility = 'hidden';

    const spin = side === 0 ? 1 : -1;
    const anim = el.animate([
      { transform: 'translate(0, 0) scale(.3) rotate(0deg)', opacity: 0 },
      { transform: `translate(0, -40px) scale(1.4) rotate(${-14 * spin}deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${dx * 0.5}px, ${arc}px) scale(1.15) rotate(${180 * spin}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale}) rotate(${360 * spin}deg)`, opacity: 1 }
    ], { duration: 1700, easing: 'cubic-bezier(.4,0,.2,1)' });
    const land = () => {
      el.remove();
      if (isEmote) { target.style.visibility = ''; pulse(target, 'land'); } else pulse(target);
      pulse(badge);
      const bar = $('#slipbar');
      if (bar && !desktop.matches) pulse(bar, 'bump');
    };
    anim.onfinish = land;
    anim.oncancel = land;
  }

  /* ==========================================================
     Login / registro → Próximamente
     ========================================================== */
  let lastFocus = null;

  function openModal(step, opts = {}) {
    const box = $('#modalBox');
    const close = `<button class="icon-btn modal__x" data-act="close-modal" aria-label="Cerrar">${ico('close')}</button>`;
    if (step === 'login') {
      const lead = opts.stake > 0
        ? `Para confirmar tu apuesta de <b>${fmtMoney(opts.stake)}</b> tienes que iniciar sesión.`
        : opts.fromBet ? 'Para confirmar tu apuesta tienes que iniciar sesión.' : 'Accede a tu cuenta de ChiniBank.';
      box.innerHTML = `${close}
        <div class="modal__logo"><span class="logo">CHINIBANK</span></div>
        <h2 id="modalTitle">Inicia sesión</h2>
        <p class="modal__lead">${lead}</p>
        <form id="loginForm" novalidate>
          <label class="field"><span>Email o usuario</span><input type="text" name="user" autocomplete="username" placeholder="tu@email.com"></label>
          <label class="field"><span>Contraseña</span><input type="password" name="pass" autocomplete="current-password" placeholder="••••••••"></label>
          <button class="btn" type="submit">Conectarse</button>
        </form>
        <p class="modal__alt">¿No tienes cuenta? <button type="button" data-act="register">Regístrate</button></p>`;
    } else {
      box.innerHTML = `${close}
        <div class="soon-art">${emote(0)}${emote(1)}</div>
        <span class="soon-pill">Próximamente</span>
        <h2 id="modalTitle">¡Próximamente!</h2>
        <p class="modal__lead">${opts.register ? 'El registro' : 'El inicio de sesión'} llegará muy pronto a ChiniBank. Mientras tanto puedes seguir armando tu cesta${state.slip.length ? ' (no se borra)' : ''}.</p>
        <button class="btn" data-act="close-modal">Entendido</button>`;
    }
    const modal = $('#modal');
    if (modal.hidden) lastFocus = document.activeElement;
    modal.hidden = false;
    const first = $('input, .btn', box);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
  }

  function closeModal() {
    const modal = $('#modal');
    if (modal.hidden) return false;
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    return true;
  }

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'loginForm') return;
    e.preventDefault();
    openModal('soon');
  });

  function placeBet() {
    const t = slipTotals();
    if (!t.sels.length) return;
    openModal('login', { fromBet: true, stake: t.stake });
  }

  /* ==========================================================
     Menú lateral y buscador
     ========================================================== */
  function renderSidebar() {
    $('#sidebar').innerHTML = `
      <div class="side-top only-mobile"><span class="logo logo--sm">CHINIBANK</span><button class="icon-btn" data-act="close-overlays" aria-label="Cerrar menú">${ico('close')}</button></div>
      <div class="search">${ico('search')}<input id="search" type="search" placeholder="Buscar" autocomplete="off" aria-label="Buscar jugadores o competiciones"><div class="search__results" id="searchResults" hidden></div></div>
      <div class="side-group">
        <a class="side-link" href="#/calendario" data-nav="calendar">${ico('clock', 'ico--lg')}<span>Próximos partidos (calendario)</span>${chev}</a>
        <a class="side-link" href="#/promos" data-nav="promos">${ico('gift', 'ico--lg')}<span>Promos</span>${chev}</a>
      </div>
      <h3 class="side-title">Competiciones destacadas</h3>
      <div class="side-group">
        <a class="side-link" href="#/competicion" data-nav="competition">${compIcons()}<span>${esc(C.name)}</span>${chev}</a>
      </div>
      <h3 class="side-title">Deportes</h3>
      <div class="side-group">
        <div class="side-link side-link--head"><svg class="ico ico--lg" aria-hidden="true"><use href="#i-ball"/></svg><span>${esc(C.sport)}</span><span class="count">1</span></div>
        <a class="side-link side-link--sub" href="#/partido" data-nav="match">${flag(C.country)}<span>${esc(matchTitle)}</span>${chev}</a>
      </div>
      <p class="side-note">ChiniBank es un entorno de pruebas con cuotas ficticias. Juega con responsabilidad · +18.</p>`;

    const input = $('#search');
    const box = $('#searchResults');
    const index = [
      { title: matchTitle, sub: `${C.name} · ${M.round}`, href: '#/partido', icon: flag(C.country, 'flag--md') },
      { title: C.name, sub: C.sport, href: '#/competicion', icon: compIcons() },
      ...P.map((p) => ({ title: p.name, sub: `${C.name} · ${M.round}`, href: '#/partido', icon: flag(p.flag, 'flag--md') })),
      ...M.markets.map((mk) => ({ title: mk.name, sub: matchTitle, href: `#/partido/${mk.tab}`, icon: ico('ticket') }))
    ];
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    input.addEventListener('input', () => {
      const q = norm(input.value.trim());
      if (!q) { box.hidden = true; return; }
      const hits = index.filter((it) => norm(`${it.title} ${it.sub}`).includes(q)).slice(0, 6);
      box.innerHTML = hits.length
        ? hits.map((h) => `<a href="${h.href}" data-search-hit>${h.icon}<span><span>${esc(h.title)}</span><small>${esc(h.sub)}</small></span></a>`).join('')
        : `<div class="search__empty">Sin resultados para «${esc(input.value.trim())}»</div>`;
      box.hidden = false;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = $('a', box); if (first) { location.hash = first.getAttribute('href'); clearSearch(); } }
      if (e.key === 'Escape') clearSearch();
    });
  }
  function clearSearch() {
    const input = $('#search');
    if (input) input.value = '';
    const box = $('#searchResults');
    if (box) box.hidden = true;
  }

  function closeOverlays() {
    document.body.classList.remove('menu-open', 'slip-open');
  }

  /* ==========================================================
     Router
     ========================================================== */
  let lastBase = null;
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const map = { '': 'home', competicion: 'competition', partido: 'match', directo: 'live', 'mis-apuestas': 'bets', promos: 'promos', calendario: 'calendar' };
    const name = map[parts[0] || ''] || 'home';
    return { name, tab: parts[1] || '' };
  }

  function render() {
    const r = route();
    $('#view').innerHTML = views[r.name](r.tab);
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav.split(' ').includes(r.name)));
    const titles = { home: 'Apuestas deportivas', competition: C.name, match: matchTitle, live: 'En directo', bets: 'Mis apuestas', promos: 'Promos', calendar: 'Calendario' };
    document.title = `${titles[r.name]} · ChiniBank`;
    renderSlip();
    renderChrome();
    if (lastBase !== r.name) { window.scrollTo(0, 0); lastBase = r.name; }
  }

  /* ==========================================================
     Eventos
     ========================================================== */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const out = t.closest('[data-out]');
    if (out) { e.preventDefault(); toggleSelection(out.dataset.out, out); return; }

    const tog = t.closest('[data-toggle]');
    if (tog) {
      const id = tog.dataset.toggle;
      if (collapsedMarkets.has(id)) collapsedMarkets.delete(id); else collapsedMarkets.add(id);
      const box = tog.closest('.market');
      box.classList.toggle('is-collapsed');
      tog.setAttribute('aria-expanded', !box.classList.contains('is-collapsed'));
      return;
    }

    const rm = t.closest('[data-remove]');
    if (rm) { toggleSelection(rm.dataset.remove); return; }

    const mode = t.closest('[data-mode]');
    if (mode && !mode.disabled) { state.mode = mode.dataset.mode; save(); renderSlip(); renderChrome(); return; }

    const q = t.closest('[data-quick]');
    if (q) {
      const key = q.dataset.for;
      const cur = parseStake(key === 'combo' ? state.comboStake : state.stakes[key]);
      const val = String(round2(cur + Number(q.dataset.quick))).replace('.', ',');
      if (key === 'combo') state.comboStake = val; else state.stakes[key] = val;
      const input = $(`[data-stake="${CSS.escape(key)}"]`);
      if (input) input.value = val;
      save(); updateTotals(); renderChrome();
      return;
    }

    if (t.closest('[data-search-hit]')) { clearSearch(); return; }
    if (!t.closest('.search')) { const box = $('#searchResults'); if (box) box.hidden = true; }

    const act = t.closest('[data-act]');
    if (!act) return;
    switch (act.dataset.act) {
      case 'open-menu': document.body.classList.remove('slip-open'); document.body.classList.add('menu-open'); break;
      case 'open-slip': document.body.classList.remove('menu-open'); document.body.classList.add('slip-open'); break;
      case 'close-overlays': closeOverlays(); break;
      case 'clear-slip':
        state.slip = []; state.stakes = {}; state.comboStake = '';
        save(); refreshOdds(); renderSlip(); renderChrome();
        break;
      case 'place-bet': placeBet(); break;
      case 'login': openModal('login'); break;
      case 'register': openModal('soon', { register: true }); break;
      case 'close-modal': closeModal(); break;
    }
  });

  document.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-stake]');
    if (!inp) return;
    const clean = inp.value.replace(/[^\d.,]/g, '');
    if (clean !== inp.value) inp.value = clean;
    if (inp.dataset.stake === 'combo') state.comboStake = clean; else state.stakes[inp.dataset.stake] = clean;
    save(); updateTotals(); renderChrome();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!closeModal()) closeOverlays(); }
    if (e.key === 'Enter' && e.target.closest('[data-stake]')) { e.preventDefault(); placeBet(); }
  });

  window.addEventListener('hashchange', () => { closeOverlays(); closeModal(); render(); });
  desktop.addEventListener('change', closeOverlays);

  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY) return;
    Object.assign(state, load());
    render();
  });

  setInterval(() => {
    const els = $$('[data-countdown]');
    if (els.length) { const txt = countdown(); els.forEach((el) => { el.textContent = txt; }); }
  }, 1000);

  /* ---------- Arranque ---------- */
  renderSidebar();
  render();
})();
