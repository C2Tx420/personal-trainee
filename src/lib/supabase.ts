import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — xem .env.example');
}

/** Chỉ anon key ở client. Phiên đăng nhập là thứ duy nhất được lưu trên máy. */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export class ApiError extends Error {}

/** Ném lỗi tiếng Việt dễ hiểu nếu Supabase trả lỗi. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new ApiError(res.error.message);
  return res.data as T;
}
