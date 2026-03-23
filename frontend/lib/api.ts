import type { User } from "@/types";

// Backend API adresi: .env.local içindeki NEXT_PUBLIC_API_URL veya varsayılan 5004
const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5004";
const withCreds: RequestCredentials = "include";

/** E-posta ve şifre ile giriş; başarılıysa kullanıcı bilgisi, değilse null döner */
export async function login(email: string, password: string): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return null;  // 401 vb. durumda null

  const data = await res.json();
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    studentId: data.studentId,
    department: data.department,
    currentSemester: data.currentSemester,
    photo: data.photo,
  };
}

export type RegisterResult = { success: true; user: User } | { success: false; message: string };

/** Yeni öğrenci kaydı; başarılıysa user ile, hata varsa message ile döner */
export async function register(data: {
  studentId: string;
  email: string;
  name: string;
  password: string;
}): Promise<RegisterResult> {
  const res = await fetch(`${getApiUrl()}/api/auth/register`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { success: false, message: body.message || "Registration failed." };
  }

  // Başarılı yanıttan kullanıcı nesnesini oluştur
  const user: User = {
    id: body.id,
    email: body.email,
    name: body.name,
    role: body.role,
    studentId: body.studentId,
    department: body.department,
    currentSemester: body.currentSemester,
    photo: body.photo,
  };
  return { success: true, user };
}

/** API'den gelen ham objeyi User tipine çevirir */
function mapUser(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string,
    role: data.role as User["role"],
    studentId: data.studentId as string | undefined,
    department: data.department as string | undefined,
    currentSemester: data.currentSemester as number | undefined,
    photo: data.photo as string | undefined,
  };
}

/** Aktif oturumdaki kullanıcıyı döndürür (cookie tabanlı) */
export async function getMe(): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/api/auth/me`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return mapUser(data);
}

/** Aktif oturumu kapatır */
export async function logout(): Promise<void> {
  await fetch(`${getApiUrl()}/api/auth/logout`, {
    method: "POST",
    credentials: withCreds,
  });
}

/** Kullanıcı id'sine göre profil bilgisini API'den alır (GET /api/users/{id}) */
export async function getProfile(userId: string): Promise<User | null> {
  const res = await fetch(`${getApiUrl()}/api/users/${userId}`, {
    credentials: withCreds,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return mapUser(data);
}

export type UpdateProfileResult = { success: true; user: User } | { success: false; message: string };

/** Profil güncelle (ad, e-posta, öğrenci no, bölüm, dönem, fotoğraf) - PATCH /api/users/{id} */
export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string; studentId?: string; department?: string; currentSemester?: number; photo?: string }
): Promise<UpdateProfileResult> {
  const res = await fetch(`${getApiUrl()}/api/users/${userId}`, {
    method: "PATCH",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Update failed." };
  return { success: true, user: mapUser(body) };
}

/** Şifre değiştir (mevcut + yeni şifre) - POST /api/users/{id}/change-password */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${getApiUrl()}/api/users/${userId}/change-password`, {
    method: "POST",
    credentials: withCreds,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, message: (body.message as string) || "Password update failed." };
  return { success: true, message: (body.message as string) || "Password updated." };
}
