/** The serializer returns a failure object; it does not always throw. */
export function assertCompiledMdx(
  value: unknown,
  source = 'content',
): asserts value is { compiledSource: string } {
  const failure =
    value && typeof value === 'object' && 'error' in value
      ? value.error
      : undefined
  if (
    failure ||
    !value ||
    typeof value !== 'object' ||
    !('compiledSource' in value) ||
    typeof value.compiledSource !== 'string' ||
    value.compiledSource.trim() === ''
  ) {
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
