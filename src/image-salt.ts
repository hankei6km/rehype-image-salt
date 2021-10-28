import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
// import { Parent, Image, HTML } from 'mdast'
import { Root, Parent, Element, Properties, Text } from 'hast'
import { visitParents, CONTINUE, SKIP } from 'unist-util-visit-parents'
import { toHtml } from 'hast-util-to-html'
import {
  attrsFromAlt,
  attrsFromBlock,
  decodeAttrs,
  editAttrs,
  extractAttrsFromAlt,
  pickAttrs,
  salt,
  sblock
} from './util/attrs.js'
import { editQuery, toModifiers } from './util/query.js'
import { normalizeOpts, trimBaseURL } from './util/util.js'

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
export type RehypeImageSaltOptionsNormalized =
  Required<RehypeImageSaltOptions> & {
    rebuild: Required<RehypeImageSaltOptionsRebuild> & {
      baseProperties: Properties
    }
    embed: Required<RehypeImageSaltOptionsEmbed>
  }

export const defaultOpts: Required<RehypeImageSaltOptions> & {
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
  [RehypeImageSaltOptions] | [RehypeImageSaltOptions[]] | [],
  string,
  Root
> = function rehypeImageSalt(
  opts: RehypeImageSaltOptions | RehypeImageSaltOptions[] = defaultOpts
): Transformer {
  const nopts = normalizeOpts(opts)

  const visitTest = (node: Node) => {
    if (node.type === 'element' && (node as Element).tagName === 'img') {
      return true
    }
    return false
  }

  const visitorRebuild = (
    { baseURL, rebuild: rebuildOpts }: RehypeImageSaltOptionsNormalized,
    node: Node,
    parents: Parent[]
  ) => {
    const parentsLen = parents.length
    const parent: Parent = parents[parentsLen - 1]
    const imageIdx = parent.children.findIndex((n) => n === node)
    const image: Element = node as Element

    if (
      typeof image.properties?.src === 'string' &&
      image.properties.src.startsWith(baseURL)
    ) {
      const imageAlt =
        typeof image.properties?.alt === 'string' ? image.properties?.alt : ''
      let imageURL = image.properties.src
      let largeImageURL = ''

      const resFromAlt = attrsFromAlt(imageAlt)
      const resFromBlock = attrsFromBlock(parent.children, imageIdx + 1)
      const workProperties: Properties = {}
      Object.assign(
        workProperties,
        rebuildOpts.baseProperties,
        resFromAlt.properties || {},
        resFromBlock.properties || {}
      )
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
          alt: resFromAlt.alt,
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
      if (resFromBlock.removeRange) {
        const textValue = resFromBlock.removeRange.keepText
        parent.children.splice(
          resFromBlock.removeRange.startIdx,
          resFromBlock.removeRange.count
        )
        if (
          textValue &&
          parent.children[resFromBlock.removeRange.endIdx].type === 'text' // 念のため.
        ) {
          ;(parent.children[resFromBlock.removeRange.endIdx] as Text).value =
            textValue
        }
      }
      parent.children[imageIdx] = rebuilded
      return SKIP // サムネイル化で <a> の children になるので.
    }
  }

  const visitorEmbed = (
    {
      baseURL,
      rebuild: rebuildOpts,
      embed: embedOpts
    }: RehypeImageSaltOptionsNormalized,
    node: Node,
    parents: Parent[]
  ) => {
    const parentsLen = parents.length
    const parent: Parent = parents[parentsLen - 1]
    const imageIdx = parent.children.findIndex((n) => n === node)
    const image: Element = node as Element

    if (
      typeof image.properties?.src === 'string' &&
      image.properties.src.startsWith(baseURL)
    ) {
      const imageAlt =
        typeof image.properties?.alt === 'string' ? image.properties?.alt : ''
      const imageProperties = image.properties || {}

      const resFromAlt = attrsFromAlt(imageAlt)
      const resFromBlock = attrsFromBlock(parent.children, imageIdx + 1)
      const workProperties: Properties = {}
      Object.assign(
        workProperties,
        resFromAlt.properties || {},
        resFromBlock.properties || {}
      )
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
                    editAttrs(workProperties, picked)
                  )
                : salt(extractAttrsFromAlt(imageAlt), {}),
            ...others
          },
          children: []
        }
      ]
      if (embedOpts.embedTo === 'block') {
        const value = sblock(editAttrs(workProperties, picked))
        if (value) {
          rebuilded.push({
            type: 'text',
            value
          })
        }
      }

      if (resFromBlock.removeRange) {
        const textValue = resFromBlock.removeRange.keepText
        parent.children.splice(
          resFromBlock.removeRange.startIdx,
          resFromBlock.removeRange.count
        )
        if (
          textValue &&
          parent.children[resFromBlock.removeRange.endIdx].type === 'text' // 念のため.
        ) {
          ;(parent.children[resFromBlock.removeRange.endIdx] as Text).value =
            textValue
        }
      }
      parent.children.splice(imageIdx, 1, ...rebuilded)
      return
    }
  }

  return function transformer(tree: Node): void {
    nopts.forEach((opts) => {
      const visitor = (node: Node, parents: Parent[]) => {
        if (opts.command === 'rebuild') {
          return visitorRebuild(opts, node, parents)
        } else if (opts.command === 'embed') {
          return visitorEmbed(opts, node, parents)
        }
      }
      visitParents(tree, visitTest, visitor)
    })
  }
}
