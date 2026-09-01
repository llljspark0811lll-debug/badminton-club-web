import type {
  SessionBracketConfig,
  SessionBracketMatch,
  SessionBracketPlayerEntry,
  SessionBracketPlayerStat,
  SessionBracketRound,
  SessionBracketSummary,
} from "@/components/dashboard/types";

export type SessionBracketPlayerInput = {
  playerId: string;
  participantId: number;
  name: string;
  gender: string;
  level: string;
  birth?: string | Date | null;
  age?: number | null;
  isGuest: boolean;
  hostName: string | null;
};

export type SessionBracketGenerationInput = {
  players: SessionBracketPlayerInput[];
  courtCount: number;
  minGamesPerPlayer: number;
  separateByGender: boolean;
  doublesMode?: DoublesMode;
  relaxedMode?: boolean;
  generationMode?: "STANDARD" | "TEAM_BATTLE";
  teamAssignments?: Record<string, "A" | "B">;
  teamLabels?: {
    A: string;
    B: string;
  };
  fixedPairs?: Array<[string, string, number?]>;
  seed?: number;
};

type FixedPairRule = {
  playerAId: string;
  playerBId: string;
  targetGames: number;
};

export type DoublesMode = "RANDOM" | "MIXED_PRIORITY" | "GENDER_SEPARATED";

export function normalizeDoublesMode(
  value: unknown,
  separateByGender = false
): DoublesMode {
  if (value === "MIXED_PRIORITY" || value === "GENDER_SEPARATED" || value === "RANDOM") {
    return value;
  }
  return separateByGender ? "GENDER_SEPARATED" : "RANDOM";
}

type DivisionKey = "ALL" | "MEN" | "WOMEN";
type InternalPlayer = SessionBracketPlayerEntry & {
  age: number | null;
};
type RandomFn = () => number;

type PlayerState = {
  games: number;
  rests: number;
  lastPlayedRound: number;
};

type Pool = {
  key: DivisionKey;
  label: string;
  players: InternalPlayer[];
};

type TeamBattleSide = "A" | "B";

type TeamBattlePool = {
  key: DivisionKey;
  label: string;
  teamAPlayers: InternalPlayer[];
  teamBPlayers: InternalPlayer[];
};

type MatchCandidate = {
  match: SessionBracketMatch;
  playerIds: string[];
  score: number;
};

const LEVEL_SCORE_MAP: Record<string, number> = {
  "1": 7,
  "2": 6,
  "3": 5,
  "4": 4,
  "5": 3,
  "6": 2,
  "7": 1,
};

const BALANCE_GAP_WEIGHT = 14;
const OPPONENT_REPEAT_WEIGHT = 40;
const FIXED_PAIR_REPEAT_WEIGHT = 80;
const FIXED_PAIR_STRONG_TEAM_THRESHOLD = 10;
const TOP_CANDIDATE_POOL_SIZE = 5;
const TOP_CANDIDATE_SCORE_MARGIN = 8;

function hasFixedPair(
  teamPlayers: InternalPlayer[],
  fixedPairMap: Map<string, string>
) {
  if (teamPlayers.length !== 2) {
    return false;
  }

  const [first, second] = teamPlayers;
  return (
    fixedPairMap.get(first!.playerId) === second!.playerId ||
    fixedPairMap.get(second!.playerId) === first!.playerId
  );
}

function getFixedPairBalanceProtectionPenalty(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  teamATotal: number,
  teamBTotal: number,
  balanceGap: number,
  fixedPairMap: Map<string, string>
) {
  const teamAIsFixedPair = hasFixedPair(teamAPlayers, fixedPairMap);
  const teamBIsFixedPair = hasFixedPair(teamBPlayers, fixedPairMap);

  if (!teamAIsFixedPair && !teamBIsFixedPair) {
    return 0;
  }

  const strongerTotal = Math.max(teamATotal, teamBTotal);

  if (strongerTotal < FIXED_PAIR_STRONG_TEAM_THRESHOLD) {
    return 0;
  }

  if (balanceGap >= 4) {
    return 40;
  }

  if (balanceGap >= 3) {
    return 20;
  }

  return 0;
}

function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(items: T[], random: RandomFn) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [
      shuffled[nextIndex]!,
      shuffled[index]!,
    ];
  }

  return shuffled;
}

function normalizeGender(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["남", "남자", "m", "male"].includes(normalized)) {
    return "남";
  }

  if (["여", "여자", "f", "female"].includes(normalized)) {
    return "여";
  }

  return String(value ?? "").trim() || "미정";
}

const LEGACY_LEVEL_TO_RANK: Record<string, string> = {
  S: "1", A: "2", B: "3", C: "4", D: "5", E: "6", 초심: "7",
};

export function normalizeLevel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "7";
  if (LEVEL_SCORE_MAP[normalized] !== undefined) return normalized;
  if (LEGACY_LEVEL_TO_RANK[normalized]) return LEGACY_LEVEL_TO_RANK[normalized];
  return "7";
}

function getLevelScore(level: string) {
  return LEVEL_SCORE_MAP[level] ?? LEVEL_SCORE_MAP["7"]!;
}

function normalizeAge(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const age = Math.floor(Number(value));
  return age > 0 ? age : null;
}

function getAgeFromBirth(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const birthDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthGap = today.getMonth() - birthDate.getMonth();

  if (
    monthGap < 0 ||
    (monthGap === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age > 0 ? age : null;
}

function getAgeBandAdjustment(age: number | null) {
  if (age === null) {
    return 0;
  }

  if (age >= 60) {
    return -3;
  }

  if (age >= 50) {
    return -2;
  }

  if (age >= 40) {
    return -1;
  }

  return 0;
}

function chooseCandidateFromTopPool(
  candidates: MatchCandidate[],
  random: RandomFn
) {
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    return 0;
  });

  const bestScore = sorted[0]!.score;
  const eligibleCandidates = sorted
    .filter(
      (candidate) =>
        candidate.score <= bestScore + TOP_CANDIDATE_SCORE_MARGIN
    )
    .slice(0, TOP_CANDIDATE_POOL_SIZE);

  return eligibleCandidates[
    Math.floor(random() * eligibleCandidates.length)
  ]!;
}

function getGenderAdjustment(gender: string, separateByGender: boolean) {
  if (separateByGender) {
    return 0;
  }

  const normalized = String(gender ?? "").trim().toLowerCase();
  return ["여", "여자", "f", "female"].includes(normalized) ? -1 : 0;
}

function getAdjustedPlayerScore(
  level: string,
  gender: string,
  age: number | null,
  separateByGender: boolean
) {
  const baseScore = getLevelScore(level);
  // 현재 급수는 1(S)~7(초심)로 정규화된다. 나이 보정은 S~D(1~5)에만 적용한다.
  const ageAdjustment = ["1", "2", "3", "4", "5"].includes(level)
    ? getAgeBandAdjustment(age)
    : 0;
  const genderAdjustment = getGenderAdjustment(gender, separateByGender);

  return Math.max(1, baseScore + ageAdjustment + genderAdjustment);
}

function createPlayerEntry(
  input: SessionBracketPlayerInput,
  separateByGender: boolean
): InternalPlayer {
  const gender = normalizeGender(input.gender);
  const level = normalizeLevel(input.level);
  const age = normalizeAge(input.age) ?? getAgeFromBirth(input.birth);

  return {
    playerId: input.playerId,
    participantId: input.participantId,
    name: input.name.trim(),
    gender,
    level,
    score: getAdjustedPlayerScore(level, gender, age, separateByGender),
    age,
    isGuest: input.isGuest,
    hostName: input.hostName,
  };
}

function buildPools(
  players: InternalPlayer[],
  separateByGender: boolean
) {
  if (!separateByGender) {
    return [
      {
        key: "ALL" as const,
        label: "통합 복식",
        players,
      },
    ];
  }

  const invalidPlayers = players.filter(
    (player) => !["남", "여"].includes(player.gender)
  );

  if (invalidPlayers.length > 0) {
    throw new Error(
      `남복/여복 분리 생성은 모든 참가자의 성별 정보가 필요합니다. ${invalidPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 성별을 먼저 확인해 주세요.`
    );
  }

  return [
    {
      key: "MEN" as const,
      label: "남복",
      players: players.filter((player) => player.gender === "남"),
    },
    {
      key: "WOMEN" as const,
      label: "여복",
      players: players.filter((player) => player.gender === "여"),
    },
  ].filter((pool) => pool.players.length > 0);
}

function getTeamBattleLabel(
  division: DivisionKey,
  teamLabels: { A: string; B: string }
) {
  if (division === "MEN") {
    return `${teamLabels.A} 남복 vs ${teamLabels.B} 남복`;
  }

  if (division === "WOMEN") {
    return `${teamLabels.A} 여복 vs ${teamLabels.B} 여복`;
  }

  return `${teamLabels.A} vs ${teamLabels.B}`;
}

function buildTeamBattlePools(
  players: InternalPlayer[],
  separateByGender: boolean,
  teamAssignments: Record<string, "A" | "B">,
  teamLabels: { A: string; B: string }
) {
  const unassignedPlayers = players.filter(
    (player) => !teamAssignments[player.playerId]
  );

  if (unassignedPlayers.length > 0) {
    throw new Error(
      `팀 대항 자동대진은 모든 참가자를 팀에 배정해야 합니다. ${unassignedPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 팀을 선택해 주세요.`
    );
  }

  if (!separateByGender) {
    return [
      {
        key: "ALL" as const,
        label: getTeamBattleLabel("ALL", teamLabels),
        teamAPlayers: players.filter(
          (player) => teamAssignments[player.playerId] === "A"
        ),
        teamBPlayers: players.filter(
          (player) => teamAssignments[player.playerId] === "B"
        ),
      },
    ];
  }

  const invalidPlayers = players.filter(
    (player) => !["남", "여"].includes(player.gender)
  );

  if (invalidPlayers.length > 0) {
    throw new Error(
      `남복/여복 분리 생성은 모든 참가자의 성별 정보가 필요합니다. ${invalidPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 성별을 먼저 확인해 주세요.`
    );
  }

  return [
    {
      key: "MEN" as const,
      label: getTeamBattleLabel("MEN", teamLabels),
      teamAPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "A" && player.gender === "남"
      ),
      teamBPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "B" && player.gender === "남"
      ),
    },
    {
      key: "WOMEN" as const,
      label: getTeamBattleLabel("WOMEN", teamLabels),
      teamAPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "A" && player.gender === "여"
      ),
      teamBPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "B" && player.gender === "여"
      ),
    },
  ].filter(
    (pool) => pool.teamAPlayers.length > 0 || pool.teamBPlayers.length > 0
  );
}

function keyForPair(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join(":");
}

function normalizeFixedPairs(
  pairs: Array<[string, string, number?]> | undefined,
  maxGames: number
): Array<[string, string, number]> {
  return (pairs ?? []).map(([playerAId, playerBId, requestedGames]) => [
    playerAId,
    playerBId,
    Math.min(
      maxGames,
      Math.max(
        1,
        Number.isFinite(requestedGames)
          ? Math.floor(Number(requestedGames))
          : maxGames
      )
    ),
  ]);
}

function buildFixedPairRules(
  pairs: Array<[string, string, number?]>,
  playerIds: Set<string>
): FixedPairRule[] {
  return pairs
    .filter(
      ([playerAId, playerBId]) =>
        playerAId !== playerBId &&
        playerIds.has(playerAId) &&
        playerIds.has(playerBId)
    )
    .map(([playerAId, playerBId, targetGames]) => ({
      playerAId,
      playerBId,
      targetGames: Math.max(1, Math.floor(targetGames ?? 1)),
    }));
}

function getFixedPairConstraints(
  rules: FixedPairRule[],
  partnerHistory: Map<string, number>
) {
  const activePairMap = new Map<string, string>();
  const forbiddenPairKeys = new Set<string>();

  for (const rule of rules) {
    const pairKey = keyForPair(rule.playerAId, rule.playerBId);
    const gamesTogether = partnerHistory.get(pairKey) ?? 0;
    if (gamesTogether < rule.targetGames) {
      activePairMap.set(rule.playerAId, rule.playerBId);
      activePairMap.set(rule.playerBId, rule.playerAId);
    } else {
      forbiddenPairKeys.add(pairKey);
    }
  }

  return { activePairMap, forbiddenPairKeys };
}

function hasForbiddenPartnerPair(
  teamPlayers: InternalPlayer[],
  forbiddenPairKeys: Set<string>
) {
  return (
    teamPlayers.length === 2 &&
    forbiddenPairKeys.has(
      keyForPair(teamPlayers[0]!.playerId, teamPlayers[1]!.playerId)
    )
  );
}

function assertFixedPairTargetsSatisfied(
  rules: FixedPairRule[],
  partnerHistory: Map<string, number>,
  players: InternalPlayer[]
) {
  const playerNames = new Map(players.map((player) => [player.playerId, player.name]));
  const unsatisfied = rules.find(
    (rule) =>
      (partnerHistory.get(keyForPair(rule.playerAId, rule.playerBId)) ?? 0) <
      rule.targetGames
  );
  if (!unsatisfied) return;

  throw new Error(
    `${playerNames.get(unsatisfied.playerAId) ?? unsatisfied.playerAId} & ${
      playerNames.get(unsatisfied.playerBId) ?? unsatisfied.playerBId
    } 파트너가 함께할 경기 수 ${unsatisfied.targetGames}경기를 충족할 수 없습니다. 참가 인원, 팀 배정 또는 파트너 경기 수를 조정해 주세요.`
  );
}

function sortPlayersForSelection(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>
) {
  return [...players].sort((left, right) => {
    const leftMustPlay = previousRested.has(left.playerId) ? 0 : 1;
    const rightMustPlay = previousRested.has(right.playerId) ? 0 : 1;

    if (leftMustPlay !== rightMustPlay) {
      return leftMustPlay - rightMustPlay;
    }

    const leftState = states.get(left.playerId)!;
    const rightState = states.get(right.playerId)!;

    const leftNeedsMoreGames =
      leftState.games < minGamesPerPlayer ? 0 : 1;
    const rightNeedsMoreGames =
      rightState.games < minGamesPerPlayer ? 0 : 1;

    if (leftNeedsMoreGames !== rightNeedsMoreGames) {
      return leftNeedsMoreGames - rightNeedsMoreGames;
    }

    if (leftState.games !== rightState.games) {
      return leftState.games - rightState.games;
    }

    if (leftState.lastPlayedRound !== rightState.lastPlayedRound) {
      return leftState.lastPlayedRound - rightState.lastPlayedRound;
    }

    const leftRandom = randomOrder.get(left.playerId) ?? 0;
    const rightRandom = randomOrder.get(right.playerId) ?? 0;

    if (leftRandom !== rightRandom) {
      return leftRandom - rightRandom;
    }

    return left.name.localeCompare(right.name, "ko");
  });
}

function getPoolMatchLimit(pool: Pool, doublesMode: DoublesMode = "RANDOM") {
  if (doublesMode === "MIXED_PRIORITY" && pool.key === "ALL") {
    const men = pool.players.filter((player) => player.gender === "남").length;
    const women = pool.players.filter((player) => player.gender === "여").length;
    const totalLimit = Math.floor(pool.players.length / 4);
    for (let matches = totalLimit; matches >= 0; matches -= 1) {
      for (let mixed = 0; mixed <= matches; mixed += 1) {
        for (let menMatches = 0; menMatches <= matches - mixed; menMatches += 1) {
          const womenMatches = matches - mixed - menMatches;
          if (mixed * 2 + menMatches * 4 <= men && mixed * 2 + womenMatches * 4 <= women) {
            return matches;
          }
        }
      }
    }
    return 0;
  }
  return Math.floor(pool.players.length / 4);
}

function getPoolRecoveryMatchFloor(pool: Pool, doublesMode: DoublesMode = "RANDOM") {
  const matchLimit = getPoolMatchLimit(pool, doublesMode);

  if (matchLimit <= 0) {
    return 0;
  }

  const maxSelectableNextRound = matchLimit * 4;
  const unrecoverableCarryCount =
    pool.players.length - maxSelectableNextRound;

  if (unrecoverableCarryCount <= 0) {
    return 0;
  }

  return Math.ceil(unrecoverableCarryCount / 4);
}

function getPoolAverageGames(
  pool: Pool,
  states: Map<string, PlayerState>
) {
  if (pool.players.length === 0) {
    return 0;
  }

  const totalGames = pool.players.reduce((total, player) => {
    return total + (states.get(player.playerId)?.games ?? 0);
  }, 0);

  return totalGames / pool.players.length;
}

function getOverallAverageGames(
  pools: Pool[],
  states: Map<string, PlayerState>
) {
  const players = pools.flatMap((pool) => pool.players);

  if (players.length === 0) {
    return 0;
  }

  const totalGames = players.reduce((total, player) => {
    return total + (states.get(player.playerId)?.games ?? 0);
  }, 0);

  return totalGames / players.length;
}

function getPoolMatchPriority(
  pool: Pool,
  currentMatches: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  overallAverageGames: number
) {
  const nextSelectedCount = (currentMatches + 1) * 4;
  const orderedPlayers = sortPlayersForSelection(
    pool.players,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder
  );

  if (orderedPlayers.length < nextSelectedCount) {
    return Number.NEGATIVE_INFINITY;
  }

  const selectedPlayers = orderedPlayers.slice(0, nextSelectedCount);
  const poolAverageGames = getPoolAverageGames(pool, states);
  const gameGap = overallAverageGames - poolAverageGames;

  return selectedPlayers.reduce((total, player, index) => {
    const state = states.get(player.playerId)!;
    const unmetGames = Math.max(0, minGamesPerPlayer - state.games);
    const mustPlayBonus = previousRested.has(player.playerId)
      ? 6
      : 0;
    const lowGamesBonus = Math.max(
      0,
      overallAverageGames - state.games
    );
    const randomBias =
      (randomOrder.get(player.playerId) ?? 0) * (index + 1) * 0.01;

    return (
      total +
      unmetGames * 10 +
      mustPlayBonus +
      lowGamesBonus * 4 +
      randomBias
    );
  }, gameGap * 40 - currentMatches * 12);
}

function allocateMatchesForRound(
  pools: Pool[],
  courtCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  relaxedMode = false,
  doublesMode: DoublesMode = "RANDOM"
) {
  const allocations = new Map<DivisionKey, number>();
  let requiredMatches = 0;
  const overallAverageGames = getOverallAverageGames(
    pools,
    states
  );

  for (const pool of pools) {
    if (pool.players.length > 0 && pool.players.length < 4) {
      const needsGames = pool.players.some((player) => {
        const state = states.get(player.playerId)!;
        return state.games < minGamesPerPlayer;
      });
      const hasPreviousResters = pool.players.some((player) =>
        previousRested.has(player.playerId)
      );

      if (needsGames || hasPreviousResters) {
        throw new Error(
          `${pool.label} 참가 인원이 4명 미만이라 자동 대진표를 생성할 수 없습니다.`
        );
      }
    }

    const mustPlayCount = pool.players.filter((player) =>
      previousRested.has(player.playerId)
    ).length;
    const requiredFromPreviousRest =
      mustPlayCount === 0
        ? 0
        : Math.ceil(mustPlayCount / 4);
    const requiredForRecovery =
      getPoolRecoveryMatchFloor(pool, doublesMode);
    const required = Math.max(
      requiredFromPreviousRest,
      requiredForRecovery
    );

    const matchLimit = getPoolMatchLimit(pool, doublesMode);

    if (!relaxedMode && required > matchLimit) {
      throw new Error(
        `${pool.label}에서 직전 라운드를 쉰 인원을 모두 이번 라운드에 넣을 수 없습니다. 코트를 늘리거나 참가 인원을 다시 확인해 주세요.`
      );
    }

    const initialRequired = relaxedMode ? 0 : required;
    allocations.set(pool.key, initialRequired);
    requiredMatches += initialRequired;
  }

  if (!relaxedMode && requiredMatches > courtCount) {
    throw new Error(
      "직전 라운드 휴식 인원을 모두 다음 라운드에 배치할 수 없습니다. 코트를 늘리거나 대진 생성 조건을 다시 확인해 주세요."
    );
  }

  let remainingMatches = courtCount - requiredMatches;

  while (remainingMatches > 0) {
    let bestPool: Pool | null = null;
    let bestPriority = Number.NEGATIVE_INFINITY;

    for (const pool of pools) {
      const currentMatches = allocations.get(pool.key) ?? 0;
      const matchLimit = getPoolMatchLimit(pool, doublesMode);

      if (currentMatches >= matchLimit) {
        continue;
      }

      const priority = getPoolMatchPriority(
        pool,
        currentMatches,
        states,
        previousRested,
        minGamesPerPlayer,
        randomOrder,
        overallAverageGames
      );

      if (priority > bestPriority) {
        bestPriority = priority;
        bestPool = pool;
      }
    }

    if (!bestPool || bestPriority === Number.NEGATIVE_INFINITY) {
      break;
    }

    allocations.set(
      bestPool.key,
      (allocations.get(bestPool.key) ?? 0) + 1
    );
    remainingMatches -= 1;
  }

  return allocations;
}

function chooseSelectedPlayers(
  players: InternalPlayer[],
  target: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  if (target <= 0) {
    return [];
  }

  const selectableIds = new Set(players.map((p) => p.playerId));
  const sorted = sortPlayersForSelection(
    players,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder
  );

  // ?섏뼱???먯옄 ?⑥쐞濡?痍④툒: ?????좏깮?섍굅???????쒖쇅
  const selected = new Set<string>();
  for (const player of sorted) {
    if (selected.size >= target) break;
    if (selected.has(player.playerId)) continue;

    const partnerId = fixedPairMap.get(player.playerId);
    if (
      partnerId &&
      selectableIds.has(partnerId) &&
      !selected.has(partnerId)
    ) {
      if (selected.size + 2 <= target) {
        selected.add(player.playerId);
        selected.add(partnerId);
      }
      // ?щ’??1媛쒕쭔 ?⑥쑝硫??섏뼱 ?ㅽ궢 (?ㅼ쓬 媛쒖씤 ?좎닔媛 梨꾩?)
    } else {
      selected.add(player.playerId);
    }
  }

  return players.filter((p) => selected.has(p.playerId));
}

function chooseSelectedPlayersForPool(
  pool: Pool,
  matchCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  return chooseSelectedPlayers(
    pool.players,
    matchCount * 4,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder,
    fixedPairMap
  );
}

type MixedPriorityAllocation = {
  mixedMatches: number;
  menMatches: number;
  womenMatches: number;
  selectedPlayers: InternalPlayer[];
};

function choosePlayersForGenderTargets(
  pool: Pool,
  menNeeded: number,
  womenNeeded: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  const sorted = sortPlayersForSelection(
    pool.players, states, previousRested, minGamesPerPlayer, randomOrder
  );
  const playerMap = new Map(pool.players.map((player) => [player.playerId, player]));
  const selected = new Set<string>();
  let selectedMen = 0;
  let selectedWomen = 0;

  const canAdd = (entries: InternalPlayer[]) => {
    const menToAdd = entries.filter((entry) => entry.gender === "남").length;
    const womenToAdd = entries.filter((entry) => entry.gender === "여").length;
    return selectedMen + menToAdd <= menNeeded && selectedWomen + womenToAdd <= womenNeeded;
  };
  const add = (entries: InternalPlayer[]) => {
    for (const entry of entries) {
      if (selected.has(entry.playerId)) continue;
      selected.add(entry.playerId);
      if (entry.gender === "남") selectedMen += 1;
      if (entry.gender === "여") selectedWomen += 1;
    }
  };

  for (const current of sorted) {
    if (selectedMen === menNeeded && selectedWomen === womenNeeded) break;
    if (selected.has(current.playerId)) continue;
    const partnerId = fixedPairMap.get(current.playerId);
    const partner = partnerId ? playerMap.get(partnerId) : undefined;
    const entries = partner && !selected.has(partner.playerId) ? [current, partner] : [current];
    if (canAdd(entries)) add(entries);
  }

  if (selectedMen !== menNeeded || selectedWomen !== womenNeeded) return [];
  return pool.players.filter((player) => selected.has(player.playerId));
}

function chooseMixedPriorityAllocation(
  pool: Pool,
  matchCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
): MixedPriorityAllocation | null {
  const men = pool.players.filter((player) => player.gender === "남");
  const women = pool.players.filter((player) => player.gender === "여");
  const candidates: Array<MixedPriorityAllocation & { score: number }> = [];

  for (let mixedMatches = 0; mixedMatches <= matchCount; mixedMatches += 1) {
    for (let menMatches = 0; menMatches <= matchCount - mixedMatches; menMatches += 1) {
      const womenMatches = matchCount - mixedMatches - menMatches;
      const menNeeded = mixedMatches * 2 + menMatches * 4;
      const womenNeeded = mixedMatches * 2 + womenMatches * 4;
      if (menNeeded > men.length || womenNeeded > women.length) continue;

      const selectedPlayers = choosePlayersForGenderTargets(
        pool, menNeeded, womenNeeded, states, previousRested,
        minGamesPerPlayer, randomOrder, fixedPairMap
      );
      if (selectedPlayers.length !== menNeeded + womenNeeded) continue;
      const selectedIds = new Set(selectedPlayers.map((player) => player.playerId));
      const splitsFixedPair = selectedPlayers.some((player) => {
        const partnerId = fixedPairMap.get(player.playerId);
        return partnerId && pool.players.some((entry) => entry.playerId === partnerId) && !selectedIds.has(partnerId);
      });
      if (splitsFixedPair) continue;

      const missedPreviousRest = pool.players.filter(
        (player) => previousRested.has(player.playerId) && !selectedIds.has(player.playerId)
      ).length;
      const projectedGames = pool.players.map(
        (player) => (states.get(player.playerId)?.games ?? 0) + (selectedIds.has(player.playerId) ? 1 : 0)
      );
      const gameSpread = Math.max(...projectedGames) - Math.min(...projectedGames);
      const remainingNeed = pool.players.reduce(
        (sum, player) =>
          sum + Math.max(0, minGamesPerPlayer - ((states.get(player.playerId)?.games ?? 0) + (selectedIds.has(player.playerId) ? 1 : 0))),
        0
      );
      const score =
        missedPreviousRest * 1_000_000_000 +
        gameSpread * 1_000_000 +
        remainingNeed * 1_000 -
        mixedMatches * 10;

      candidates.push({ mixedMatches, menMatches, womenMatches, selectedPlayers, score });
    }
  }

  candidates.sort((left, right) => left.score - right.score);
  const best = candidates[0];
  if (!best) return null;
  return best;
}

function getTeamBattleMatchLimit(pool: TeamBattlePool) {
  return Math.min(
    Math.floor(pool.teamAPlayers.length / 2),
    Math.floor(pool.teamBPlayers.length / 2)
  );
}

function getTeamBattleRecoveryMatchFloor(pool: TeamBattlePool) {
  const matchLimit = getTeamBattleMatchLimit(pool);

  if (matchLimit <= 0) {
    return 0;
  }

  const maxSelectableNextRound = matchLimit * 2;
  const unrecoverableCarryA =
    pool.teamAPlayers.length - maxSelectableNextRound;
  const unrecoverableCarryB =
    pool.teamBPlayers.length - maxSelectableNextRound;

  return Math.max(
    unrecoverableCarryA <= 0 ? 0 : Math.ceil(unrecoverableCarryA / 2),
    unrecoverableCarryB <= 0 ? 0 : Math.ceil(unrecoverableCarryB / 2)
  );
}

function getTeamBattlePoolAverageGames(
  pool: TeamBattlePool,
  states: Map<string, PlayerState>
) {
  const players = [...pool.teamAPlayers, ...pool.teamBPlayers];

  if (players.length === 0) {
    return 0;
  }

  const totalGames = players.reduce(
    (total, player) => total + (states.get(player.playerId)?.games ?? 0),
    0
  );

  return totalGames / players.length;
}

function getOverallAverageGamesForTeamBattle(
  pools: TeamBattlePool[],
  states: Map<string, PlayerState>
) {
  const players = pools.flatMap((pool) => [
    ...pool.teamAPlayers,
    ...pool.teamBPlayers,
  ]);

  if (players.length === 0) {
    return 0;
  }

  const totalGames = players.reduce(
    (total, player) => total + (states.get(player.playerId)?.games ?? 0),
    0
  );

  return totalGames / players.length;
}

function getTeamBattlePoolMatchPriority(
  pool: TeamBattlePool,
  currentMatches: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  overallAverageGames: number,
  fixedPairMap: Map<string, string>
) {
  const nextSelectedCount = (currentMatches + 1) * 2;
  const selectedA = chooseSelectedPlayers(
    pool.teamAPlayers,
    nextSelectedCount,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder,
    fixedPairMap
  );
  const selectedB = chooseSelectedPlayers(
    pool.teamBPlayers,
    nextSelectedCount,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder,
    fixedPairMap
  );

  if (
    selectedA.length < nextSelectedCount ||
    selectedB.length < nextSelectedCount
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  const poolAverageGames = getTeamBattlePoolAverageGames(pool, states);
  const gameGap = overallAverageGames - poolAverageGames;

  return [...selectedA, ...selectedB].reduce((total, player, index) => {
    const state = states.get(player.playerId)!;
    const unmetGames = Math.max(0, minGamesPerPlayer - state.games);
    const mustPlayBonus = previousRested.has(player.playerId) ? 6 : 0;
    const lowGamesBonus = Math.max(0, overallAverageGames - state.games);
    const randomBias =
      (randomOrder.get(player.playerId) ?? 0) * (index + 1) * 0.01;

    return (
      total +
      unmetGames * 10 +
      mustPlayBonus +
      lowGamesBonus * 4 +
      randomBias
    );
  }, gameGap * 40 - currentMatches * 12);
}

function allocateMatchesForRoundTeamBattle(
  pools: TeamBattlePool[],
  courtCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>,
  relaxedMode = false
) {
  const allocations = new Map<DivisionKey, number>();
  let requiredMatches = 0;
  const overallAverageGames = getOverallAverageGamesForTeamBattle(
    pools,
    states
  );

  for (const pool of pools) {
    const needsGamesA = pool.teamAPlayers.some((player) => {
      const state = states.get(player.playerId)!;
      return state.games < minGamesPerPlayer;
    });
    const needsGamesB = pool.teamBPlayers.some((player) => {
      const state = states.get(player.playerId)!;
      return state.games < minGamesPerPlayer;
    });
    const hasPreviousRestersA = pool.teamAPlayers.some((player) =>
      previousRested.has(player.playerId)
    );
    const hasPreviousRestersB = pool.teamBPlayers.some((player) =>
      previousRested.has(player.playerId)
    );

    if (pool.teamAPlayers.length < 2 && (needsGamesA || hasPreviousRestersA)) {
      throw new Error(
        `${pool.label} 생성하는 ${pool.label.includes("남복") ? "A팀 남자" : pool.label.includes("여복") ? "A팀 여자" : "A팀"} 인원이 최소 2명 이상 필요합니다`
      );
    }

    if (pool.teamBPlayers.length < 2 && (needsGamesB || hasPreviousRestersB)) {
      throw new Error(
        `${pool.label} 생성하는 ${pool.label.includes("남복") ? "B팀 남자" : pool.label.includes("여복") ? "B팀 여자" : "B팀"} 인원이 최소 2명 이상 필요합니다`
      );
    }

    const mustPlayCountA = pool.teamAPlayers.filter((player) =>
      previousRested.has(player.playerId)
    ).length;
    const mustPlayCountB = pool.teamBPlayers.filter((player) =>
      previousRested.has(player.playerId)
    ).length;
    const requiredFromPreviousRest = Math.max(
      mustPlayCountA === 0 ? 0 : Math.ceil(mustPlayCountA / 2),
      mustPlayCountB === 0 ? 0 : Math.ceil(mustPlayCountB / 2)
    );
    const requiredForRecovery = getTeamBattleRecoveryMatchFloor(pool);
    const required = Math.max(requiredFromPreviousRest, requiredForRecovery);

    const matchLimit = getTeamBattleMatchLimit(pool);

    if (!relaxedMode && required > matchLimit) {
      throw new Error(
        `${pool.label}에서 직전 라운드를 쉰 인원을 모두 이번 라운드에 넣을 수 없습니다. 코트 수 또는 참가 인원을 다시 확인해 주세요.`
      );
    }

    const initialRequired = relaxedMode ? 0 : required;
    allocations.set(pool.key, initialRequired);
    requiredMatches += initialRequired;
  }

  if (!relaxedMode && requiredMatches > courtCount) {
    throw new Error(
      "직전 라운드 휴식 인원을 모두 다음 라운드에 배치할 수 없습니다. 코트를 늘리거나 대진 생성 조건을 다시 확인해 주세요."
    );
  }

  let remainingMatches = courtCount - requiredMatches;

  while (remainingMatches > 0) {
    let bestPool: TeamBattlePool | null = null;
    let bestPriority = Number.NEGATIVE_INFINITY;

    for (const pool of pools) {
      const currentMatches = allocations.get(pool.key) ?? 0;
      const matchLimit = getTeamBattleMatchLimit(pool);

      if (currentMatches >= matchLimit) {
        continue;
      }

      const priority = getTeamBattlePoolMatchPriority(
        pool,
        currentMatches,
        states,
        previousRested,
        minGamesPerPlayer,
        randomOrder,
        overallAverageGames,
        fixedPairMap
      );

      if (priority > bestPriority) {
        bestPriority = priority;
        bestPool = pool;
      }
    }

    if (!bestPool || bestPriority === Number.NEGATIVE_INFINITY) {
      break;
    }

    allocations.set(
      bestPool.key,
      (allocations.get(bestPool.key) ?? 0) + 1
    );
    remainingMatches -= 1;
  }

  return allocations;
}

function chooseSelectedPlayersForTeamBattlePool(
  pool: TeamBattlePool,
  matchCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  const target = matchCount * 2;

  return {
    teamAPlayers: chooseSelectedPlayers(
      pool.teamAPlayers,
      target,
      states,
      previousRested,
      minGamesPerPlayer,
      randomOrder,
      fixedPairMap
    ),
    teamBPlayers: chooseSelectedPlayers(
      pool.teamBPlayers,
      target,
      states,
      previousRested,
      minGamesPerPlayer,
      randomOrder,
      fixedPairMap
    ),
  };
}

function generateCombinations<T>(
  items: T[],
  count: number
): T[][] {
  if (count === 0) {
    return [[]];
  }

  if (items.length < count) {
    return [];
  }

  const result: T[][] = [];

  for (let index = 0; index <= items.length - count; index += 1) {
    const head = items[index]!;
    const tails = generateCombinations(
      items.slice(index + 1),
      count - 1
    );

    for (const tail of tails) {
      result.push([head, ...tail]);
    }
  }

  return result;
}

function getPairingRandomBias(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  randomOrder: Map<string, number>
) {
  return (
    (randomOrder.get(teamAPlayers[0]!.playerId) ?? 0) * 0.001 +
    (randomOrder.get(teamAPlayers[1]!.playerId) ?? 0) * 0.002 +
    (randomOrder.get(teamBPlayers[0]!.playerId) ?? 0) * 0.003 +
    (randomOrder.get(teamBPlayers[1]!.playerId) ?? 0) * 0.004
  );
}

function isPairingValidForFixedPairs(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  fixedPairMap: Map<string, string>
) {
  for (const player of [...teamAPlayers, ...teamBPlayers]) {
    const partnerId = fixedPairMap.get(player.playerId);
    if (!partnerId) continue;
    const playerInA = teamAPlayers.some((p) => p.playerId === player.playerId);
    const partnerInA = teamAPlayers.some((p) => p.playerId === partnerId);
    const partnerInB = teamBPlayers.some((p) => p.playerId === partnerId);
    // ?뚰듃?덇? ??荑쇳뀩 ?덉뿉 ?덈뒗???ㅻⅨ ???諛곗젙??寃쎌슦 ??臾댄슚
    if ((partnerInA || partnerInB) && playerInA !== partnerInA) {
      return false;
    }
  }
  return true;
}

function evaluateQuartetPairings(
  quartet: InternalPlayer[],
  division: DivisionKey,
  label: string,
  courtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>,
  forbiddenPairKeys: Set<string>
): MatchCandidate | null {
  const [p1, p2, p3, p4] = quartet;
  const pairings: [InternalPlayer[], InternalPlayer[]][] = [
    [
      [p1, p2],
      [p3, p4],
    ],
    [
      [p1, p3],
      [p2, p4],
    ],
    [
      [p1, p4],
      [p2, p3],
    ],
  ];

  let bestCandidate: MatchCandidate | null = null;

  for (const [teamAPlayers, teamBPlayers] of pairings) {
    if (
      hasForbiddenPartnerPair(teamAPlayers, forbiddenPairKeys) ||
      hasForbiddenPartnerPair(teamBPlayers, forbiddenPairKeys)
    ) {
      continue;
    }
    // 怨좎젙 ?뚰듃?덇? ?ㅻⅨ ??쇰줈 遺꾨━?섎뒗 諛곗젙? 嫄대꼫?
    if (!isPairingValidForFixedPairs(teamAPlayers!, teamBPlayers!, fixedPairMap)) {
      continue;
    }
    const teamATotal = teamAPlayers.reduce(
      (total, player) => total + player.score,
      0
    );
    const teamBTotal = teamBPlayers.reduce(
      (total, player) => total + player.score,
      0
    );
    const balanceGap = Math.abs(teamATotal - teamBTotal);

    const partnerPenalty =
      (partnerHistory.get(
        keyForPair(
          teamAPlayers[0]!.playerId,
          teamAPlayers[1]!.playerId
        )
      ) ?? 0) *
        FIXED_PAIR_REPEAT_WEIGHT +
      (partnerHistory.get(
        keyForPair(
          teamBPlayers[0]!.playerId,
          teamBPlayers[1]!.playerId
        )
      ) ?? 0) *
        FIXED_PAIR_REPEAT_WEIGHT;

    const opponentPairs = [
      [teamAPlayers[0]!, teamBPlayers[0]!],
      [teamAPlayers[0]!, teamBPlayers[1]!],
      [teamAPlayers[1]!, teamBPlayers[0]!],
      [teamAPlayers[1]!, teamBPlayers[1]!],
    ];

    const opponentPenalty = opponentPairs.reduce(
      (total, [left, right]) =>
        total +
        (opponentHistory.get(
          keyForPair(left.playerId, right.playerId)
        ) ?? 0) *
          OPPONENT_REPEAT_WEIGHT,
      0
    );

    const scoreSpread =
      Math.max(...quartet.map((player) => player.score)) -
      Math.min(...quartet.map((player) => player.score));

    const fixedPairBalancePenalty = getFixedPairBalanceProtectionPenalty(
      teamAPlayers,
      teamBPlayers,
      teamATotal,
      teamBTotal,
      balanceGap,
      fixedPairMap
    );

    const score =
      balanceGap * BALANCE_GAP_WEIGHT +
      partnerPenalty +
      opponentPenalty +
      fixedPairBalancePenalty +
      scoreSpread * 3 +
      getPairingRandomBias(
        teamAPlayers,
        teamBPlayers,
        randomOrder
      );

    const candidate: MatchCandidate = {
      score,
      playerIds: quartet.map((player) => player.playerId),
      match: {
        courtNumber,
        label,
        division,
        balanceGap,
        teamA: {
          players: teamAPlayers,
          totalScore: teamATotal,
        },
        teamB: {
          players: teamBPlayers,
          totalScore: teamBTotal,
        },
      },
    };

    if (!bestCandidate || candidate.score < bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function wouldSplitFixedPair(
  selectedPlayers: InternalPlayer[],
  availablePlayers: InternalPlayer[],
  fixedPairMap: Map<string, string>
) {
  const selectedIds = new Set(selectedPlayers.map((player) => player.playerId));
  const availableIds = new Set(availablePlayers.map((player) => player.playerId));

  return selectedPlayers.some((player) => {
    const partnerId = fixedPairMap.get(player.playerId);
    return (
      partnerId !== undefined &&
      availableIds.has(partnerId) &&
      !selectedIds.has(partnerId)
    );
  });
}

function evaluateTeamBattlePairing(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  division: DivisionKey,
  label: string,
  courtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>,
  forbiddenPairKeys: Set<string>
): MatchCandidate | null {
  if (
    hasForbiddenPartnerPair(teamAPlayers, forbiddenPairKeys) ||
    hasForbiddenPartnerPair(teamBPlayers, forbiddenPairKeys)
  ) {
    return null;
  }
  if (
    !isPairingValidForFixedPairs(teamAPlayers, teamBPlayers, fixedPairMap)
  ) {
    return null;
  }

  const teamATotal = teamAPlayers.reduce(
    (total, player) => total + player.score,
    0
  );
  const teamBTotal = teamBPlayers.reduce(
    (total, player) => total + player.score,
    0
  );
  const balanceGap = Math.abs(teamATotal - teamBTotal);

  const partnerPenalty =
    (partnerHistory.get(
      keyForPair(teamAPlayers[0]!.playerId, teamAPlayers[1]!.playerId)
    ) ?? 0) *
      FIXED_PAIR_REPEAT_WEIGHT +
    (partnerHistory.get(
      keyForPair(teamBPlayers[0]!.playerId, teamBPlayers[1]!.playerId)
    ) ?? 0) *
      FIXED_PAIR_REPEAT_WEIGHT;

  const opponentPairs = [
    [teamAPlayers[0]!, teamBPlayers[0]!],
    [teamAPlayers[0]!, teamBPlayers[1]!],
    [teamAPlayers[1]!, teamBPlayers[0]!],
    [teamAPlayers[1]!, teamBPlayers[1]!],
  ];

  const opponentPenalty = opponentPairs.reduce(
    (total, [left, right]) =>
      total +
      (opponentHistory.get(keyForPair(left.playerId, right.playerId)) ?? 0) *
        OPPONENT_REPEAT_WEIGHT,
    0
  );

  const quartet = [...teamAPlayers, ...teamBPlayers];
  const scoreSpread =
    Math.max(...quartet.map((player) => player.score)) -
    Math.min(...quartet.map((player) => player.score));

  const fixedPairBalancePenalty = getFixedPairBalanceProtectionPenalty(
    teamAPlayers,
    teamBPlayers,
    teamATotal,
    teamBTotal,
    balanceGap,
    fixedPairMap
  );

  const score =
    balanceGap * BALANCE_GAP_WEIGHT +
    partnerPenalty +
    opponentPenalty +
    fixedPairBalancePenalty +
    scoreSpread * 3 +
    getPairingRandomBias(teamAPlayers, teamBPlayers, randomOrder);

  return {
    score,
    playerIds: quartet.map((player) => player.playerId),
    match: {
      courtNumber,
      label,
      division,
      balanceGap,
      teamA: {
        players: teamAPlayers,
        totalScore: teamATotal,
      },
      teamB: {
        players: teamBPlayers,
        totalScore: teamBTotal,
      },
    },
  };
}

function buildRoundMatchesForTeamBattlePool(
  pool: TeamBattlePool,
  selectedTeamAPlayers: InternalPlayer[],
  selectedTeamBPlayers: InternalPlayer[],
  firstCourtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairMap: Map<string, string>,
  forbiddenPairKeys: Set<string>
) {
  const remainingTeamA = shuffleArray(selectedTeamAPlayers, random);
  const remainingTeamB = shuffleArray(selectedTeamBPlayers, random);
  const matches: SessionBracketMatch[] = [];
  let nextCourtNumber = firstCourtNumber;

  while (remainingTeamA.length >= 2 && remainingTeamB.length >= 2) {
    const teamACombos = shuffleArray(
      generateCombinations(remainingTeamA, 2),
      random
    );
    const teamBCombos = shuffleArray(
      generateCombinations(remainingTeamB, 2),
      random
    );

    const candidates: MatchCandidate[] = [];

    for (const teamAPlayers of teamACombos) {
      if (
        wouldSplitFixedPair(teamAPlayers, remainingTeamA, fixedPairMap)
      ) {
        continue;
      }

      for (const teamBPlayers of teamBCombos) {
        if (
          wouldSplitFixedPair(teamBPlayers, remainingTeamB, fixedPairMap)
        ) {
          continue;
        }

        const candidate = evaluateTeamBattlePairing(
          teamAPlayers,
          teamBPlayers,
          pool.key,
          pool.label,
          nextCourtNumber,
          partnerHistory,
          opponentHistory,
          randomOrder,
          fixedPairMap,
          forbiddenPairKeys
        );

        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    const bestCandidate = chooseCandidateFromTopPool(
      candidates,
      random
    );

    if (!bestCandidate) {
      throw new Error(
        `${pool.label} 대진을 구성하지 못했습니다. 팀 배정 또는 고정 파트너 설정을 다시 확인해 주세요.`
      );
    }

    matches.push(bestCandidate.match);
    nextCourtNumber += 1;

    const selectedIdSet = new Set(bestCandidate.playerIds);
    for (let index = remainingTeamA.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(remainingTeamA[index]!.playerId)) {
        remainingTeamA.splice(index, 1);
      }
    }
    for (let index = remainingTeamB.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(remainingTeamB[index]!.playerId)) {
        remainingTeamB.splice(index, 1);
      }
    }
  }

  return matches.map((match, index) => ({
    ...match,
    courtNumber: firstCourtNumber + index,
  }));
}

function calculateMixedMatchCount(maleCount: number, femaleCount: number): number {
  // 엄격한 4의 배수 조건 없이 최대한 많은 혼복 코트 수를 반환
  return Math.min(Math.floor(maleCount / 2), Math.floor(femaleCount / 2));
}

function evaluateMixedGenderPairing(
  maleCouple: InternalPlayer[],
  femaleCouple: InternalPlayer[],
  division: DivisionKey,
  label: string,
  courtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>,
  forbiddenPairKeys: Set<string>
): MatchCandidate | null {
  const [m1, m2] = maleCouple;
  const [f1, f2] = femaleCouple;
  if (!m1 || !m2 || !f1 || !f2) return null;

  // 혼복 팀 배정만 허용: (남+여) vs (남+여)
  const pairings: [InternalPlayer[], InternalPlayer[]][] = [
    [[m1, f1], [m2, f2]],
    [[m1, f2], [m2, f1]],
  ];

  let bestCandidate: MatchCandidate | null = null;

  for (const [teamAPlayers, teamBPlayers] of pairings) {
    if (
      hasForbiddenPartnerPair(teamAPlayers, forbiddenPairKeys) ||
      hasForbiddenPartnerPair(teamBPlayers, forbiddenPairKeys)
    ) {
      continue;
    }
    if (!isPairingValidForFixedPairs(teamAPlayers, teamBPlayers, fixedPairMap)) {
      continue;
    }

    const teamATotal = teamAPlayers.reduce((total, p) => total + p.score, 0);
    const teamBTotal = teamBPlayers.reduce((total, p) => total + p.score, 0);
    const balanceGap = Math.abs(teamATotal - teamBTotal);
    const quartet = [...teamAPlayers, ...teamBPlayers];
    const scoreSpread =
      Math.max(...quartet.map((p) => p.score)) -
      Math.min(...quartet.map((p) => p.score));

    const partnerPenalty =
      (partnerHistory.get(
        keyForPair(teamAPlayers[0]!.playerId, teamAPlayers[1]!.playerId)
      ) ?? 0) *
        FIXED_PAIR_REPEAT_WEIGHT +
      (partnerHistory.get(
        keyForPair(teamBPlayers[0]!.playerId, teamBPlayers[1]!.playerId)
      ) ?? 0) *
        FIXED_PAIR_REPEAT_WEIGHT;

    const opponentPenalty = [
      [teamAPlayers[0]!, teamBPlayers[0]!],
      [teamAPlayers[0]!, teamBPlayers[1]!],
      [teamAPlayers[1]!, teamBPlayers[0]!],
      [teamAPlayers[1]!, teamBPlayers[1]!],
    ].reduce(
      (total, [left, right]) =>
        total +
        (opponentHistory.get(keyForPair(left.playerId, right.playerId)) ?? 0) *
          OPPONENT_REPEAT_WEIGHT,
      0
    );

    const fixedPairBalancePenalty = getFixedPairBalanceProtectionPenalty(
      teamAPlayers,
      teamBPlayers,
      teamATotal,
      teamBTotal,
      balanceGap,
      fixedPairMap
    );

    const score =
      balanceGap * BALANCE_GAP_WEIGHT +
      partnerPenalty +
      opponentPenalty +
      fixedPairBalancePenalty +
      scoreSpread * 3 +
      getPairingRandomBias(teamAPlayers, teamBPlayers, randomOrder);

    const candidate: MatchCandidate = {
      score,
      playerIds: quartet.map((p) => p.playerId),
      match: {
        courtNumber,
        label,
        division,
        balanceGap,
        teamA: { players: teamAPlayers, totalScore: teamATotal },
        teamB: { players: teamBPlayers, totalScore: teamBTotal },
      },
    };

    if (!bestCandidate || candidate.score < bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function buildStandardMatchesFromPool(
  pool: Pool,
  players: InternalPlayer[],
  firstCourtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairMap: Map<string, string>,
  forbiddenPairKeys: Set<string>
): { matches: SessionBracketMatch[]; nextCourtNumber: number } {
  const ordered = [...players];
  const matches: SessionBracketMatch[] = [];
  let nextCourtNumber = firstCourtNumber;

  while (ordered.length >= 4) {
    const anchorIndex = Math.floor(random() * ordered.length);
    const anchor = ordered[anchorIndex]!;
    const remaining = ordered.filter((_, index) => index !== anchorIndex);
    const combos = shuffleArray(generateCombinations(remaining, 3), random);
    const candidates: MatchCandidate[] = [];

    for (const combo of combos) {
      const quartet = [anchor, ...combo];
      const quartetIds = new Set(quartet.map((p) => p.playerId));
      const splitsPair = quartet.some((player) => {
        const partnerId = fixedPairMap.get(player.playerId);
        return (
          partnerId !== undefined &&
          ordered.some((p) => p.playerId === partnerId) &&
          !quartetIds.has(partnerId)
        );
      });
      if (splitsPair) continue;

      const candidate = evaluateQuartetPairings(
        quartet,
        pool.key,
        pool.label,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        fixedPairMap,
        forbiddenPairKeys
      );
      if (candidate) candidates.push(candidate);
    }

    const bestCandidate = chooseCandidateFromTopPool(candidates, random);
    if (!bestCandidate) {
      throw new Error(
        `${pool.label} 대진을 구성하지 못했습니다. 고정 파트너 설정 또는 참가 인원을 다시 확인해 주세요.`
      );
    }

    const selectedIdSet = new Set(bestCandidate.playerIds);
    const flippedMatch =
      random() < 0.5
        ? bestCandidate.match
        : {
            ...bestCandidate.match,
            teamA: bestCandidate.match.teamB,
            teamB: bestCandidate.match.teamA,
          };

    matches.push(flippedMatch);
    nextCourtNumber += 1;

    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(ordered[index]!.playerId)) {
        ordered.splice(index, 1);
      }
    }
  }

  return { matches, nextCourtNumber };
}

function adjustSelectedForGenderBalance(
  selected: InternalPlayer[],
  poolPlayers: InternalPlayer[],
  previousRested: Set<string>,
  states: Map<string, PlayerState>,
  fixedPairMap: Map<string, string>
): InternalPlayer[] {
  const females = selected.filter((p) => p.gender === "여");
  const males = selected.filter((p) => p.gender === "남");
  const minCount = Math.min(males.length, females.length);

  if (minCount === 0 || minCount % 2 === 0) return selected;

  const selectedIds = new Set(selected.map((p) => p.playerId));
  const isSmaller = males.length <= females.length ? "남" : "여";
  const isLarger = isSmaller === "남" ? "여" : "남";

  const smallerSelected = selected.filter((p) => p.gender === isSmaller);
  const largerResting = poolPlayers.filter(
    (p) =>
      !selectedIds.has(p.playerId) &&
      p.gender === isLarger &&
      !previousRested.has(p.playerId)
  );

  if (largerResting.length === 0) return selected;

  // fixed pair 멤버는 교체 대상에서 제외 (한 명만 빠지면 pair가 깨짐)
  const swappableSmaller = smallerSelected.filter((s) => {
    if (previousRested.has(s.playerId)) return false;
    const partnerId = fixedPairMap.get(s.playerId);
    return !partnerId || !selectedIds.has(partnerId);
  });
  if (swappableSmaller.length === 0) return selected;

  const playerOut = swappableSmaller.sort(
    (a, b) =>
      (states.get(b.playerId)?.games ?? 0) -
      (states.get(a.playerId)?.games ?? 0)
  )[0]!;
  const outGames = states.get(playerOut.playerId)?.games ?? 0;
  // playerIn은 playerOut보다 경기수가 적을 때만 교체 — 더 많이 뛴 사람을 넣으면 경기수 불균형 심화
  const playerIn = largerResting
    .filter((p) => (states.get(p.playerId)?.games ?? 0) < outGames)
    .sort(
      (a, b) =>
        (states.get(a.playerId)?.games ?? 0) -
        (states.get(b.playerId)?.games ?? 0)
    )[0];

  if (!playerIn) return selected;

  return selected
    .filter((p) => p.playerId !== playerOut.playerId)
    .concat([playerIn]);
}
function buildRoundMatchesForPool(
  pool: Pool,
  selectedPlayers: InternalPlayer[],
  firstCourtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairMap: Map<string, string>,
  forbiddenPairKeys: Set<string>,
  mixedAllocation?: MixedPriorityAllocation
) {
  if (mixedAllocation && pool.key === "ALL") {
    const matches: SessionBracketMatch[] = [];
    let nextCourtNumber = firstCourtNumber;
    let remainingMen = shuffleArray(
      mixedAllocation.selectedPlayers.filter((player) => player.gender === "남"),
      random
    );
    let remainingWomen = shuffleArray(
      mixedAllocation.selectedPlayers.filter((player) => player.gender === "여"),
      random
    );

    for (let index = 0; index < mixedAllocation.mixedMatches; index += 1) {
      const candidates: MatchCandidate[] = [];
      for (const menPair of shuffleArray(generateCombinations(remainingMen, 2), random)) {
        if (wouldSplitFixedPair(menPair, remainingMen, fixedPairMap)) continue;
        for (const womenPair of shuffleArray(generateCombinations(remainingWomen, 2), random)) {
          if (wouldSplitFixedPair(womenPair, remainingWomen, fixedPairMap)) continue;
          const quartet = [...menPair, ...womenPair];
          const quartetIds = new Set(quartet.map((player) => player.playerId));
          const remainingIds = new Set(
            [...remainingMen, ...remainingWomen].map((player) => player.playerId)
          );
          const splitsFixedPair = quartet.some((player) => {
            const partnerId = fixedPairMap.get(player.playerId);
            return partnerId && remainingIds.has(partnerId) && !quartetIds.has(partnerId);
          });
          if (splitsFixedPair) continue;
          const candidate = evaluateMixedGenderPairing(
            menPair,
            womenPair,
            pool.key,
            "혼복 우선",
            nextCourtNumber,
            partnerHistory,
            opponentHistory,
            randomOrder,
            fixedPairMap,
            forbiddenPairKeys
          );
          if (candidate) candidates.push(candidate);
        }
      }
      const best = chooseCandidateFromTopPool(candidates, random);
      if (!best) {
        throw new Error("혼복 우선 대진을 구성하지 못했습니다. 고정 파트너 또는 참가 인원을 확인해 주세요.");
      }
      matches.push(best.match);
      nextCourtNumber += 1;
      const usedIds = new Set(best.playerIds);
      remainingMen = remainingMen.filter((player) => !usedIds.has(player.playerId));
      remainingWomen = remainingWomen.filter((player) => !usedIds.has(player.playerId));
    }

    for (const [sameGenderPlayers, division, label] of [
      [remainingMen, "MEN", "남복"],
      [remainingWomen, "WOMEN", "여복"],
    ] as const) {
      const result = buildStandardMatchesFromPool(
        { ...pool, key: division, label },
        sameGenderPlayers,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        random,
        fixedPairMap,
        forbiddenPairKeys
      );
      matches.push(...result.matches);
      nextCourtNumber = result.nextCourtNumber;
    }

    return shuffleArray(matches, random).map((match, index) => ({
      ...match,
      courtNumber: firstCourtNumber + index,
    }));
  }

  // 랜덤 복식(ALL)은 성별 구성에 우선순위를 두지 않는다.
  // 남복/여복 분리 모드는 이미 buildPools에서 성별별 풀로 나뉜다.
  const result = buildStandardMatchesFromPool(
    pool,
    shuffleArray(selectedPlayers, random),
    firstCourtNumber,
    partnerHistory,
    opponentHistory,
    randomOrder,
    random,
    fixedPairMap,
    forbiddenPairKeys
  );

  return shuffleArray(result.matches, random).map((match, index) => ({
    ...match,
    courtNumber: firstCourtNumber + index,
  }));
}

function registerMatchHistory(
  match: SessionBracketMatch,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>
) {
  const teamAPlayers = match.teamA.players;
  const teamBPlayers = match.teamB.players;

  const teamAPartnerKey = keyForPair(
    teamAPlayers[0]!.playerId,
    teamAPlayers[1]!.playerId
  );
  const teamBPartnerKey = keyForPair(
    teamBPlayers[0]!.playerId,
    teamBPlayers[1]!.playerId
  );

  partnerHistory.set(
    teamAPartnerKey,
    (partnerHistory.get(teamAPartnerKey) ?? 0) + 1
  );
  partnerHistory.set(
    teamBPartnerKey,
    (partnerHistory.get(teamBPartnerKey) ?? 0) + 1
  );

  for (const left of teamAPlayers) {
    for (const right of teamBPlayers) {
      const opponentKey = keyForPair(left.playerId, right.playerId);
      opponentHistory.set(
        opponentKey,
        (opponentHistory.get(opponentKey) ?? 0) + 1
      );
    }
  }
}

function allPlayersSatisfied(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  minGamesPerPlayer: number
) {
  return players.every((player) => {
    const state = states.get(player.playerId)!;
    return state.games >= minGamesPerPlayer;
  });
}

function getEntryMap(players: InternalPlayer[]) {
  return new Map(players.map((player) => [player.playerId, player]));
}

function validateGenerationInput(
  players: InternalPlayer[],
  config: SessionBracketConfig
) {
  if (players.length < 4) {
    throw new Error(
      "자동 대진표는 최소 4명 이상의 참석 확정 인원이 있어야 생성할 수 있습니다."
    );
  }

  if (config.courtCount < 1) {
    throw new Error("사용 코트 수는 1개 이상이어야 합니다.");
  }

  if (config.minGamesPerPlayer < 1) {
    throw new Error("최소 경기 수는 1경기 이상이어야 합니다.");
  }

  if (
    config.doublesMode === "MIXED_PRIORITY" &&
    players.some((player) => player.gender !== "남" && player.gender !== "여")
  ) {
    throw new Error("혼복 우선 대진은 모든 참가자의 성별 정보가 필요합니다.");
  }

  const maxPlayersPerRound = config.courtCount * 4;

  if (!config.relaxedMode && players.length > maxPlayersPerRound * 2) {
    throw new Error(
      "현재 코트 수로는 모든 참가자에게 연속 휴식 없이 대진표를 만들 수 없습니다. 코트를 늘리거나 참가 인원을 다시 확인해 주세요."
    );
  }
}

function validateTeamBattleInput(
  players: InternalPlayer[],
  config: SessionBracketConfig,
  teamAssignments: Record<string, "A" | "B">,
  fixedPairMap: Map<string, string>
) {
  validateGenerationInput(players, config);

  const unassignedPlayers = players.filter(
    (player) => !teamAssignments[player.playerId]
  );
  if (unassignedPlayers.length > 0) {
    throw new Error(
      `팀 대항 자동대진은 모든 참가자의 팀 배정이 필요합니다. ${unassignedPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 팀을 먼저 선택해 주세요.`
    );
  }

  const teamAPlayers = players.filter(
    (player) => teamAssignments[player.playerId] === "A"
  );
  const teamBPlayers = players.filter(
    (player) => teamAssignments[player.playerId] === "B"
  );

  if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
    throw new Error(
      "팀 대항 자동대진은 A팀과 B팀에 각각 최소 2명 이상 있어야 생성할 수 있습니다."
    );
  }

  for (const [playerId, partnerId] of fixedPairMap.entries()) {
    if (playerId > partnerId) {
      continue;
    }

    if (teamAssignments[playerId] !== teamAssignments[partnerId]) {
      throw new Error(
        "고정 파트너는 같은 팀 안에서만 설정할 수 있습니다. 팀 배정 또는 고정 파트너를 다시 확인해 주세요."
      );
    }

    if (config.separateByGender) {
      const player = players.find((entry) => entry.playerId === playerId);
      const partner = players.find((entry) => entry.playerId === partnerId);
      if (player && partner && player.gender !== partner.gender) {
        throw new Error(
          "남복/여복 분리 생성에서는 고정 파트너도 같은 성별 안에서만 설정할 수 있습니다."
        );
      }
    }
  }
}

function buildSummary(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  config: SessionBracketConfig,
  rounds: SessionBracketRound[],
  warnings: string[]
): SessionBracketSummary {
  const playerStats: SessionBracketPlayerStat[] = players
    .map((player) => {
      const state = states.get(player.playerId)!;
      return {
        ...player,
        games: state.games,
        rests: state.rests,
      };
    })
    .sort((left, right) => {
      if (left.games !== right.games) {
        return right.games - left.games;
      }

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.name.localeCompare(right.name, "ko");
    });

  return {
    totalPlayers: players.length,
    totalRounds: rounds.length,
    totalMatches: rounds.reduce(
      (total, round) => total + round.matches.length,
      0
    ),
    warnings,
    playerStats,
  };
}

function generateTeamBattleRounds(
  players: InternalPlayer[],
  config: SessionBracketConfig,
  teamAssignments: Record<string, "A" | "B">,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairRules: FixedPairRule[]
) {
  const teamLabels = config.teamLabels ?? { A: "팀A", B: "팀B" };
  const pools = buildTeamBattlePools(
    players,
    config.separateByGender,
    teamAssignments,
    teamLabels
  );
  const playerEntryMap = getEntryMap(players);
  const states = new Map<string, PlayerState>(
    players.map((player) => [
      player.playerId,
      {
        games: 0,
        rests: 0,
        lastPlayedRound: 0,
      },
    ])
  );
  const partnerHistory = new Map<string, number>();
  const opponentHistory = new Map<string, number>();
  const rounds: SessionBracketRound[] = [];
  const warnings: string[] = [];
  let previousRested = new Set<string>();

  const teamACount = players.filter(
    (player) => teamAssignments[player.playerId] === "A"
  ).length;
  const teamBCount = players.filter(
    (player) => teamAssignments[player.playerId] === "B"
  ).length;
  if (teamACount !== teamBCount) {
    warnings.push(
      `${teamLabels.A} ${teamACount}명 / ${teamLabels.B} ${teamBCount}명으로 인원 차이가 있어 일부 선수의 경기 수가 다를 수 있습니다.`
    );
  }

  for (const pool of pools) {
    if (pool.teamAPlayers.length !== pool.teamBPlayers.length) {
      warnings.push(
        `${pool.label} 인원 차이로 휴식자의 경기 수가 균등하지 않을 수 있습니다.`
      );
    }
  }

  const estimatedRounds = Math.ceil(
    (players.length * config.minGamesPerPlayer) /
      Math.max(1, config.courtCount * 4)
  );
  const maxRounds = Math.max(
    estimatedRounds + players.length,
    config.minGamesPerPlayer * 3,
    6
  );

  for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
    if (
      rounds.length > 0 &&
      allPlayersSatisfied(players, states, config.minGamesPerPlayer)
    ) {
      break;
    }

    const { activePairMap, forbiddenPairKeys } = getFixedPairConstraints(
      fixedPairRules,
      partnerHistory
    );
    const allocations = allocateMatchesForRoundTeamBattle(
      pools,
      config.courtCount,
      states,
      previousRested,
      config.minGamesPerPlayer,
      randomOrder,
      activePairMap,
      config.relaxedMode
    );
    const roundMatches: SessionBracketMatch[] = [];
    const restedPlayerIds = new Set<string>();
    let nextCourtNumber = 1;

    for (const pool of pools) {
      const matchCount = allocations.get(pool.key) ?? 0;
      const selectedPlayers = chooseSelectedPlayersForTeamBattlePool(
        pool,
        matchCount,
        states,
        previousRested,
        config.minGamesPerPlayer,
        randomOrder,
        activePairMap
      );

      const poolMatches = buildRoundMatchesForTeamBattlePool(
        pool,
        selectedPlayers.teamAPlayers,
        selectedPlayers.teamBPlayers,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        random,
        activePairMap,
        forbiddenPairKeys
      );

      const actualPlayingIds = new Set(
        poolMatches.flatMap((m) => [...m.teamA.players, ...m.teamB.players]).map((p) => p.playerId)
      );
      for (const player of [...pool.teamAPlayers, ...pool.teamBPlayers]) {
        if (!actualPlayingIds.has(player.playerId)) restedPlayerIds.add(player.playerId);
      }

      roundMatches.push(...poolMatches);
      nextCourtNumber += poolMatches.length;
    }

    if (roundMatches.length === 0) {
      break;
    }

    for (const match of roundMatches) {
      registerMatchHistory(match, partnerHistory, opponentHistory);
    }

    for (const player of players) {
      const state = states.get(player.playerId)!;

      if (restedPlayerIds.has(player.playerId)) {
        state.rests += 1;
      } else {
        state.games += 1;
        state.lastPlayedRound = roundNumber;
      }
    }

    previousRested = restedPlayerIds;

    rounds.push({
      roundNumber,
      matches: roundMatches,
      restingPlayers: [...restedPlayerIds]
        .map((playerId) => playerEntryMap.get(playerId)!)
        .sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }

          return left.name.localeCompare(right.name, "ko");
        }),
    });
  }

  if (
    !config.relaxedMode &&
    !allPlayersSatisfied(players, states, config.minGamesPerPlayer)
  ) {
    throw new Error(
      "현재 조건으로는 모든 참가자에게 최소 경기 수를 배정할 수 없습니다. 코트 수나 참가 인원을 다시 확인해 주세요."
    );
  }

  assertFixedPairTargetsSatisfied(fixedPairRules, partnerHistory, players);

  for (const player of players) {
    const state = states.get(player.playerId)!;

    if (state.games > config.minGamesPerPlayer + 1) {
      warnings.push(
        `${player.name} 선수는 경기 수가 다른 인원보다 많게 배정되었습니다.`
      );
    }
  }

  return {
    rounds,
    summary: buildSummary(players, states, config, rounds, warnings),
  };
}

// 급수 구분 대진 코트 배분.
// need > 0: 필수 활성 그룹 (minGames 미달 선수 존재)
// need == -1: filler 그룹 (minGames 달성, minGames+1 미달 — 코트 채우기 보조)
// need == -2: super-filler 그룹 (minGames+1 달성, 다른 그룹이 아직 활성 — 빈 코트 채우기)
// need == 0: 완전 완료 — 배정 없음
//
// 핵심 원칙:
//   모든 eligible 그룹(need ≠ 0)에 credit 기반 선수 비율 배분을 통일 적용.
//   active/filler 구분 없이 선수 수 비율로 장기적으로 동일한 1인당 게임수 보장.
//   연속 휴식 방지 최솟값은 사후 보정으로만 적용.
function allocateCourtsForLevelGroups(
  groups: Array<{ id: string; need: number; maxCourts: number; prevRestedCount: number; playerCount: number; courtCredit: number }>,
  totalCourts: number
): { courts: Map<string, number>; credits: Map<string, number> } {
  const courts = new Map<string, number>(groups.map((g) => [g.id, 0]));
  const credits = new Map<string, number>(groups.map((g) => [g.id, g.courtCredit]));

  // 완전 완료(need=0)는 배정 제외
  const eligibleGroups = groups.filter((g) => g.need !== 0 && g.maxCourts >= 1);
  if (eligibleGroups.length === 0) return { courts, credits };

  const totalPlayers = eligibleGroups.reduce((s, g) => s + g.playerCount, 0);

  // 연속 휴식 방지 최솟값 계산
  const minCourts = new Map<string, number>(
    eligibleGroups.map((g) => [
      g.id,
      Math.min(Math.ceil(g.prevRestedCount / 4), g.maxCourts),
    ])
  );
  const totalMin = [...minCourts.values()].reduce((s, v) => s + v, 0);

  if (totalMin > totalCourts) {
    // 최솟값 합이 전체 코트 초과 → 이전 휴식자 많은 그룹 우선 보장
    const sorted = [...eligibleGroups].sort((a, b) => b.prevRestedCount - a.prevRestedCount);
    let rem = totalCourts;
    for (const g of sorted) {
      if (rem <= 0) break;
      const min = minCourts.get(g.id) ?? 1;
      courts.set(g.id, Math.min(min, rem));
      rem -= courts.get(g.id)!;
    }
    // 이 경우에도 credit 업데이트
    for (const g of eligibleGroups) {
      const fairShare = (g.playerCount / totalPlayers) * totalCourts;
      credits.set(g.id, g.courtCredit + fairShare - (courts.get(g.id) ?? 0));
    }
    return { courts, credits };
  }

  // credit 기반 비례 배분:
  //   effectiveCredit = 이전 잔여 credit + 이번 라운드 공정 분담량
  //   → 장기적으로 선수 비율에 비례하는 코트를 정확히 배정 (Deficit Round Robin)
  const shares = eligibleGroups.map((g) => {
    const fairShare = (g.playerCount / totalPlayers) * totalCourts;
    return {
      id: g.id,
      maxCourts: g.maxCourts,
      fairShare,
      effectiveCredit: g.courtCredit + fairShare,
    };
  });

  let allocated = 0;
  for (const s of shares) {
    const c = Math.min(Math.floor(s.effectiveCredit), s.maxCourts);
    courts.set(s.id, c);
    allocated += c;
  }

  // 소수점 나머지를 effectiveCredit fraction이 큰 순서로 1씩 추가 배분
  // 한 그룹이 maxCourts 한도로 못 받은 크레딧이 있을 경우 다른 그룹이 흡수하도록 다회 패스
  let remaining = totalCourts - allocated;
  const sortedByFrac = [...shares].sort((a, b) => (b.effectiveCredit % 1) - (a.effectiveCredit % 1));
  let passAdded = true;
  while (remaining > 0 && passAdded) {
    passAdded = false;
    for (const s of sortedByFrac) {
      if (remaining <= 0) break;
      const cur = courts.get(s.id) ?? 0;
      if (cur < s.maxCourts) { courts.set(s.id, cur + 1); remaining--; passAdded = true; }
    }
  }

  // 사후 보정: 최솟값(연속휴식 방지) 미달 그룹이 있으면 잉여 그룹에서 차감
  for (const g of eligibleGroups) {
    const min = minCourts.get(g.id) ?? 1;
    const cur = courts.get(g.id) ?? 0;
    if (cur < min) {
      let deficit = min - cur;
      courts.set(g.id, min);
      const donors = [...eligibleGroups]
        .filter((d) => d.id !== g.id)
        .sort((a, b) => {
          const sA = (courts.get(a.id) ?? 0) - (minCourts.get(a.id) ?? 1);
          const sB = (courts.get(b.id) ?? 0) - (minCourts.get(b.id) ?? 1);
          return sB - sA;
        });
      for (const donor of donors) {
        if (deficit <= 0) break;
        const donorCur = courts.get(donor.id) ?? 0;
        const donorMin = minCourts.get(donor.id) ?? 1;
        const canDonate = Math.max(0, donorCur - donorMin);
        const donated = Math.min(canDonate, deficit);
        if (donated > 0) {
          courts.set(donor.id, donorCur - donated);
          deficit -= donated;
        }
      }
    }
  }

  // credit 업데이트: effectiveCredit - 실제 배정 코트
  for (const s of shares) {
    credits.set(s.id, s.effectiveCredit - (courts.get(s.id) ?? 0));
  }

  return { courts, credits };
}

export type LevelGroupBracketInput = {
  groupId: string;
  groupName: string;
  players: SessionBracketPlayerInput[];
  fixedPairs: Array<[string, string, number?]>;
};

export type LevelGroupBracketResult = {
  groupId: string;
  rounds: SessionBracketRound[];
  summary: SessionBracketSummary;
};

export function generateSessionBracketLevelGroups(
  groupInputs: LevelGroupBracketInput[],
  totalCourtCount: number,
  minGamesPerPlayer: number,
  separateByGender: boolean,
  relaxedMode: boolean,
  seed: number,
  doublesModeInput?: DoublesMode
): LevelGroupBracketResult[] {
  const doublesMode = normalizeDoublesMode(doublesModeInput, separateByGender);
  const isGenderSeparated = doublesMode === "GENDER_SEPARATED";
  type GroupState = {
    groupId: string;
    groupName: string;
    players: InternalPlayer[];
    pools: Pool[];
    states: Map<string, PlayerState>;
    partnerHistory: Map<string, number>;
    opponentHistory: Map<string, number>;
    previousRested: Set<string>;
    randomOrder: Map<string, number>;
    random: RandomFn;
    fixedPairRules: FixedPairRule[];
    playerEntryMap: Map<string, InternalPlayer>;
    rounds: SessionBracketRound[];
    warnings: string[];
    courtCredit: number; // 그룹 간 게임수 균등화를 위한 누적 코트 크레딧
  };

  const baseRandom = createSeededRandom(seed);

  const groupStates: GroupState[] = groupInputs.map((input) => {
    const groupSeed = Math.floor(baseRandom() * 2147483647) + 1;
    const random = createSeededRandom(groupSeed);
    const players = shuffleArray(
      input.players.map((p) => createPlayerEntry(p, isGenderSeparated)),
      random
    );
    if (
      doublesMode === "MIXED_PRIORITY" &&
      players.some((player) => player.gender !== "남" && player.gender !== "여")
    ) {
      throw new Error(`"${input.groupName}" 혼복 우선 대진은 모든 참가자의 성별 정보가 필요합니다.`);
    }
    const playerIdSet = new Set(players.map((p) => p.playerId));
    const fixedPairRules = buildFixedPairRules(
      normalizeFixedPairs(input.fixedPairs, minGamesPerPlayer),
      playerIdSet
    );
    const randomOrder = new Map(players.map((p) => [p.playerId, random()]));

    return {
      groupId: input.groupId,
      groupName: input.groupName,
      players,
      pools: buildPools(players, isGenderSeparated),
      states: new Map(
        players.map((p) => [p.playerId, { games: 0, rests: 0, lastPlayedRound: 0 }])
      ),
      partnerHistory: new Map(),
      opponentHistory: new Map(),
      previousRested: new Set(),
      randomOrder,
      random,
      fixedPairRules,
      playerEntryMap: getEntryMap(players),
      rounds: [],
      warnings: [],
      courtCredit: 0,
    };
  });

  const maxRoundsEstimate = Math.max(
    ...groupStates.map((gs) =>
      Math.ceil(
        (gs.players.length * minGamesPerPlayer) / Math.max(1, totalCourtCount * 4)
      ) * 4
    ),
    minGamesPerPlayer * 5,
    40
  );

  for (let roundNumber = 1; roundNumber <= maxRoundsEstimate; roundNumber++) {
    // 잔여 경기 수 계산
    // need > 0: 필수 활성 (minGames 미달 선수 있음)
    // need == -1: filler (minGames 달성, minGames+1 미달 — 코트 채우기 보조)
    // need == -2: super-filler (minGames+1 달성, 다른 그룹 아직 활성 — 빈 코트 채우기)
    // need == 0: 완전 완료 (다른 그룹도 모두 완료)
    const rawNeeds = groupStates.map((gs) => {
      if (!allPlayersSatisfied(gs.players, gs.states, minGamesPerPlayer)) {
        return gs.players.reduce((sum, p) => {
          const state = gs.states.get(p.playerId)!;
          return sum + Math.max(0, minGamesPerPlayer - state.games);
        }, 0);
      }
      if (!allPlayersSatisfied(gs.players, gs.states, minGamesPerPlayer + 1)) {
        return -1; // filler
      }
      return 0; // minGames+1 달성 (잠정 완료)
    });

    // 모든 그룹이 minGames+1 달성(0)이면 종료
    const allDone = rawNeeds.every((n) => n <= 0);
    if (roundNumber > 1 && allDone) break;

    // 잠정 완료(0) 그룹 중 다른 그룹이 아직 활성/filler이면 super-filler(-2)로 전환
    // → 빈 코트를 채워 "모든 라운드 전체 코트 활용" 원칙 유지
    const anyStillActive = rawNeeds.some((n) => n > 0 || n === -1);
    const groupNeeds = rawNeeds.map((n) => (n === 0 && anyStillActive ? -2 : n));

    // 라운드별 동적 코트 배분 (credit 기반 선수 비율 배분 + 연속 휴식 방지 보정)
    const { courts: courtAllocations, credits: updatedCredits } = allocateCourtsForLevelGroups(
      groupStates.map((gs, i) => ({
        id: gs.groupId,
        need: groupNeeds[i]!,
        maxCourts:
          doublesMode === "MIXED_PRIORITY"
            ? Math.max(...gs.pools.map((pool) => getPoolMatchLimit(pool, doublesMode)))
            : Math.floor(gs.players.length / 4),
        prevRestedCount: gs.previousRested.size,
        playerCount: gs.players.length,
        courtCredit: gs.courtCredit,
      })),
      totalCourtCount
    );

    // credit 업데이트
    for (const gs of groupStates) {
      gs.courtCredit = updatedCredits.get(gs.groupId) ?? gs.courtCredit;
    }

    // 어떤 그룹도 코트를 받지 못하면 종료 (무한 루프 방지)
    const totalAllocated = [...courtAllocations.values()].reduce((s, v) => s + v, 0);
    if (totalAllocated === 0) break;

    let anyMatchThisRound = false;

    for (let gi = 0; gi < groupStates.length; gi++) {
      const gs = groupStates[gi]!;
      const courts = courtAllocations.get(gs.groupId) ?? 0;
      if (courts === 0) continue;

      // filler/super-filler 그룹은 목표 경기수를 높여 내부 우선순위 계산
      const effectiveMinGames =
        groupNeeds[gi] === -1 ? minGamesPerPlayer + 1 :
        groupNeeds[gi] === -2 ? minGamesPerPlayer + 2 :
        minGamesPerPlayer;
      const { activePairMap, forbiddenPairKeys } = getFixedPairConstraints(
        gs.fixedPairRules,
        gs.partnerHistory
      );

      // 이 그룹의 1라운드 생성
      let allocations: Map<DivisionKey, number>;
      try {
        allocations = allocateMatchesForRound(
          gs.pools,
          courts,
          gs.states,
          gs.previousRested,
          effectiveMinGames,
          gs.randomOrder,
          relaxedMode,
          doublesMode
        );
      } catch {
        try {
          allocations = allocateMatchesForRound(
            gs.pools,
            courts,
            gs.states,
            gs.previousRested,
            effectiveMinGames,
            gs.randomOrder,
            true,
            doublesMode
          );
        } catch {
          continue;
        }
      }

      const roundMatches: SessionBracketMatch[] = [];
      const restedPlayerIds = new Set<string>();
      let nextCourtNumber = 1;

      for (const pool of gs.pools) {
        const matchCount = allocations.get(pool.key) ?? 0;
        const mixedAllocation =
          doublesMode === "MIXED_PRIORITY" && pool.key === "ALL"
            ? chooseMixedPriorityAllocation(
                pool,
                matchCount,
                gs.states,
                gs.previousRested,
                effectiveMinGames,
                gs.randomOrder,
                activePairMap
              )
            : null;
        if (doublesMode === "MIXED_PRIORITY" && pool.key === "ALL" && matchCount > 0 && !mixedAllocation) {
          throw new Error(`"${gs.groupName}"에서 현재 인원과 고정 파트너 조건으로 혼복 우선 대진을 구성할 수 없습니다.`);
        }
        const selectedPlayers = mixedAllocation?.selectedPlayers ?? chooseSelectedPlayersForPool(
          pool,
          matchCount,
          gs.states,
          gs.previousRested,
          effectiveMinGames,
          gs.randomOrder,
          activePairMap
        );
        const poolMatches = buildRoundMatchesForPool(
          pool,
          selectedPlayers,
          nextCourtNumber,
          gs.partnerHistory,
          gs.opponentHistory,
          gs.randomOrder,
          gs.random,
          activePairMap,
          forbiddenPairKeys,
          mixedAllocation ?? undefined
        );

        const actualPlayingIds = new Set(
          poolMatches.flatMap((m) => [...m.teamA.players, ...m.teamB.players]).map((p) => p.playerId)
        );
        for (const p of pool.players) {
          if (!actualPlayingIds.has(p.playerId)) restedPlayerIds.add(p.playerId);
        }

        roundMatches.push(...poolMatches);
        nextCourtNumber += poolMatches.length;
      }

      if (roundMatches.length === 0) continue;

      anyMatchThisRound = true;

      for (const match of roundMatches) {
        registerMatchHistory(match, gs.partnerHistory, gs.opponentHistory);
      }

      for (const p of gs.players) {
        const state = gs.states.get(p.playerId)!;
        if (restedPlayerIds.has(p.playerId)) {
          state.rests++;
        } else {
          state.games++;
          state.lastPlayedRound = roundNumber;
        }
      }

      gs.previousRested = restedPlayerIds;
      gs.rounds.push({
        roundNumber,
        matches: roundMatches,
        restingPlayers: [...restedPlayerIds]
          .map((id) => gs.playerEntryMap.get(id)!)
          .filter(Boolean)
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko")),
      });
    }

    if (!anyMatchThisRound) break;
  }

  for (const gs of groupStates) {
    assertFixedPairTargetsSatisfied(gs.fixedPairRules, gs.partnerHistory, gs.players);
    if (doublesMode === "MIXED_PRIORITY") {
      const games = gs.players.map((player) => gs.states.get(player.playerId)?.games ?? 0);
      if (Math.max(...games) - Math.min(...games) > 1) {
        throw new Error(`"${gs.groupName}"은 현재 성비와 코트 수로 경기 수 편차 1 이내의 혼복 우선 대진을 만들 수 없습니다.`);
      }
    }
    for (const p of gs.players) {
      const state = gs.states.get(p.playerId)!;
      if (state.games > minGamesPerPlayer + 3) {
        gs.warnings.push(
          `${p.name} 선수는 경기 수가 다른 인원보다 많게 배정되었습니다.`
        );
      }
    }
  }

  const fakeConfig: SessionBracketConfig = {
    courtCount: totalCourtCount,
    minGamesPerPlayer,
    separateByGender: isGenderSeparated,
    doublesMode,
    relaxedMode,
    generationMode: "STANDARD",
    fixedPairs: [],
  };

  return groupStates.map((gs) => ({
    groupId: gs.groupId,
    rounds: gs.rounds,
    summary: buildSummary(gs.players, gs.states, fakeConfig, gs.rounds, gs.warnings),
  }));
}

export function generateSessionBracket(
  input: SessionBracketGenerationInput
) {
  const random = createSeededRandom(
    Number.isFinite(input.seed) ? Number(input.seed) : Date.now()
  );

  const requestedDoublesMode = normalizeDoublesMode(input.doublesMode, input.separateByGender);
  const doublesMode =
    input.generationMode === "TEAM_BATTLE" && requestedDoublesMode === "MIXED_PRIORITY"
      ? "RANDOM"
      : requestedDoublesMode;
  const config: SessionBracketConfig = {
    courtCount: Math.max(1, Math.floor(input.courtCount)),
    minGamesPerPlayer: Math.max(
      1,
      Math.floor(input.minGamesPerPlayer)
    ),
    separateByGender: doublesMode === "GENDER_SEPARATED",
    doublesMode,
    relaxedMode: Boolean(input.relaxedMode),
    generationMode:
      input.generationMode === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD",
    teamAssignments:
      input.generationMode === "TEAM_BATTLE"
        ? input.teamAssignments ?? {}
        : undefined,
    teamLabels:
      input.generationMode === "TEAM_BATTLE"
        ? {
            A: input.teamLabels?.A?.trim() || "팀A",
            B: input.teamLabels?.B?.trim() || "팀B",
          }
        : undefined,
    fixedPairs: normalizeFixedPairs(
      input.fixedPairs,
      Math.max(1, Math.floor(input.minGamesPerPlayer))
    ),
  };

  const players = shuffleArray(
    input.players.map((player) =>
      createPlayerEntry(player, config.separateByGender)
    ),
    random
  );
  validateGenerationInput(players, config);

  // 怨좎젙 ?뚰듃??留?援ъ꽦 (?묐갑??
  const playerIdSet = new Set(players.map((p) => p.playerId));
  const fixedPairRules = buildFixedPairRules(config.fixedPairs ?? [], playerIdSet);
  const initialFixedPairMap = getFixedPairConstraints(
    fixedPairRules,
    new Map()
  ).activePairMap;

  const randomOrder = new Map(
    players.map((player) => [player.playerId, random()])
  );

  if (config.generationMode === "TEAM_BATTLE") {
    validateTeamBattleInput(
      players,
      config,
      config.teamAssignments ?? {},
      initialFixedPairMap
    );

    return {
      config,
      ...generateTeamBattleRounds(
        players,
        config,
        config.teamAssignments ?? {},
        randomOrder,
        random,
        fixedPairRules
      ),
    };
  }

  const pools = buildPools(players, config.separateByGender);
  const playerEntryMap = getEntryMap(players);
  const states = new Map<string, PlayerState>(
    players.map((player) => [
      player.playerId,
      {
        games: 0,
        rests: 0,
        lastPlayedRound: 0,
      },
    ])
  );
  const partnerHistory = new Map<string, number>();
  const opponentHistory = new Map<string, number>();
  const rounds: SessionBracketRound[] = [];
  const warnings: string[] = [];
  let previousRested = new Set<string>();

  const estimatedRounds = Math.ceil(
    (players.length * config.minGamesPerPlayer) /
      Math.max(1, config.courtCount * 4)
  );
  const maxRounds = Math.max(
    estimatedRounds + players.length,
    config.minGamesPerPlayer * 3,
    6
  );

  for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
    if (
      rounds.length > 0 &&
      allPlayersSatisfied(players, states, config.minGamesPerPlayer)
    ) {
      break;
    }

    const { activePairMap, forbiddenPairKeys } = getFixedPairConstraints(
      fixedPairRules,
      partnerHistory
    );
    const allocations = allocateMatchesForRound(
      pools,
      config.courtCount,
      states,
      previousRested,
      config.minGamesPerPlayer,
      randomOrder,
      config.relaxedMode,
      config.doublesMode ?? "RANDOM"
    );
    const roundMatches: SessionBracketMatch[] = [];
    const restedPlayerIds = new Set<string>();
    let nextCourtNumber = 1;

    for (const pool of pools) {
      const matchCount = allocations.get(pool.key) ?? 0;
      const mixedAllocation =
        config.doublesMode === "MIXED_PRIORITY" && pool.key === "ALL"
          ? chooseMixedPriorityAllocation(
              pool,
              matchCount,
              states,
              previousRested,
              config.minGamesPerPlayer,
              randomOrder,
              activePairMap
            )
          : null;
      if (config.doublesMode === "MIXED_PRIORITY" && pool.key === "ALL" && matchCount > 0 && !mixedAllocation) {
        throw new Error("현재 인원과 고정 파트너 조건으로 혼복 우선 대진을 구성할 수 없습니다.");
      }
      const selectedPlayers = mixedAllocation?.selectedPlayers ?? chooseSelectedPlayersForPool(
        pool,
        matchCount,
        states,
        previousRested,
        config.minGamesPerPlayer,
        randomOrder,
        activePairMap
      );
      const poolMatches = buildRoundMatchesForPool(
        pool,
        selectedPlayers,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        random,
        activePairMap,
        forbiddenPairKeys,
        mixedAllocation ?? undefined
      );

      // 실제 경기에 배정된 선수 기준으로 휴식 판단
      // (selectedPlayers 중 경기 배정에 실패한 leftover도 휴식으로 처리)
      const actualPlayingIds = new Set(
        poolMatches.flatMap((m) => [...m.teamA.players, ...m.teamB.players]).map((p) => p.playerId)
      );
      for (const player of pool.players) {
        if (!actualPlayingIds.has(player.playerId)) restedPlayerIds.add(player.playerId);
      }

      roundMatches.push(...poolMatches);
      nextCourtNumber += poolMatches.length;
    }

    if (roundMatches.length === 0) {
      break;
    }

    for (const match of roundMatches) {
      registerMatchHistory(match, partnerHistory, opponentHistory);
    }

    for (const player of players) {
      const state = states.get(player.playerId)!;

      if (restedPlayerIds.has(player.playerId)) {
        state.rests += 1;
      } else {
        state.games += 1;
        state.lastPlayedRound = roundNumber;
      }
    }

    previousRested = restedPlayerIds;

    rounds.push({
      roundNumber,
      matches: roundMatches,
      restingPlayers: [...restedPlayerIds]
        .map((playerId) => playerEntryMap.get(playerId)!)
        .sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }

          return left.name.localeCompare(right.name, "ko");
        }),
    });
  }

  if (
    !config.relaxedMode &&
    !allPlayersSatisfied(players, states, config.minGamesPerPlayer)
  ) {
    throw new Error(
      "현재 조건으로는 모든 참가자에게 최소 경기 수를 배정할 수 없습니다. 코트를 늘리거나 최소 경기 수를 낮춰 주세요."
    );
  }

  assertFixedPairTargetsSatisfied(fixedPairRules, partnerHistory, players);

  for (const player of players) {
    const state = states.get(player.playerId)!;

    if (state.games > config.minGamesPerPlayer + 1) {
      warnings.push(
        `${player.name} 선수는 경기 수가 다른 인원보다 많게 배정되었습니다.`
      );
    }
  }

  if (config.doublesMode === "MIXED_PRIORITY") {
    const games = players.map((player) => states.get(player.playerId)?.games ?? 0);
    if (Math.max(...games) - Math.min(...games) > 1) {
      throw new Error(
        "현재 성비와 코트 수로는 경기 수 편차를 1 이내로 유지하는 혼복 우선 대진을 만들 수 없습니다. 코트 수 또는 참가 인원을 조정해 주세요."
      );
    }
  }

  return {
    config,
    rounds,
    summary: buildSummary(players, states, config, rounds, warnings),
  };
}







