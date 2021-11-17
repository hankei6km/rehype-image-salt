import { camelCase } from 'camel-case'
import { Element, Parent, Properties } from 'hast'
import {
  defaultOpts,
  RehypeImageSaltOptions,
  RehypeImageSaltOptionsNormalized
} from '../image-salt.js'
import { decodeAttrs } from './attrs.js'

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
    if (!Number.isNaN(mn) && d[0] > mn) {
      ret[0] = mn
      if (typeof d[1] === 'number') {
        ret[1] = Math.round((d[1] * mn) / d[0])
      }
    }
  }
  return ret
}

export function slibingParagraph(
  parents: Parent[]
): [Element, number] | undefined {
  const plen = parents.length
  if (plen > 1) {
    const childrenInParent2 = parents[plen - 2].children
    const l = childrenInParent2.length
    const parentIdx = childrenInParent2.findIndex(
      (n) => n === parents[plen - 1]
    )
    if (parentIdx >= 0 && parentIdx + 1 < l) {
      const s = parents[plen - 2].children[parentIdx + 1]
      if (s.type === 'element' && s.tagName === 'p') {
        return [s as Element, parentIdx + 1]
      }
    }
  }
  return undefined
}
