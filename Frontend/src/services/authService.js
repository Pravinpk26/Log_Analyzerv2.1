// Mock authentication service.
//
// This is the ONLY file that needs to change when real backend auth is
// added — everything above it (AuthContext, LoginPage) already calls this
// as if it were async and network-backed, so swapping the body of
// `login()` for a real `fetch('/auth/login', ...)` call is a drop-in
// replacement with zero changes required anywhere else.

const DEMO_USER = {
  username: 'admin',
  password: 'admin123',
  displayName: 'Alex Demir',
  role: 'Security Analyst',
  initials: 'AD',
}

const SESSION_KEY = 'log_analyzer_session'

export async function login(username, password) {
  // TODO: Backend Integration Required — replace this block with a real
  // POST /auth/login call once the backend exposes authentication. Keep
  // the same return shape ({ token, user }) so AuthContext doesn't change.
  await new Promise((resolve) => setTimeout(resolve, 650))

  if (username.trim().toLowerCase() !== DEMO_USER.username || password !== DEMO_USER.password) {
    throw new Error('Invalid username or password.')
  }

  return {
    token: `mock-token-${Date.now()}`,
    user: {
      username: DEMO_USER.username,
      displayName: DEMO_USER.displayName,
      role: DEMO_USER.role,
      initials: DEMO_USER.initials,
    },
  }
}

export function persistSession(session, remember) {
  const payload = JSON.stringify(session)
  if (remember) {
    localStorage.setItem(SESSION_KEY, payload)
    sessionStorage.removeItem(SESSION_KEY)
  } else {
    sessionStorage.setItem(SESSION_KEY, payload)
    localStorage.removeItem(SESSION_KEY)
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export const DEMO_CREDENTIALS = { username: DEMO_USER.username, password: DEMO_USER.password }
