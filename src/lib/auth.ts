/** Constant-time comparison of a presented key with the expected one. */
export function checkKey(presented: string | null, expected: string): boolean {
  if (presented === null) return false
  let diff = presented.length ^ expected.length
  const n = Math.max(presented.length, expected.length)
  for (let i = 0; i < n; i++) diff |= (presented.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0)
  return diff === 0
}
