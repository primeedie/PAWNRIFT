export function newRunSeed(previous: string) {
  const values = crypto.getRandomValues(new Uint32Array(2))
  const seed = `run-${values[0].toString(16)}-${values[1].toString(16)}`
  return seed === previous ? `${seed}-new` : seed
}
