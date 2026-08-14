import {
  generateSessionBracket,
  generateSessionBracketLevelGroups,
  type LevelGroupBracketInput,
  type SessionBracketPlayerInput,
} from "../lib/session-bracket";

function player(id: number, gender: "남" | "여", level = "2"): SessionBracketPlayerInput {
  return {
    playerId: String(id), participantId: id, name: `${gender}${id}`,
    gender, level, age: 30 + (id % 4) * 10, isGuest: false, hostName: null,
  };
}

function players(men: number, women: number, offset = 0) {
  return [
    ...Array.from({ length: men }, (_, index) => player(offset + index + 1, "남", String(2 + (index % 4)))),
    ...Array.from({ length: women }, (_, index) => player(offset + men + index + 1, "여", String(2 + (index % 4)))),
  ];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function classifyMatch(match: ReturnType<typeof generateSessionBracket>["rounds"][number]["matches"][number]) {
  const teamGenders = [match.teamA.players, match.teamB.players].map((team) =>
    team.map((entry) => entry.gender).sort().join("")
  );
  if (teamGenders.every((value) => value === "남여")) return "MIXED";
  if (teamGenders.every((value) => value === "남남")) return "MEN";
  if (teamGenders.every((value) => value === "여여")) return "WOMEN";
  return "INVALID";
}

function validateCase(name: string, men: number, women: number, courts: number, expected: Set<string>) {
  const result = generateSessionBracket({
    players: players(men, women), courtCount: courts, minGamesPerPlayer: 5,
    separateByGender: false, doublesMode: "MIXED_PRIORITY", seed: 20260814,
  });
  const seen = new Set<string>();
  for (const round of result.rounds) {
    for (const match of round.matches) {
      const kind = classifyMatch(match);
      assert(kind !== "INVALID", `${name} ${round.roundNumber}R: 혼복/동성복식 규칙 위반`);
      seen.add(kind);
    }
  }
  for (const kind of expected) assert(seen.has(kind), `${name}: ${kind} 경기가 생성되지 않음`);
  for (const stat of result.summary.playerStats) {
    assert(stat.games >= 5, `${name}: ${stat.name} 최소 경기 미달`);
  }
  const games = result.summary.playerStats.map((stat) => stat.games);
  assert(Math.max(...games) - Math.min(...games) <= 1, `${name}: 경기 수 편차 초과 (${Math.min(...games)}~${Math.max(...games)})`);
  assert(result.config.doublesMode === "MIXED_PRIORITY", `${name}: 모드 저장 오류`);
  console.log(`✅ ${name}: ${result.rounds.length}R/${result.summary.totalMatches}경기`, [...seen]);
}

validateCase("7남7여 2코트", 7, 7, 2, new Set(["MIXED"]));
validateCase("10남4여 3코트", 10, 4, 3, new Set(["MIXED", "MEN"]));
validateCase("4남10여 3코트", 4, 10, 3, new Set(["MIXED", "WOMEN"]));

const fixedResult = generateSessionBracket({
  players: players(7, 7), courtCount: 2, minGamesPerPlayer: 3,
  separateByGender: false, doublesMode: "MIXED_PRIORITY", fixedPairs: [["1", "8"]], seed: 77,
});
for (const round of fixedResult.rounds) {
  const teamWithFirst = round.matches
    .flatMap((match) => [match.teamA.players, match.teamB.players])
    .find((team) => team.some((entry) => entry.playerId === "1"));
  const secondIsPlaying = round.matches.some((match) =>
    [...match.teamA.players, ...match.teamB.players].some((entry) => entry.playerId === "8")
  );
  assert(Boolean(teamWithFirst) === secondIsPlaying, `고정 혼복 파트너의 동시 출전 오류 (${round.roundNumber}R)`);
  if (teamWithFirst) {
    assert(teamWithFirst.some((entry) => entry.playerId === "8"), `고정 혼복 파트너 분리 (${round.roundNumber}R)`);
  }
}
console.log("✅ 혼복 우선 고정 파트너 유지");
assert(
  (() => {
    try {
      generateSessionBracket({
        players: players(19, 3), courtCount: 3, minGamesPerPlayer: 5,
        separateByGender: false, doublesMode: "MIXED_PRIORITY", seed: 20260814,
      });
      return false;
    } catch (error) {
      return error instanceof Error && error.message.includes("경기 수 편차");
    }
  })(),
  "19남3여 불균형 조건을 차단하지 않음"
);
console.log("✅ 19남3여 불균형 조건 차단");

const groupInputs: LevelGroupBracketInput[] = [
  { groupId: "same_a", groupName: "A급", players: players(7, 7), fixedPairs: [] },
  { groupId: "filter_bc", groupName: "B/C 그룹", players: players(10, 4, 100), fixedPairs: [] },
];
const groupResults = generateSessionBracketLevelGroups(
  groupInputs, 5, 5, false, false, 20260814, "MIXED_PRIORITY"
);
assert(groupResults.length === 2, "급수 그룹 결과 수 오류");
for (const result of groupResults) {
  const kinds = new Set(result.rounds.flatMap((round) => round.matches.map(classifyMatch)));
  assert(!kinds.has("INVALID"), `${result.groupId}: 급수 그룹 혼복 우선 규칙 위반`);
  const games = result.summary.playerStats.map((stat) => stat.games);
  assert(Math.max(...games) - Math.min(...games) <= 1, `${result.groupId}: 급수 그룹 경기 수 편차 초과`);
}
console.log("✅ 동일급수별/급수필터별 공용 그룹 생성 경로 통과");
