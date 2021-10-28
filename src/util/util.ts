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
