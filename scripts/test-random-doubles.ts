import { generateSessionBracket } from "../lib/session-bracket";
import type { SessionBracketPlayerInput } from "../lib/session-bracket";

function player(
  id: number,
  gender: "남" | "여",
  level: string,
  age: number
): SessionBracketPlayerInput {
  return {
    playerId: String(id),
    participantId: id,
    name: `${gender}${id}`,
    gender,
    level,
    age,
    isGuest: false,
    hostName: null,
  };
}

const players = [
  player(1, "남", "A", 30), player(2, "남", "A", 45),
  player(3, "남", "B", 30), player(4, "남", "B", 55),
  player(5, "남", "C", 30), player(6, "남", "C", 65),
  player(7, "남", "D", 30), player(8, "여", "A", 30),
  player(9, "여", "A", 45), player(10, "여", "B", 30),
  player(11, "여", "B", 55), player(12, "여", "C", 30),
  player(13, "여", "C", 65), player(14, "여", "D", 30),
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function ids(values: Array<{ playerId: string }>) {
  return values.map((value) => value.playerId).sort().join(",");
}

const firstRoundRosters = new Set<string>();
const firstRoundPartners = new Set<string>();
const firstRoundMatches = new Set<string>();
const pairFrequency = new Map<string, number>();
let sawNonMixedTeam = false;

for (let seed = 1; seed <= 100; seed += 1) {
  const result = generateSessionBracket({
    players,
    courtCount: 2,
    minGamesPerPlayer: 5,
    separateByGender: false,
    seed,
  });
  const firstRound = result.rounds[0]!;
  const playing = firstRound.matches.flatMap((match) => [
    ...match.teamA.players,
    ...match.teamB.players,
  ]);
  firstRoundRosters.add(ids(playing));

  const matchSignatures: string[] = [];
  for (const match of firstRound.matches) {
    const teams = [match.teamA.players, match.teamB.players];
    const teamSignatures = teams.map((team) => ids(team)).sort();
    matchSignatures.push(teamSignatures.join(" vs "));

    for (const team of teams) {
      const pair = ids(team);
      firstRoundPartners.add(pair);
      pairFrequency.set(pair, (pairFrequency.get(pair) ?? 0) + 1);
      if (new Set(team.map((entry) => entry.gender)).size === 1) {
        sawNonMixedTeam = true;
      }
    }
  }
  firstRoundMatches.add(matchSignatures.sort().join(" | "));

  const games = result.summary.playerStats.map((stat) => stat.games);
  const rests = result.summary.playerStats.map((stat) => stat.rests);
  assert(Math.max(...games) - Math.min(...games) <= 1, `seed ${seed}: 경기 수 편차 초과`);
  assert(Math.max(...rests) - Math.min(...rests) <= 1, `seed ${seed}: 휴식 수 편차 초과`);

  for (const round of result.rounds) {
    for (const match of round.matches) {
      const teamATotal = match.teamA.players.reduce((sum, entry) => sum + entry.score, 0);
      const teamBTotal = match.teamB.players.reduce((sum, entry) => sum + entry.score, 0);
      assert(match.teamA.totalScore === teamATotal, `seed ${seed}: A팀 점수 합계 오류`);
      assert(match.teamB.totalScore === teamBTotal, `seed ${seed}: B팀 점수 합계 오류`);
      assert(
        match.balanceGap === Math.abs(teamATotal - teamBTotal),
        `seed ${seed}: 팀 밸런스 차이 계산 오류`
      );
    }
  }

  const scoreById = new Map(
    result.summary.playerStats.map((stat) => [stat.playerId, stat.score])
  );
  assert(scoreById.get("1") === 6, "30대 남성 A급 점수가 6이 아님");
  assert(scoreById.get("2") === 5, "40대 남성 A급 나이 보정이 유지되지 않음");
  assert(scoreById.get("8") === 5, "30대 여성 A급 성별 보정이 유지되지 않음");
  assert(scoreById.get("9") === 4, "40대 여성 A급 성별·나이 보정이 유지되지 않음");
}

assert(firstRoundRosters.size >= 20, `1라운드 출전자 다양성 부족: ${firstRoundRosters.size}`);
assert(firstRoundPartners.size >= 30, `1라운드 파트너 다양성 부족: ${firstRoundPartners.size}`);
assert(firstRoundMatches.size >= 30, `1라운드 대진 다양성 부족: ${firstRoundMatches.size}`);
assert(sawNonMixedTeam, "랜덤 복식이 여전히 혼복 팀만 생성함");
assert(
  Math.max(...pairFrequency.values()) < 100,
  "특정 파트너 두 명이 모든 생성에서 고정됨"
);

console.log("✅ 랜덤 복식 다중 시드 검증 통과", {
  seeds: 100,
  firstRoundRosters: firstRoundRosters.size,
  firstRoundPartners: firstRoundPartners.size,
  firstRoundMatches: firstRoundMatches.size,
});
