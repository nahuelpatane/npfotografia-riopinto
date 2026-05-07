export function calcPrice(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 6000
  if (count === 2) return 10000
  return 10000 + (count - 2) * 4000
}
