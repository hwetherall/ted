export function normalizeNickname(value: string) {
  return value.trim().toLocaleLowerCase("en-AU").replace(/\s+/g, " ");
}

export function chooseNicknameOptions(real: string, decoys: string[], random = Math.random) {
  const pool = [...new Set(decoys.filter((item) => normalizeNickname(item) !== normalizeNickname(real)))];
  if (pool.length < 2) throw new Error("At least two other nicknames are required.");

  const shuffled = [...pool].sort(() => random() - 0.5).slice(0, 2);
  return [real, ...shuffled].sort(() => random() - 0.5);
}
