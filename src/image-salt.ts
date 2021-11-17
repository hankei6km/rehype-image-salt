import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
// import { Parent, Image, HTML } from 'mdast'
import { Root, Parent, Element, Properties, Text } from 'hast'
import { visitParents, CONTINUE, SKIP } from 'unist-util-visit-parents'
import {
  attrsFromAlt,
  attrsFromBlock,
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
    let slibingP: [Element, number] | undefined = undefined // block が取得されなかったときに算出.

    if (
      typeof image.properties?.src === 'string' &&
      image.properties.src.startsWith(baseURL)
    ) {
      const imageAlt =
        typeof image.properties?.alt === 'string' ? image.properties?.alt : ''
      let imageURL = image.properties.src
      let largeImageURL = ''

      const resFromAlt = attrsFromAlt(imageAlt)
      let resFromBlock = attrsFromBlock(parent.children, imageIdx + 1)
      if (
        resFromBlock.removeRange === undefined &&
        (resFromBlock.properties === undefined ||
          Object.keys(resFromBlock.properties).length === 0)
      ) {
        slibingP = slibingParagraph(parents)
        if (slibingP) {
          resFromBlock = attrsFromBlock(slibingP[0].children, 0)
        }
      }
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
        const children =
          slibingP === undefined
            ? parent.children
            : (parents[parentsLen - 2].children[slibingP[1]] as Element)
                .children // parent の slibing の paragraph を対象に除去する.
        children.splice(
          resFromBlock.removeRange.startIdx,
          resFromBlock.removeRange.count
        )
        if (
          textValue &&
          children[resFromBlock.removeRange.endIdx].type === 'text' // 念のため.
        ) {
          ;(children[resFromBlock.removeRange.endIdx] as Text).value = textValue
        }
        // slibing の paragraph との間に white space 的な text node が存在していても除去しない.
        if (children.length === 0 && slibingP) {
          // slibing の paragraph が空になった場合は除去する(rehype-split-paragraph を使う?)
          parents[parentsLen - 2].children.splice(slibingP[1], 1)
        }
      }
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
