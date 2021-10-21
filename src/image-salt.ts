import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
// import { Parent, Image, HTML } from 'mdast'
import { Parent, Element, Properties } from 'hast'
import { visitParents } from 'unist-util-visit-parents'
import { toHtml } from 'hast-util-to-html'
import { attrs, decodeAttrs } from './util/alt-attrs.js'
import { editQuery, toModifiers } from './util/query.js'
import { trimBaseURL } from './util/util.js'

type RehypeImageSaltOptionsRebuild = {
  tagName?: string
  keepBaseURL?: boolean
  baseAttrs?: string
}
export type RehypeImageSaltOptions = {
  command?: 'rebuild'
  baseURL?: string
  rebuild: RehypeImageSaltOptionsRebuild
}
const defaultOpts: Required<RehypeImageSaltOptions> & {
  rebuild: Required<RehypeImageSaltOptionsRebuild>
} = {
  command: 'rebuild',
  baseURL: '',
  rebuild: {
    tagName: 'img',
    keepBaseURL: false,
    baseAttrs: ''
  }
}

export const rehypeImageSalt: Plugin = function rehypeImageSalt(
  opts: RehypeImageSaltOptions = defaultOpts
): Transformer {
  const command =
    opts.command !== undefined ? opts.command : defaultOpts.command
  const baseURL =
    opts.baseURL !== undefined ? opts.baseURL : defaultOpts.baseURL
  const rebuild: Required<RehypeImageSaltOptionsRebuild> = {
    tagName:
      opts.rebuild.tagName !== undefined
        ? opts.rebuild.tagName
        : defaultOpts.rebuild.tagName,
    keepBaseURL:
      opts.rebuild.keepBaseURL !== undefined
        ? opts.rebuild.keepBaseURL
        : defaultOpts.rebuild.keepBaseURL,
    baseAttrs:
      opts.rebuild.baseAttrs !== undefined
        ? opts.rebuild.baseAttrs
        : defaultOpts.rebuild.baseAttrs
  }

  const baseProperties = rebuild.baseAttrs
    ? decodeAttrs(`${rebuild.baseAttrs}`)
    : {}

  const visitTest = (node: Node) => {
    if (node.type === 'element' && (node as Element).tagName === 'img') {
      return true
    }
    return false
  }

  const visitorRebuild = (node: Node, parents: Parent[]) => {
    const parentsLen = parents.length
    const parent: Parent = parents[parentsLen - 1]
    const imageIdx = parent.children.findIndex((n) => n === node)
    const image: Element = node as Element

    if (
      typeof image.properties?.src === 'string' &&
      image.properties.src.startsWith(baseURL)
    ) {
      let imageURL = image.properties.src
      let largeImageURL = ''

      const ex =
        typeof image.properties?.alt === 'string'
          ? attrs(image.properties?.alt)
          : { alt: '' }
      const workProperties: Properties = {}
      Object.assign(workProperties, baseProperties, ex.properties || {})
      const {
        src: _src,
        alt: _alt,
        ...imageProperties
      } = image.properties || {}
      const properties: Properties = { ...imageProperties }

      Object.entries(workProperties).forEach(([k, v]) => {
        let key = k
        let value = v
        let set = true
        // 特殊な属性の一覧を別に作れないか?
        // ("d:" 属性も処理が分散している)
        if (k === 'modifiers') {
          key = `:${k}`
          value = JSON.stringify(toModifiers(`${v}`))
        } else if (k === 'qq') {
          imageURL = editQuery(baseURL, imageURL, `${v}`, true)
          set = false
        } else if (k === 'q') {
          imageURL = editQuery(baseURL, imageURL, `${v}`, false)
          set = false
        } else if (k === 'thumb') {
          largeImageURL = editQuery(baseURL, imageURL, `${v}`, true)
          set = false
        }
        if (set) {
          properties[key] = value
        }
      })
      if (!rebuild.keepBaseURL) {
        imageURL = trimBaseURL(baseURL, imageURL)
      }

      const imageTag: Element = {
        type: 'element',
        tagName: rebuild.tagName,
        properties: {
          src: imageURL,
          alt: ex.alt,
          ...properties
        },
        children: []
      }
      let rebuilded: Element = imageTag
      if (largeImageURL) {
        const largeImageTag: Element = {
          type: 'element',
          tagName: 'a',
          properties: {
            href: largeImageURL,
            target: '_blank',
            rel: 'noopener noreferrer'
          },
          children: [imageTag]
        }
        rebuilded = largeImageTag
      }
      parent.children[imageIdx] = rebuilded
    }
  }

  let visitor: (node: Node, parents: Parent[]) => void = (
    node: Node,
    parents: Parent[]
  ) => {}
  if (command === 'rebuild') {
    visitor = visitorRebuild
  }

  return function transformer(tree: Node): void {
    visitParents(tree, visitTest, visitor)
  }
}
