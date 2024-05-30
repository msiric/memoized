export const remToPx = (remValue: number) => {
  let rootFontSize =
    typeof window === 'undefined'
      ? 16
      : parseFloat(window.getComputedStyle(document.documentElement).fontSize)

  return remValue * rootFontSize
}

export const toDateTime = (secs: number) => {
  var t = new Date(+0) // Unix epoch start.
  t.setSeconds(secs)
  return t
}
