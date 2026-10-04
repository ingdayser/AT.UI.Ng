/** Accepts only in-app absolute paths, to avoid redirecting to a foreign location. */
export function safeReturnUrl(
  returnUrl: string | null | undefined,
  options: { readonly homePath?: string; readonly loginPath?: string } = {},
): string {
  const home = options.homePath ?? '/home';
  const login = options.loginPath ?? '/login';
  if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) return home;
  if (returnUrl.startsWith(login)) return home;
  return returnUrl;
}
