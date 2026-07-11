async function getAuthToken(): Promise<string> {
  const { $supabase } = useNuxtApp()
  const { data } = await $supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'You must be logged in' })
  }
  return token
}

/** POST multipart upload with real upload progress (0–100). */
export async function authUploadWithProgress<T>(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  const token = await getAuthToken()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onProgress(100)
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new Error('Invalid upload response'))
        }
        return
      }

      let message = 'Upload failed'
      try {
        const body = JSON.parse(xhr.responseText)
        message = body.statusMessage || body.message || message
      } catch {
        /* use default */
      }
      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(formData)
  })
}

/** DELETE with animated progress while the request is in flight. */
export async function authDeleteWithProgress(
  url: string,
  body: Record<string, unknown>,
  onProgress: (percent: number) => void,
): Promise<void> {
  const token = await getAuthToken()
  onProgress(8)

  let progress = 8
  const timer = setInterval(() => {
    progress = Math.min(progress + 6, 88)
    onProgress(progress)
  }, 70)

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const message = (data as { statusMessage?: string }).statusMessage || 'Delete failed'
      throw new Error(message)
    }

    onProgress(100)
  } finally {
    clearInterval(timer)
  }
}
