export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function getStoredUser(): StoredUser | null {
  try {
    const s = localStorage.getItem("user");
    return s ? JSON.parse(s) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
}
