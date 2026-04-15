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
  isGuest: boolean;
  hostName: string | null;
};

export type SessionBracketGenerationInput = {
  players: SessionBracketPlayerInput[];
  courtCount: number;
  minGamesPerPlayer: number;
  separateByGender: boolean;
};

type DivisionKey = "ALL" | "MEN" | "WOMEN";

type InternalPlayer = SessionBracketPlayerEntry;

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

type MatchCandidate = {
  match: SessionBracketMatch;
  playerIds: string[];
  score: number;
};

const LEVEL_SCORE_MAP: Record<string, number> = {
  S: 7,
  A: 6,
  B: 5,
  C: 4,
  D: 3,
  E: 2,
  초심: 1,
};

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

function normalizeLevel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "초심";
  }

  const upper = normalized.toUpperCase();
  if (LEVEL_SCORE_MAP[upper] !== undefined) {
    return upper;
  }

  if (normalized === "초심") {
    return normalized;
  }

  return normalized;
}

function getLevelScore(level: string) {
  return LEVEL_SCORE_MAP[level] ?? LEVEL_SCORE_MAP["초심"];
}

function createPlayerEntry(
  input: SessionBracketPlayerInput
): InternalPlayer {
  const gender = normalizeGender(input.gender);
  const level = normalizeLevel(input.level);

  return {
    playerId: input.playerId,
    participantId: input.participantId,
    name: input.name.trim(),
    gender,
    level,
    score: getLevelScore(level),
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
      `남복/여복 분리 생성을 하려면 모든 참가자의 성별이 필요합니다. ${invalidPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 성별을 먼저 확인해주세요.`
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

function keyForPair(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join(":");
}

function sortPlayersForSelection(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number
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

    if (left.score !== right.score) {
      return right.score - left.score;
    }

    return left.name.localeCompare(right.name, "ko");
  });
}

function getPoolMatchLimit(pool: Pool) {
  return Math.floor(pool.players.length / 4);
}

function getPoolMatchPriority(
  pool: Pool,
  currentMatches: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number
) {
  const nextSelectedCount = (currentMatches + 1) * 4;
  const orderedPlayers = sortPlayersForSelection(
    pool.players,
    states,
    previousRested,
    minGamesPerPlayer
  );

  if (orderedPlayers.length < nextSelectedCount) {
    return Number.NEGATIVE_INFINITY;
  }

  const selectedPlayers = orderedPlayers.slice(0, nextSelectedCount);

  return selectedPlayers.reduce((total, player) => {
    const state = states.get(player.playerId)!;
    const unmetGames = Math.max(0, minGamesPerPlayer - state.games);
    const mustPlayBonus = previousRested.has(player.playerId)
      ? 2
      : 0;
    return total + unmetGames * 10 + mustPlayBonus;
  }, 0);
}

function allocateMatchesForRound(
  pools: Pool[],
  courtCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number
) {
  const allocations = new Map<DivisionKey, number>();
  let requiredMatches = 0;

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
    const required = mustPlayCount === 0 ? 0 : Math.ceil(mustPlayCount / 4);

    if (required > getPoolMatchLimit(pool)) {
      throw new Error(
        `${pool.label}에서 직전 라운드를 쉰 인원을 모두 이번 라운드에 넣을 수 없습니다. 코트를 늘리거나 참가 인원을 다시 확인해주세요.`
      );
    }

    allocations.set(pool.key, required);
    requiredMatches += required;
  }

  if (requiredMatches > courtCount) {
    throw new Error(
      "직전 라운드 휴식 인원을 모두 다음 라운드에 배치할 수 없습니다. 코트 수를 늘리거나 대진 생성 조건을 다시 확인해주세요."
    );
  }

  let remainingMatches = courtCount - requiredMatches;

  while (remainingMatches > 0) {
    let bestPool: Pool | null = null;
    let bestPriority = Number.NEGATIVE_INFINITY;

    for (const pool of pools) {
      const currentMatches = allocations.get(pool.key) ?? 0;
      const matchLimit = getPoolMatchLimit(pool);

      if (currentMatches >= matchLimit) {
        continue;
      }

      const priority = getPoolMatchPriority(
        pool,
        currentMatches,
        states,
        previousRested,
        minGamesPerPlayer
      );

      if (priority > bestPriority) {
        bestPriority = priority;
        bestPool = pool;
      }
    }

    if (!bestPool || bestPriority <= 0) {
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

function chooseSelectedPlayersForPool(
  pool: Pool,
  matchCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number
) {
  if (matchCount <= 0) {
    return [];
  }

  return sortPlayersForSelection(
    pool.players,
    states,
    previousRested,
    minGamesPerPlayer
  ).slice(0, matchCount * 4);
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

function evaluateQuartetPairings(
  quartet: InternalPlayer[],
  division: DivisionKey,
  label: string,
  courtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>
): MatchCandidate {
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
        80 +
      (partnerHistory.get(
        keyForPair(
          teamBPlayers[0]!.playerId,
          teamBPlayers[1]!.playerId
        )
      ) ?? 0) *
        80;

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
          18,
      0
    );

    const scoreSpread =
      Math.max(...quartet.map((player) => player.score)) -
      Math.min(...quartet.map((player) => player.score));

    const score =
      balanceGap * 12 +
      partnerPenalty +
      opponentPenalty +
      scoreSpread * 3;

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

  return bestCandidate!;
}

function buildRoundMatchesForPool(
  pool: Pool,
  selectedPlayers: InternalPlayer[],
  firstCourtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>
) {
  const orderedPlayers = [...selectedPlayers].sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    return left.name.localeCompare(right.name, "ko");
  });
  const matches: SessionBracketMatch[] = [];
  let nextCourtNumber = firstCourtNumber;

  while (orderedPlayers.length >= 4) {
    const anchor = orderedPlayers[0]!;
    const combos = generateCombinations(
      orderedPlayers.slice(1),
      3
    );

    let bestCandidate: MatchCandidate | null = null;

    for (const combo of combos) {
      const quartet = [anchor, ...combo];
      const candidate = evaluateQuartetPairings(
        quartet,
        pool.key,
        pool.label,
        nextCourtNumber,
        partnerHistory,
        opponentHistory
      );

      if (!bestCandidate || candidate.score < bestCandidate.score) {
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) {
      throw new Error(
        `${pool.label} 대진표를 구성하지 못했습니다. 참가자 수와 조건을 다시 확인해주세요.`
      );
    }

    const selectedIdSet = new Set(bestCandidate.playerIds);
    matches.push(bestCandidate.match);
    nextCourtNumber += 1;

    for (let index = orderedPlayers.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(orderedPlayers[index]!.playerId)) {
        orderedPlayers.splice(index, 1);
      }
    }
  }

  return matches;
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
      "자동 대진표는 최소 4명 이상 참석 확정 인원이 있어야 생성할 수 있습니다."
    );
  }

  if (config.courtCount < 1) {
    throw new Error("사용 코트 수는 1개 이상이어야 합니다.");
  }

  if (config.minGamesPerPlayer < 1) {
    throw new Error("최소 경기 수는 1경기 이상이어야 합니다.");
  }

  const maxPlayersPerRound = config.courtCount * 4;

  if (players.length > maxPlayersPerRound * 2) {
    throw new Error(
      "현재 코트 수로는 두 경기 연속 쉬는 인원 없이 대진을 만들 수 없습니다. 코트를 늘리거나 참가 인원을 나눠서 운영해주세요."
    );
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

export function generateSessionBracket(
  input: SessionBracketGenerationInput
) {
  const config: SessionBracketConfig = {
    courtCount: Math.max(1, Math.floor(input.courtCount)),
    minGamesPerPlayer: Math.max(
      1,
      Math.floor(input.minGamesPerPlayer)
    ),
    separateByGender: Boolean(input.separateByGender),
  };

  const players = input.players.map(createPlayerEntry);
  validateGenerationInput(players, config);

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

    const allocations = allocateMatchesForRound(
      pools,
      config.courtCount,
      states,
      previousRested,
      config.minGamesPerPlayer
    );
    const roundMatches: SessionBracketMatch[] = [];
    const restedPlayerIds = new Set<string>();
    let nextCourtNumber = 1;

    for (const pool of pools) {
      const matchCount = allocations.get(pool.key) ?? 0;
      const selectedPlayers = chooseSelectedPlayersForPool(
        pool,
        matchCount,
        states,
        previousRested,
        config.minGamesPerPlayer
      );
      const selectedIdSet = new Set(
        selectedPlayers.map((player) => player.playerId)
      );
      const restingPlayers = pool.players.filter(
        (player) => !selectedIdSet.has(player.playerId)
      );

      for (const restingPlayer of restingPlayers) {
        restedPlayerIds.add(restingPlayer.playerId);
      }

      const poolMatches = buildRoundMatchesForPool(
        pool,
        selectedPlayers,
        nextCourtNumber,
        partnerHistory,
        opponentHistory
      );

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

  if (!allPlayersSatisfied(players, states, config.minGamesPerPlayer)) {
    throw new Error(
      "현재 조건으로는 모든 참가자에게 최소 경기 수를 배정할 수 없습니다. 코트 수를 늘리거나 최소 경기 수를 낮춰주세요."
    );
  }

  for (const player of players) {
    const state = states.get(player.playerId)!;

    if (state.games > config.minGamesPerPlayer + 1) {
      warnings.push(
        `${player.name} 님은 경기 수가 다른 인원보다 많게 배정되었습니다.`
      );
    }
  }

  return {
    config,
    rounds,
    summary: buildSummary(players, states, config, rounds, warnings),
  };
}
