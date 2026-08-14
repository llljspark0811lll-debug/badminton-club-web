import {
  generateSessionBracket,
  generateSessionBracketLevelGroups,
  type SessionBracketPlayerInput,
} from "../lib/session-bracket";

function makePlayers(men: number, women: number, offset = 0): SessionBracketPlayerInput[] {
  const make = (index: number, gender: "남" | "여") => ({
    playerId: String(offset + index), participantId: offset + index,
    name: `${gender}${offset + index}`, gender,
    level: String(1 + (index % 7)), age: 25 + (index % 5) * 10,
    isGuest: false, hostName: null,
  });
  return [
    ...Array.from({ length: men }, (_, index) => make(index + 1, "남")),
    ...Array.from({ length: women }, (_, index) => make(men + index + 1, "여")),
  ];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateResult(
  label: string,
  inputPlayers: SessionBracketPlayerInput[],
  result: ReturnType<typeof generateSessionBracket>,
  courts: number,
  minGames: number
) {
  const allIds = new Set(inputPlayers.map((player) => player.playerId));
  const previousRest = new Set<string>();

  for (const round of result.rounds) {
    assert(round.matches.length <= courts, `${label}: 코트 수 초과`);
    const playingIds = new Set<string>();
    for (const match of round.matches) {
      const teams = [match.teamA.players, match.teamB.players];
      assert(teams.every((team) => team.length === 2), `${label}: 팀 인원 오류`);
      const teamGenderKinds = teams.map((team) => new Set(team.map((player) => player.gender)));
      const isMixed = teamGenderKinds.every((genders) => genders.size === 2);
      const isSameGenderMatch = new Set(
        teams.flatMap((team) => team.map((player) => player.gender))
      ).size === 1;
      assert(isMixed || isSameGenderMatch, `${label}: 혼복 우선 형식이 아닌 경기 생성`);

      const teamATotal = match.teamA.players.reduce((sum, player) => sum + player.score, 0);
      const teamBTotal = match.teamB.players.reduce((sum, player) => sum + player.score, 0);
      assert(teamATotal === match.teamA.totalScore, `${label}: A팀 점수 오류`);
      assert(teamBTotal === match.teamB.totalScore, `${label}: B팀 점수 오류`);
      assert(match.balanceGap === Math.abs(teamATotal - teamBTotal), `${label}: 밸런스 차이 오류`);

      for (const player of teams.flat()) {
        assert(allIds.has(player.playerId), `${label}: 알 수 없는 선수`);
        assert(!playingIds.has(player.playerId), `${label}: 같은 라운드 중복 출전`);
        playingIds.add(player.playerId);
      }
    }

    const restingIds = new Set(round.restingPlayers.map((player) => player.playerId));
    assert(playingIds.size + restingIds.size === inputPlayers.length, `${label}: 출전/휴식 인원 누락`);
    for (const id of playingIds) assert(!restingIds.has(id), `${label}: 출전과 휴식 중복`);
    for (const id of previousRest) assert(playingIds.has(id), `${label}: 연속 휴식 발생`);
    previousRest.clear();
    for (const id of restingIds) previousRest.add(id);
  }

  const games = result.summary.playerStats.map((stat) => stat.games);
  const rests = result.summary.playerStats.map((stat) => stat.rests);
  assert(games.every((gamesPlayed) => gamesPlayed >= minGames), `${label}: 최소 경기 미달`);
  assert(Math.max(...games) - Math.min(...games) <= 1, `${label}: 경기 수 편차 초과`);
  assert(Math.max(...rests) - Math.min(...rests) <= 1, `${label}: 휴식 수 편차 초과`);
}

const counts = [0, 2, 3, 4, 5, 7, 8, 10, 12, 16];
let successes = 0;
let expectedRejections = 0;
for (const men of counts) {
  for (const women of counts) {
    if (men + women < 4 || men + women > 24) continue;
    for (const courts of [1, 2, 3, 4]) {
      for (const minGames of [2, 5]) {
        for (const seed of [17, 2026]) {
          const label = `${men}남${women}여/${courts}코트/min${minGames}/seed${seed}`;
          const inputPlayers = makePlayers(men, women);
          try {
            const result = generateSessionBracket({
              players: inputPlayers, courtCount: courts, minGamesPerPlayer: minGames,
              separateByGender: false, doublesMode: "MIXED_PRIORITY", seed,
            });
            validateResult(label, inputPlayers, result, courts, minGames);
            successes += 1;
          } catch (error) {
            assert(error instanceof Error && error.message.length > 0, `${label}: 비정상 오류`);
            assert(
              [
                "연속 휴식", "직전 라운드", "참가 인원", "현재 조건", "현재 성비",
                "혼복 우선 대진을 구성", "최소 4명", "최소 경기",
              ].some((text) => error.message.includes(text)),
              `${label}: 예상하지 못한 오류 메시지 — ${error.message}`
            );
            expectedRejections += 1;
          }
        }
      }
    }
  }
}

for (const [index, groupCases] of [
  [[7, 7], [10, 4]],
  [[4, 10], [8, 8]],
  [[12, 4], [5, 7]],
].entries()) {
  const groups = groupCases.map(([men, women], groupIndex) => ({
    groupId: `g${index}_${groupIndex}`,
    groupName: `그룹${index + 1}-${groupIndex + 1}`,
    players: makePlayers(men, women, index * 1000 + groupIndex * 100),
    fixedPairs: [],
  }));
  const results = generateSessionBracketLevelGroups(
    groups, 5, 4, false, false, 3000 + index, "MIXED_PRIORITY"
  );
  assert(results.length === groups.length, `급수 그룹 ${index}: 결과 누락`);
  for (const result of results) {
    const group = groups.find((entry) => entry.groupId === result.groupId)!;
    const wrapped = {
      config: { courtCount: 5, minGamesPerPlayer: 4, separateByGender: false, doublesMode: "MIXED_PRIORITY" as const },
      rounds: result.rounds,
      summary: result.summary,
    };
    validateResult(`급수 그룹 ${result.groupId}`, group.players, wrapped, 5, 4);
  }
}

console.log("✅ 혼복 우선 매트릭스 검증 통과", { successes, expectedRejections });
