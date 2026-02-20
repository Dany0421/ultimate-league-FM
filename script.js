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

/** === DETAILED POSITIONS (12 specific positions) === */
const POSITIONS = ["GK", "RB", "LB", "CB", "CDM", "CM", "CAM", "LM", "RM", "RW", "LW", "ST"];
const POSITION_SECTOR = { GK: "GK", RB: "DEF", LB: "DEF", CB: "DEF", CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID", RW: "ATT", LW: "ATT", ST: "ATT" };
function getSector(pos) { return POSITION_SECTOR[pos] || null; }
function positionsInSector(sector) {
  if (sector === "GK") return ["GK"];
  return POSITIONS.filter(p => POSITION_SECTOR[p] === sector);
}

/** Formation as 11 slots (exact position per slot) */
const formationSlots = {
  "4-3-3": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CAM", "RW", "LW", "ST"],
  "4-4-2": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LM", "CM", "CDM", "CM", "RM", "ST", "ST"],
  "5-2-3": ["GK", "CB", "CB", "CB", "LB", "RB", "CM", "CM", "LW", "ST", "RW"],
  "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "CAM", "LM", "RM", "ST"],
  "3-4-3": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW"]
};

/** Style-by-position boost (decimal, e.g. 0.10 = +10%). Missing = 0. */
const STYLE_POSITION_BOOST = {
  balanced: {},
  wingPlay: { RW: 0.10, LW: 0.10, ST: 0.05, RB: 0.05, LB: 0.05, CDM: -0.05 },
  possession: { CM: 0.10, CAM: 0.10, CDM: 0.05, RW: -0.05, LW: -0.05, CB: 0.03, RB: 0.02, LB: 0.02 },
  counter: { ST: 0.10, RW: 0.07, LW: 0.07, CAM: 0.05, CDM: 0.05, CB: 0.03, CM: -0.05 },
  direct: { ST: 0.12, CAM: 0.05, CDM: 0.03, RW: -0.03, LW: -0.03, CM: -0.03, GK: 0.02 }
};
const OOP_PENALTY_MULTIPLIER = 0.85;

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
  POS_DISTRIBUTION: { GK: 2, RB: 2, LB: 2, CB: 3, CDM: 2, CM: 3, CAM: 2, LM: 1, RM: 1, RW: 2, LW: 2, ST: 2 },
  MARKET_REFRESH_INTERVAL: 5,
  // AI Rebuild Mode (bottom 3 each season)
  REBUILD_BUDGET_INJECTION: 8_000_000,
  REBUILD_PROSPECTS_COUNT: 1,
  // Neo Egoist Cup: underdog strength bonus (lower-rated team gets boost)
  CUP_UNDERDOG_BOOST: 0.8,
  // Dynamic AI transfers (per market-refresh window)
  AI_TRANSFER_MAX_BUYS_PER_WINDOW: 2,
  AI_TRANSFER_MAX_SELLS_PER_WINDOW: 1,
  AI_BUY_RATING_CAP_OVER_CLUB: 2,
  AI_SELL_ONLY_IF_MARKET_BELOW: 15,
  // Job offers: mid-season at matchday 17 (halfway), 2 offers; more at start of new season
  JOB_OFFER_MID_SEASON_MATCHDAY: 17,
  JOB_OFFERS_COUNT_MID_SEASON: 2,
  JOB_OFFERS_COUNT_SEASON_END: 5,
  JOB_OFFERS_AT_SEASON_END: true,
};

/** === TRAINING PLANS === **/
const TRAINING_PLANS = ["attacking", "tactical", "fitness", "defensive", "recovery"];
const TRAINING_INTENSITY = ["low", "medium", "high"];
const TRAINING_INTENSITY_MULTIPLIER = { low: 0.7, medium: 1.0, high: 1.3 };
const TRAINING_FITNESS_RECOVERY = { low: 2, medium: 3, high: 4 };
const TRAINING_INJURY_INTENSITY = { low: 0.9, medium: 1.0, high: 1.2 };

function trainingAgeFactor(player) {
  const age = player.age ?? 25;
  if (age <= 22) return 1.0;
  if (age <= 27) return 0.75;
  if (age <= 31) return 0.5;
  return 0.25;
}

/** === CLUB LIST – Top 36 from Top 5 Leagues (by rating, D1 = top 18, D2 = 19–36) === **/
const CLUB_PRESETS = [
  // Division 1 (top 18 by rating)
  { name: "Manchester City", rating: 89 },
  { name: "Real Madrid", rating: 87 },
  { name: "Barcelona", rating: 88 },
  { name: "Bayern Munich", rating: 86 },
  { name: "Paris Saint-Germain", rating: 86 },
  { name: "Liverpool", rating: 85 },
  { name: "Arsenal", rating: 84 },
  { name: "Inter", rating: 84 },
  { name: "Atlético Madrid", rating: 83 },
  { name: "Chelsea", rating: 82 },
  { name: "Newcastle United", rating: 81 },
  { name: "Borussia Dortmund", rating: 80 },
  { name: "Bayer Leverkusen", rating: 80 },
  { name: "Juventus", rating: 80 },
  { name: "Manchester United", rating: 79 },
  { name: "Tottenham Hotspur", rating: 78 },
  { name: "AC Milan", rating: 78 },
  { name: "Napoli", rating: 77 },
  // Division 2 (19–36)
  { name: "Aston Villa", rating: 77 },
  { name: "RB Leipzig", rating: 77 },
  { name: "Real Sociedad", rating: 76 },
  { name: "West Ham United", rating: 76 },
  { name: "Brighton & Hove Albion", rating: 76 },
  { name: "Roma", rating: 76 },
  { name: "Villarreal", rating: 75 },
  { name: "Lazio", rating: 75 },
  { name: "Nice", rating: 75 },
  { name: "Marseille", rating: 75 },
  { name: "Atalanta", rating: 75 },
  { name: "Sevilla", rating: 74 },
  { name: "Freiburg", rating: 74 },
  { name: "Lyon", rating: 74 },
  { name: "Eintracht Frankfurt", rating: 73 },
  { name: "Real Betis", rating: 73 },
  { name: "Lille", rating: 73 },
  { name: "Nottingham Forest", rating: 72 },
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

/** === BOARD EXPECTATION (Division 1 & 2, promotion/relegation) === **/
function generateBoardExpectation(club) {
  const r = club.rating;
  const div = club.division || 1;

  let base;
  if (div === 1) {
    if (r >= 85) base = "Win the League";
    else if (r >= 80) base = "Top 4";
    else if (r >= 76) base = "Top Half";
    else base = "Avoid Relegation";
    if (club.lastSeasonPosition != null) {
      if (club.lastSeasonPosition <= 4 && r < 85) base = "Top 4";
      if (club.lastSeasonPosition >= 16 && r >= 75) base = "Avoid Relegation";
    }
  } else {
    if (r >= 80) base = "Win Promotion";
    else if (r >= 76) base = "Push for Promotion";
    else if (r >= 73) base = "Mid-table";
    else base = "Avoid Bottom";
    if (club.lastSeasonPosition != null) {
      if (club.lastSeasonPosition <= 2 && r >= 76) base = "Win Promotion";
      if (club.lastSeasonPosition >= 16) base = "Avoid Bottom";
    }
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

/** === PLAYER PERSONALITIES === **/
const PLAYER_PERSONALITIES = ["professional", "injuryProne", "bigGamePlayer", "choker", "mercenary", "loyal", "ambitious"];
function getPersonalityDisplayName(p) {
  const map = { professional: "Professional", injuryProne: "Injury Prone", bigGamePlayer: "Big Game Player", choker: "Choker", mercenary: "Mercenary", loyal: "Loyal", ambitious: "Ambitious" };
  return map[p] || "Professional";
}

/** === PLAYER GENERATION === **/
const FIRST_NAMES = [
  "Leo", "Alex", "Ney", "Noah", "Kai", "Hugo", "Enzo", "Bruno", "Omar", "Dany", "Dave", "Lamine", "Nico", "Nathan", "Jacob", "Aaron", "Theo", "Dominic",
  "Max", "Malik", "Karim", "Isaac", "Lucas", "Gabriel", "Rafael", "Felipe", "Rodrigo", "Diego", "Sergio", "Andrés", "Marcos", "Paulo", "João", "Pedro", "Miguel", "Carlos", "Javier", "Antonio", "Marco", "Lorenzo",
  "Mohamed", "Youssef", "Achraf", "Hakim", "Idrissa", "Sadio", "Kalidou", "Victor", "Pierre", "Kylian", "Ousmane", "Antoine", "N'Golo", "Paul", "Eden", "Romelu", "Kevin", "Thibaut", "Dries",
  "Thomas", "Joshua", "Leon", "Serge", "Toni", "Manuel", "Ilkay", "Leroy", "Kai", "Jamal", "Phil", "Bukayo", "Marcus", "Jude", "Declan", "Harry", "Jordan", "Raheem",
  "Cristiano", "Bernardo", "Rúben", "João", "Diogo", "Gonçalo", "Rafael", "Pepe", "William", "Vitinha",
  "Virgil", "Darwin", "Luis", "Diogo", "Trent", "Andy", "Roberto", "Alisson", "Fabinho",
  "Erling", "Martin", "Rodri", "İlkay", "Riyad", "Julian", "Nathan", "Kyle", "John", "Phil"
];
const LAST_NAMES = [
  "Silva", "Khan", "Mendes", "Alves", "Costa", "Fernandes", "Santos", "Pereira", "Ramos", "Lucca", "Yamal", "Williams", "Acosta", "Paredes", "Vieira", "Cardoso", "Abdullah", "Traoré", "Balde", "Boateng", "Sissoko", "Azizi",
  "Rodríguez", "García", "Martínez", "López", "Hernández", "González", "Pérez", "Sánchez", "Romero", "Torres", "Díaz", "Moreno", "Álvarez", "Ruiz", "Jiménez", "Vázquez", "Castro", "Ortega", "Molina", "Reyes",
  "Oliveira", "Sousa", "Carvalho", "Ribeiro", "Ferreira", "Lopes", "Martins", "Teixeira", "Correia", "Gomes", "Rocha", "Nunes", "Coelho", "Cunha", "Dias", "Monteiro", "Cavaco", "Neves", "Félix", "Leão",
  "Müller", "Schmidt", "Becker", "Fischer", "Weber", "Wagner", "Hoffmann", "Kroos", "Gündoğan", "Rüdiger", "Kimmich", "Havertz", "Goretzka", "Süle", "Neuer", "Reus", "Brandt", "Sané", "Gnabry",
  "Martin", "Bernard", "Dubois", "Moreau", "Laurent", "Simon", "Lefebvre", "Michel", "Garcia", "David", "Pogba", "Kanté", "Mbappé", "Dembélé", "Griezmann", "Giroud", "Benzema", "Varane", "Hernández",
  "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Fontana",
  "Smith", "Jones", "Taylor", "Brown", "Wilson", "Walker", "White", "Roberts", "Robinson", "Thompson", "Wright", "Evans", "King", "Baker", "Green", "Harris", "Clark", "Lewis", "James", "Phillips",
  "Nascimento", "Jesus", "Lima", "Araújo", "Barbosa", "Ribeiro", "Cavani", "Suárez", "Gómez", "Martínez", "Di María", "Dybala", "Lautaro", "Tagliafico", "Otamendi", "Romero", "De Paul", "Mac Allister",
  "Mané", "Salah", "Keita", "Konaté", "Koné", "Camara", "Diallo", "Diop", "Ndidi", "Partey", "Zaha", "Aubameyang", "Pépé", "Onana", "André", "Koulibaly", "Mendy", "Bouna", "Gueye",
  "Ødegaard", "Haaland", "Højlund", "Eriksen", "Schmeichel", "Lindelöf", "Isak", "Forsberg", "Berg", "Larsson", "Ibrahimović"
];

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
  let base = clubRating;
  if (role === "star") base += randInt(2, 4);
  if (role === "prospect") base -= randInt(1, 2);
  const overall = clamp(base + randInt(-4, 3), 50, 95);
  const nationality = NATIONALITIES[randInt(0, NATIONALITIES.length - 1)];
  let age;
  if (role === "prospect") age = randInt(17, 21);
  else if (role === "star") age = randInt(22, 30);
  else age = randInt(20, 34);
  let potential = overall + randInt(0, 8);
  if (role === "prospect") potential = overall + randInt(6, 14);
  potential = clamp(potential, overall, 99);
  const morale = randInt(55, 85);
  const form = randInt(45, 80);
  const stamina = randInt(70, 100);
  const contractYears = randInt(3, 5);
  const personality = PLAYER_PERSONALITIES[randInt(0, PLAYER_PERSONALITIES.length - 1)];
  const baseWage = calcPlayerWage(overall, age);
  const wage = (personality === "mercenary") ? Math.round(baseWage * 1.2) : baseWage;

  const primaryPosition = POSITIONS.includes(position) ? position : normalizeLegacyPosition(position);
  const sector = getSector(primaryPosition);
  const inSector = positionsInSector(sector).filter(p => p !== primaryPosition);
  const secondaryPosition = inSector.length ? inSector[randInt(0, inSector.length - 1)] : primaryPosition;

  return {
    id: uid("p"),
    name: randomName(),
    age,
    position: primaryPosition,
    primaryPosition,
    secondaryPosition,
    overall,
    potential,
    value: calcPlayerValue(overall, age),
    wage,
    morale,
    form,
    stamina,
    isStarter: false,
    matchPosition: null,
    nationality: nationality.name,
    flag: nationality.code,
    goals: 0,
    contractYears,
    personality,
    redCard: false,
    suspendedMatches: 0,
    yellowCards: 0,
    injured: false,
    injuryWeeks: 0,
    shirtNumber: undefined, // assigned in generateSquad or when joining club
  };
}

function normalizeLegacyPosition(oldPos) {
  if (oldPos === "GK") return "GK";
  if (oldPos === "DEF") return ["RB", "LB", "CB"][randInt(0, 2)];
  if (oldPos === "MID") return ["CDM", "CM", "CAM", "LM", "RM"][randInt(0, 4)];
  if (oldPos === "ATT") return ["RW", "LW", "ST"][randInt(0, 2)];
  return POSITIONS[randInt(0, POSITIONS.length - 1)];
}

function formatPlayerPosition(p) {
  ensurePlayerPositions(p);
  const prim = p.primaryPosition || p.position;
  const sec = p.secondaryPosition;
  if (!sec || sec === prim) return prim || "—";
  return `${prim} / ${sec}`;
}

function ensurePlayerPositions(p) {
  if (p.primaryPosition != null && p.primaryPosition !== undefined) return;
  const old = p.position;
  if (POSITIONS.includes(old)) {
    p.primaryPosition = old;
    const sector = getSector(old);
    const inSector = positionsInSector(sector).filter(x => x !== old);
    p.secondaryPosition = inSector.length ? inSector[randInt(0, inSector.length - 1)] : old;
  } else {
    p.primaryPosition = normalizeLegacyPosition(old || "CM");
    const sector = getSector(p.primaryPosition);
    const inSector = positionsInSector(sector).filter(x => x !== p.primaryPosition);
    p.secondaryPosition = inSector.length ? inSector[randInt(0, inSector.length - 1)] : p.primaryPosition;
  }
  p.position = p.primaryPosition;
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

  assignSquadNumbers(squad);
  return squad;
}

function getNextShirtNumber(club) {
  const used = new Set((club.squad || []).map(p => p.shirtNumber).filter(n => n != null && n >= 1 && n <= 99));
  for (let n = 1; n <= 99; n++) if (!used.has(n)) return n;
  return 99;
}

function assignSquadNumbers(squad) {
  const starters = squad.filter(p => p.isStarter);
  const rest = squad.filter(p => !p.isStarter);
  const used = new Set();
  let next = 1;
  starters.forEach(p => {
    p.shirtNumber = next;
    used.add(next);
    next++;
  });
  next = 12;
  rest.forEach(p => {
    while (used.has(next) && next <= 99) next++;
    if (next > 99) {
      for (let i = 1; i <= 99; i++) if (!used.has(i)) { next = i; break; }
    }
    p.shirtNumber = next;
    used.add(next);
    next++;
  });
}

/** === TIER (dynamic later; initial from rating) === **/
function initialTierFromRating(rating) {
  if (rating >= 87) return "Elite";
  if (rating >= 84) return "Strong";
  if (rating >= 81) return "Competitive";
  if (rating >= 76) return "Mid";
  return "Underdog"; // 75 and below
}

/** Tier ladder for AI Rebuild (bottom 3 get tier-above tactics). */
const TIER_ORDER = ["Underdog", "Mid", "Competitive", "Strong", "Elite"];
function getTierAbove(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
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

/** Season-start budget: 75% of tier amount (no carry-over from last season). */
function getSeasonStartBudget(rating) {
  return Math.round(generateInitialBudget(rating) * 0.75);
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
      budget: getSeasonStartBudget(c.rating),
      lastSeasonPosition: null,
      consecutiveGoodSeasons: 0,
      consecutiveBadSeasons: 0,
      squad: [],
      momentum: 0,
      division: null, // set below: 1 = D1 (top 18), 2 = D2 (19–36)
      tactics: {
        ...TACTIC_DEFAULTS,
      },
      cheatBoost: {
        GK: 0,
        DEF: 0,
        MID: 0,
        ATT: 0
      },
      trainingPlan: TRAINING_PLANS[randInt(0, TRAINING_PLANS.length - 1)],
      trainingIntensity: TRAINING_INTENSITY[randInt(0, TRAINING_INTENSITY.length - 1)]
    };

    club.squad = generateSquad(club.rating);

    lockInitialFormation(club);
    buildStartingXI(club);

    club.squad.forEach(p => {
      if (p.contractYears === undefined) p.contractYears = randInt(3,5);
    });

    assignClubIdentity(club);
    assignAITacticsByTier(club);

    return club;
  });

  // Top 18 by rating = Division 1, rest = Division 2
  clubs.sort((a, b) => b.rating - a.rating);
  clubs.forEach((club, i) => {
    club.division = i < 18 ? 1 : 2;
    club.boardExpectation = generateBoardExpectation(club);
  });

  return {
    season: 1,
    week: 0,
    clubs,
    selectedClubId: null,
    league: null, // later
    cup: null,    // later
    trophies: {},
    lastLeagueChampionId: null,
    dominantClubId: null,
    meta: {
      dominantStyle: null,
      dominanceCounter: 0,
    },
    transferMarket: {
      players: [],
     history: []
    },
    activeCompetition: "league", // default to league, can be changed later
    careerStats: [] // { season, team, division, leaguePosition, cupResult, goalsFor, goalsAgainst }
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
    UL.game = initWorld();   // 🔥 regenerate full world
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
 * JOB OFFERS
 **********************/

function getJobOffers(count) {
  const myId = UL.game.selectedClubId;
  const myClub = getClubById(myId);
  if (!myClub || count <= 0) return [];

  const pool = UL.game.clubs.filter(c => c.id !== myId);
  const myRating = myClub.rating || 75;
  const higher = pool.filter(c => (c.rating || 75) > myRating);
  const lower = pool.filter(c => (c.rating || 75) < myRating);
  const same = pool.filter(c => (c.rating || 75) === myRating);

  const half = Math.ceil(count / 2);
  const fromHigher = shuffle([...higher]).slice(0, half);
  const fromLower = shuffle([...lower]).slice(0, count - fromHigher.length);
  const need = count - fromHigher.length - fromLower.length;
  const fromSame = need > 0 ? shuffle([...same]).slice(0, need) : [];

  const combined = [...fromHigher, ...fromLower, ...fromSame];
  return shuffle(combined).slice(0, count);
}

function showJobOffersModal(offers) {
  if (!offers || offers.length === 0) return;

  const modal = document.getElementById("jobOffersModal");
  const listEl = document.getElementById("jobOffersList");
  if (!modal || !listEl) return;

  listEl.innerHTML = offers.map(club => {
    const div = club.division === 1 ? "D1" : "D2";
    return `
      <div class="job-offer-row" data-club-id="${club.id}">
        <div class="job-offer-info">
          <strong>${club.name}</strong>
          <span>Rating ${club.rating} · ${div}</span>
        </div>
        <div class="job-offer-actions">
          <button class="btn-confirm job-offer-accept" data-club-id="${club.id}">Accept</button>
          <button class="btn-cancel job-offer-decline" data-club-id="${club.id}">Decline</button>
        </div>
      </div>
    `;
  }).join("");

  modal.classList.remove("hidden");

  const closeJobOffers = () => modal.classList.add("hidden");

  listEl.querySelectorAll(".job-offer-accept").forEach(btn => {
    btn.addEventListener("click", () => {
      const clubId = btn.getAttribute("data-club-id");
      const club = getClubById(clubId);
      closeJobOffers();
      selectClub(clubId);
      showNotification(`You accepted the offer from ${club.name}`);
    });
  });

  listEl.querySelectorAll(".job-offer-decline").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".job-offer-row");
      if (row) row.remove();
      if (listEl.children.length === 0) closeJobOffers();
    });
  });

  const closeBtn = document.getElementById("jobOffersModalClose");
  if (closeBtn) closeBtn.onclick = closeJobOffers;
}

function renderCareerStats() {
  const wrap = document.getElementById("careerStatsTableWrap");
  if (!wrap) return;

  const stats = UL.game.careerStats || [];
  if (stats.length === 0) {
    wrap.innerHTML = "<p class=\"career-stats-empty\">No seasons completed yet. Finish a season and click Start Next Season to see your career history here.</p>";
    return;
  }

  const rows = stats.map(entry => {
    const posText = entry.leaguePosition != null ? `D${entry.division} ${entry.leaguePosition}` : "-";
    return `
      <tr>
        <td>${entry.season}</td>
        <td>${entry.team}</td>
        <td>${entry.division}</td>
        <td>${posText}</td>
        <td>${entry.cupResult}</td>
        <td>${entry.goalsFor}</td>
        <td>${entry.goalsAgainst}</td>
      </tr>
    `;
  }).join("");

  wrap.innerHTML = `
    <table class="league-table career-stats-table">
      <thead>
        <tr>
          <th>Season</th>
          <th>Team</th>
          <th>Div</th>
          <th>League Pos</th>
          <th>Cup</th>
          <th>GF</th>
          <th>GA</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

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
  const intensityMult = TRAINING_INTENSITY_MULTIPLIER[club.trainingIntensity] ?? 1;
  club.squad.forEach(p => {
    let d = delta;
    if (delta < 0 && (p.personality || "professional") === "professional") d = delta * 0.8;
    if (delta < 0 && club.trainingPlan === "tactical") {
      const reduce = 0.12 * trainingAgeFactor(p) * intensityMult;
      d = d * (1 - reduce);
    }
    p.form = clamp(p.form + d, 20, 95);
  });
}

function applyStreakBonus(standing) {
  // 3 vitórias seguidas -> +3; 3 derrotas -> -3 (aplicado como delta extra)
  const last3 = standing.streak.slice(-3).join("");
  if (last3 === "WWW") return 3;
  if (last3 === "LLL") return -3;
  return 0;
}


/** Match context for personality effects: cupRound, league matchday, top-4 clash (per division). */
function personalityMatchModifier(player, matchContext) {
  if (!matchContext) return 0;
  const ctx = matchContext;
  const cupBigGame = ctx.cupRound === "Semi Finals" || ctx.cupRound === "Final";
  const decisiveMatchday = ctx.leagueMatchday === ctx.totalLeagueMatchdays && ctx.totalLeagueMatchdays === 34;
  const top4Clash = !!ctx.isTop4Clash;
  const isBigGameForBGP = cupBigGame || (decisiveMatchday && (player.personality || "") === "bigGamePlayer") || top4Clash;
  const isBigGame = cupBigGame || top4Clash; // Choker in cup semi/final or top-4 clash

  const p = player.personality || "professional";
  if (p === "bigGamePlayer" && isBigGameForBGP) return 3;
  if (p === "choker" && isBigGame && (player.morale || 70) < 60) return -3;
  if (p === "professional" && cupBigGame) return 1;
  return 0;
}

function simulateMatch(homeClub, awayClub, matchContext) {
  const homeForm = avgTeamForm(homeClub);
  const awayForm = avgTeamForm(awayClub);

  const homeXI = homeClub.squad.filter(p => p.isStarter);
  const awayXI = awayClub.squad.filter(p => p.isStarter);

  const calcSectorOVR = (club, XI) => {
    const total = XI.reduce((acc, p) => {
      const matchPos = p.matchPosition || p.primaryPosition || p.position;
      const sector = getSector(matchPos);
      const boost = club.cheatBoost?.[matchPos] ?? club.cheatBoost?.[sector] ?? 0;
      let contribution = p.overall + boost + personalityMatchModifier(p, matchContext);
      const prim = p.primaryPosition || p.position;
      const sec = p.secondaryPosition;
      if (matchPos !== prim && matchPos !== sec) contribution *= OOP_PENALTY_MULTIPLIER;
      const styleBoost = (STYLE_POSITION_BOOST[club.tactics?.style] || {})[matchPos] ?? 0;
      contribution *= (1 + styleBoost);
      const intensityMult = TRAINING_INTENSITY_MULTIPLIER[club.trainingIntensity] ?? 1;
      const ageF = trainingAgeFactor(p);
      if (club.trainingPlan === "attacking" && ["RW", "LW", "ST"].includes(matchPos)) {
        contribution += 1.5 * ageF * intensityMult;
      }
      if (club.trainingPlan === "defensive" && ["RB", "LB", "CB", "CDM"].includes(matchPos)) {
        contribution += 1.5 * ageF * intensityMult;
      }
      return acc + contribution;
    }, 0);
    return total / XI.length;
  };

  const homeOVR = calcSectorOVR(homeClub, homeXI);
  const awayOVR = calcSectorOVR(awayClub, awayXI);

  let homeStrength = homeOVR * 0.8 + homeForm * 0.2 + randInt(-4, 4);
  let awayStrength = awayOVR * 0.8 + awayForm * 0.2 + randInt(-4, 4);

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

  // Cup underdog buff (Neo Egoist Cup only): lower-rated team gets strength bonus
  if (matchContext && matchContext.cupRound) {
    const homeRating = homeClub.rating ?? 80;
    const awayRating = awayClub.rating ?? 80;
    const boost = CONFIG.CUP_UNDERDOG_BOOST ?? 0.8;
    if (homeRating < awayRating) homeStrength += boost;
    else if (awayRating < homeRating) awayStrength += boost;
  }

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

  // === Assign Goals To Players (position-based weights: ST/RW/LW highest) ===
  function assignGoals(club, goals) {
    const scorers = [];
    const starters = club.squad.filter(p => p.isStarter);
    const weightedPool = [];
    starters.forEach(p => {
      const pos = p.matchPosition || p.primaryPosition || p.position;
      let weight = 1;
      if (pos === "ST" || pos === "RW" || pos === "LW") weight = 6;
      else if (pos === "CAM" || pos === "LM" || pos === "RM") weight = 3;
      else if (pos === "CM" || pos === "CDM") weight = 2;
      else if (pos === "RB" || pos === "LB" || pos === "CB") weight = 1;
      else if (pos === "GK") weight = 0.2;
      for (let i = 0; i < weight; i++) weightedPool.push(p);
    });
    if (weightedPool.length === 0) return scorers;
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
  let injuryOccurred = false;
  const intensityMult = TRAINING_INJURY_INTENSITY[club.trainingIntensity] ?? 1;

  XI.forEach(player => {
    if (injuryOccurred) return;

    let risk = 0.002;
    if (club.tactics.tackling === "aggressive") risk += 0.006;
    if ((player.personality || "") === "injuryProne") risk *= 1.3;
    if (club.trainingPlan === "recovery") risk *= 0.85;
    risk *= intensityMult;

    if (Math.random() < risk) {
      player.injured = true;
      const p = player.personality || "";
      if (p === "professional") player.injuryWeeks = 1;
      else if (p === "injuryProne") player.injuryWeeks = 3;
      else player.injuryWeeks = randInt(1, 3);
      if (club.trainingPlan === "recovery" && player.injuryWeeks > 1) {
        player.injuryWeeks = Math.max(1, player.injuryWeeks - 1);
      }
      injuryOccurred = true;

      if (club.id === UL.game.selectedClubId) {
        showNotification(`🩺 ${player.name} injured for ${player.injuryWeeks} weeks`);
      }
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
  // Anti-dominance: light penalty only for back-to-back league champion
  if (UL.game.dominantClubId === club.id) {
    return strength * 0.97;
  }

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

  // Anti-dominance: opponents raise their game vs back-to-back champion
  const dominantId = UL.game.dominantClubId;
  if (dominantId) {
    if (homeClub.id === dominantId) awayStrength += 0.6;
    if (awayClub.id === dominantId) homeStrength += 0.6;
  }

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

function applyPersonalityMoraleUpdates(homeClub, awayClub, homeStanding, awayStanding, hg, ag, standings) {
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
  const getPosition = (clubId) => sorted.findIndex(s => s.clubId === clubId) + 1;

  const applyToClub = (club, standing, won) => {
    club.squad.forEach(p => {
      const pers = p.personality || "";
      if (pers === "loyal") {
        if (won) p.morale = clamp((p.morale || 70) + 3, 40, 95);
        if (standing.streak.slice(-3).join("") === "WWW") p.stamina = clamp((p.stamina || 80) + 5, 50, 100);
      }
      if (pers === "ambitious") {
        const pos = getPosition(club.id);
        if (pos <= 8) p.morale = clamp((p.morale || 70) + 2, 40, 95);
        else p.morale = clamp((p.morale || 70) - 2, 40, 95);
      }
    });
  };

  applyToClub(homeClub, homeStanding, hg > ag);
  applyToClub(awayClub, awayStanding, ag > hg);
}

function initLeague() {
  const d1Clubs = UL.game.clubs.filter(c => c.division === 1);
  const d2Clubs = UL.game.clubs.filter(c => c.division === 2);
  UL.game.league = {
    division1: {
      standings: createStandings(d1Clubs),
      fixtures: generateFixtures(d1Clubs.map(c => c.id)),
      currentMatchday: 1,
    },
    division2: {
      standings: createStandings(d2Clubs),
      fixtures: generateFixtures(d2Clubs.map(c => c.id)),
      currentMatchday: 1,
    },
    lastMatchdayResults: null, // { division1: { number, matches }, division2: { number, matches } }
  };
  UL.game.activeCompetition = "league";
}

function getDivisionForClub(clubId) {
  const club = getClubById(clubId);
  return club ? club.division : 1;
}

function findUserMatch(matchdayMatches) {
  const myId = UL.game.selectedClubId;
  return matchdayMatches ? matchdayMatches.find(m => m.homeId === myId || m.awayId === myId) : null;
}

function simulateOneDivisionMatchday(divKey) {
  const L = UL.game.league;
  const div = L[divKey];
  if (!div || !div.fixtures) return null;
  const idx = div.currentMatchday - 1;
  const matchday = div.fixtures[idx];
  if (!matchday) return null;

  const sortedStandings = [...div.standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
  const top4Ids = new Set(sortedStandings.slice(0, 4).map(s => s.clubId));

  const results = matchday.map(m => {
    const homeClub = getClubById(m.homeId);
    const awayClub = getClubById(m.awayId);
    const isTop4Clash = top4Ids.has(m.homeId) && top4Ids.has(m.awayId);
    const matchContext = { cupRound: null, leagueMatchday: div.currentMatchday, totalLeagueMatchdays: div.fixtures.length, isCup: false, isTop4Clash };
    const sim = simulateMatch(homeClub, awayClub, matchContext);

    const { home: homeStanding, away: awayStanding } =
      updateStandingsAfterMatch(div.standings, m.homeId, m.awayId, sim.homeGoals, sim.awayGoals);

    applyFormChanges(homeClub, awayClub, homeStanding, awayStanding, sim.homeGoals, sim.awayGoals);
    applyPersonalityMoraleUpdates(homeClub, awayClub, homeStanding, awayStanding, sim.homeGoals, sim.awayGoals, div.standings);

    const tierMultiplier = {
      "Elite": 1.3, "Strong": 1.1, "Competitive": 1.0, "Mid": 0.8, "Underdog": 0.6
    };
    const baseRevenue = randInt(150000, 700000);
    const revenue = Math.round(baseRevenue * (tierMultiplier[homeClub.tier] || 1));
    homeClub.budget += revenue;

    return {
      homeId: m.homeId, awayId: m.awayId,
      homeGoals: sim.homeGoals, awayGoals: sim.awayGoals,
      homeScorers: sim.homeScorers, awayScorers: sim.awayScorers,
      stats: sim.stats,
      motm: sim.motm
    };
  });

  return { number: div.currentMatchday, matches: results };
}

function simulateCurrentMatchday() {
  if (!UL.game.league || !UL.game.league.division1) return;
  const L = UL.game.league;

  const res1 = simulateOneDivisionMatchday("division1");
  const res2 = simulateOneDivisionMatchday("division2");

  L.lastMatchdayResults = {
    division1: res1,
    division2: res2,
  };
  renderMatchdayResults();
  rendertop8Table();
  renderTeamCard();
}

function renderMatchdayResults() {
  const L = UL.game.league;
  const res = L.lastMatchdayResults;
  if (!res || !res.division1 || !res.division2) return;

  const myId = UL.game.selectedClubId;
  const myDivision = getDivisionForClub(myId);
  const myRes = myDivision === 1 ? res.division1 : res.division2;
  const userMatch = findUserMatch(myRes.matches);

  const title = document.getElementById("mdTitle");
  title.textContent = `Matchday ${res.division1.number} Results`;

  const card = document.getElementById("yourMatchCard");
  if (userMatch) {
    const homeClub = getClubById(userMatch.homeId);
    const awayClub = getClubById(userMatch.awayId);
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
        ⭐ MOTM: ${userMatch.motm.name} (${formatPlayerPosition(userMatch.motm)})
      </div>
    `;
  } else {
    card.innerHTML = "<p>No match this matchday</p>";
  }

  const list = document.getElementById("otherResultsList");
  list.innerHTML = "";

  const d1Other = res.division1.matches.filter(m => m !== userMatch);
  const d2Other = res.division2.matches.filter(m => m !== userMatch);

  const addSection = (label, matches) => {
    if (matches.length === 0) return;
    const heading = document.createElement("div");
    heading.className = "results-section-title";
    heading.textContent = label;
    list.appendChild(heading);
    matches.forEach(m => {
      const h = getClubById(m.homeId);
      const a = getClubById(m.awayId);
      const row = document.createElement("div");
      row.className = "result-row";
      row.textContent = `${h.name} ${m.homeGoals} - ${m.awayGoals} ${a.name}`;
      list.appendChild(row);
    });
  };

  addSection("Division 1", myDivision === 1 ? d1Other : res.division1.matches);
  addSection("Division 2", myDivision === 2 ? d2Other : res.division2.matches);

  const pages = document.querySelectorAll(".page");
  pages.forEach(p => p.classList.remove("active"));
  document.getElementById("matchdayResults").classList.add("active");
}

function buildLeagueTableHTML(standings) {
  sortStandings(standings);
  const rows = standings.map((s, i) => {
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
  return `
    <thead>
      <tr>
        <th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th>
        <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

function renderLeagueTable() {
  const L = UL.game.league;
  if (!L || !L.division1 || !L.division2) return;

  const leagueSection = document.getElementById("league");
  let wrap = document.getElementById("leagueTableWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "leagueTableWrap";
    wrap.className = "table-wrap";
    leagueSection.appendChild(wrap);
  }

  const table1 = buildLeagueTableHTML(L.division1.standings);
  const table2 = buildLeagueTableHTML(L.division2.standings);

  wrap.innerHTML = `
    <h3 class="division-title">Division 1</h3>
    <table class="league-table">${table1}</table>
    <h3 class="division-title">Division 2</h3>
    <table class="league-table">${table2}</table>
  `;
}

function updateDashboardNextMatchInfo() {
  const panel = document.getElementById("careerPanel");
  const title = document.getElementById("clubTitle");
  const info = document.getElementById("nextMatchInfo");

  if (!UL.game.selectedClubId) return;

  const myClub = getClubById(UL.game.selectedClubId);
  const divNum = myClub.division;
  title.textContent = `${myClub.name} — Season ${UL.game.season} (Division ${divNum})`;

  const L = UL.game.league;
  const div = divNum === 1 ? L.division1 : L.division2;
  if (!div || !div.fixtures) return;
  const md = div.currentMatchday;
  const matches = div.fixtures[md - 1];
  if (!matches) return;
  const myMatch = matches.find(m => m.homeId === myClub.id || m.awayId === myClub.id);
  if (!myMatch) return;
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

      L.division1.currentMatchday++;
      L.division2.currentMatchday++;
      applyWeeklyWages();
      decrementSuspensions();
      decrementInjuries();
      applyTrainingBetweenMatchdays();
      applyMercenaryMorale();

      const md = L.division1.currentMatchday;
      if (md % CONFIG.MARKET_REFRESH_INTERVAL === 0) {
        generateTransferMarket();
        runAITransferWindow();
        showNotification("⚡ Transfer Market Updated!");
        if (document.getElementById("transferTableWrap")) renderTransferMarket();
        if (document.getElementById("transferHistory")) renderTransferHistory();
      }

      const d1Done = L.division1.currentMatchday > L.division1.fixtures.length;
      const d2Done = L.division2.currentMatchday > L.division2.fixtures.length;
      if (d1Done && d2Done && UL.game.activeCompetition === "league") {
        showNotification("League finished! Neo Egoist Cup begins!");
        startNeoEgoistCup();
        return;
      }

      renderLeagueTable();
      renderTopScorers();
      updateDashboardNextMatchInfo();
      renderTeamCard();

      const pages = document.querySelectorAll(".page");
      pages.forEach(p => p.classList.remove("active"));
      document.getElementById("dashboard").classList.add("active");

      if (UL.game.activeCompetition === "league" && md === (CONFIG.JOB_OFFER_MID_SEASON_MATCHDAY || 17)) {
        const offers = getJobOffers(CONFIG.JOB_OFFERS_COUNT_MID_SEASON);
        if (offers.length) setTimeout(() => showJobOffersModal(offers), 100);
      }
    });
  }
});

function decrementSuspensions() {
  const L = UL.game.league;
  [L.division1, L.division2].forEach(div => {
    const currentMD = div.currentMatchday - 1;
    const matchday = div.fixtures[currentMD];
    if (!matchday) return;
    matchday.forEach(match => {
      const clubs = [getClubById(match.homeId), getClubById(match.awayId)];
      clubs.forEach(club => {
        if (!club) return;
        club.squad.forEach(player => {
          if (player.suspendedMatches > 0) player.suspendedMatches -= 1;
        });
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
          if (club.id === UL.game.selectedClubId) {
            showNotification(`💪 ${player.name} recovered from injury`);
          }
        }
      }
    });
  });
}

function applyTrainingBetweenMatchdays() {
  UL.game.clubs.forEach(club => {
    const intensityMult = TRAINING_INTENSITY_MULTIPLIER[club.trainingIntensity] ?? 1;
    club.squad.forEach(p => {
      if (club.trainingPlan === "fitness") {
        const add = TRAINING_FITNESS_RECOVERY[club.trainingIntensity] ?? 3;
        p.stamina = clamp((p.stamina ?? 80) + add, 10, 100);
      }
      if (club.trainingPlan === "tactical") {
        const formGain = Math.round(1 * trainingAgeFactor(p) * intensityMult);
        if (formGain > 0) p.form = clamp((p.form ?? 50) + formGain, 20, 95);
      }
    });
  });
}

function applyMercenaryMorale() {
  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
      if ((player.personality || "") === "mercenary" && (player.contractYears || 0) <= 1) {
        player.morale = clamp((player.morale || 70) - 5, 40, 95);
      }
    });
  });
}

function rendertop8Table() {
  const container = document.getElementById("top8Table");
  if (!container) return;
  const L = UL.game.league;
  if (!L || !L.division1 || !L.division2) return;

  const d1Sorted = [...L.division1.standings].sort((a, b) => b.points - a.points).slice(0, 4);
  const d2Sorted = [...L.division2.standings].sort((a, b) => b.points - a.points).slice(0, 2);

  const rows = [];
  d1Sorted.forEach((row, i) => {
    const club = getClubById(row.clubId);
    rows.push(`<div class="top-row"><span>D1 ${i + 1}. ${club.name}</span><span>${row.points} pts</span></div>`);
  });
  d2Sorted.forEach((row, i) => {
    const club = getClubById(row.clubId);
    rows.push(`<div class="top-row"><span>D2 ${i + 1}. ${club.name}</span><span>${row.points} pts</span></div>`);
  });
  container.innerHTML = rows.join("");
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

  const club = UL.game.clubs.find(c => c.id === clubId);
  if (!club) return;
  const div = club.division === 1 ? UL.game.league.division1 : UL.game.league.division2;
  if (!div) return;
  sortStandings(div.standings);
  const standing = div.standings.find(s => s.clubId === clubId);
  if (!standing) return;

  const rating = club.rating || 85;
  const position = div.standings.indexOf(standing) + 1;

  const tier = club.tier || initialTierFromRating(rating);

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
    <p class="training-display">Training: ${(club.trainingPlan || "tactical").charAt(0).toUpperCase() + (club.trainingPlan || "tactical").slice(1)} (${(club.trainingIntensity || "medium").charAt(0).toUpperCase() + (club.trainingIntensity || "medium").slice(1)})</p>
  `;
}

function renderSquad() {
  const squadSection = document.getElementById("squad");
  const myId = UL.game.selectedClubId;
  if (!myId) return;

  const club = getClubById(myId);
  if (!club) return;

  if (club.squad.some(p => p.shirtNumber == null)) {
    assignSquadNumbers(club.squad);
  }

  let wrap = document.getElementById("squadTableWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "squadTableWrap";
    wrap.className = "table-wrap";
    squadSection.appendChild(wrap);
  }

  const filterVal = (document.getElementById("squadPositionFilter") && document.getElementById("squadPositionFilter").value) || "All";
  const filtered = filterVal === "All" ? club.squad : club.squad.filter(p => (p.primaryPosition || p.position) === filterVal || p.secondaryPosition === filterVal);

  const rows = filtered.map(p => `
    <tr class="${p.isStarter ? 'starter-row' : ''}" onclick="openPlayerModal('${p.id}')">
      <td class="shirt-num">${p.shirtNumber != null ? p.shirtNumber : "-"}</td>
      <td>
      <img 
        class="flag" 
        src="https://flagcdn.com/24x18/${p.flag.toLowerCase()}.png"
        alt="${p.flag}"
      >
      ${p.name}
      ${p.injured ? `<span style="color:red; font-weight:bold;"> (INJ ${p.injuryWeeks})</span>` : ""}
      </td>
      <td>${formatPlayerPosition(p)}</td>
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

  const posOptions = ["All", ...POSITIONS].map(pos => `<option value="${pos}" ${filterVal === pos ? "selected" : ""}>${pos}</option>`).join("");

  wrap.innerHTML = `
    <label>Filter by position: <select id="squadPositionFilter">${posOptions}</select></label>
    <table class="squad-table">
      <thead>
        <tr>
          <th>No.</th>
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
  const squadFilterEl = document.getElementById("squadPositionFilter");
  if (squadFilterEl) squadFilterEl.addEventListener("change", () => renderSquad());
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
      if (target === "careerStats") renderCareerStats();

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

  if (!club.trainingPlan) club.trainingPlan = "tactical";
  if (!club.trainingIntensity) club.trainingIntensity = "medium";

  const formationSelect = document.getElementById("formationSelect");
  const styleSelect = document.getElementById("styleSelect");
  const mentalitySelect = document.getElementById("mentalitySelect");
  const pressingSelect = document.getElementById("pressingSelect");
  const widthSelect = document.getElementById("widthSelect");
  const tempoSelect = document.getElementById("tempoSelect");
  const lineSelect = document.getElementById("lineSelect");
  const tacklingSelect = document.getElementById("tacklingSelect");
  const trainingPlanSelect = document.getElementById("trainingPlanSelect");
  const trainingIntensitySelect = document.getElementById("trainingIntensitySelect");

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
  if (trainingPlanSelect) trainingPlanSelect.value = club.trainingPlan || "tactical";
  if (trainingIntensitySelect) trainingIntensitySelect.value = club.trainingIntensity || "medium";

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
  const tPlan = document.getElementById("trainingPlanSelect");
  const tInt = document.getElementById("trainingIntensitySelect");
  if (tPlan) club.trainingPlan = tPlan.value;
  if (tInt) club.trainingIntensity = tInt.value;

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
  const L = UL.game.league;
  const d1Top5 = [...L.division1.standings].sort((a, b) => b.points - a.points).slice(0, 5).map(s => s.clubId);
  const d2Top3 = [...L.division2.standings].sort((a, b) => b.points - a.points).slice(0, 3).map(s => s.clubId);
  const cupTeamIds = [...d1Top5, ...d2Top3];

  UL.game.cup = {
    round: "Quarter Finals",
    teams: shuffle([...cupTeamIds]),
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
    const matchContext = { cupRound: cup.round, leagueMatchday: 0, totalLeagueMatchdays: 34 };
    const sim = simulateMatch(home, away, matchContext);

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

/** AI Rebuild Mode: bottom 3 (positions 16–18) get budget, 1 youth swap, and tier-above tactics next season. */
function applyAIRebuildMode(finalTable) {
  const bottom3 = finalTable.slice(-3);
  const myId = UL.game.selectedClubId;

  bottom3.forEach((row) => {
    const club = getClubById(row.clubId);
    if (!club || club.id === myId) return;

    // Budget injection
    club.budget += CONFIG.REBUILD_BUDGET_INJECTION;

    // Slight squad rejuvenation: replace one player with one prospect (keep squad size)
    const n = CONFIG.REBUILD_PROSPECTS_COUNT || 1;
    for (let i = 0; i < n && club.squad.length >= 2; i++) {
      const victim = [...club.squad]
        .sort((a, b) => a.overall - b.overall || b.age - a.age)[0];
      ensurePlayerPositions(victim);
      const pos = victim.primaryPosition || victim.position;
      const idx = club.squad.indexOf(victim);
      club.squad.splice(idx, 1);
      const newPlayer = generatePlayer(pos, club.rating, "prospect");
      club.squad.push(newPlayer);
      newPlayer.shirtNumber = getNextShirtNumber(club);
    }

    // Tactical reset: use tier above next season (stored for tactics loop)
    const tierAbove = getTierAbove(club.tier);
    club._rebuildTacticsTierAbove = tierAbove;

    showNotification(`${club.name} received a Rebuild boost after finishing in the bottom 3.`);
  });
}

/** Soft power drift: one source of truth for rating, momentum, streaks, tier. */
function applySeasonRatingAndPowerDrift(finalTable) {
  const clubs = UL.game.clubs;

  finalTable.forEach((row, index) => {
    const club = getClubById(row.clubId);
    const position = index + 1;

    let ratingChange = 0;

    // Champion
    if (position === 1) {
      ratingChange += 1;
      club.momentum = (club.momentum || 0) + 3;
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

    // Momentum weight (from previous seasons)
    const mom = club.momentum || 0;
    ratingChange += Math.min(2, Math.floor(mom / 4));

    // Update good/bad streaks (good 1-6, bad 13-18, neutral 7-12)
    if (position >= 1 && position <= 6) {
      club.consecutiveGoodSeasons = (club.consecutiveGoodSeasons || 0) + 1;
      club.consecutiveBadSeasons = 0;
    } else if (position >= 13 && position <= 18) {
      club.consecutiveBadSeasons = (club.consecutiveBadSeasons || 0) + 1;
      club.consecutiveGoodSeasons = 0;
    } else {
      club.consecutiveGoodSeasons = 0;
      club.consecutiveBadSeasons = 0;
    }

    // 2+ good seasons in a row: extra boost
    if ((club.consecutiveGoodSeasons || 0) >= 2) {
      ratingChange += 1;
      club.momentum = (club.momentum || 0) + 1;
    }

    // 2+ bad seasons in a row: extra drop, capped for smaller clubs
    if ((club.consecutiveBadSeasons || 0) >= 2) {
      if (club.rating > 77) ratingChange -= 1;
      else ratingChange -= 0.5;
    }

    club.rating = clamp(club.rating + ratingChange, 70, 95);
    club.lastSeasonPosition = position;

    if (UL.game.lastSeasonSummary && UL.game.lastSeasonSummary.ratingChanges) {
      UL.game.lastSeasonSummary.ratingChanges.push({
        clubId: club.id,
        change: ratingChange
      });
    }

    club.squad.forEach(player => {
      player.overall = clamp(player.overall + ratingChange, 55, 99);
    });
  });

  // Tier follows rating
  clubs.forEach(club => {
    club.tier = initialTierFromRating(club.rating);
  });

  // Momentum decay
  clubs.forEach(club => {
    club.momentum = Math.max(0, (club.momentum || 0) - 1);
  });
}

function endSeason() {

  const L = UL.game.league;
  const clubs = UL.game.clubs;

  const finalTableD1 = [...L.division1.standings].sort((a, b) => b.points - a.points);
  const finalTableD2 = [...L.division2.standings].sort((a, b) => b.points - a.points);

  UL.game.lastSeasonSummary = {
    finalTableD1,
    finalTableD2,
    ratingChanges: [],
    promoted: [],
    relegated: []
  };

  applySeasonRatingAndPowerDrift(finalTableD1);
  applySeasonRatingAndPowerDrift(finalTableD2);

  // ===== PROMOTION / RELEGATION (2 up 2 down; if 3rd D2 wins cup → 3 up 3 down) =====
  const cupWinnerId = UL.game.lastCupSummary && UL.game.lastCupSummary.winnerId ? UL.game.lastCupSummary.winnerId : null;
  const thirdD2ClubId = finalTableD2[2] ? finalTableD2[2].clubId : null;
  const thirdD2WonCup = cupWinnerId === thirdD2ClubId;

  let promotedIds = [finalTableD2[0].clubId, finalTableD2[1].clubId];
  let relegatedIds = [finalTableD1[16].clubId, finalTableD1[17].clubId]; // 17th, 18th

  if (thirdD2WonCup) {
    promotedIds = [finalTableD2[0].clubId, finalTableD2[1].clubId, finalTableD2[2].clubId];
    relegatedIds = [finalTableD1[15].clubId, finalTableD1[16].clubId, finalTableD1[17].clubId]; // 16th, 17th, 18th
    showNotification(`${getClubById(thirdD2ClubId).name} won the cup and steal promotion to Division 1!`);
  }

  promotedIds.forEach(id => { const c = getClubById(id); if (c) c.division = 1; });
  relegatedIds.forEach(id => { const c = getClubById(id); if (c) c.division = 2; });
  UL.game.lastSeasonSummary.promoted = promotedIds;
  UL.game.lastSeasonSummary.relegated = relegatedIds;

  // ===== GOLDEN BOOT (per division) =====
  let goldenBootD1 = null;
  let goldenBootD2 = null;
  UL.game.clubs.forEach(club => {
    const isD1 = club.division === 1;
    club.squad.forEach(player => {
      if (player.goals && player.goals > 0) {
        const target = isD1 ? goldenBootD1 : goldenBootD2;
        if (!target || player.goals > target.goals) {
          const boot = { name: player.name, goals: player.goals, club: club.name };
          if (isD1) goldenBootD1 = boot; else goldenBootD2 = boot;
        }
      }
    });
  });

  // CONTRACT COUNTDOWN
  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => {
      if (player.contractYears !== undefined) player.contractYears -= 1;
    });
    club.squad = club.squad.filter(player => {
      if (player.contractYears !== undefined && player.contractYears <= 0) {
        showNotification(`${player.name} left on free transfer`);
        return false;
      }
      return true;
    });
  });

  UL.game.lastGoldenBootD1 = goldenBootD1;
  UL.game.lastGoldenBootD2 = goldenBootD2;

  applySeasonPerformanceBonuses();
  applyPlayerAging();
  updateMetaAfterSeason();

  UL.game.clubs.forEach(c => considerAIStyleChange(c));

  UL.game.clubs.forEach(club => {
    club.squad.forEach(player => { player.goals = 0; });
  });

  // ===== START NEW SEASON =====
  UL.game.season += 1;

  initLeague();
  UL.game.activeCompetition = "league";

  UL.game.clubs.forEach(club => {
    club.budget = getSeasonStartBudget(club.rating);
  });

  const championId = finalTableD1[0].clubId;
  getClubById(championId).budget += 25_000_000;

  if (UL.game.lastLeagueChampionId === championId) {
    UL.game.dominantClubId = championId;
  } else {
    UL.game.dominantClubId = null;
  }
  UL.game.lastLeagueChampionId = championId;

  if (UL.game.dominantClubId) {
    const dominantClub = getClubById(UL.game.dominantClubId);
    if (dominantClub && dominantClub.squad) {
      dominantClub.squad.forEach(p => {
        p.morale = clamp((p.morale || 70) - 8, 40, 95);
      });
      showNotification(`${dominantClub.name} are under pressure after winning the league twice in a row.`);
    }
  }

  if (UL.game.lastCupSummary && UL.game.lastCupSummary.winnerId) {
    getClubById(UL.game.lastCupSummary.winnerId).budget += 50_000_000;
  }

  applyAIRebuildMode(finalTableD1);
  applyAIRebuildMode(finalTableD2);

  UL.game.clubs.forEach(club => {
    if (club.id !== UL.game.selectedClubId) {
      if (club._rebuildTacticsTierAbove != null) {
        assignAITacticsByTier(club, club._rebuildTacticsTierAbove);
        delete club._rebuildTacticsTierAbove;
      } else {
        assignAITacticsByTier(club);
      }
    }
  });

  UL.game.transferMarket.players = [];
  UL.game.transferMarket.history = [];
  generateTransferMarket();

  showNotification("Season ended. Welcome to Season " + UL.game.season);

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
  if (expectation === "Avoid Relegation" && position >= 17) underperformed = true;
  if (expectation === "Win Promotion" && position > 2) underperformed = true;
  if (expectation === "Push for Promotion" && position > 5) underperformed = true;

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
      const newPlayer = generatePlayer(randomPos, club.rating);
      club.squad.push(newPlayer);
      newPlayer.shirtNumber = getNextShirtNumber(club);
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

  const finalTableD1 = season.finalTableD1 || [];
  const finalTableD2 = season.finalTableD2 || [];
  const myId = UL.game.selectedClubId;

  // ====== LEAGUE BASIC (D1 champion, Top 4 D1 + Top 2 D2) ======
  const championRow = finalTableD1[0];
  const championClub = championRow ? getClubById(championRow.clubId) : null;
  const champTrophies = championClub ? (UL.game.trophies?.[championClub.id] || 0) : 0;

  const top4D1 = finalTableD1.slice(0, 4).map((row, i) => {
    const c = getClubById(row.clubId);
    return `<div class="line"><span>D1 ${i + 1}. ${c.name}</span><span>${row.points} pts</span></div>`;
  }).join("");
  const top2D2 = finalTableD2.slice(0, 2).map((row, i) => {
    const c = getClubById(row.clubId);
    return `<div class="line"><span>D2 ${i + 1}. ${c.name}</span><span>${row.points} pts</span></div>`;
  }).join("");
  const top4 = top4D1 + top2D2;

  const bottomClub = finalTableD1.length ? getClubById(finalTableD1[finalTableD1.length - 1].clubId) : null;

  const gap = finalTableD1.length >= 2 ? (finalTableD1[0].points - finalTableD1[1].points) : 0;

  // ====== USER STATS (position in their division) ======
  const myClub = myId ? getClubById(myId) : null;
  const myDivision = myClub ? myClub.division : 1;
  const myTable = myDivision === 1 ? finalTableD1 : finalTableD2;
  const myRowIndex = myTable.findIndex(r => r.clubId === myId);
  const myRow = myRowIndex >= 0 ? myTable[myRowIndex] : null;

  const myGF = myRow ? myRow.goalsFor : 0;
  const myGA = myRow ? myRow.goalsAgainst : 0;
  const myPos = myRowIndex >= 0 ? `D${myDivision} ${myRowIndex + 1}` : "-";

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

        ${(UL.game.lastGoldenBootD1 || UL.game.lastGoldenBootD2) ? `
          <div class="mini">
            ${UL.game.lastGoldenBootD1 ? `<div><b>Golden Boot D1:</b> ${UL.game.lastGoldenBootD1.name} (${UL.game.lastGoldenBootD1.club}) – ${UL.game.lastGoldenBootD1.goals} ⚽</div>` : ""}
            ${UL.game.lastGoldenBootD2 ? `<div><b>Golden Boot D2:</b> ${UL.game.lastGoldenBootD2.name} (${UL.game.lastGoldenBootD2.club}) – ${UL.game.lastGoldenBootD2.goals} ⚽</div>` : ""}
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

  // Start next season: record career stats for the season that just ended, then endSeason, then dashboard; job offers at start of new season
  document.getElementById("startNextSeasonBtn").addEventListener("click", () => {
    const season = UL.game.lastSeasonSummary;
    const cupSum = UL.game.lastCupSummary;
    const myId = UL.game.selectedClubId;
    if (season && myId) {
      const myClub = getClubById(myId);
      const myDivision = myClub ? myClub.division : 1;
      const finalD1 = season.finalTableD1 || [];
      const finalD2 = season.finalTableD2 || [];
      const myTable = myDivision === 1 ? finalD1 : finalD2;
      const myRowIndex = myTable.findIndex(r => r.clubId === myId);
      const myRow = myRowIndex >= 0 ? myTable[myRowIndex] : null;
      let cupResult = "Did not qualify";
      if (cupSum && cupSum.history?.length) {
        if (cupSum.winnerId === myId) cupResult = "Champion";
        else {
          let lastRound = null;
          cupSum.history.forEach(h => {
            if (h.matches?.some(m => m.homeId === myId || m.awayId === myId)) lastRound = h.round;
          });
          if (lastRound) cupResult = `Eliminated in ${lastRound}`;
        }
      }
      UL.game.careerStats.push({
        season: UL.game.season,
        team: myClub ? myClub.name : "Unknown",
        division: myDivision,
        leaguePosition: myRowIndex >= 0 ? myRowIndex + 1 : null,
        cupResult,
        goalsFor: myRow ? myRow.goalsFor : 0,
        goalsAgainst: myRow ? myRow.goalsAgainst : 0
      });
    }

    endSeason();

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("dashboard").classList.add("active");

    renderLeagueTable();
    renderTopScorers();
    rendertop8Table();
    renderTeamCard();
    updateDashboardNextMatchInfo();

    if (CONFIG.JOB_OFFERS_AT_SEASON_END) {
      setTimeout(() => {
        const offers = getJobOffers(CONFIG.JOB_OFFERS_COUNT_SEASON_END);
        if (offers.length) showJobOffersModal(offers);
      }, 150);
    }
  });
}

function endSeasonLogicOnly() {
  const L = UL.game.league;

  UL.game.lastSeasonSummary = {
    finalTableD1: [...L.division1.standings].sort((a, b) => b.points - a.points),
    finalTableD2: [...L.division2.standings].sort((a, b) => b.points - a.points),
    ratingChanges: [],
    promoted: [],
    relegated: []
  };

  applyPlayerAging();
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
    <span class="position-badge ${(player.primaryPosition || player.position) || ''}">
      ${formatPlayerPosition(player)}
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

    <div class="stat-row">
      <span>Personality</span>
      <span>${getPersonalityDisplayName(player.personality || "professional")}</span>
    </div>

    <div class="stat-row">
      <span>Shirt number</span>
      <input type="number" id="playerShirtNumberInput" min="1" max="99" value="${player.shirtNumber ?? ""}" placeholder="1-99" style="width:60px;" />
    </div>
    <button type="button" id="saveShirtNumberBtn" data-player-id="${player.id}">Save number</button>

    <button onclick="openSellModalById('${player.id}')">Sell Player</button>
    <button onclick="renewContract('${player.id}')">Renew Contract</button>
  `;

  const saveBtn = document.getElementById("saveShirtNumberBtn");
  const inputEl = document.getElementById("playerShirtNumberInput");
  if (saveBtn && inputEl) {
    saveBtn.addEventListener("click", () => {
      let num = parseInt(inputEl.value, 10);
      if (isNaN(num) || num < 1 || num > 99) {
        showNotification("Shirt number must be between 1 and 99.");
        return;
      }
      const myClub = getClubById(UL.game.selectedClubId);
      const otherWithSame = myClub.squad.find(p => p.id !== player.id && p.shirtNumber === num);
      if (otherWithSame) {
        showNotification(`Number ${num} is already used by ${otherWithSame.name}.`);
        return;
      }
      player.shirtNumber = num;
      showNotification(`Shirt number set to ${num}.`);
      renderSquad();
    });
  }

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

// 2️⃣ Generate exactly 30 market players
function generateTransferMarket() {

  const market = [];

  for (let i = 0; i < 30; i++) {
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

  const tfFilter = (document.getElementById("transferPositionFilter") && document.getElementById("transferPositionFilter").value) || "All";
  const tfList = tfFilter === "All" ? UL.game.transferMarket.players : UL.game.transferMarket.players.filter(p => (p.primaryPosition || p.position) === tfFilter || p.secondaryPosition === tfFilter);

  const rows = tfList.map(p => `
    <tr onclick="openTransferModal('${p.id}')">
      <td>
        <img class="flag" src="https://flagcdn.com/24x18/${p.flag.toLowerCase()}.png">
        ${p.name}
      </td>
      <td>${formatPlayerPosition(p)}</td>
      <td>${p.age}</td>
      <td><b>${p.overall}</b></td>
      <td>${p.potential}</td>
      <td>€${(p.value/1000000).toFixed(1)}M</td>
    </tr>
  `).join("");

  const tfPosOptions = ["All", ...POSITIONS].map(pos => `<option value="${pos}" ${tfFilter === pos ? "selected" : ""}>${pos}</option>`).join("");

  wrap.innerHTML = `
    <h2>Transfer Market</h2>
    <label>Filter: <select id="transferPositionFilter">${tfPosOptions}</select></label>
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
  `;

  const transferFilterEl = document.getElementById("transferPositionFilter");
  if (transferFilterEl) transferFilterEl.addEventListener("change", () => renderTransferMarket());

  renderTransferHistory();
}

// 6️⃣ Transfer history (uses the single #transferHistory from index.html)
function renderTransferHistory() {

  const container = document.getElementById("transferHistory");
  if (!container) return;

  const history = UL.game.transferMarket && UL.game.transferMarket.history ? UL.game.transferMarket.history : [];

  if (!history.length) {
    container.innerHTML = "<p class=\"transfer-history-empty\">No transfers this season</p>";
    return;
  }

  const clubLabel = (h) => {
    if (h.clubName) return h.clubName;
    if (h.clubId == null) return "—";
    const c = UL.game.clubs.find(cl => cl.id === h.clubId);
    return c ? c.name : "—";
  };

  container.innerHTML = history.map(h => `
    <div class="transfer-row ${h.type}">
      <span>[${clubLabel(h)}]</span>
      <span>${h.type === "IN" ? "IN" : "OUT"}: ${h.name} €${(h.value/1000000).toFixed(1)}M</span>
    </div>
  `).join("");
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

  const d1Players = [];
  const d2Players = [];

  UL.game.clubs.forEach(club => {
    const list = club.division === 1 ? d1Players : d2Players;
    club.squad.forEach(player => {
      if (player.goals > 0) {
        list.push({
          name: player.name,
          goals: player.goals,
          club: club.name,
          position: formatPlayerPosition(player)
        });
      }
    });
  });

  const top3D1 = d1Players.sort((a, b) => b.goals - a.goals).slice(0, 3);
  const top3D2 = d2Players.sort((a, b) => b.goals - a.goals).slice(0, 3);

  if (top3D1.length === 0 && top3D2.length === 0) {
    container.innerHTML = "<div>No goals yet</div>";
    return;
  }

  const row = (p, index) => `
    <div class="scorer-row">
      <span>${index + 1}. ${p.name} <small>(${p.position})</small></span>
      <span>${p.club}</span>
      <span>${p.goals} ⚽</span>
    </div>
  `;

  let html = "";
  if (top3D1.length) {
    html += `<div class="scorers-division-label">Division 1</div>`;
    html += top3D1.map((p, i) => row(p, i)).join("");
  }
  if (top3D2.length) {
    html += `<div class="scorers-division-label">Division 2</div>`;
    html += top3D2.map((p, i) => row(p, i)).join("");
  }
  container.innerHTML = html;
}

function openTransferModal(playerId) {
  const player = UL.game.transferMarket.players.find(p => p.id === playerId);
  if (!player) return;

  const modal = document.getElementById("transferModal");

  document.getElementById("modalPlayerName").textContent = player.name;
  const posEl = document.getElementById("modalPosition");
  if (posEl) posEl.textContent = formatPlayerPosition(player);
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
  player.shirtNumber = getNextShirtNumber(club);

  market.splice(index, 1);

  UL.game.transferMarket.history.push({
    type: "IN",
    clubId: club.id,
    clubName: club.name,
    name: player.name,
    value: player.value
  });

  renderTransferMarket();
  renderTeamCard();
  if (document.getElementById("transferHistory")) renderTransferHistory();
}

function openSellModal(player) {

  const modal = document.getElementById("transferModal");

  document.getElementById("modalPlayerName").textContent = player.name;
  const posElSell = document.getElementById("modalPosition");
  if (posElSell) posElSell.textContent = formatPlayerPosition(player);
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
    clubId: club.id,
    clubName: club.name,
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
  if (document.getElementById("transferHistory")) renderTransferHistory();
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
      ${(function() {
        const slots = formationSlots[club.tactics?.formation] || formationSlots["4-3-3"];
        const starters = club.squad.filter(p => p.isStarter);
        return starters.sort((a,b) => {
          const ia = slots.indexOf(a.matchPosition || a.primaryPosition || a.position);
          const ib = slots.indexOf(b.matchPosition || b.primaryPosition || b.position);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
      })().map(p => `
          <div class="starter-card" 
               onclick="openAIPlayerModal('${club.id}','${p.id}')">

            <div class="starter-left">
              <span class="pos-badge ${p.matchPosition || p.primaryPosition || p.position}">${p.matchPosition || formatPlayerPosition(p)}</span>
              ${p.shirtNumber != null ? `<span class="starter-num">${p.shirtNumber}</span>` : ""}
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
  const posElAI = document.getElementById("modalPosition");
  if (posElAI) posElAI.textContent = formatPlayerPosition(player);
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
  player.shirtNumber = getNextShirtNumber(myClub);

  sellingClub.squad = sellingClub.squad.filter(p => p.id !== player.id);

  tryAIFillFromMarket(sellingClub, player);

  showNotification(`Signed ${player.name} from ${sellingClub.name}`);

  renderTeamCard();
  renderSquad();
  if (document.getElementById("transferHistory")) renderTransferHistory();
}

function tryAIFillFromMarket(club, soldPlayer) {
  if (!UL.game.transferMarket) {
    UL.game.transferMarket = { players: [], history: [] };
  }
  if (!UL.game.transferMarket.players || UL.game.transferMarket.players.length === 0) {
    generateTransferMarket();
  }
  const market = UL.game.transferMarket.players;
  if (!market || !market.length) return;
  const needPos = soldPlayer.primaryPosition || soldPlayer.position;
  let candidates = market.filter(p => (p.primaryPosition || p.position) === needPos || p.secondaryPosition === needPos);
  if (candidates.length === 0) {
    const sector = getSector(needPos);
    candidates = market.filter(p => getSector(p.primaryPosition || p.position) === sector);
  }
  if (candidates.length === 0) return;
  candidates.sort((a, b) => (b.overall || 0) - (a.overall || 0));
  const buy = candidates.find(p => p.value <= club.budget);
  if (!buy) return;
  const idx = market.findIndex(p => p.id === buy.id);
  if (idx === -1) return;
  market.splice(idx, 1);
  club.budget -= buy.value;
  club.squad.push(buy);
  buy.shirtNumber = getNextShirtNumber(club);
  buildStartingXI(club);
  if (!Array.isArray(UL.game.transferMarket.history)) UL.game.transferMarket.history = [];
  UL.game.transferMarket.history.push({
    type: "IN",
    clubId: club.id,
    clubName: club.name,
    name: buy.name,
    value: buy.value
  });
}

function runAITransferWindow() {
  if (!UL.game.transferMarket) {
    UL.game.transferMarket = { players: [], history: [] };
    generateTransferMarket();
  }
  const market = UL.game.transferMarket.players;
  if (!market) return;

  const aiClubs = UL.game.clubs
    .filter(c => c.id !== UL.game.selectedClubId && c.squad != null && c.budget != null)
    .slice()
    .sort((a, b) => (a.rating || 0) - (b.rating || 0));

  const maxBuys = CONFIG.AI_TRANSFER_MAX_BUYS_PER_WINDOW ?? 2;
  const maxSells = CONFIG.AI_TRANSFER_MAX_SELLS_PER_WINDOW ?? 1;
  const ratingCap = CONFIG.AI_BUY_RATING_CAP_OVER_CLUB ?? 2;
  const sellOnlyIfMarketBelow = CONFIG.AI_SELL_ONLY_IF_MARKET_BELOW ?? 15;

  function positionCount(squad, pos) {
    return squad.filter(p => (p.primaryPosition || p.position) === pos || p.secondaryPosition === pos).length;
  }

  function pickPositionNeed(club) {
    ensureClubTactics(club);
    const formation = club.tactics?.formation || "4-3-3";
    const slots = formationSlots[formation] || formationSlots["4-3-3"];
    const needs = [];
    for (const pos of slots) {
      if (positionCount(club.squad, pos) === 0) needs.push(pos);
    }
    if (needs.length) return needs[randInt(0, needs.length - 1)];
    if (club.squad.length < CONFIG.SQUAD_SIZE) {
      const posKeys = Object.keys(CONFIG.POS_DISTRIBUTION);
      return posKeys[randInt(0, posKeys.length - 1)];
    }
    return null;
  }

  function doBuy(club, needPos) {
    let candidates = market.filter(p => {
      const prim = p.primaryPosition || p.position;
      if (prim === needPos || p.secondaryPosition === needPos) return true;
      return getSector(prim) === getSector(needPos);
    });
    candidates = candidates.filter(p =>
      (p.overall || 0) <= (club.rating || 0) + ratingCap && p.value <= club.budget
    );
    if (candidates.length === 0) return false;
    candidates.sort((a, b) => (b.overall || 0) - (a.overall || 0));
    const buy = candidates[0];
    const idx = market.findIndex(p => p.id === buy.id);
    if (idx === -1) return false;
    market.splice(idx, 1);
    club.budget -= buy.value;
    club.squad.push(buy);
    buy.shirtNumber = getNextShirtNumber(club);
    buildStartingXI(club);
    UL.game.transferMarket.history.push({
      type: "IN",
      clubId: club.id,
      clubName: club.name,
      name: buy.name,
      value: buy.value
    });
    return true;
  }

  // Phase 1: all clubs buy (weaker first), max 2 per club
  for (const club of aiClubs) {
    let buys = 0;
    while (buys < maxBuys) {
      const need = pickPositionNeed(club);
      if (!need || !doBuy(club, need)) break;
      buys++;
    }
  }

  // Phase 2: all clubs sell, max 1 per club (only if squad 20 and market below cap)
  for (const club of aiClubs) {
    if (club.squad.length !== CONFIG.SQUAD_SIZE || market.length >= sellOnlyIfMarketBelow) continue;
    if (maxSells <= 0) continue;
    const byOvr = club.squad.slice().sort((a, b) => (a.overall || 0) - (b.overall || 0));
    const toSell = byOvr[0];
    if (!toSell) continue;
    const idx = club.squad.findIndex(p => p.id === toSell.id);
    if (idx === -1) continue;
    club.squad.splice(idx, 1);
    club.budget += toSell.value;
    market.push(toSell);
    UL.game.transferMarket.history.push({
      type: "OUT",
      clubId: club.id,
      clubName: club.name,
      name: toSell.name,
      value: toSell.value
    });
  }
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
//STARTING XI BUILDER (slot-based: 11 slots per formation, matchPosition set)
//**********************/
function buildStartingXI(club) {
  ensureClubTactics(club);
  club.squad.forEach(ensurePlayerPositions);
  club.squad.forEach(p => { p.isStarter = false; p.matchPosition = null; });

  const slots = formationSlots[club.tactics.formation] || formationSlots["4-3-3"];
  const score = (p) => {
    const ovr = p.overall ?? 0;
    const form = p.form ?? 50;
    const stamina = p.stamina ?? 80;
    return ovr * 0.88 + form * 0.08 + stamina * 0.04;
  };

  const available = () => club.squad.filter(p => !p.isStarter && p.suspendedMatches === 0 && !p.injured);

  for (const slot of slots) {
    const prim = (p) => (p.primaryPosition || p.position) === slot;
    const sec = (p) => (p.secondaryPosition || "") === slot;
    let candidates = available().filter(p => prim(p) || sec(p));
    if (candidates.length === 0) {
      const sector = getSector(slot);
      candidates = available().filter(p => getSector(p.primaryPosition || p.position) === sector);
    }
    if (candidates.length === 0) candidates = available();
    if (candidates.length === 0) continue;
    const best = candidates.sort((a, b) => score(b) - score(a))[0];
    best.isStarter = true;
    best.matchPosition = slot;
  }

  const starters = club.squad.filter(p => p.isStarter);
  if (starters.length < 11) {
    const remaining = available().sort((a, b) => score(b) - score(a));
    const filledSlots = new Set(starters.map(p => p.matchPosition).filter(Boolean));
    const unfilledSlots = slots.filter(s => !filledSlots.has(s));
    remaining.slice(0, 11 - starters.length).forEach((p, i) => {
      p.isStarter = true;
      p.matchPosition = unfilledSlots[i] || slots[starters.length + i] || "CM";
    });
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

function assignAITacticsByTier(club, overrideTier) {
  ensureClubTactics(club);

  // ✅ Preserve locked formation forever
  const lockedFormation = club.formationLocked ? club.tactics.formation : null;
  const effectiveTier = overrideTier != null ? overrideTier : club.tier;

  // 🔥 1️⃣ IDENTITY OVERRIDE (HISTORY > TIER) — skipped when overrideTier (e.g. Rebuild)
  if (club.identity && overrideTier == null) {

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

  // 🔵 2️⃣ NORMAL TIER LOGIC (fallback; uses effectiveTier for Rebuild)

  if (effectiveTier === "Elite") {
    club.tactics.style = "possession";
    club.tactics.mentality = "attacking";
    club.tactics.pressing = "high";
    club.tactics.width = "wide";
    club.tactics.tempo = "balanced";
    club.tactics.line = "high";
    club.tactics.tackling = "normal";
  }

  else if (effectiveTier === "Strong") {
    club.tactics.style = ["possession","wingPlay"][randInt(0,1)];
    club.tactics.mentality = "balanced";
    club.tactics.pressing = "medium";
    club.tactics.width = "balanced";
    club.tactics.tempo = "balanced";
    club.tactics.line = "balanced";
    club.tactics.tackling = "normal";
  }

  else if (effectiveTier === "Competitive") {
    club.tactics.style = ["wingPlay","balanced","counter"][randInt(0,2)];
    club.tactics.mentality = "balanced";
    club.tactics.pressing = "medium";
    club.tactics.width = ["balanced","wide"][randInt(0,1)];
    club.tactics.tempo = "balanced";
    club.tactics.line = "balanced";
    club.tactics.tackling = ["normal","aggressive"][randInt(0,1)];
  }

  else if (effectiveTier === "Mid") {
    club.tactics.style = ["balanced","counter"][randInt(0,1)];
    club.tactics.mentality = "balanced";
    club.tactics.pressing = "medium";
    club.tactics.width = "balanced";
    club.tactics.tempo = "balanced";
    club.tactics.line = "balanced";
    club.tactics.tackling = "normal";
  }

  else {
    // Underdog
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

  if (!L || !L.division1 || !L.division1.fixtures) {
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

// =============================
// SAFE GLOBAL EXPOSURE WRAPPER
// =============================

(function() {

  if (!window.UL || !window.UL.game) {
    console.warn("UL not ready yet — delaying modal bindings...");
    return;
  }

  // Ensure transferMarket exists
  if (!UL.game.transferMarket) {
    UL.game.transferMarket = {
      players: [],
      history: []
    };
  }

  // Expose modals safely
  window.openPlayerModal = openPlayerModal;
  window.openSellModalById = openSellModalById;
  window.openTransferModal = openTransferModal;
  window.confirmBuyPlayer = confirmBuyPlayer;
  window.openClubModal = openClubModal;
  window.openAIPlayerModal = openAIPlayerModal;
  window.closeClubModal = closeClubModal;
  window.buyFromAIClub = buyFromAIClub;
  window.renewContract = renewContract;

  console.log("✅ Modal & transfer bindings safely attached.");

})();

// Expose for any global/inline use (e.g. GitHub Pages) — must run after functions exist
if (typeof renderSquad !== "undefined") window.renderSquad = renderSquad;
if (typeof renderTransferMarket !== "undefined") window.renderTransferMarket = renderTransferMarket;

