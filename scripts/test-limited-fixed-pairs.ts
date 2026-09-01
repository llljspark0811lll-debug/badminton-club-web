import {
  generateSessionBracket,
  generateSessionBracketLevelGroups,
  type SessionBracketPlayerInput,
} from "../lib/session-bracket";

function players(count: number): SessionBracketPlayerInput[] {
  return Array.from({ length: count }, (_, index) => ({
    playerId: String(index + 1),
    participantId: index + 1,
    name: `선수${index + 1}`,
    gender: index % 2 === 0 ? "남" : "여",
    level: String((index % 4) + 1),
    isGuest: false,
    hostName: null,
  }));
}

function countPartnership(
  rounds: ReturnType<typeof generateSessionBracket>["rounds"],
  playerAId: string,
  playerBId: string
) {
  return rounds.reduce(
    (count, round) =>
      count +
      round.matches.filter((match) =>
        [match.teamA, match.teamB].some((team) => {
          const ids = new Set(team.players.map((player) => player.playerId));
          return ids.has(playerAId) && ids.has(playerBId);
        })
      ).length,
    0
  );
}

for (const seed of [1, 7, 19, 77, 2026]) {
  const result = generateSessionBracket({
    players: players(8),
    courtCount: 2,
    minGamesPerPlayer: 4,
    separateByGender: false,
    doublesMode: "RANDOM",
    fixedPairs: [["1", "2", 2]],
    seed,
  });
  if (countPartnership(result.rounds, "1", "2") !== 2) {
    throw new Error(`seed ${seed}: 지정 파트너가 정확히 2경기 함께하지 않았습니다.`);
  }
}

const allGamesTogether = generateSessionBracket({
  players: players(8),
  courtCount: 2,
  minGamesPerPlayer: 4,
  separateByGender: false,
  doublesMode: "RANDOM",
  fixedPairs: [["1", "2", 4]],
  seed: 42,
});
if (countPartnership(allGamesTogether.rounds, "1", "2") !== 4) {
  throw new Error("최대 경기 수 지정 파트너가 정확히 4경기 함께하지 않았습니다.");
}

const mixed = generateSessionBracket({
  players: players(8),
  courtCount: 2,
  minGamesPerPlayer: 4,
  separateByGender: false,
  doublesMode: "MIXED_PRIORITY",
  fixedPairs: [["1", "2", 2]],
  seed: 77,
});
if (countPartnership(mixed.rounds, "1", "2") !== 2) {
  throw new Error("혼복 우선에서 지정 파트너 횟수가 지켜지지 않았습니다.");
}

const separated = generateSessionBracket({
  players: players(8),
  courtCount: 2,
  minGamesPerPlayer: 4,
  separateByGender: true,
  doublesMode: "GENDER_SEPARATED",
  fixedPairs: [["1", "3", 2]],
  seed: 31,
});
if (countPartnership(separated.rounds, "1", "3") !== 2) {
  throw new Error("성별 분리에서 지정 파트너 횟수가 지켜지지 않았습니다.");
}

const teamBattlePlayers = players(8);
const teamBattle = generateSessionBracket({
  players: teamBattlePlayers,
  courtCount: 2,
  minGamesPerPlayer: 4,
  separateByGender: false,
  doublesMode: "RANDOM",
  generationMode: "TEAM_BATTLE",
  teamAssignments: Object.fromEntries(
    teamBattlePlayers.map((player, index) => [player.playerId, index < 4 ? "A" : "B"])
  ),
  fixedPairs: [["1", "2", 2]],
  seed: 93,
});
if (countPartnership(teamBattle.rounds, "1", "2") !== 2) {
  throw new Error("팀 대항에서 지정 파트너 횟수가 지켜지지 않았습니다.");
}

const grouped = generateSessionBracketLevelGroups(
  [{
    groupId: "group",
    groupName: "그룹",
    players: players(8),
    fixedPairs: [["1", "2", 2]],
  }],
  2,
  4,
  false,
  false,
  101,
  "RANDOM"
)[0]!;
if (countPartnership(grouped.rounds, "1", "2") !== 2) {
  throw new Error("급수 그룹에서 지정 파트너 횟수가 지켜지지 않았습니다.");
}

let impossibleTeamBattleRejected = false;
try {
  generateSessionBracket({
    players: players(4),
    courtCount: 1,
    minGamesPerPlayer: 3,
    separateByGender: false,
    doublesMode: "RANDOM",
    generationMode: "TEAM_BATTLE",
    teamAssignments: { "1": "A", "2": "A", "3": "B", "4": "B" },
    fixedPairs: [["1", "2", 1]],
    seed: 5,
  });
} catch {
  impossibleTeamBattleRejected = true;
}
if (!impossibleTeamBattleRejected) {
  throw new Error("금지 후 대체 파트너가 없는 팀 대항 대진이 거부되지 않았습니다.");
}

console.log("limited fixed-pair tests passed");
