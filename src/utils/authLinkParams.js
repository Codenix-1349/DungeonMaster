export function hasPendingAuthLinkAction(search = '') {
  const params = new URLSearchParams(search)
  return Boolean(params.get('verify') || params.get('reset'))
}
