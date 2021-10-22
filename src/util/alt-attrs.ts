import parse5 from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { Element } from 'hast'
import { Node } from 'unist'
import { Properties } from 'hast'
import { toHtml } from 'hast-util-to-html'

// const fenceStart = '##'
// const fenceEnd = '##'

export type ExtractAttrsFromAlt = {
  source: string
  extracted: boolean
  surrounded: [string, string]
  start: string
  attrs: string
  end: string
}

export type ExtractAttrsFromBlock = {
  source: string
  extracted: boolean
  surrounded: [string, string]
  attrs: string
}

type AttrsResult = {
  alt: string
  removeBlock?: boolean
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
  base: Properties,
  attrs: Properties,
  replace?: boolean
): Properties {
  const ret: Properties = { ...base }
  Object.entries(attrs).forEach(([k, v]) => {
    if (base[k] === undefined || replace) {
      ret[k] = attrs[k]
    }
  })
  return ret
}

export function pickAttrs(attrs: Properties, pick: string[]): Properties {
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

const extractAttrsFromAltRegExp = /(^[^#]*)##(.+)##(.*$)/
export function extractAttrsFromAlt(alt: string): ExtractAttrsFromAlt {
  const s = alt.match(extractAttrsFromAltRegExp)
  if (s) {
    return {
      source: alt,
      extracted: true,
      surrounded: ['##', '##'],
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
const extractAttrsFromBlockRegExp = /^([ \n\r]*){([^}]+)}([ \n\r]*)$/m
export function extractAttrsFromBlock(block: string): ExtractAttrsFromBlock {
  const s = block.match(extractAttrsFromBlockRegExp)
  if (s) {
    return {
      source: block,
      extracted: true,
      surrounded: ['{', '}'],
      attrs: s[2]
    }
  }
  return {
    source: block,
    extracted: false,
    surrounded: ['', ''],
    attrs: ''
  }
}

const dimRegExp = /^d:(\d+)x(\d+)$/m
function decodeDim(attrs: Properties): Properties {
  const properties: Properties = {}
  Object.entries(attrs).forEach(([k, v]) => {
    const dm = k.match(dimRegExp)
    if (dm) {
      properties.width = parseInt(dm[1], 10)
      properties.height = parseInt(dm[2], 10)
      return
    }
    properties[k] = v
  })
  return properties
}

export function attrs(alt: string, block: string): AttrsResult {
  const ret: AttrsResult = {
    alt,
    properties: {}
  }

  const a = extractAttrsFromAlt(alt)
  if (a.extracted) {
    Object.assign(ret.properties, decodeDim(decodeAttrs(a.attrs)))
    ret.alt = `${a.start}${a.end}`
  }
  const b = extractAttrsFromBlock(block)
  if (b.extracted) {
    Object.assign(ret.properties, decodeDim(decodeAttrs(b.attrs)))
    ret.removeBlock = true
  }
  return ret
}

export function salt(ex: ExtractAttrsFromAlt, propertiess: Properties): string {
  const attrText = encodeAttrs(propertiess)
  if (attrText) {
    if (ex.extracted) {
      return `${ex.start}${ex.surrounded[0]}${attrText}${ex.surrounded[1]}${ex.end}`
    }
    return `${ex.source}##${attrText}##`
  }
  if (ex.extracted) {
    return `${ex.start}${ex.end}`
  }
  return ex.source
}

export function sblock(propertiess: Properties): string {
  const attrText = encodeAttrs(propertiess)
  if (attrText) {
    return `{${attrText}}`
  }
  return ''
}
