import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
// import { Parent, Image, HTML } from 'mdast'
import { Root, Parent, Element, Properties, Text } from 'hast'
import { visitParents } from 'unist-util-visit-parents'
import { toHtml } from 'hast-util-to-html'
import {
  attrs,
  decodeAttrs,
  editAttrs,
  extractAttrsFromAlt,
  pickAttrs,
  salt,
  sblock
} from './util/alt-attrs.js'
import { editQuery, toModifiers } from './util/query.js'
import { trimBaseURL } from './util/util.js'

type RehypeImageSaltOptionsRebuild = {
  tagName?: string
  keepBaseURL?: boolean
  baseAttrs?: string
}
export type EmbedTo = 'alt' | 'block'
type RehypeImageSaltOptionsEmbed = {
  embedTo?: EmbedTo
  pickAttrs?: string[]
}
export type CommandNames = 'rebuild' | 'embed'
export type RehypeImageSaltOptions = {
  command?: CommandNames
  baseURL?: string
  rebuild?: RehypeImageSaltOptionsRebuild
  embed?: RehypeImageSaltOptionsEmbed
}
const defaultOpts: Required<RehypeImageSaltOptions> & {
  rebuild: Required<RehypeImageSaltOptionsRebuild>
  embed: Required<RehypeImageSaltOptionsEmbed>
} = {
  command: 'rebuild',
  baseURL: '',
  rebuild: {
    tagName: 'img',
    keepBaseURL: false,
    baseAttrs: ''
  },
  embed: {
    embedTo: 'alt',
    pickAttrs: ['width', 'height']
  }
}

export const rehypeImageSalt: Plugin<
  [RehypeImageSaltOptions] | [],
  string,
  Root
> = function rehypeImageSalt(
  opts: RehypeImageSaltOptions = defaultOpts
): Transformer {
  const command =
    opts.command !== undefined ? opts.command : defaultOpts.command
  const baseURL =
    opts.baseURL !== undefined ? opts.baseURL : defaultOpts.baseURL
  const rebuildOpts: Required<RehypeImageSaltOptionsRebuild> = {
    tagName:
      opts.rebuild?.tagName !== undefined
        ? opts.rebuild.tagName
        : defaultOpts.rebuild.tagName,
    keepBaseURL:
      opts.rebuild?.keepBaseURL !== undefined
        ? opts.rebuild.keepBaseURL
        : defaultOpts.rebuild.keepBaseURL,
    baseAttrs:
      opts.rebuild?.baseAttrs !== undefined
        ? opts.rebuild.baseAttrs
        : defaultOpts.rebuild.baseAttrs
  }
  const embedOpts: Required<RehypeImageSaltOptionsEmbed> = {
    embedTo:
      opts.embed?.embedTo !== undefined
        ? opts.embed.embedTo
        : defaultOpts.embed.embedTo,
    pickAttrs:
      opts.embed?.pickAttrs !== undefined
        ? opts.embed.pickAttrs
        : defaultOpts.embed.pickAttrs
  }

  const baseProperties = rebuildOpts.baseAttrs
    ? decodeAttrs(`${rebuildOpts.baseAttrs}`)
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
    const text: Text | undefined =
      parent.children[imageIdx + 1]?.type === 'text'
        ? (parent.children[imageIdx + 1] as Text)
        : undefined

    if (
      typeof image.properties?.src === 'string' &&
      image.properties.src.startsWith(baseURL)
    ) {
      const imageAlt =
        typeof image.properties?.alt === 'string' ? image.properties?.alt : ''
      const blockText = text?.value || ''
      let imageURL = image.properties.src
      let largeImageURL = ''

      const ra = attrs(imageAlt, blockText)
      const workProperties: Properties = {}
      Object.assign(workProperties, baseProperties, ra.properties || {})
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
      if (!rebuildOpts.keepBaseURL) {
        imageURL = trimBaseURL(baseURL, imageURL)
      }

      const imageTag: Element = {
        type: 'element',
        tagName: rebuildOpts.tagName,
        properties: {
          src: imageURL,
          alt: ra.alt,
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
      if (ra.removeBlock) {
        parent.children.splice(imageIdx + 1, 1)
      }
      parent.children[imageIdx] = rebuilded
    }
  }

  const visitorEmbed = (node: Node, parents: Parent[]) => {
    const parentsLen = parents.length
    const parent: Parent = parents[parentsLen - 1]
    const imageIdx = parent.children.findIndex((n) => n === node)
    const image: Element = node as Element
    const text: Text | undefined =
      parent.children[imageIdx + 1]?.type === 'text'
        ? (parent.children[imageIdx + 1] as Text)
        : undefined

    if (
      typeof image.properties?.src === 'string' &&
      image.properties.src.startsWith(baseURL)
    ) {
      const imageAlt =
        typeof image.properties?.alt === 'string' ? image.properties?.alt : ''
      const imageProperties = image.properties || {}
      const blockText = text?.value || ''

      const ra = attrs(imageAlt, blockText)
      const picked = pickAttrs(imageProperties, embedOpts.pickAttrs)

      const { src: imageURL, alt: _alt, ...others } = imageProperties
      const rebuilded: (Element | Text)[] = [
        {
          type: 'element',
          tagName: rebuildOpts.tagName,
          properties: {
            src: imageURL,
            alt:
              embedOpts.embedTo === 'alt'
                ? salt(
                    extractAttrsFromAlt(imageAlt),
                    editAttrs(ra.properties || {}, picked)
                  )
                : salt(extractAttrsFromAlt(imageAlt), {}),
            ...others
          },
          children: []
        }
      ]
      if (embedOpts.embedTo === 'block') {
        const value = sblock(editAttrs(ra.properties || {}, picked))
        if (value) {
          rebuilded.push({
            type: 'text',
            value
          })
        }
      }
      if (ra.removeBlock) {
        parent.children.splice(imageIdx + 1, 1)
      }
      parent.children.splice(imageIdx, 1, ...rebuilded)
    }
  }

  let visitor: (node: Node, parents: Parent[]) => void = (
    node: Node,
    parents: Parent[]
  ) => {}
  if (command === 'rebuild') {
    visitor = visitorRebuild
  } else if (command === 'embed') {
    visitor = visitorEmbed
  }

  return function transformer(tree: Node): void {
    visitParents(tree, visitTest, visitor)
  }
}
