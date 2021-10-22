import parse5 from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { Element } from 'hast'
import { Node } from 'unist'
import { Properties } from 'hast'
import { toHtml } from 'hast-util-to-html'

export type ExtractAttrs = {
  source: string
  extracted: boolean
  surrounded: [string, string]
  start: string
  attrs: string
  end: string
}

type AttrsResult = {
  alt: string
  properties?: Properties
  query?: string
  modifiers?: string
}

export function decodeAttrs(s: string): Properties {
  const dummy = `<dummy ${s}/>`
  const p5ast = parse5.parseFragment(String(dummy), {
    sourceCodeLocationInfo: true
  })
  const n: Node = fromParse5(p5ast)
  if ((n.type = 'element')) {
    const root: Element = n as Element
    const dummy = root.children[0]
    if (
      root.children.length === 1 &&
      dummy.type === 'element' &&
      dummy.tagName === 'dummy' &&
      dummy.children.length === 0
    ) {
      return dummy.properties || {}
    }
  }
  throw new Error('extractAttrs: invalid attrs has injected')
  //throw new Error(`extractAttrs: invalid attrs has injected: ${s}`)
}

const stripTagRegExp = /^<dummy (.[^>]+)><\/dummy>/
export function encodeAttrs(properties: Properties): string {
  const dummy: Element = {
    type: 'element',
    tagName: 'dummy',
    children: [],
    properties
  }
  const h = toHtml(dummy)
  const m = h.match(stripTagRegExp)
  if (m) {
    return m[1] || ''
  }
  return ''
}

export function editAttrs(
  attrs: Properties,
  s: Properties,
  replace?: boolean
): Properties {
  const ret: Properties = {}
  Object.entries(s).forEach(([k, v]) => {
    if (attrs[k] === undefined || replace) {
      ret[k] = s[k]
    } else {
      ret[k] = attrs[k]
    }
  })
  return ret
}

export function piackAttrs(attrs: Properties, pick: string[]): Properties {
  const { src: _src, alt: _alt, className, ...others } = attrs
  const ret: Properties = {}
  Object.entries(attrs)
    .filter(([k]) => pick.includes(k))
    .forEach(([k, v]) => (ret[k] = v))
  if (pick.includes('class')) {
    ret.className = className
  }
  return ret
}

const extractRegExp = /(^[^#]*)#([^#]+)#(.*$)/
export function extractAttrs(alt: string): ExtractAttrs {
  const s = alt.match(extractRegExp)
  if (s) {
    return {
      source: alt,
      extracted: true,
      surrounded: ['#', '#'],
      start: s[1],
      attrs: s[2],
      end: s[3]
    }
  }
  return {
    source: alt,
    extracted: false,
    surrounded: ['', ''],
    start: '',
    attrs: '',
    end: ''
  }
}

const dimRegExp = /^d:(\d+)x(\d+)$/
export function attrs(alt: string): AttrsResult {
  // Properties {
  const e = extractAttrs(alt)
  if (e.extracted) {
    const properties: Properties = {}
    Object.entries(decodeAttrs(e.attrs)).forEach(([k, v]) => {
      const dm = k.match(dimRegExp)
      if (dm) {
        properties.width = parseInt(dm[1], 10)
        properties.height = parseInt(dm[2], 10)
        return
      }
      properties[k] = v
    })
    return {
      alt: `${e.start}${e.end}`,
      properties
    }
  }
  return { alt }
}

export function salt(ex: ExtractAttrs, propertiess: Properties): string {
  const alt = encodeAttrs(propertiess)
  if (alt) {
    if (ex.extracted) {
      return `${ex.start}${ex.surrounded[0]}${alt}${ex.surrounded[1]}${ex.end}`
    }
    return `${ex.source}#${alt}#`
  }
  return ex.source
}
