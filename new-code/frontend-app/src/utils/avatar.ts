export const DEFAULT_AVATAR = '/assets/default-avatar.png';

export function avatarUrl(value?: string) {
  const path = value?.trim();
  if (!path) return DEFAULT_AVATAR;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  if (path.startsWith('/api/data/')) return path.slice(4);
  if (path.startsWith('/data/')) return path;
  if (path.startsWith('/')) return path;
  return `/data/${path}`;
}

export function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
}
