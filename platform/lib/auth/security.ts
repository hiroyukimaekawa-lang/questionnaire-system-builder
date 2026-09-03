export function safeNextPath(value: string | null | undefined, fallback = '/admin') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const parsed = new URL(value, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function validatePassword(password: string, confirmation?: string) {
  if (password.length < 8) return 'パスワードは8文字以上で入力してください。';
  if (confirmation !== undefined && password !== confirmation) return '確認用パスワードが一致しません。';
  return null;
}

export function canDemoteAdmin(currentRole: string, nextRole: string, adminCount: number) {
  return !(currentRole === 'admin' && nextRole === 'sales' && adminCount <= 1);
}
