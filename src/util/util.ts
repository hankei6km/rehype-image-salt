import { camelCase } from 'camel-case'
import { Element, Parent, Properties, Text } from 'hast'
import {
  defaultOpts,
  RehypeImageSaltOptions,
  RehypeImageSaltOptionsNormalized
} from '../image-salt.js'
import { AttrsResultFromBlock, decodeAttrs } from './attrs.js'

function _normalizeOpts(
  opts: RehypeImageSaltOptions
): RehypeImageSaltOptionsNormalized {
  const baseAttrs =
    opts.rebuild?.baseAttrs !== undefined
      ? opts.rebuild.baseAttrs
      : defaultOpts.rebuild.baseAttrs
  const ret: RehypeImageSaltOptionsNormalized = {
    command: opts.command !== undefined ? opts.command : defaultOpts.command,
    baseURL: opts.baseURL !== undefined ? opts.baseURL : defaultOpts.baseURL,
    rebuild: {
      tagName:
        opts.rebuild?.tagName !== undefined
          ? opts.rebuild.tagName
          : defaultOpts.rebuild.tagName,
      keepBaseURL:
        opts.rebuild?.keepBaseURL !== undefined
          ? opts.rebuild.keepBaseURL
          : defaultOpts.rebuild.keepBaseURL,
      baseAttrs,
      baseProperties: baseAttrs ? decodeAttrs(baseAttrs) : {}
    },
    embed: {
      embedTo:
        opts.embed?.embedTo !== undefined
          ? opts.embed.embedTo
          : defaultOpts.embed.embedTo,
      pickAttrs:
        opts.embed?.pickAttrs !== undefined
          ? opts.embed.pickAttrs
          : defaultOpts.embed.pickAttrs
    }
  }

  return ret
}
export function normalizeOpts(
  opts: RehypeImageSaltOptions | RehypeImageSaltOptions[]
): RehypeImageSaltOptionsNormalized[] {
  if (Array.isArray(opts)) {
    return opts.map((v) => _normalizeOpts(v))
  } else {
    return [_normalizeOpts(opts)]
  }
}

export function customAttrName(prefix: string, name: string): string {
  return camelCase(`data-${prefix}-${name}`)
}

export function trimBaseURL(base: string | undefined, url: string): string {
  if (base && url.startsWith(base)) {
    const t = url.substring(base.length)
    if (!t.startsWith('/')) {
      return `/${t}`
    }
    return t
  }
  return url
}

type PropValue = Properties['PropertyName']
export function fitToMax(
  d: [PropValue, PropValue],
  m: unknown
): [PropValue, PropValue] {
  const ret: [PropValue, PropValue] = [d[0], d[1]]
  if (typeof m === 'string' && typeof d[0] === 'number') {
    const mn = Number.parseInt(m, 10)
    if (!Number.isNaN(mn) && mn >= 0 && d[0] > mn) {
      // 0 は受け付ける (0 は意味があるようなので).
      // https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-height-dev
      ret[0] = mn
      if (typeof d[1] === 'number') {
        ret[1] = Math.round((d[1] * mn) / d[0])
      }
    }
  }
  return ret
}

const slibingParagraphTextSkipRegExp = /^[\s]*$/
export function slibingParagraph(
  parents: Parent[]
): [Element, number, number] | undefined {
  const plen = parents.length
  if (plen > 1) {
    const parent = parents[plen - 1]
    const parent2 = parents[plen - 2]
    const childrenInParent2 = parent2.children
    const parentIdx = childrenInParent2.findIndex((n) => n === parent)
    if (parentIdx >= 0) {
      const l = childrenInParent2.length
      for (let idx = parentIdx + 1; idx < l; idx++) {
        const s = parent2.children[idx]
        if (s.type === 'element' && s.tagName === 'p') {
          return [s as Element, parentIdx + 1, idx] // [対象の node, 親の中での親のidx +1 ,対象の idx ]
        } else if (
          s.type === 'text' &&
          s.value.match(slibingParagraphTextSkipRegExp)
        ) {
        } else {
          return undefined
        }
      }
    }
  }
  return undefined
}

export function removeBlock(
  parents: Parent[],
  parent: Parent,
  imageIdx: number,
  resFromBlock: AttrsResultFromBlock
) {
  if (resFromBlock.removeRange) {
    const parentsLen = parents.length
    const textValue = resFromBlock.removeRange.keepText
    const children =
      resFromBlock.blockBy === 'slibing'
        ? (
            parents[parentsLen - 2].children[
              resFromBlock.slibingP![2] // blockBy が slibing なら undefined はない.
            ] as Element
          ).children // parent の slibing の paragraph を対象に除去する.
        : resFromBlock.blockBy === 'following'
        ? (parent.children[imageIdx + 1] as Element).children
        : parent.children
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
    // paragrah が空になっていたら取り除く.
    if (resFromBlock.blockBy === 'slibing') {
      if (children.length === 0) {
        // slibing の paragraph が空になった場合は
        // paragraph と間の white space 的な text node (存在していたら)を削除する.
        const removeSlibingStart = resFromBlock.slibingP![1]
        const removeSlibingCount =
          resFromBlock.slibingP![2] - resFromBlock.slibingP![1] + 1
        parents[parentsLen - 2].children.splice(
          removeSlibingStart,
          removeSlibingCount
        )
      }
    } else if (resFromBlock.blockBy === 'following') {
      if (children.length === 0) {
        // following の paragraph が空になった場合は
        // paragraph と間のはなにも存在しないので単純に paragraph のみを取り除く.
        parent.children.splice(imageIdx + 1, 1)
      }
    }
  }
}
