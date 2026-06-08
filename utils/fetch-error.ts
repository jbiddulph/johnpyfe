/** Extract a human-readable message from a failed $fetch / useAuthFetch call. */
export function fetchErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback

  const err = error as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }

  return (
    err.data?.statusMessage
    || err.data?.message
    || err.statusMessage
    || err.message
    || fallback
  )
}
