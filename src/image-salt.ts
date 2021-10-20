import { Plugin, Transformer } from 'unified'
import { Node } from 'unist'
// import { Parent, Image, HTML } from 'mdast'
import { Parent, Element, Properties } from 'hast'
import { visitParents } from 'unist-util-visit-parents'
import { toHtml } from 'hast-util-to-html'
import { attrs, decodeAttrs } from './alt-attrs.js'
import { editQuery, toModifiers } from './query.js'
import { trimBaseURL } from './util.js'

export type RemarkImageSaltOptions = {
  tagName?: string
  baseURL?: string
  keepBaseURL?: boolean
  baseAttrs?: string
}
const defaultOpts: Required<RemarkImageSaltOptions> = {
  tagName: 'img',
  baseURL: '',
  keepBaseURL: false,
  baseAttrs: ''
}

export const remarkImageSalt: Plugin = function remarkImageSalt({
  tagName: inTagName,
  baseURL: inBaseURL,
  keepBaseURL: inKeepBaseURL,
  baseAttrs: inBaseAttrs
}: RemarkImageSaltOptions = defaultOpts): Transformer {
  const { tagName, baseURL, keepBaseURL, baseAttrs }: typeof defaultOpts = {
    tagName: inTagName !== undefined ? inTagName : defaultOpts.tagName,
    baseURL: inBaseURL !== undefined ? inBaseURL : defaultOpts.baseURL,
    keepBaseURL:
      inKeepBaseURL !== undefined ? inKeepBaseURL : defaultOpts.keepBaseURL,
    baseAttrs: inBaseAttrs !== undefined ? inBaseAttrs : defaultOpts.baseAttrs
  }
  const baseProperties = baseAttrs ? decodeAttrs(`${baseAttrs}`) : {}

  const visitTest = (node: Node) => {
    if (node.type === 'element' && (node as Element).tagName === 'img') {
      return true
    }
    return false
  }

  return function transformer(tree: Node): void {
    visitParents(tree, visitTest, (node, parents: Parent[]) => {
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
        if (!keepBaseURL) {
          imageURL = trimBaseURL(baseURL, imageURL)
        }

        const imageTag: Element = {
          type: 'element',
          tagName,
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
    })
  }
}
