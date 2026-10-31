import { getAuthHeaders } from "@mercurjs/vendor"

declare const __BACKEND_URL__: string

export async function vendorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData
  const auth = await getAuthHeaders()
  const response = await fetch(`${__BACKEND_URL__}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "content-type": "application/json" }),
      ...(auth as Record<string, string>),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message ?? `Error ${response.status}`)
  }
  return payload as T
}
