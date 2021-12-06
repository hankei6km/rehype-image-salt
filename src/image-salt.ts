import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
// import { Parent, Image, HTML } from 'mdast'
import { Root, Parent, Element, Properties, Text } from 'hast'
import { visitParents, CONTINUE, SKIP } from 'unist-util-visit-parents'
import {
  attrsFromAlt,
  attrsFromBlock,
  AttrsResultFromBlock,
  editAttrs,
  extractAttrsFromAlt,
  mergeAttrs,
  pickAttrs,
  salt,
  sblock
} from './util/attrs.js'
import { editQuery, toModifiers } from './util/query.js'
import {
  customAttrName,
  fitToMax,
  normalizeOpts,
  removeBlock,
  slibingParagraph,
  trimBaseURL
} from './util/util.js'

const customAttrPrefix = 'salt'
const customAttrNameModifiers = 'modifiers'
const customAttrNameMaxWidth = customAttrName(customAttrPrefix, 'max-w')
const customAttrNameMaxHeight = customAttrName(customAttrPrefix, 'max-h')
// const customAttrNameQueryForce = customAttrName(customAttrPrefix, 'query!')  // '!' は hast の properties の中で扱いが微妙になる(キャメルケースにならない)
const customAttrNameQueryForce = customAttrName(customAttrPrefix, 'q')
const customAttrNameQueryMerge = customAttrName(customAttrPrefix, 'qm')
const customAttrNameThumb = customAttrName(customAttrPrefix, 'thumb')

const targetTagName = 'img'
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
    tagName: targetTagName,
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
    if (
      node.type === 'element' &&
      (node as Element).tagName === targetTagName
    ) {
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
      let linkToURL = ''

      const resFromAlt = attrsFromAlt(imageAlt)
      const resFromBlock = attrsFromBlock(
        parents,
        parent.children,
        imageIdx + 1
      )
      // const workProperties: Properties = {}
      // Object.assign(
      //   workProperties,
      //   rebuildOpts.baseProperties,
      //   resFromAlt.properties || {},
      //   resFromBlock.properties || {}
      // )
      const workProperties: Properties = mergeAttrs(
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
        if (k === customAttrNameModifiers) {
          key = `:${k}`
          value = JSON.stringify(toModifiers(`${v}`))
        } else if (k === customAttrNameMaxWidth) {
          // リサイズはループの後で行う.
          set = false
        } else if (k === customAttrNameMaxHeight) {
          // リサイズはループの後で行う.
          set = false
        } else if (k === customAttrNameQueryForce) {
          imageURL = editQuery(baseURL, imageURL, `${v}`, true)
          set = false
        } else if (k === customAttrNameQueryMerge) {
          imageURL = editQuery(baseURL, imageURL, `${v}`, false)
          set = false
        } else if (k === customAttrNameThumb) {
          const thumbOpt = `${v}`
          if (
            thumbOpt.startsWith('http://') ||
            thumbOpt.startsWith('https://') ||
            thumbOpt.startsWith('/')
          ) {
            linkToURL = thumbOpt
          } else {
            linkToURL = editQuery(baseURL, imageURL, `${v}`, true)
          }
          set = false
        }
        if (set) {
          properties[key] = value
        }
      })
      if (!rebuildOpts.keepBaseURL) {
        imageURL = trimBaseURL(baseURL, imageURL)
      }
      if (typeof workProperties[customAttrNameMaxWidth] === 'string') {
        const d = fitToMax(
          [properties.width, properties.height],
          workProperties[customAttrNameMaxWidth]
        )
        properties.width = d[0]
        properties.height = d[1]
      }
      if (typeof workProperties[customAttrNameMaxHeight] === 'string') {
        const d = fitToMax(
          [properties.height, properties.width],
          workProperties[customAttrNameMaxHeight]
        )
        properties.width = d[1]
        properties.height = d[0]
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
      if (linkToURL) {
        const targetRel = linkToURL.startsWith('/')
          ? {}
          : {
              target: '_blank',
              rel: 'noopener noreferrer'
            }
        const linkToTag: Element = {
          type: 'element',
          tagName: 'a',
          properties: {
            href: linkToURL,
            ...targetRel
          },
          children: [imageTag]
        }
        rebuilded = linkToTag
      }
      // block を取り除く.
      removeBlock(parents, parent, imageIdx, resFromBlock)

      // 再構築された image へ置き換える.
      parent.children[imageIdx] = rebuilded

      return SKIP // サムネイル化で <a> の children になるので.
    }
  }

  const visitorEmbed = (
    { baseURL, embed: embedOpts }: RehypeImageSaltOptionsNormalized,
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
      const resFromBlock = attrsFromBlock(
        parents,
        parent.children,
        imageIdx + 1
      )
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
          tagName: targetTagName,
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
      // block を取り除く
      // (block の attrs は新しい要素に埋め込まれた状態になっているので、
      // ソースは削除する).
      removeBlock(parents, parent, imageIdx, resFromBlock)

      // 埋め込まれた image へ置き換える.
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
