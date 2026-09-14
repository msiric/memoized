export function isCompiledMdx(value: unknown): value is { compiledSource: string } {
  return !!value && typeof value === 'object' &&
    (!('error' in value) || !value.error) &&
    'compiledSource' in value && typeof value.compiledSource === 'string' &&
    value.compiledSource.trim() !== ''
}

/** The serializer returns a failure object; it does not always throw. */
export function assertCompiledMdx(
  value: unknown,
  source = 'content',
): asserts value is { compiledSource: string } {
  const failure =
    value && typeof value === 'object' && 'error' in value
      ? value.error
      : undefined
  if (!isCompiledMdx(value)) {
    const message =
      failure &&
      typeof failure === 'object' &&
      'message' in failure &&
      typeof failure.message === 'string'
        ? failure.message.split('\n').slice(0, 2).join(' ').slice(0, 300)
        : 'Missing compiledSource.'
    throw new Error(`MDX compilation failed for ${source}: ${message}`)
  }
}
