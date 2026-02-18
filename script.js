/**********************
 * ULTIMATE LEAGUE
 * World Init + Squad Generator
 **********************/

/** === CONFIG === **/

const formations = {
  "4-3-3": { GK:1, DEF:4, MID:3, ATT:3 },
  "4-4-2": { GK:1, DEF:4, MID:4, ATT:2 },
  "3-5-2": { GK:1, DEF:3, MID:5, ATT:2 },
  "5-2-3": { GK:1, DEF:5, MID:2, ATT:3 },
  "4-2-3-1": { GK: 1, DEF: 4, MID: 5, ATT: 1 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, ATT: 3}
};

function randomFormation() {
  const keys = Object.keys(formations);
  return keys[randInt(0, keys.length - 1)];
}

const TACTIC_DEFAULTS = {
  formation: "4-3-3",
  style: "balanced",
  mentality: "balanced",
  pressing: "medium",
  width: "balanced",
  tempo: "balanced",
  line: "balanced",
  tackling: "normal"
};

function ensureClubTactics(club) {
  if (!club.tactics) club.tactics = { ...TACTIC_DEFAULTS };
  // migrate old fields if exist
  if (club.tactic && !club.tactics.formation) club.tactics.formation = club.tactic;
  if (club.mentality && !club.tactics.mentality) club.tactics.mentality = club.mentality;
  if (club.pressing && !club.tactics.pressing) club.tactics.pressing = club.pressing;

  // harden
  if (!formations[club.tactics.formation]) club.tactics.formation = "4-3-3";
  return club;
}

const CONFIG = {
  SQUAD_SIZE: 20,
  JOB_SECURITY: 0.97, // quase impossível seres despedido (fase inicial)
  POS_DISTRIBUTION: { GK: 2, DEF: 6, MID: 6, ATT: 6 },
  MARKET_REFRESH_INTERVAL: 5,
};

/** === CLUB LIST (Season 1) === **/
const CLUB_PRESETS = [
  // Elite
  { name: "Manchester City", rating: 89 },
  { name: "Real Madrid", rating: 88 },
  { name: "Barcelona", rating: 88 },

  // Strong
  { name: "Bayern Munich", rating: 86 },
  { name: "Paris Saint-Germain", rating: 86 },
  { name: "Liverpool", rating: 85 },
  { name: "Arsenal", rating: 84 },

  // Competitive
  { name: "Atlético Madrid", rating: 83 },
  { name: "Chelsea", rating: 82 },
  { name: "Newcastle United", rating: 81 },

  // Mid
  { name: "Borussia Dortmund", rating: 80 },
  { name: "Bayer Leverkusen", rating: 80 },
  { name: "Manchester United", rating: 79 },
  { name: "Tottenham Hotspur", rating: 78 },

  // Underdogs
  { name: "Napoli", rating: 77 },
  { name: "Benfica", rating: 77 },
  { name: "Aston Villa", rating: 76 },
  { name: "Mambas", rating: 75 },
];

/** === UTILITIES === **/
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/** === BOARD EXPECTATION (Closed league) === **/
function generateBoardExpectation(club) {
  // closed league -> "Avoid Bottom 4" em vez de relegation
  const r = club.rating;

  // base expectation pelo rating
  let base;
  if (r >= 85) base = "Win the League";
  else if (r >= 80) base = "Top 4";
  else if (r >= 76) base = "Top Half";
  else base = "Avoid Bottom 4";

  // ajuste leve pela época anterior (se existir)
  // lastSeasonPosition: 1..18
  if (club.lastSeasonPosition != null) {
    if (club.lastSeasonPosition <= 4 && r < 85) base = "Top 4";
    if (club.lastSeasonPosition >= 15 && r >= 75) base = "Avoid Bottom 4";
  }

  return base;
}

/** === VALUE/WAGE (simple formulas for now) === **/
function calcPlayerValue(overall, age) {
  // value escala: overall importa muito, idade jovem valoriza
  const base = overall * overall * 8000; // 80 -> ~51M-ish scale in future; fine for now
  const ageFactor = age <= 23 ? 1.25 : age <= 28 ? 1.1 : age <= 32 ? 0.95 : 0.8;
  return Math.round(base * ageFactor);
}

function calcPlayerWage(overall,age) {
  // wage semanal (placeholder)
  const base = overall * 500;
  const ageFactor = age <= 23 ? 0.9 : age <= 30 ? 1 : 0.8;
  return Math.round(base * ageFactor);
}

/** === PLAYER GENERATION === **/
const FIRST_NAMES = ["Leo", "Alex", "Ney", "Noah", "Kai", "Hugo", "Enzo", "Bruno", "Omar", "Dany", "Dave", "Puto", "Bola", "Lamine", "Nico", "Nathan", "Jacob", "Aaron", "Theo", "Dominic", "Kai",
    "Max", "Malik", "Karim", "Isaac"];
const LAST_NAMES  = ["Silva", "Khan", "Mendes", "Alves", "Costa", "Fernandes", "Santos", "Messi", "Pereira", "Ramos", "Bandeiroso", "Kali", "Lucca", "Yamal", "Williams", "Acosta", "Paredes", "Vieira", "Cardoso", "Abdullah", "Traoré", "Balde", "Boateng", "Sissoko", "Azizi"];

const NATIONALITIES = [
  { name: "England", code: "GB" },
  { name: "Spain", code: "ES" },
  { name: "France", code: "FR" },
  { name: "Germany", code: "DE" },
  { name: "Brazil", code: "BR" },
  { name: "Argentina", code: "AR" },
  { name: "Portugal", code: "PT" },
  { name: "Italy", code: "IT" },
  { name: "Netherlands", code: "NL" },
  { name: "Morocco", code: "MA" }
];


function randomName() {
  return `${FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[randInt(0, LAST_NAMES.length - 1)]}`;
}

function generatePlayer(position, clubRating, role = "normal") {
  // overall por posição com variação
  let base = clubRating;

  // estrelas e jovens
  if (role === "star") base += randInt(2, 4);
  if (role === "prospect") base -= randInt(1, 2);

  const overall = clamp(base + randInt(-4, 3), 50, 95);

  const nationality = NATIONALITIES[randInt(0, NATIONALITIES.length - 1)];

  // idade
  let age;
  if (role === "prospect") age = randInt(17, 21);
  else if (role === "star") age = randInt(22, 30);
  else age = randInt(20, 34);

  // potencial
  let potential = overall + randInt(0, 8);
  if (role === "prospect") potential = overall + randInt(6, 14);
  potential = clamp(potential, overall, 99);

  const morale = randInt(55, 85);
  const form = randInt(45, 80);
  const stamina = randInt(70, 100);
  const contractYears = randInt(3,5);

  return {
    id: uid("p"),
    name: randomName(),
    age,
    position, // GK / DEF / MID / ATT
    overall,
    potential,
    value: calcPlayerValue(overall, age),
    wage: calcPlayerWage(overall, age),
    morale,
    form,
    stamina,
    isStarter: false,
    nationality: nationality.name,
    flag: nationality.code,
    goals: 0,
    contractYears: randInt(3,5),
    redCard: false,
    suspendedMatches: 0,
    yellowCards: 0,
    injured: false,
    injuryWeeks: 0,
  };
}

function generateSquad(clubRating) {
  const squad = [];

  // 2-3 stars / 2-3 prospects
  const starCount = randInt(2, 3);
  const prospectCount = randInt(2, 3);

  // positions pool
  const positions = [];
  for (const [pos, count] of Object.entries(CONFIG.POS_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) positions.push(pos);
  }

  // pick indices for stars/prospects
  const indices = [...Array(CONFIG.SQUAD_SIZE).keys()];
  // shuffle indices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const starIdx = new Set(indices.slice(0, starCount));
  const prospectIdx = new Set(indices.slice(starCount, starCount + prospectCount));

  for (let i = 0; i < CONFIG.SQUAD_SIZE; i++) {
    const pos = positions[i];
    const role = starIdx.has(i) ? "star" : prospectIdx.has(i) ? "prospect" : "normal";
    squad.push(generatePlayer(pos, clubRating, role));
  }

  const best11 = [...squad]
    .sort((a,b) => b.overall - a.overall)
    .slice(0, 11);

  best11.forEach(p => p.isStarter = true);

  return squad;
}

/** === TIER (dynamic later; initial from rating) === **/
function initialTierFromRating(rating) {
  if (rating >= 87) return "Elite";
  if (rating >= 84) return "Strong";
  if (rating >= 81) return "Competitive";
  if (rating >= 78) return "Mid";
  return "Underdog";
}

// ==============================
// 🔥 AI IDENTITY SYSTEM (BIG CLUB DNA)
// Add this BELOW initialTierFromRating
// ==============================

function assignClubIdentity(club) {
  // Big historical clubs behave differently

  const bigNames = [
    "Real Madrid",
    "Barcelona",
    "Manchester City",
    "Bayern Munich",
    "Liverpool",
    "Paris Saint-Germain"
  ];

  if (bigNames.includes(club.name)) {
    club.identity = {
      preferredStyle: "possession",
      flexibility: 0.15,   // very hard to change style
      ego: 0.8             // resist meta shifts
    };
    return;
  }

  // Tier based fallback
  if (club.tier === "Elite") {
    club.identity = {
      preferredStyle: "possession",
      flexibility: 0.2,
      ego: 0.7
    };
  }
  else if (club.tier === "Strong") {
    club.identity = {
      preferredStyle: ["possession","wingPlay"][randInt(0,1)],
      flexibility: 0.35,
      ego: 0.5
    };
  }
  else if (club.tier === "Competitive") {
    club.identity = {
      preferredStyle: ["balanced","wingPlay","counter"][randInt(0,2)],
      flexibility: 0.5,
      ego: 0.3
    };
  }

  else {
    club.identity = {
      preferredStyle: "counter",
      flexibility: 0.7,
      ego: 0.1
    };
  }
}

function generateInitialBudget(rating) {
    if (rating >= 87) return randInt(140,180) * 1_000_000;
    if (rating >= 84) return randInt(100,140) * 1_000_000;
    if (rating >= 81) return randInt(70,110) * 1_000_000;
    if (rating >= 78) return randInt(45,80) * 1_000_000;
    return randInt(20, 55) * 1_000_000;
}

/** === WORLD INIT === **/
function initWorld() {
  const clubs = CLUB_PRESETS.map((c) => {
    const club = {
      id: uid("c"),
      name: c.name,
      rating: c.rating,
      tier: initialTierFromRating(c.rating),
      reputation: c.rating,          // placeholder (same as rating)
      budget: generateInitialBudget(c.rating),   // placeholder (vamos calibrar depois)
      lastSeasonPosition: null,
      squad: [],
      momentum: 0,
      tactics: {
        ...TACTIC_DEFAULTS,
      },
      cheatBoost: {
        GK: 0,
        DEF: 0,
        MID: 0,
        ATT: 0
      }
    };

    club.squad = generateSquad(club.rating);

    lockInitialFormation(club);
    buildStartingXI(club);

    club.squad.forEach(p => {
      if (p.contractYears === undefined) p.contractYears = randInt(3,5);
    });

    club.boardExpectation = generateBoardExpectation(club); // generated each season (kept for display)

    assignClubIdentity(club);
    assignAITacticsByTier(club);

    return club;
  });

  return {
    season: 1,
    week: 0,
    clubs,
    selectedClubId: null,
    league: null, // later
    cup: null,    // later
    trophies: {},
    meta: {
      dominantStyle: null,
      dominanceCounter: 0,
    },
    activeCompetition: "league" // default to league, can be changed later
  };
}

/** === DEBUG: make world and expose globally === **/
window.UL = {
  game: initWorld(),
};

console.log("✅ Ultimate League world created:", window.UL.game);

/**********************
 * START NEW CAREER
 **********************/

const startBtn = document.getElementById("startGameBtn");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    showClubSelection();
  });
}

function showClubSelection() {
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => p.classList.remove("active"));

  document.getElementById("clubSelect").classList.add("active");

  renderClubCards();
}

function renderClubCards() {
  const grid = document.getElementById("clubGrid");
  grid.innerHTML = "";

  const clubs = UL.game.clubs;

  clubs.forEach(club => {
    const card = document.createElement("div");
    card.classList.add("club-card");

    card.innerHTML = `
      <h3>${club.name}</h3>
      <p>Rating: ${club.rating}</p>
      <p>Tier: ${club.tier}</p>
      <p>Budget: €${(club.budget / 1000000).toFixed(1)}M</p>
      <p>Expectation: ${club.boardExpectation}</p>
    `;

    card.addEventListener("click", () => {
      window.selectClub(club.id);
    });

    grid.appendChild(card);
  });
}

function selectClub(clubId) {
  UL.game.selectedClubId = clubId;

    if (!UL.game.league) {
    initLeague();
  }

  const club = UL.game.clubs.find(c => c.id === clubId);

  buildStartingXI(club);

  showNotification(`You are now manager of ${club.name}`);

  // Voltar ao dashboard
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => p.classList.remove("active"));

  document.getElementById("dashboard").classList.add("active");

  updateDashboardNextMatchInfo();
  renderLeagueTable();
  renderTopScorers();
  rendertop8Table();
  renderTeamCard();

}

window.selectClub = selectClub

/**********************
 * LEAGUE ENGINE v1
 **********************/

function createStandings(clubs) {
  return clubs.map(c => ({
    clubId: c.id,
    played: 0, wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0,
    points: 0,
    streak: [] // últimos resultados: "W","D","L"
  }));
}

function sortStandings(standings) {
  return standings.sort((a,b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

// round robin "circle method" (single round), depois espelha para casa/fora
function generateFixtures(clubIds) {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push(null);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  const firstLeg = [];

  let arr = [...teams];
  for (let r = 0; r < rounds; r++) {
    const matchday = [];
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home && away) matchday.push({ homeId: home, awayId: away, played: false });
    }
    firstLeg.push(matchday);

    // rotate except first
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }

  // second leg swap home/away
  const secondLeg = firstLeg.map(md =>
    md.map(m => ({ homeId: m.awayId, awayId: m.homeId, played: false }))
  );

  return [...firstLeg, ...secondLeg]; // 34 matchdays for 18 teams
}

function getClubById(id) {
  return UL.game.clubs.find(c => c.id === id);
}

function avgTeamForm(club) {
  // Fase 1: média dos 20 jogadores (depois mudamos para titulares) !!! JÁ ESTÃO SÓ OS 11 TITULARES !!!
  const starters = club.squad.filter(p => p.isStarter);

  if (starters.length === 0) return 0;
  const sum = starters.reduce((acc, p) => acc + p.form, 0);
  return sum / starters.length;
}

function clampFormUpdate(club, delta) {
  club.squad.forEach(p => {
    p.form = clamp(p.form + delta, 20, 95);
  });
}

function applyStreakBonus(standing) {
  // 3 vitórias seguidas -> +3; 3 derrotas -> -3 (aplicado como delta extra)
  const last3 = standing.streak.slice(-3).join("");
  if (last3 === "WWW") return 3;
  if (last3 === "LLL") return -3;
  return 0;
}


function simulateMatch(homeClub, awayClub) {
  const homeForm = avgTeamForm(homeClub);
  const awayForm = avgTeamForm(awayClub);

  const homeXI = homeClub.squad.filter(p => p.isStarter);
  const awayXI = awayClub.squad.filter(p => p.isStarter);

  const calcSectorOVR = (club, XI) => {
    const total = XI.reduce((acc, p) => {
        const boost = club.cheatBoost?.[p.position] || 0;
        return acc + (p.overall + boost);
    }, 0);
    return total / XI.length;
  };

  const homeOVR = calcSectorOVR(homeClub, homeXI);
  const awayOVR = calcSectorOVR(awayClub, awayXI);

  let homeStrength = homeOVR * 0.7 + homeForm * 0.3 + randInt(-4, 4);
  let awayStrength = awayOVR * 0.7 + awayForm * 0.3 + randInt(-4, 4);

  // ===== NEW TACTIC ENGINE =====
  const baseHomeStrenght = homeStrength;
  const baseAwayStrenght = awayStrength;

  const tacticResult = applyTacticsToMatchStrength(
    homeClub,
    awayClub,
    baseHomeStrenght,
    baseAwayStrenght
  );

  homeStrength = tacticResult.homeStrength;
  awayStrength = tacticResult.awayStrength;

  // ==========================

  const diff = homeStrength - awayStrength;

  // goals baseline
  const baseHome = diff >= 10 ? randInt(2,4) : diff >= 4 ? randInt(1,3) : diff >= -3 ? randInt(0,2) : randInt(0,1);
  const baseAway = diff <= -10 ? randInt(2,4) : diff <= -4 ? randInt(1,3) : diff <= 3 ? randInt(0,2) : randInt(0,1);

  // small noise
  let homeGoals = clamp(baseHome + randInt(0,1), 0, 5);
  let awayGoals = clamp(baseAway + randInt(0,1), 0, 5);

  // make draws a bit more common when close
  if (Math.abs(diff) < 2 && randInt(1, 4) === 1) {
    awayGoals = homeGoals;
  }

  // mini stats (placeholder)
  const shotsHome = clamp(Math.round(homeGoals * 3 + randInt(4, 10)), 2, 20);
  const shotsAway = clamp(Math.round(awayGoals * 3 + randInt(4, 10)), 2, 20);
  const possHome = clamp(Math.round(50 + (diff * 1.2) + randInt(-8, 8)), 35, 65);
  const possAway = 100 - possHome;

  // === Assign Goals To Players ===
  function assignGoals(club, goals) {

    const scorers = [];

    const starters = club.squad.filter(p => p.isStarter);

    // weighted pool
    const weightedPool = [];

    starters.forEach(p => {
      let weight = 1;

      if (p.position === "ATT") weight = 6;
      else if (p.position === "MID") weight = 3;
      else if (p.position === "DEF") weight = 1;
      else if (p.position === "GK") weight = 0.2;

      for (let i = 0; i < weight; i++) {
        weightedPool.push(p);
      }
    });

    for (let i = 0; i < goals; i++) {

      const scorer = weightedPool[randInt(0, weightedPool.length - 1)];

      if (!scorer.goals) scorer.goals = 0;
      scorer.goals += 1;

      scorers.push(scorer);
    }

    return scorers;
  }

  const homeScorers = assignGoals(homeClub, homeGoals);
  const awayScorers = assignGoals(awayClub, awayGoals);

  // === MOTM Logic ===
  let allPlayers = [...homeScorers, ...awayScorers];

  let motm;

  if (allPlayers.length > 0) {
    motm = allPlayers.sort((a,b)=> (b.goals||0)-(a.goals||0))[0];
  } else {
    const randomXI = homeClub.squad.filter(p=>p.isStarter);
    motm = randomXI[randInt(0, randomXI.length - 1)];
  }

  applyTacticStaminaDrain(homeClub);
  applyTacticStaminaDrain(awayClub);

  function applyMatchInjuries(club) {
  const XI = club.squad.filter(p => p.isStarter && !p.injured);

  // 🔥 Only allow MAX 1 injury per team per match
  let injuryOccurred = false;

  XI.forEach(player => {
    if (injuryOccurred) return;

    // Base injury chance MUCH lower
    let risk = 0.002; // was 0.02 (2%) → now 0.8%

    // Aggressive tackling small boost
    if (club.tactics.tackling === "aggressive") risk += 0.006;

    if (Math.random() < risk) {
      player.injured = true;
      player.injuryWeeks = randInt(1, 3);
      injuryOccurred = true;

      showNotification(`🩺 ${player.name} injured for ${player.injuryWeeks} weeks`);
    }
  });
}

  applyMatchInjuries(homeClub);
  applyMatchInjuries(awayClub);
  
  [homeClub, awayClub].forEach(club => {
    club.squad.forEach(player => {
      if (player.redCard) {
        player.suspendedMatches += 1;
        player.redCard = false;
      }
    });
  });

  return {
    homeGoals, awayGoals,
    homeScorers, awayScorers,
    motm,
    stats: { shotsHome, shotsAway, possHome, possAway }
  };
}

function applyMetaInfluence(club, strength) {

  const meta = UL.game.meta;
  if (!meta || meta.dominanceCounter < 3) return strength;

  const dominant = meta.dominantStyle;
  const clubStyle = club.tactics.style;

  if (clubStyle === dominant) {
    return strength * 0.94;
  }

  return strength * 1.05;
}

// THE NEW TACTIC ENGINE

function applyTacticsToMatchStrength(homeClub, awayClub, baseHomeStrength, baseAwayStrength) {
  // Ensure XI exists based on tactics
  buildStartingXI(homeClub);
  buildStartingXI(awayClub);

  const { homeBonus, awayBonus } = computeTacticImpact(homeClub, awayClub);

  const homeT = homeClub.tactics;
  const awayT = awayClub.tactics;

  // stamina penalty for high press if starters are tired
  const avgStamina = (club) => {
    const XI = club.squad.filter(p => p.isStarter);
    if (!XI.length) return 80;
    return XI.reduce((a, p) => a + (p.stamina ?? 80), 0) / XI.length;
  };

  const hs = avgStamina(homeClub);
  const as = avgStamina(awayClub);

  let homeStaminaPenalty = 0;
  let awayStaminaPenalty = 0;

  if (homeT.pressing === "high" && hs < 55) homeStaminaPenalty = -1.2;
  if (awayT.pressing === "high" && as < 55) awayStaminaPenalty = -1.2;

  // tackling: slight strength bump but adds red card risk that can swing match
  const ht = tacklingDisciplineModifier(homeT.tackling);
  const at = tacklingDisciplineModifier(awayT.tackling);

  let homeStrength = baseHomeStrength + homeBonus + ht.strength + homeStaminaPenalty;
  let awayStrength = baseAwayStrength + awayBonus + at.strength + awayStaminaPenalty;

  homeStrength = applyMetaInfluence(homeClub, homeStrength);
  awayStrength = applyMetaInfluence(awayClub, awayStrength);

  // red card swing (rare)
  // If a red happens, apply a large temporary penalty
  const redRoll = () => Math.random();

  if (redRoll() < ht.redRisk * 0.08) {    // home red
    if (applyRedCard(homeClub)) {
      homeStrength -= 3.5;
    }
  }

  if (redRoll() < at.redRisk * 0.08) {    // away red
    if (applyRedCard(awayClub)) {
      awayStrength -= 3.5;
    }
  }

  return { homeStrength, awayStrength };
}

function applyRedCard(club) {
  const XI = club.squad.filter(p => p.isStarter && p.suspendedMatches === 0);
  if (!XI.length) return false;

  const player = XI[randInt(0, XI.length - 1)];
  player.redCard = true;
  showNotification(`🟥 ${player.name} sent off!`);
  return true;
}

function updateStandingsAfterMatch(standings, homeId, awayId, hg, ag) {
  const home = standings.find(s => s.clubId === homeId);
  const away = standings.find(s => s.clubId === awayId);

  home.played++; away.played++;
  home.goalsFor += hg; home.goalsAgainst += ag;
  away.goalsFor += ag; away.goalsAgainst += hg;

  if (hg > ag) {
    home.wins++; home.points += 3; home.streak.push("W");
    away.losses++; away.streak.push("L");
  } else if (hg < ag) {
    away.wins++; away.points += 3; away.streak.push("W");
    home.losses++; home.streak.push("L");
  } else {
    home.draws++; away.draws++;
    home.points += 1; away.points += 1;
    home.streak.push("D"); away.streak.push("D");
  }

  // keep streak size reasonable
  home.streak = home.streak.slice(-10);
  away.streak = away.streak.slice(-10);

  return { home, away };
}

function applyFormChanges(homeClub, awayClub, homeStanding, awayStanding, hg, ag) {
  let deltaHome = 0, deltaAway = 0;

  if (hg > ag) { deltaHome = randInt(2,4); deltaAway = -randInt(2,4); }
  if (hg < ag) { deltaAway = randInt(2,4); deltaHome = -randInt(2,4); }
  if (hg === ag) { deltaHome = randInt(-1,1); deltaAway = randInt(-1,1); }

  // streak bonus
  deltaHome += applyStreakBonus(homeStanding);
  deltaAway += applyStreakBonus(awayStanding);

  // big win/lose bonus
  const gd = hg - ag;
  if (gd >= 3) deltaHome += 2;
  if (gd <= -3) deltaHome -= 2;
  if (-gd >= 3) deltaAway += 2;
  if (-gd <= -3) deltaAway -= 2;

  clampFormUpdate(homeClub, deltaHome);
  clampFormUpdate(awayClub, deltaAway);
}

function initLeague() {
  UL.game.league = {
    fixtures: generateFixtures(UL.game.clubs.map(c => c.id)),
    standings: createStandings(UL.game.clubs),
    currentMatchday: 1,
    lastMatchdayResults: null,
  };
  UL.game.activeCompetition = "league";
}

function findUserMatch(matchdayMatches) {
  const myId = UL.game.selectedClubId;
  return matchdayMatches.find(m => m.homeId === myId || m.awayId === myId);
}

function simulateCurrentMatchday() {
  if (!UL.game.league || !UL.game.league.fixtures) return;
  const L = UL.game.league;
  const idx = L.currentMatchday - 1;
  const matchday = L.fixtures[idx];

  const results = matchday.map(m => {
    const homeClub = getClubById(m.homeId);
    const awayClub = getClubById(m.awayId);

    const sim = simulateMatch(homeClub, awayClub);

    // update standings
    const { home: homeStanding, away: awayStanding } =
      updateStandingsAfterMatch(L.standings, m.homeId, m.awayId, sim.homeGoals, sim.awayGoals);

    // update form
    applyFormChanges(homeClub, awayClub, homeStanding, awayStanding, sim.homeGoals, sim.awayGoals);

    const homeRevenue = Math.round(homeClub.reputation * 120000);
    const awayRevenue = Math.round(awayClub.reputation * 80000);
    homeClub.budget += homeRevenue; awayClub.budget += awayRevenue;

    return {
      homeId: m.homeId, awayId: m.awayId,
      homeGoals: sim.homeGoals, awayGoals: sim.awayGoals,
      homeScorers: sim.homeScorers, awayScorers: sim.awayScorers,
      stats: sim.stats,
      motm: sim.motm
    };
  });

  L.lastMatchdayResults = { number: L.currentMatchday, matches: results };
  renderMatchdayResults();
  rendertop8Table();
  renderTeamCard();
}

function renderMatchdayResults() {
  const L = UL.game.league;
  const res = L.lastMatchdayResults;
  const title = document.getElementById("mdTitle");
  title.textContent = `Matchday ${res.number} Results`;

  const userMatch = findUserMatch(res.matches);
  const other = res.matches.filter(m => m !== userMatch);

  // Your match card
  const homeClub = getClubById(userMatch.homeId);
  const awayClub = getClubById(userMatch.awayId);

  const card = document.getElementById("yourMatchCard");
  card.innerHTML = `
    <div class="your-match-top">
      <div class="team-name">${homeClub.name}</div>
      <div class="score">${userMatch.homeGoals} - ${userMatch.awayGoals}</div>
      <div class="team-name">${awayClub.name}</div>
    </div>
    <div class="mini-stats">
      <div>Shots: ${userMatch.stats.shotsHome} - ${userMatch.stats.shotsAway}</div>
      <div>Possession: ${userMatch.stats.possHome}% - ${userMatch.stats.possAway}%</div>
    </div>
    <div class="motm-highlight">
      ⭐ MOTM: ${userMatch.motm.name} (${userMatch.motm.position})
    </div>
  `;

  // Other results list
  const list = document.getElementById("otherResultsList");
  list.innerHTML = "";
  other.forEach(m => {
    const h = getClubById(m.homeId);
    const a = getClubById(m.awayId);
    const row = document.createElement("div");
    row.className = "result-row";
    row.textContent = `${h.name} ${m.homeGoals} - ${m.awayGoals} ${a.name}`;
    list.appendChild(row);
  });

  // switch page to matchdayResults
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => p.classList.remove("active"));
  document.getElementById("matchdayResults").classList.add("active");
}

function renderLeagueTable() {
  const L = UL.game.league;
  sortStandings(L.standings);

  const leagueSection = document.getElementById("league");
  // inject a table container if missing
  let wrap = document.getElementById("leagueTableWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "leagueTableWrap";
    wrap.className = "table-wrap";
    leagueSection.appendChild(wrap);
  }

  const rows = L.standings.map((s, i) => {
    const club = getClubById(s.clubId);
    const gd = s.goalsFor - s.goalsAgainst;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <span class="club-link" onclick="openClubModal('${club.id}')">
          ${club.name}
          </span>
        </td>
        <td>${s.played}</td>
        <td>${s.wins}</td>
        <td>${s.draws}</td>
        <td>${s.losses}</td>
        <td>${s.goalsFor}</td>
        <td>${s.goalsAgainst}</td>
        <td>${gd}</td>
        <td><b>${s.points}</b></td>
      </tr>
    `;
  }).join("");

  wrap.innerHTML = `
    <table class="league-table">
      <thead>
        <tr>
          <th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function updateDashboardNextMatchInfo() {
  const panel = document.getElementById("careerPanel");
  const title = document.getElementById("clubTitle");
  const info = document.getElementById("nextMatchInfo");

  if (!UL.game.selectedClubId) return;

  const myClub = getClubById(UL.game.selectedClubId);
  title.textContent = `${myClub.name} — Season ${UL.game.season}`;

  const L = UL.game.league;
  const md = L.currentMatchday;
  const matches = L.fixtures[md - 1];
  const myMatch = matches.find(m => m.homeId === myClub.id || m.awayId === myClub.id);
  const oppId = myMatch.homeId === myClub.id ? myMatch.awayId : myMatch.homeId;
  const opp = getClubById(oppId);
  const venue = myMatch.homeId === myClub.id ? "Home" : "Away";

  info.textContent = `Next: Matchday ${md} vs ${opp.name} (${venue})`;
  panel.style.display = "block";
}

/**********************
 * PLAY MATCHDAY + CONTINUE
 **********************/

document.addEventListener("DOMContentLoaded", () => {
  const playBtn = document.getElementById("playMatchdayBtn");
  const contBtn = document.getElementById("continueBtn");

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (!UL.game.selectedClubId) {
        showNotification("Select a club first.");
      return;
      }
      playCurrentCompetitionRound();
    });
  }

  if (contBtn) {
    contBtn.addEventListener("click", () => {
      const L = UL.game.league;
      // advance matchday
      L.currentMatchday++;
      applyWeeklyWages();
      decrementSuspensions();
      decrementInjuries();
      

      // 🔄 Transfer Market Refresh
      if (L.currentMatchday % CONFIG.MARKET_REFRESH_INTERVAL === 0) {
        generateTransferMarket();
        showNotification("⚡ Transfer Market Updated!");
      }

      // 🔥 INSTA START NEO EGOIST CUP
      if (L.currentMatchday > L.fixtures.length) {

        showNotification("League finished! Neo Egoist Cup begins!");

        startNeoEgoistCup();
    
        return;
      }
      // update UI
      renderLeagueTable();
      renderTopScorers();
      updateDashboardNextMatchInfo();
      renderTeamCard();

      const pages = document.querySelectorAll(".page");
      pages.forEach(p => p.classList.remove("active"));
      document.getElementById("dashboard").classList.add("active");
    });
  }
});

function decrementSuspensions() {
  const L = UL.game.league; const currentMD = L.currentMatchday - 1;
  const matchday = L.fixtures[currentMD];
  matchday.forEach(match => {
    const clubs = [getClubById(match.homeId), getClubById(match.awayId)];
    clubs.forEach(club => {
      club.squad.forEach(player => {
        if (player.suspendedMatches > 0) {
          player.suspendedMatches -= 1;
        }
      });
    });
  });
}

function decrementInjuries() {
  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
      if (player.injured && player.injuryWeeks > 0) {
        player.injuryWeeks -= 1;
        if (player.injuryWeeks <= 0) {
          player.injured = false;
          player.injuryWeeks = 0;
          showNotification(`💪 ${player.name} recovered from injury`);
        }
      }
    });
  });
}

function rendertop8Table() {
  const container = document.getElementById("top8Table");
  if (!container) return;
  if (!UL.game.league) return;

  const sorted = [...UL.game.league.standings]
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  container.innerHTML = sorted.map((row, index) => {
    const club = getClubById(row.clubId);
    return `
      <div class="top-row">
        <span>${index + 1}. ${club.name}</span>
        <span>${row.points} pts</span>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    if (UL?.game?.league) {
        rendertop8Table();
    }
});

function renderTeamCard() {
  const card = document.getElementById("yourTeamCard");
  if (!card) return;

  const clubId = UL.game.selectedClubId;
  if (!clubId || !UL.game.league) return;

  sortStandings(UL.game.league.standings);

  const club = UL.game.clubs.find(c => c.id === clubId);
  const standing = UL.game.league.standings.find(s => s.clubId === clubId);

  if (!club || !standing) return;

  const rating = club.rating || 85; // usa rating real se tiveres
  const position = UL.game.league.standings.indexOf(standing) + 1;

  const tier =
    rating >= 90 ? "Elite" :
    rating >= 85 ? "Strong" :
    rating >= 80 ? "Competitive" :
    "Underdog";

  const record = `${standing.wins}W - ${standing.draws}D - ${standing.losses}L`;
  const gd = standing.goalsFor - standing.goalsAgainst;
  const budget = club.budget 
    ? `€${(club.budget / 1000000).toFixed(1)}M`
    : "€100M";

  card.innerHTML = `
    <h2>${club.name}</h2>
    <div class="team-stats-grid">
      <div class="stat-box">
        <div class="stat-value">${rating}</div>
        <div class="stat-label">OVR</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${position}</div>
        <div class="stat-label">Position</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${tier}</div>
        <div class="stat-label">Tier</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${record}</div>
        <div class="stat-label">Record</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${gd >= 0 ? "+" + gd : gd}</div>
        <div class="stat-label">Goal Diff</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${budget}</div>
        <div class="stat-label">Budget</div>
      </div>
    </div>
  `;
}

function renderSquad() {
  const squadSection = document.getElementById("squad");
  const myId = UL.game.selectedClubId;
  if (!myId) return;

  const club = getClubById(myId);
  if (!club) return;

  // cria container se ainda não existir
  let wrap = document.getElementById("squadTableWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "squadTableWrap";
    wrap.className = "table-wrap";
    squadSection.appendChild(wrap);
  }

  const rows = club.squad.map(p => `
    <tr class="${p.isStarter ? 'starter-row' : ''}" onclick="openPlayerModal('${p.id}')">
      <td>
      <img 
        class="flag" 
        src="https://flagcdn.com/24x18/${p.flag.toLowerCase()}.png"
        alt="${p.flag}"
      >
      ${p.name}
      ${p.injured ? `<span style="color:red; font-weight:bold;"> (INJ ${p.injuryWeeks})</span>` : ""}
      </td>
      <td>${p.position}</td>
      <td>${p.age}</td>
      <td><b>${p.overall}</b></td>
      <td>${p.potential}</td>
      <td>${p.form}</td>
      <td>${p.morale}</td>
      <td>${p.stamina}</td>
      <td>€${(p.value / 1000000).toFixed(1)}M</td>
      <td>€${p.wage}</td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <table class="squad-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Pos</th>
          <th>Age</th>
          <th>OVR</th>
          <th>POT</th>
          <th>Form</th>
          <th>Morale</th>
          <th>Stamina</th>
          <th>Value</th>
          <th>Wage</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// 🔥 CLEAN NAVIGATION SYSTEM

// ===== GLOBAL NAVIGATION =====
document.addEventListener("DOMContentLoaded", () => {

  const navButtons = document.querySelectorAll(".nav-btn");

  navButtons.forEach(button => {
    button.addEventListener("click", () => {

      const target = button.dataset.page;

      // hide all pages
      document.querySelectorAll(".page").forEach(p =>
        p.classList.remove("active")
      );

      // show target page
      const targetPage = document.getElementById(target);
      if (targetPage) {
        targetPage.classList.add("active");
      }

      // page-specific logic
      if (target === "squad") renderSquad();
      if (target === "tactics") safeInitTacticsV2();
      if (target === "transfers") renderTransferMarket();

    });
  });

  const saveBtn = document.getElementById("saveTacticsBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveTacticsV2);
  }

});

function safeInitTacticsV2() {
  if (!window.UL || !UL.game || !UL.game.selectedClubId) return;

  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  if (!club) return;

  ensureClubTactics(club);

  const formationSelect = document.getElementById("formationSelect");
  const styleSelect = document.getElementById("styleSelect");
  const mentalitySelect = document.getElementById("mentalitySelect");
  const pressingSelect = document.getElementById("pressingSelect");
  const widthSelect = document.getElementById("widthSelect");
  const tempoSelect = document.getElementById("tempoSelect");
  const lineSelect = document.getElementById("lineSelect");
  const tacklingSelect = document.getElementById("tacklingSelect");

  if (!formationSelect || !styleSelect || !mentalitySelect || !pressingSelect || !widthSelect || !tempoSelect || !lineSelect || !tacklingSelect) {
    console.warn("Tactics v2 UI missing elements.");
    return;
  }

  // formations
  formationSelect.innerHTML = "";
  Object.keys(formations).forEach(f => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    if (f === club.tactics.formation) opt.selected = true;
    formationSelect.appendChild(opt);
  });

  // set selects
  styleSelect.value = club.tactics.style;
  mentalitySelect.value = club.tactics.mentality;
  pressingSelect.value = club.tactics.pressing;
  widthSelect.value = club.tactics.width;
  tempoSelect.value = club.tactics.tempo;
  lineSelect.value = club.tactics.line;
  tacklingSelect.value = club.tactics.tackling;

  // boosts (optional)
  if (club.cheatBoost) {
    const bGK = document.getElementById("boostGK");
    const bD = document.getElementById("boostDEF");
    const bM = document.getElementById("boostMID");
    const bA = document.getElementById("boostATT");
    if (bGK) bGK.value = club.cheatBoost.GK;
    if (bD) bD.value = club.cheatBoost.DEF;
    if (bM) bM.value = club.cheatBoost.MID;
    if (bA) bA.value = club.cheatBoost.ATT;
  }
}

function saveTacticsV2() {
  if (!UL.game.selectedClubId) return;

  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  if (!club) return;
  ensureClubTactics(club);

  club.tactics.formation = document.getElementById("formationSelect").value;
  club.tactics.style = document.getElementById("styleSelect").value;
  club.tactics.mentality = document.getElementById("mentalitySelect").value;
  club.tactics.pressing = document.getElementById("pressingSelect").value;
  club.tactics.width = document.getElementById("widthSelect").value;
  club.tactics.tempo = document.getElementById("tempoSelect").value;
  club.tactics.line = document.getElementById("lineSelect").value;
  club.tactics.tackling = document.getElementById("tacklingSelect").value;

  // boosts (optional)
  if (club.cheatBoost) {
    club.cheatBoost.GK = parseInt(document.getElementById("boostGK")?.value) || 0;
    club.cheatBoost.DEF = parseInt(document.getElementById("boostDEF")?.value) || 0;
    club.cheatBoost.MID = parseInt(document.getElementById("boostMID")?.value) || 0;
    club.cheatBoost.ATT = parseInt(document.getElementById("boostATT")?.value) || 0;
  }

  // rebuild XI with the new formation
  buildStartingXI(club);

  showNotification("Tactics saved. Lineup recalibrated.");
}

/************************************************
 * ========= NEO EGOIST CUP SYSTEM =========
 ************************************************/

function startNeoEgoistCup() {
  const sorted = [...UL.game.league.standings]
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  const top8Ids = sorted.map(s => s.clubId);

  UL.game.cup = {
    round: "Quarter Finals",
    teams: shuffle([...top8Ids]),
    matches: [],
    history: [],
    eliminated: []
  };

  generateCupMatches();

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("cup").classList.add("active");

  UL.game.activeCompetition = "cup";
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateCupMatches() {
  const cup = UL.game.cup;
  cup.matches = [];

  for (let i = 0; i < cup.teams.length; i += 2) {
    cup.matches.push({
      homeId: cup.teams[i],
      awayId: cup.teams[i + 1],
      played: false
    });
  }

  renderCup();
}

function renderCup() {
  const cup = UL.game.cup;
  const title = document.getElementById("cupRoundTitle");
  const container = document.getElementById("cupMatches");

  title.textContent = cup.round;
  container.innerHTML = "";

  cup.matches.forEach(m => {
    const home = getClubById(m.homeId);
    const away = getClubById(m.awayId);

    const row = document.createElement("div");
    row.className = "cup-match-row";

    if (!m.played) {
      row.textContent = `${home.name} vs ${away.name}`;
    } else {
      row.textContent = `${home.name} ${m.homeGoals} - ${m.awayGoals} ${away.name}`;
    }

    container.appendChild(row);
  });

  const playCupBtn = document.getElementById("playCupRoundBtn");
  if (playCupBtn) {
    playCupBtn.onclick = simulateCupRound;
  }

}

function simulateCupRound() {
  const cup = UL.game.cup;
  const winners = [];

  cup.matches.forEach(m => {

    const home = getClubById(m.homeId);
    const away = getClubById(m.awayId);

    const sim = simulateMatch(home, away);

    let hg = sim.homeGoals;
    let ag = sim.awayGoals;
    if (hg === ag) {
      if (randInt(0,1) === 0) hg++;
      else ag++; 
    }

    m.homeGoals = hg; m.awayGoals = ag; m.played = true;

    const winnerId = hg > ag ? m.homeId : m.awayId; winners.push(winnerId);

  });

  if (!cup.history) cup.history = [];

  cup.history.push({
    round: cup.round,
    matches: JSON.parse(JSON.stringify(cup.matches))
  });

  renderCup();

  setTimeout(() => {
    advanceCupRound(winners);
  }, 4000);
}

function advanceCupRound(winners) {
  const cup = UL.game.cup;

  if (cup.round === "Quarter Finals") {
    cup.round = "Semi Finals";
  } else if (cup.round === "Semi Finals") {
    cup.round = "Final";
  } else {
    // guardar resumo da cup
    const finalRound = cup.history[cup.history.length - 1];
    const finalMatch = finalRound.matches[0];

    UL.game.lastCupSummary = {
        winnerId: winners[0],
        finalMatch: finalMatch,
        history: [...cup.history]
    };

    const winnerId = winners[0];
    UL.game.trophies[winnerId] = (UL.game.trophies[winnerId] || 0) + 1;

    // ✅ Apply league end logic BEFORE showing summary
    endSeasonLogicOnly();

    // ✅ Remove cup so it doesn't persist
    UL.game.cup = null;

    // ✅ SWITCH TO SUMMARY PAGE
    document.querySelectorAll(".page").forEach(p =>
      p.classList.remove("active")
    );

    const summaryPage = document.getElementById("cupFinalStats");
    if (summaryPage) summaryPage.classList.add("active");

    renderCupFinalStats();

    return;
  }

  cup.teams = shuffle([...winners]);
  generateCupMatches();
}

function endSeason() {

  const L = UL.game.league;
  const clubs = UL.game.clubs;

  UL.game.lastSeasonSummary = {
    finalTable: [...L.standings].sort((a,b)=>b.points-a.points),
    ratingChanges: []
  };

  // ===== FINAL TABLE =====
  const finalTable = [...L.standings]
    .sort((a, b) => b.points - a.points);

  finalTable.forEach((row, index) => {
    const club = getClubById(row.clubId);
    const position = index + 1;

    let ratingChange = 0;

    // Champion
    if (position === 1) {
      ratingChange += 1;
      club.momentum += 3;

      //🏆 add league trophy
      UL.game.trophies[club.id] = (UL.game.trophies[club.id] || 0) + 1;
    }

    // Last place
    if (position === finalTable.length) {
      ratingChange -= 1;
    }

    // Top half small random boost
    if (position > 1 && position <= 9) {
      if (randInt(0, 1) === 1) ratingChange += 1;
    }

    // Bottom half small random drop
    if (position > 9 && position < finalTable.length) {
      if (randInt(0, 1) === 1) ratingChange -= 1;
    }

    club.rating = clamp(club.rating + ratingChange, 70, 95);
    club.lastSeasonPosition = position;

    UL.game.lastSeasonSummary.ratingChanges.push({
      clubId: club.id,
      change: ratingChange
    });

    // Apply proportional adjustment to squad
    club.squad.forEach(player => {
      player.overall = clamp(player.overall + ratingChange, 55, 99);
    });

  });

  // ===== MOMENTUM DECAY =====
  clubs.forEach(club => {
    club.momentum = Math.max(0, club.momentum - 1);
  });

  // ===== GOLDEN BOOT =====
  let goldenBoot = null;

  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
      if (player.goals && player.goals > 0) {
        if (!goldenBoot || player.goals > goldenBoot.goals) {
          goldenBoot = {
            name: player.name,
            goals: player.goals,
            club: club.name
          };
        }
      }
    });
  });

  // CONTRACT COUNTDOWN
  UL.game.clubs.forEach(club => {

    // diminuir 1 ano de contrato
    club.squad.forEach(player => {
      if (player.contractYears !== undefined) {
        player.contractYears -= 1;
      }
    });

    // remover jogadores sem contrato
    club.squad = club.squad.filter(player => {
      if (player.contractYears !== undefined && player.contractYears <= 0) {
        showNotification(`${player.name} left on free transfer`);
        return false;
      }
      return true;
      });
  });

  UL.game.lastGoldenBoot = goldenBoot;

  applySeasonPerformanceBonuses();
  applyPlayerAging();
  updateMetaAfterSeason();

  UL.game.clubs.forEach(c => considerAIStyleChange(c));

  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
        player.goals = 0;
    });
  });

  // ===== START NEW SEASON =====
  UL.game.season += 1;

  initLeague();

  UL.game.activeCompetition = "league";

  UL.game.clubs.forEach(club => {
    if (club.id !== UL.game.selectedClubId) {
      assignAITacticsByTier(club);
    }
  });

  UL.game.league.currentMatchday = 1;

  UL.game.transferMarket.players = [];
  UL.game.transferMarket.history = [];
  generateTransferMarket();

  showNotification("Season ended. Welcome to Season " + UL.game.season)

  updateDashboardNextMatchInfo();
  renderLeagueTable();
  renderTopScorers();
  renderTeamCard();
}

function considerAIStyleChange(club) {

  if (club.id === UL.game.selectedClubId) return; // never change user
  if (!club.identity) return;

  const expectation = club.boardExpectation;
  const position = club.lastSeasonPosition;

  let underperformed = false;

  if (expectation === "Win the League" && position > 3) underperformed = true;
  if (expectation === "Top 4" && position > 6) underperformed = true;
  if (expectation === "Top Half" && position > 12) underperformed = true;

  if (!underperformed) return;

  // Big clubs resist change
  const changeProbability = club.identity.flexibility * (1 - club.identity.ego);

  if (Math.random() < changeProbability) {

    const styles = ["possession","wingPlay","counter","balanced","direct"];

    // remove current style
    const possible = styles.filter(s => s !== club.tactics.style);

    club.tactics.style = possible[randInt(0, possible.length - 1)];

    showNotification(`${club.name} changed tactical philosophy.`);
  }
}

function updateMetaAfterSeason() {

  const styleCount = {};

  UL.game.clubs.forEach(club => {
    const style = club.tactics.style;
    styleCount[style] = (styleCount[style] || 0) + 1;
  });

  const dominant = Object.keys(styleCount)
    .sort((a,b)=> styleCount[b]-styleCount[a])[0];

  if (UL.game.meta.dominantStyle === dominant) {
    UL.game.meta.dominanceCounter++;
  } else {
    UL.game.meta.dominantStyle = dominant;
    UL.game.meta.dominanceCounter = 1;
  }

  if (UL.game.meta.dominanceCounter >= 3) {
    showNotification(`📉 Meta shift! ${dominant} is being countered.`);
  }
}

function applySeasonPerformanceBonuses() {

  const allPlayers = [];

  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
      allPlayers.push(player);
    });
  });

  const maxGoals = Math.max(...allPlayers.map(p => p.goals || 0));

  allPlayers.forEach(player => {

    let seasonDelta = 0;

    // ======================
    // AGE LOGIC
    // ======================

    if (player.age <= 24 && player.overall < player.potential) {
        seasonDelta += 1;
    } 
    else if (player.age <= 32 && player.overall < player.potential) {
        seasonDelta += 1;
    } 
    else if (player.age >= 34) {
        seasonDelta -= 2;
    }

    // ======================
    // TOP SCORER BONUS
    // ======================

    if ((player.goals || 0) === maxGoals && maxGoals > 0) {
        seasonDelta += 1;
    }

    // ======================
    // SOFT DECLINE
    // ======================

    if (player.form < 50 && player.age > 30) {
        seasonDelta -= 1;
    }

    // ======================
    // CAP SYSTEM
    // ======================

    seasonDelta = Math.max(-3, Math.min(3, seasonDelta));

    // ======================
    // APPLY
    // ======================

    player.overall += seasonDelta;

    player.overall = clamp(player.overall, 50, 99);

    // Recalculate
    player.value = calcPlayerValue(player.overall, player.age);
    player.wage = calcPlayerWage(player.overall, player.age);

  });

}

/************************************************
 * ========= PLAYER AGING SYSTEM =========
 ************************************************/

function applyPlayerAging() {

  UL.game.clubs.forEach(club => {

    club.squad.forEach(player => {

      // Increase age
      player.age += 1;

      // === DEVELOPMENT LOGIC ===

      // 17-22 → strong growth
      if (player.age <= 22) {
        const growth = randInt(0, 1);
        player.overall = clamp(player.overall + growth, 50, player.potential);
      }

      // 23-27 → stable
      else if (player.age <= 27) {
        // no change
      }

      // 28-32 → also stable
      else if (player.age <= 32) {
        // no change
      }

      // 33-36 → decline
      else if (player.age <= 36) {
        player.overall = clamp(player.overall - 1, 50, 99);
      }

      // 37+ → retirement chance
      else {
        if (randInt(1, 100) <= 60) {
          player.retired = true;
        } else {
          player.overall = clamp(player.overall - 1, 50, 99);
        }
      }

      // Recalculate value & wage after OVR change
      player.value = calcPlayerValue(player.overall, player.age);
      player.wage = calcPlayerWage(player.overall, player.age);

    });

    // Remove retired players
    club.squad = club.squad.filter(p => !p.retired);

    // If squad dropped below 20 players, generate replacements
    while (club.squad.length < 20) {
      const posKeys = Object.keys(CONFIG.POS_DISTRIBUTION);
      const randomPos = posKeys[randInt(0, posKeys.length - 1)];
      club.squad.push(generatePlayer(randomPos, club.rating));
    }

  });

}

function renderCupFinalStats() {

  const container = document.getElementById("cupFinalStatsContent");
  const season = UL.game.lastSeasonSummary;
  const cupSum = UL.game.lastCupSummary;

  if (!container || !season || !cupSum) {
    console.log("Summary data not ready yet.");
    return;
  }

  const finalTable = season.finalTable;
  const myId = UL.game.selectedClubId;

  // ====== LEAGUE BASIC ======
  const championRow = finalTable[0];
  const championClub = getClubById(championRow.clubId);
  const champTrophies = UL.game.trophies?.[championClub.id] || 0;

  const top4 = finalTable.slice(0,4).map((row,i)=>{
    const c = getClubById(row.clubId);
    return `<div class="line"><span>${i+1}. ${c.name}</span><span>${row.points} pts</span></div>`;
  }).join("");

  const bottomClub = getClubById(finalTable[finalTable.length-1].clubId);

  // Gap 1º vs 2º
  const gap = finalTable.length >= 2 ? (finalTable[0].points - finalTable[1].points) : 0;

  // ====== USER STATS ======
  const myRowIndex = finalTable.findIndex(r => r.clubId === myId);
  const myRow = finalTable[myRowIndex];
  const myClub = myId ? getClubById(myId) : null;

  // Goals for/against do user (da tabela)
  const myGF = myRow ? myRow.goalsFor : 0;
  const myGA = myRow ? myRow.goalsAgainst : 0;
  const myPos = myRowIndex >= 0 ? myRowIndex + 1 : "-";

  // Cup exit round (se não for winner)
  let cupExit = "Did not qualify";
  if (cupSum.history?.length) {
    const winnerId = cupSum.winnerId;
    if (myId && myId === winnerId) cupExit = "Champion";
    else if (myId) {
      // procurar a última ronda onde o user aparece
      let lastRoundPlayed = null;
      cupSum.history.forEach(h=>{
        const played = h.matches.some(m=>m.homeId===myId || m.awayId===myId);
        if (played) lastRoundPlayed = h.round;
      });
      cupExit = lastRoundPlayed ? `Eliminated in ${lastRoundPlayed}` : "Did not qualify";
    }
  }

  // ====== CUP STATS ======
  const winner = getClubById(cupSum.winnerId);

  // final score string
  let finalScoreText = "Final: -";
  if (cupSum.finalMatch) {
    const home = getClubById(cupSum.finalMatch.homeId);
    const away = getClubById(cupSum.finalMatch.awayId);
    finalScoreText = `${home.name} ${cupSum.finalMatch.homeGoals} - ${cupSum.finalMatch.awayGoals} ${away.name}`;
  }

  // compute totals + biggest win + upsets
  const cupAllMatches = (cupSum.history || []).flatMap(h => h.matches || []);
  const cupTotalGoals = cupAllMatches.reduce((acc,m)=>acc+(m.homeGoals||0)+(m.awayGoals||0),0);

  // biggest win by goal diff
  let biggestWin = null;
  cupAllMatches.forEach(m=>{
    const diff = Math.abs((m.homeGoals||0)-(m.awayGoals||0));
    if (!biggestWin || diff > biggestWin.diff) biggestWin = { m, diff };
  });

  let biggestWinText = "-";
  if (biggestWin?.m) {
    const h = getClubById(biggestWin.m.homeId);
    const a = getClubById(biggestWin.m.awayId);
    biggestWinText = `${h.name} ${biggestWin.m.homeGoals} - ${biggestWin.m.awayGoals} ${a.name} (diff ${biggestWin.diff})`;
  }

  // upsets (underdog wins by rating)
  let upsetCount = 0;
  let biggestUpset = null;

  cupAllMatches.forEach(m=>{
    const home = getClubById(m.homeId);
    const away = getClubById(m.awayId);
    if (!home || !away) return;

    const winnerId = (m.homeGoals > m.awayGoals) ? m.homeId : m.awayId;
    const winner = getClubById(winnerId);
    const loser  = getClubById(winnerId === m.homeId ? m.awayId : m.homeId);

    const ratingGap = (loser.rating || 0) - (winner.rating || 0); // positivo = upset
    if (ratingGap >= 3) {
      upsetCount++;
      if (!biggestUpset || ratingGap > biggestUpset.gap) {
        biggestUpset = { m, gap: ratingGap };
      }
    }
  });

  let biggestUpsetText = "-";
  if (biggestUpset?.m) {
    const h = getClubById(biggestUpset.m.homeId);
    const a = getClubById(biggestUpset.m.awayId);
    biggestUpsetText = `${h.name} ${biggestUpset.m.homeGoals} - ${biggestUpset.m.awayGoals} ${a.name} (gap ${biggestUpset.gap})`;
  }

  // ====== RENDER ======
  container.innerHTML = `
    <div class="stats-grid">

      <div class="summary-card cup-card">
        <h2>🏆 Neo Egoist Cup</h2>
        <div class="big">${winner.name}</div>
        <div class="muted">${finalScoreText}</div>

        <div class="kpi-grid">
          <div class="kpi"><span>Total Goals</span><b>${cupTotalGoals}</b></div>
          <div class="kpi"><span>Upsets</span><b>${upsetCount}</b></div>
        </div>

        <div class="mini">
          <div><b>Biggest Win:</b> ${biggestWinText}</div>
          <div><b>Biggest Upset:</b> ${biggestUpsetText}</div>
        </div>
      </div>

      <div class="summary-card league-card">
        <h2>🏆 League</h2>
        <div class="big">${championClub.name} 🏆 x${champTrophies}</div>
        <div class="muted">${championRow.points} pts • Gap to 2nd: ${gap}</div>

        <h3>Top 4</h3>
        <div class="lines">${top4}</div>

        <div class="mini">
          <div><b>Bottom Club:</b> ${bottomClub.name}</div>
        </div>

        ${UL.game.lastGoldenBoot ? `
          <div class="mini">
            <b>Golden Boot:</b> ${UL.game.lastGoldenBoot.name}
            (${UL.game.lastGoldenBoot.club}) - 
            ${UL.game.lastGoldenBoot.goals} ⚽
          </div>
        ` : ""}

      </div>

      <div class="summary-card user-card">
        <h2>👤 Your Season</h2>
        ${myClub ? `<div class="big">${myClub.name}</div>` : `<div class="big">No club selected</div>`}
        <div class="kpi-grid">
          <div class="kpi"><span>League Position</span><b>${myPos}</b></div>
          <div class="kpi"><span>GF / GA</span><b>${myGF} / ${myGA}</b></div>
        </div>
        <div class="mini">
          <div><b>Cup:</b> ${cupExit}</div>
        </div>
      </div>

    </div>

    <div class="season-btn-wrap">
      <button id="startNextSeasonBtn" class="primary-btn">Start Next Season</button>
    </div>
  `;

  // ✅ botão: agora sim faz reset + nova season
  document.getElementById("startNextSeasonBtn").addEventListener("click", () => {
    endSeason(); // usa a tua função atual

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("dashboard").classList.add("active");

    renderLeagueTable();
    renderTopScorers();
    rendertop8Table();
    renderTeamCard();
    updateDashboardNextMatchInfo();
  });
}

function endSeasonLogicOnly() {
  const L = UL.game.league;
  const clubs = UL.game.clubs;

  UL.game.lastSeasonSummary = {
    finalTable: [...UL.game.league.standings].sort((a,b)=>b.points-a.points),
    ratingChanges: []
  };

  const finalTable = [...L.standings].sort((a,b)=>b.points-a.points);

  finalTable.forEach((row,index)=>{
    const club = getClubById(row.clubId);
    const position = index+1;

    let ratingChange = 0;

    if(position === 1){ ratingChange +=1; club.momentum+=3;
        UL.game.trophies[club.id] = (UL.game.trophies[club.id] || 0) + 1
    }

    if(position === finalTable.length){ ratingChange -=1; }

    if(position>1 && position<=9){
      if(randInt(0,1)===1) ratingChange+=1;
    }

    if(position>9 && position<finalTable.length){
      if(randInt(0,1)===1) ratingChange-=1;
    }

    club.rating = clamp(club.rating+ratingChange,70,95);
    club.lastSeasonPosition = position;

    club.squad.forEach(player=>{
      player.overall = clamp(player.overall+ratingChange,55,99);
    });
  });

  applyPlayerAging();

  clubs.forEach(club=>{
    club.momentum = Math.max(0,club.momentum-1);
  });
}

function getFlagEmoji(countryCode) {
  return countryCode
    .toUpperCase()
    .replace(/./g, char =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

function openPlayerModal(playerId) {
  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  const player = club.squad.find(p => p.id === playerId);

  const modal = document.getElementById("playerModal");
  const body = document.getElementById("modalBody");

  body.innerHTML = `
    <h2>${player.flag} ${player.name}</h2>
    <span class="position-badge ${player.position}">
      ${player.position}
    </span>


    <div class="stat-row">
      <span>Overall</span>
      <span>${player.overall}</span>
    </div>

    <div class="stat-row">
      <span>Potential</span>
      <span>${player.potential}</span>
    </div>

    <div class="stat-row">
      <span>Form</span>
      <span>${player.form}</span>
    </div>

    <div class="stat-row">
      <span>Morale</span>
      <span>${player.morale}</span>
    </div>

    <div class="stat-row">
      <span>Value</span>
      <span>€${player.value.toLocaleString()}</span>
    </div>

    <div class="stat-row">
      <span>Wage</span>
      <span>€${player.wage.toLocaleString()}</span>
    </div>

    <button onclick="openSellModalById('${player.id}')">Sell Player</button>
    <button onclick="renewContract('${player.id}')">Renew Contract</button>
  `;

  modal.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {

  const closeBtn = document.getElementById("closeModal");

  if (closeBtn) {
    closeBtn.onclick = function() {
      document.getElementById("playerModal").classList.add("hidden");
    };
  }

});

function sellPlayer(playerId) {

  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  if (!club) return;

  const playerIndex = club.squad.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const player = club.squad[playerIndex];

  // Add money
  club.budget += player.value;

  // Remove player
  club.squad.splice(playerIndex, 1);

  // Close modal
  document.getElementById("playerModal").classList.add("hidden");

  // Refresh UI
  renderSquad();
  renderTeamCard();

}

// ===============================
// 🔥 TRANSFER MARKET SYSTEM V1
// (ADD THIS AT THE VERY BOTTOM OF YOUR FILE)
// ===============================

// 1️⃣ Extend game object safely
if (!UL.game.transferMarket) {
  UL.game.transferMarket = {
    players: [],
    history: []
  };
}

// 2️⃣ Generate exactly 15 market players
function generateTransferMarket() {

  const market = [];

  for (let i = 0; i < 15; i++) {
    const randomClub = UL.game.clubs[randInt(0, UL.game.clubs.length - 1)];
    const posKeys = Object.keys(CONFIG.POS_DISTRIBUTION);
    const randomPos = posKeys[randInt(0, posKeys.length - 1)];

    const player = generatePlayer(randomPos, randomClub.rating);

    market.push(player);
  }

  UL.game.transferMarket.players = market;
}

// 3️⃣ Render transfer table
function renderTransferMarket() {

  const section = document.getElementById("transfers");
  if (!section) return;

  if (!UL.game.transferMarket.players.length) {
    generateTransferMarket();
  }

  let wrap = document.getElementById("transferTableWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "transferTableWrap";
    wrap.className = "table-wrap";
    section.appendChild(wrap);
  }

  const rows = UL.game.transferMarket.players.map(p => `
    <tr onclick="openTransferModal('${p.id}')">
      <td>
        <img class="flag" src="https://flagcdn.com/24x18/${p.flag.toLowerCase()}.png">
        ${p.name}
      </td>
      <td>${p.position}</td>
      <td>${p.age}</td>
      <td><b>${p.overall}</b></td>
      <td>${p.potential}</td>
      <td>€${(p.value/1000000).toFixed(1)}M</td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <h2>Transfer Market</h2>
    <table class="squad-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Pos</th>
          <th>Age</th>
          <th>OVR</th>
          <th>POT</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div id="transferHistory"></div>
  `;

  renderTransferHistory();
}

// 6️⃣ Transfer history
function renderTransferHistory() {

  const container = document.getElementById("transferHistory");
  if (!container) return;

  const history = UL.game.transferMarket.history;

  if (!history.length) {
    container.innerHTML = "<h3>No transfers this season</h3>";
    return;
  }

  container.innerHTML = `
    <h3>Season Transfer History</h3>
    ${history.map(h => `
      <div class="transfer-row ${h.type}">
        <span>${h.type === "IN" ? "⬆ Bought" : "⬇ Sold"}</span>
        <span>${h.name}</span>
        <span>€${(h.value/1000000).toFixed(1)}M</span>
      </div>
    `).join("")}
  `;
}

function showNotification(message) {

  let notif = document.createElement("div");
  notif.className = "game-notification";
  notif.textContent = message;

  document.body.appendChild(notif);

  // animação entrada
  setTimeout(() => {
    notif.classList.add("show");
  }, 10);

  // remover depois de 3s
  setTimeout(() => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

function renderTopScorers() {

  const container = document.getElementById("topScorers");
  if (!container) return;

  const allPlayers = [];

  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
      if (player.goals > 0) {
        allPlayers.push({
          name: player.name,
          goals: player.goals,
          club: club.name,
          position: player.position
        });
      }
    });
  });

  const sorted = allPlayers
    .sort((a,b)=>b.goals-a.goals)
    .slice(0,5);

  if (!sorted.length) {
    container.innerHTML = "<div>No goals yet</div>";
    return;
  }

  container.innerHTML = sorted.map((p, index) => `
    <div class="scorer-row">
        <span>${index + 1}. ${p.name} <small>(${p.position})</small></span>
        <span>${p.club}</span>
        <span>${p.goals} ⚽</span>
    </div>
  `).join("");

}

function openTransferModal(playerId) {
  const player = UL.game.transferMarket.players.find(p => p.id === playerId);
  if (!player) return;

  const modal = document.getElementById("transferModal");

  document.getElementById("modalPlayerName").textContent = player.name;
  document.getElementById("modalAge").textContent = player.age;
  document.getElementById("modalOVR").textContent = player.overall;
  document.getElementById("modalPOT").textContent = player.potential;
  document.getElementById("modalPrice").textContent = (player.value / 1000000).toFixed(1);

  // 🔥 CRITICAL RESET
  const confirmBtn = document.getElementById("confirmBuyBtn");
  confirmBtn.textContent = "Buy";
  confirmBtn.onclick = null;

  modal.classList.remove("hidden");

  confirmBtn.onclick = () => {
    confirmBuyPlayer(player);
    modal.classList.add("hidden");
  };

  document.getElementById("cancelBuyBtn").onclick = () => {
    modal.classList.add("hidden");
  };
}

// 🔥 NEW SAFE BUY FUNCTION
function confirmBuyPlayer(player) {

  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  const market = UL.game.transferMarket.players;

  const index = market.findIndex(p => p.id === player.id);
  if (index === -1) return;

  if (club.budget < player.value) {
    showNotification("Not enough budget.");
    return;
  }

  club.budget -= player.value;
  club.squad.push(player);

  market.splice(index, 1);

  UL.game.transferMarket.history.push({
    type: "IN",
    name: player.name,
    value: player.value
  });

  renderTransferMarket();
  renderTeamCard();
}

function openSellModal(player) {

  const modal = document.getElementById("transferModal");

  document.getElementById("modalPlayerName").textContent = player.name;
  document.getElementById("modalAge").textContent = player.age;
  document.getElementById("modalOVR").textContent = player.overall;
  document.getElementById("modalPOT").textContent = player.potential;
  document.getElementById("modalPrice").textContent = (player.value / 1000000).toFixed(1);

  modal.classList.remove("hidden");

  document.getElementById("confirmBuyBtn").textContent = "Sell";
  document.getElementById("confirmBuyBtn").onclick = () => {
    executeSell(player);
    modal.classList.add("hidden");
  };

  document.getElementById("cancelBuyBtn").onclick = () => {
    modal.classList.add("hidden");
  };
}

function executeSell(player) {

  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  if (!club) return;

  const index = club.squad.findIndex(p => p.id === player.id);
  if (index === -1) return;

  club.budget += player.value;
  club.squad.splice(index, 1);

  UL.game.transferMarket.players.push(player);

  UL.game.transferMarket.history.push({
    type: "OUT",
    name: player.name,
    value: player.value
  });

  // 🔥 CLOSE MODALS CLEANLY
  document.getElementById("transferModal").classList.add("hidden");
  document.getElementById("playerModal").classList.add("hidden");

  // 🔥 RESET BUTTON BACK TO BUY
  document.getElementById("confirmBuyBtn").textContent = "Buy";

  renderSquad();
  renderTeamCard();
  renderTransferMarket();
}

function openSellModalById(playerId) {
  const club = UL.game.clubs.find(c => c.id === UL.game.selectedClubId);
  const player = club.squad.find(p => p.id === playerId);
  if (!player) return;
  openSellModal(player);
}

// ============================================
// 🔥 AI CLUB TRANSFER PRICE MULTIPLIER PATCH
// ============================================
// Goal:
// Players coming from CLUB SQUADS (AI teams)
// should cost slightly MORE than free agents
// from Transfer Market.

// Why?
// - Free agents = neutral market value
// - AI clubs = negotiation premium
// - Prevents market abuse

// --------------------------------------------
// CONFIG
// --------------------------------------------

const AI_TRANSFER_MARKUP = 1.30; // 30% realistic bump

function getAIPlayerAskingPrice(player, sellingClub) {
  let multiplier = 1.25;

  // Young High Potential Player cost more
  if (player.age <= 23 && player.potential - player.overall >= 5) {
    multiplier += 0.15;
  }

  // Star Players cost more
  if (player.overall >= sellingClub.rating) {
    multiplier += 0.10;
  }

  // Starter Tax
  if (sellingClub.boardExpectation === "Win the League" && player.isStarter) {
    multiplier += 0.20;
  }

  return Math.round(player.value * multiplier);
}

function openClubModal(clubId) {

  // não abrir se for teu próprio clube
  if (clubId === UL.game.selectedClubId) return;

  const club = getClubById(clubId);
  if (!club) return;

  const modal = document.getElementById("clubModal");
  const body = document.getElementById("clubModalBody");

  body.innerHTML = `
    <h2>${club.name}</h2>
    <p>Rating: ${club.rating}</p>
    <p>Budget: €${(club.budget/1000000).toFixed(1)}M</p>

    <h3 class="section-title">Starting XI</h3>

    <div class="starting-grid">
      ${club.squad
        .filter(p => p.isStarter)
        .sort((a,b)=>{
          const order = { GK:0, DEF:1, MID:2, ATT:3 };
          return order[a.position] - order[b.position];
        })
        .map(p => `
          <div class="starter-card" 
               onclick="openAIPlayerModal('${club.id}','${p.id}')">

            <div class="starter-left">
              <span class="pos-badge ${p.position}">${p.position}</span>
              <span class="starter-name">${p.name}</span>
            </div>

            <div class="starter-ovr">
              ${p.overall}
            </div>

          </div>
        `).join("")}
    </div>

  `;

  modal.classList.remove("hidden");
}

function openAIPlayerModal(clubId, playerId) {

  const sellingClub = getClubById(clubId);
  const player = sellingClub.squad.find(p => p.id === playerId);
  if (!player) return;

  const modal = document.getElementById("transferModal");

  const price = getAIPlayerAskingPrice(player, sellingClub);

  document.getElementById("modalPlayerName").textContent = player.name;
  document.getElementById("modalAge").textContent = player.age;
  document.getElementById("modalOVR").textContent = player.overall;
  document.getElementById("modalPOT").textContent = player.potential;
  document.getElementById("modalPrice").textContent = (price/1000000).toFixed(1);

  const confirmBtn = document.getElementById("confirmBuyBtn");
  confirmBtn.textContent = "Buy from Club";

  confirmBtn.onclick = () => {
    buyFromAIClub(player, sellingClub, price);
    modal.classList.add("hidden");
  };

  document.getElementById("cancelBuyBtn").onclick = () => {
    modal.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

function buyFromAIClub(player, sellingClub, price) {

  const myClub = getClubById(UL.game.selectedClubId);

  if (myClub.budget < price) {
    showNotification("Not enough budget.");
    return;
  }

  myClub.budget -= price;
  myClub.squad.push(player);

  // remove from selling club
  sellingClub.squad = sellingClub.squad.filter(p => p.id !== player.id);

  showNotification(`Signed ${player.name} from ${sellingClub.name}`);

  renderTeamCard();
  renderSquad();
}

function closeClubModal() {
  document.getElementById("clubModal").classList.add("hidden");
}

function applyWeeklyWages() { 
  UL.game.clubs.forEach(club => { 
    const totalWages = club.squad.reduce((sum, p) => sum + p.wage, 0);
    club.budget -= totalWages; 
  }); 
}

function renewContract(playerId) {
  const club = getClubById(UL.game.selectedClubId);
  const player = club.squad.find(p => p.id === playerId);

  const cost = player.wage * 20;

  if (club.budget < cost) {
    showNotification("Not enough budget to renew.");
    return;
  }

  club.budget -= cost;
  player.contractYears = 3;

  showNotification(`${player.name} renewed for 3 years.`);
}

/**********************
//STARTING XI BUILDER (NO MORE 6 DEF/2 GK SHIT)
//**********************/
function buildStartingXI(club) {
  ensureClubTactics(club);

  // reset
  club.squad.forEach(p => (p.isStarter = false));

  const req = formations[club.tactics.formation] || formations["4-3-3"];

  // pick by position (rating), but also consider form & stamina slightly
  const score = (p) => {
    const ovr = p.overall ?? 0;
    const form = p.form ?? 50;
    const stamina = p.stamina ?? 80;
    return ovr * 0.75 + form * 0.15 + stamina * 0.10;
  };

  Object.entries(req).forEach(([pos, count]) => {
    club.squad
      .filter(p => p.position === pos && p.suspendedMatches === 0 && !p.injured)
      .sort((a, b) => score(b) - score(a))
      .slice(0, count)
      .forEach(p => (p.isStarter = true));
  });

  // safety: if you ever have missing positions (e.g. no GK), fill from best remaining
  const starters = club.squad.filter(p => p.isStarter);
  if (starters.length < 11) {
    const remaining = club.squad
      .filter(p => !p.isStarter)
      .sort((a, b) => score(b) - score(a));
    remaining.slice(0, 11 - starters.length).forEach(p => (p.isStarter = true));
  }
}

//**********************
//TACTIC MATCHUP ENGINE
//**********************/
// Output: { homeBonus, awayBonus, homeStyleMod, awayStyleMod, notes }
// Bonus values are small by design.

function computeTacticImpact(homeClub, awayClub) {
  ensureClubTactics(homeClub);
  ensureClubTactics(awayClub);

  const H = homeClub.tactics;
  const A = awayClub.tactics;

  let homeBonus = 0;
  let awayBonus = 0;
  const notes = [];

  // ===== mentality =====
  const ment = { defensive: -1.5, balanced: 0, attacking: 2 };
  homeBonus += ment[H.mentality] ?? 0;
  awayBonus += ment[A.mentality] ?? 0;

  // ===== pressing (helps win duels + disrupt) but drains stamina =====
  const press = { low: -0.5, medium: 0, high: 1.5 };
  homeBonus += press[H.pressing] ?? 0;
  awayBonus += press[A.pressing] ?? 0;

  // pressing vs tempo interaction
  // high press + fast tempo -> great intensity (bonus) but can collapse if stamina low
  if (H.pressing === "high" && H.tempo === "fast") homeBonus += 0.8;
  if (A.pressing === "high" && A.tempo === "fast") awayBonus += 0.8;

  // ===== line =====
  const line = { deep: -0.3, balanced: 0, high: 0.6 };
  homeBonus += line[H.line] ?? 0;
  awayBonus += line[A.line] ?? 0;

  // ===== width =====
  const width = { narrow: 0, balanced: 0, wide: 0 }; // width affects style matchups below

  // ===== style matchups (rock-paper-scissors-lite) =====
  // Keep this readable and tunable.
  // Positive = advantage.
  const styleMatrix = {
    balanced:   { balanced: 0, possession: -0.2, wingPlay: 0, counter: 0, direct: 0 },
    possession: { balanced: 0.2, possession: 0, wingPlay: 0.3, counter: -0.8, direct: -0.6 },
    wingPlay:   { balanced: 0.1, possession: -0.2, wingPlay: 0, counter: -0.2, direct: 0.2 },
    counter:    { balanced: 0, possession: 0.8, wingPlay: 0.2, counter: 0, direct: 0.1 },
    direct:     { balanced: 0, possession: 0.6, wingPlay: -0.1, counter: -0.1, direct: 0 }
  };

  const hStyleAdv = (styleMatrix[H.style]?.[A.style]) ?? 0;
  const aStyleAdv = (styleMatrix[A.style]?.[H.style]) ?? 0;

  homeBonus += hStyleAdv;
  awayBonus += aStyleAdv;

  if (hStyleAdv > 0.3) notes.push(`Home style ${H.style} matches well vs ${A.style}`);
  if (aStyleAdv > 0.3) notes.push(`Away style ${A.style} matches well vs ${H.style}`);

  // ===== width vs style =====
  // wingPlay is amplified by wide.
  if (H.style === "wingPlay" && H.width === "wide") homeBonus += 0.8;
  if (A.style === "wingPlay" && A.width === "wide") awayBonus += 0.8;

  // counter is amplified by deep line.
  if (H.style === "counter" && H.line === "deep") homeBonus += 0.6;
  if (A.style === "counter" && A.line === "deep") awayBonus += 0.6;

  // possession is amplified by slow/balanced tempo.
  if (H.style === "possession" && (H.tempo === "slow" || H.tempo === "balanced")) homeBonus += 0.5;
  if (A.style === "possession" && (A.tempo === "slow" || A.tempo === "balanced")) awayBonus += 0.5;

  // direct amplified by fast tempo
  if (H.style === "direct" && H.tempo === "fast") homeBonus += 0.6;
  if (A.style === "direct" && A.tempo === "fast") awayBonus += 0.6;

  // ===== formation synergy =====
  // Example rules (small):
  // 3 at back + wingPlay wide has natural wingback usage
  const hDefCount = (formations[H.formation]?.DEF) ?? 4;
  const aDefCount = (formations[A.formation]?.DEF) ?? 4;

  if (hDefCount === 3 && H.width === "wide") homeBonus += 0.3;
  if (aDefCount === 3 && A.width === "wide") awayBonus += 0.3;

  // 5 at back + defensive -> solidity
  if (hDefCount === 5 && H.mentality === "defensive") homeBonus += 0.4;
  if (aDefCount === 5 && A.mentality === "defensive") awayBonus += 0.4;

  // 4-4-2 + direct -> classic
  if (H.formation === "4-4-2" && H.style === "direct") homeBonus += 0.4;
  if (A.formation === "4-4-2" && A.style === "direct") awayBonus += 0.4;

  return { homeBonus, awayBonus, notes };
}

///////////////////////
// PRESSING STAMINA + FOUL RISK
/////////////////////
function applyTacticStaminaDrain(club) {
  ensureClubTactics(club);
  const P = club.tactics.pressing;
  const drain = P === "high" ? randInt(6, 10) : P === "medium" ? randInt(3, 6) : randInt(1, 3);

  // only starters get heavy drain
  club.squad.forEach(p => {
    if (!p.isStarter) return;
    p.stamina = clamp((p.stamina ?? 80) - drain, 10, 100);

    // form small penalty if stamina too low
    if (p.stamina < 35) p.form = clamp((p.form ?? 50) - randInt(1, 3), 20, 95);
  });
}

function tacklingDisciplineModifier(tackling) {
  if (tackling === "aggressive") return { strength: 0.4, redRisk: 0.25 };
  if (tackling === "careful") return { strength: -0.2, redRisk: 0.05 };
  return { strength: 0.1, redRisk: 0.12 };
}

function assignAITacticsByTier(club) {
  ensureClubTactics(club);

  // ✅ Preserve locked formation forever
  const lockedFormation = club.formationLocked ? club.tactics.formation : null;

  // 🔥 1️⃣ IDENTITY OVERRIDE (HISTORY > TIER)
  if (club.identity) {

    // Base style
    club.tactics.style = club.identity.preferredStyle;

    // Ego influences mentality
    if (club.identity.ego >= 0.7) {
      club.tactics.mentality = "attacking";
    } else if (club.identity.ego <= 0.2) {
      club.tactics.mentality = "defensive";
    } else {
      club.tactics.mentality = "balanced";
    }

    // Flexibility influences pressing
    if (club.identity.flexibility >= 0.6) {
      club.tactics.pressing = "high";
    } else if (club.identity.flexibility <= 0.2) {
      club.tactics.pressing = "low";
    } else {
      club.tactics.pressing = "medium";  
    }

    // Small stylistic defaults
    if (club.tactics.style === "possession") {
      club.tactics.width = "balanced";
      club.tactics.tempo = "slow";
      club.tactics.line = "high";
    }

    if (club.tactics.style === "counter") {
      club.tactics.width = "balanced";
      club.tactics.tempo = "fast";
      club.tactics.line = "deep";
    }

    // ✅ restore formation if locked
    if (lockedFormation) club.tactics.formation = lockedFormation;

    return; // 🔥 IMPORTANT — stop here if identity exists
  }

  // 🔵 2️⃣ NORMAL TIER LOGIC (fallback)

  if (club.tier === "Elite") {
    club.tactics.style = "possession";
    club.tactics.mentality = "attacking";
    club.tactics.pressing = "high";
    club.tactics.width = "wide";
    club.tactics.tempo = "balanced";
    club.tactics.line = "high";
    club.tactics.tackling = "normal";
  }

  else if (club.tier === "Strong") {
    club.tactics.style = ["possession","wingPlay"][randInt(0,1)];
    club.tactics.mentality = "balanced";
    club.tactics.pressing = "medium";
    club.tactics.width = "balanced";
    club.tactics.tempo = "balanced";
    club.tactics.line = "balanced";
    club.tactics.tackling = "normal";
  }

  else if (club.tier === "Competitive") {
    club.tactics.style = ["wingPlay","balanced","counter"][randInt(0,2)];
    club.tactics.mentality = "balanced";
    club.tactics.pressing = "medium";
    club.tactics.width = ["balanced","wide"][randInt(0,1)];
    club.tactics.tempo = "balanced";
    club.tactics.line = "balanced";
    club.tactics.tackling = ["normal","aggressive"][randInt(0,1)];
  }

  else {
    club.tactics.style = "counter";
    club.tactics.mentality = "defensive";
    club.tactics.pressing = "low";
    club.tactics.width = "balanced";
    club.tactics.tempo = "fast";
    club.tactics.line = "deep";
    club.tactics.tackling = "aggressive";
  }
}

function playCurrentCompetitionRound() {

  const mode = UL.game.activeCompetition;

  if (mode === "league") {
    simulateLeagueRoundSafe();
  }

  else if (mode === "cup") {
    simulateCupRoundSafe();
  }

  else {
    console.warn("Unknown competition mode.");
  }

}

function simulateLeagueRoundSafe() {

  const L = UL.game.league;

  if (!L || !L.fixtures) {
    console.warn("League not initialized.");
    return;
  }

  simulateCurrentMatchday();

}

// =============================================
// 4️⃣ SAFE CUP SIMULATION WRAPPER
// =============================================

function simulateCupRoundSafe() {

  if (!UL.game.cup || !UL.game.cup.matches) {
    console.warn("Cup not initialized.");
    return;
  }

  simulateCupRound();

}

// helper: weighted pick
function weightedPick(items) {
  // items: [{ key:"4-3-3", w:40 }, ...]
  const total = items.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.key;
  }
  return items[items.length - 1].key;
}

function pickInitialFormationByTier(tier) {
  // “chaotic” = more 3-at-back / asymmetric feel
  // “safe” = 4-4-2 / 4-3-3 / 5-2-3

  if (tier === "Elite") {
    return weightedPick([
      { key: "4-2-3-1", w: 30 },
      { key: "3-4-3",   w: 22 },
      { key: "3-5-2",   w: 18 },
      { key: "4-3-3",   w: 20 },
      { key: "5-2-3",   w: 10 },
    ]);
  }

  if (tier === "Strong") {
    return weightedPick([
      { key: "4-3-3",   w: 28 },
      { key: "4-2-3-1", w: 26 },
      { key: "4-4-2",   w: 18 },
      { key: "3-5-2",   w: 14 },
      { key: "3-4-3",   w: 8  },
      { key: "5-2-3",   w: 6  },
    ]);
  }

  if (tier === "Competitive") {
    return weightedPick([
      { key: "4-3-3",   w: 30 },
      { key: "4-4-2",   w: 26 },
      { key: "4-2-3-1", w: 18 },
      { key: "5-2-3",   w: 16 },
      { key: "3-5-2",   w: 10 },
    ]);
  }

  if (tier === "Mid") {
    return weightedPick([
      { key: "4-4-2",   w: 34 },
      { key: "4-3-3",   w: 26 },
      { key: "5-2-3",   w: 22 },
      { key: "4-2-3-1", w: 12 },
      { key: "3-5-2",   w: 6  },
    ]);
  }

  // Underdog
  return weightedPick([
    { key: "5-2-3", w: 34 },
    { key: "4-4-2", w: 30 },
    { key: "4-3-3", w: 20 },
    { key: "3-5-2", w: 10 },
    { key: "4-2-3-1", w: 6 },
  ]);
}

// This locks formation so later meta/style changes won’t rewrite it.
function lockInitialFormation(club) {
  ensureClubTactics(club);

  // don’t override if already set (or if you ever load a save later)
  if (club.formationLocked) return;

  const f = pickInitialFormationByTier(club.tier);
  club.tactics.formation = formations[f] ? f : "4-3-3";

  club.formationLocked = true;     // ✅ permanent flag
  club.initialFormation = club.tactics.formation; // optional for UI/debug
}

