const languageNames: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  php: 'PHP',
  python: 'Python',
  ruby: 'Ruby',
  go: 'Go',
}

export function getPanelTitle({
  title,
  language,
}: {
  title?: string
  language?: string
}) {
  if (title) return title
  if (language && language in languageNames) return languageNames[language]
  return 'Code'
}
