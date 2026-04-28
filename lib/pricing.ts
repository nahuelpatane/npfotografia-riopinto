export function calcPrice(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 5000
  if (count === 2) return 8000
  return 8000 + (count - 2) * 3500
}
