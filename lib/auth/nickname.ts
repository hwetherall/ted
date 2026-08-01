export function normalizeNickname(value: string) {
  return value.trim().toLocaleLowerCase("en-AU").replace(/\s+/g, " ");
}

export const NICKNAME_BENCH = [
  "Bluey",
  "Chook",
  "Dingo",
  "Macca",
  "Nugget",
  "Possum",
  "Rocket",
  "Skipper",
  "Sparky",
  "Wombat",
] as const;

function uniqueNicknames(values: readonly string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeNickname(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function shuffle(values: readonly string[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function chooseNicknameOptions(real: string, decoys: string[], random = Math.random) {
  const realNormalized = normalizeNickname(real);
  const realPool = uniqueNicknames(decoys).filter((item) => normalizeNickname(item) !== realNormalized);
  const selected = shuffle(realPool, random).slice(0, 2);

  if (selected.length < 2) {
    const reserved = new Set([realNormalized, ...realPool.map(normalizeNickname)]);
    const bench = NICKNAME_BENCH.filter((item) => !reserved.has(normalizeNickname(item)));
    selected.push(...shuffle(bench, random).slice(0, 2 - selected.length));
  }

  if (selected.length < 2) throw new Error("Nickname option pool is invalid.");

  return shuffle([real, ...selected], random);
}
