import { type Dict, plural } from '../util';

export const AUTH: Dict = {
  "Không tải được dữ liệu: {error}": "Couldn't load data: {error}",
  "Thử lại": "Try again",
  "Đang chuẩn bị dữ liệu…": "Preparing your data…",
  "Cần kết nối mạng": "No connection",
  "App lưu dữ liệu trên Supabase và không hỗ trợ dùng offline. Bật Wi-Fi hoặc 4G rồi thử lại.": "The app keeps its data in Supabase and doesn't work offline. Turn on Wi-Fi or mobile data and try again.",
  "Đang cập nhật": "Updating",
  "Có phiên bản mới": "New version available",
  "Đang cập nhật…": "Updating…",
  "Tải lại": "Reload",
  "Sai email hoặc mật khẩu": "Wrong email or password",
  "Đăng nhập một lần trên thiết bị này": "Sign in once on this device",
  "Mật khẩu": "Password",
  "Đang đăng nhập…": "Signing in…",
  "Đăng nhập": "Sign in",
  "Sai 5 lần — cần đăng nhập lại bằng mật khẩu": "5 wrong tries: sign in again with your password",
  "Nhập PIN": "Enter PIN",
  "PIN đã nhập": "PIN entered",
  "Đang kiểm tra…": "Checking…",
  "Xoá": "Delete",
  "Sai PIN — còn {n} lần thử": ({ n }) => `Wrong PIN, ${plural(n, 'try', 'tries')} left`,
};
