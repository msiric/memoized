export function staticHeading(node) {
  if (node?.type !== 'mdxJsxFlowElement' || node.name !== 'h2' || node.attributes?.length !== 1) return null
  const attribute = node.attributes[0]
  if (attribute.type !== 'mdxJsxAttribute' || attribute.name !== 'id' ||
      typeof attribute.value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attribute.value)) return null
  if (!node.children?.length || node.children.some(child => child.type !== 'text')) return null
  const title = node.children.map(child => child.value).join('')
  if (!title.trim()) return null
  return { id: attribute.value, title }
}

export function rehypeStaticHeadings() {
  return tree => {
    function visit(parent) {
      for (let index = 0; index < (parent.children?.length ?? 0); index++) {
        const child = parent.children[index]
        const heading = staticHeading(child)
        if (heading) {
          parent.children[index] = {
            type: 'element', tagName: 'h2', properties: { id: heading.id },
            children: child.children, position: child.position,
          }
        } else if (child.children) visit(child)
      }
    }
    visit(tree)
  }
}
