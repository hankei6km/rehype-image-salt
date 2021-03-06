import parse5 from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { Element, Parent, Properties, Text } from 'hast'
import { Node } from 'unist'
import { toHtml } from 'hast-util-to-html'
import { encodeQuery, toModifiers } from './query.js'
import { slibingParagraph } from './util.js'

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
  extracted: boolean
  surrounded: [string, string]
  range: [number, number, string]
  attrs: string
}

export type AttrsResultFromAlt = {
  alt: string
  properties?: Properties
}

type AttrsResultFromBlockBy = 'text' | 'following' | 'slibing' | 'none'
export type AttrsResultFromBlock = {
  blockBy: AttrsResultFromBlockBy
  removeRange?: {
    startIdx: number
    endIdx: number
    keepText: string
    count: number
  }
  slibingP?: [Element, number, number]
  properties?: Properties
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

// TODO: editAttrs ?????????????????????.
// TODO: modifiers ???????????????????????????????????????(??????Properties ???????????????????????????????????????????????????).
export function mergeAttrs(...properties: Properties[]): Properties {
  const ret: Properties = {}
  Object.assign(ret, ...properties) // modifiers ?????????????????????????????????????????????.

  const modifiers = encodeQuery(
    Object.assign(
      {},
      ...properties.map(({ modifiers }) => ({
        ...toModifiers((modifiers || '') as string)
      }))
    )
  )
  if (modifiers) {
    ret.modifiers = modifiers
  }
  const classNameSet = properties.reduce((s, { className: c }) => {
    if (Array.isArray(c)) {
      const className = c.filter((v) => !`${v}`.startsWith('-'))
      className.forEach((c) => {
        s.add(c)
      })
      const notClassName = c.filter((v) => `${v}`.startsWith('-'))
      notClassName.forEach((n) => {
        s.delete((n as string).slice(1))
      })
    }
    return s
  }, new Set())
  if (classNameSet.size > 0) {
    ret.className = [...classNameSet.values()] as string[]
  }

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

const extractAttrsFromAltRegExp = /(^[^{]*){(.+)}(.*$)/
export function extractAttrsFromAlt(alt: string): ExtractAttrsFromAlt {
  const s = alt.match(extractAttrsFromAltRegExp)
  if (s) {
    return {
      source: alt,
      extracted: true,
      surrounded: ['{', '}'],
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

const extractAttrsFromBlockStartRegExp = /^[\s]*{/m
const extractAttrsFromBlockRegExp = /^([\s]*){[\s]*(.+)[\s]*}(.*)$/ms // block ????????????????????????
const extractAttrsFromBlockRegTextSkipExp = /^[\s]*$/m
// &nbsp; &ensp; &emsp; ????????????????????????????????????????????? white space ?????????.
// \s ?????? \t ???????????????????????????????????????.
// (\t ?????????????????????????????????????????????)
const extractAttrsFromBlockRegRemoveNbsp = /[\u00A0\u2002\u2003]/g
export function extractAttrsFromBlock(
  children: Node[],
  startIdx: number
): ExtractAttrsFromBlock {
  const ret: ExtractAttrsFromBlock = {
    extracted: false,
    surrounded: ['{', '}'],
    range: [-1, -1, ''],
    attrs: ''
  }
  const len = children.length
  for (let idx = startIdx; idx < len; idx++) {
    const n = children[idx]
    // block ???????????????????????????(???????????????????????? text node ?????????????????????).
    // ?????????????????????????????????????????????????????????.
    // - ????????? <br>
    // - [ \n\r\t] ??? text node

    if (
      n.type === 'text' &&
      (n as Text).value.match(extractAttrsFromBlockStartRegExp)
    ) {
      // block ?????????????????????????????? text node
      ret.range[0] = idx
      break
    } else if (
      !(
        (n.type === 'element' &&
          (n as Element).tagName === 'br' &&
          idx - startIdx === 0) ||
        (n.type === 'text' &&
          (n as Text).value.match(extractAttrsFromBlockRegTextSkipExp))
      )
    ) {
      // ?????????????????? node **??????????????????**
      ret.range[0] = -1
      break
    }
  }
  if (ret.range[0] >= 0) {
    // block ?????????????????????????????????????????????
    let textValue = ''
    for (let idx = ret.range[0]; idx < len; idx++) {
      const n = children[idx]
      if (n.type === 'text') {
        textValue = textValue + (n as Text).value
        const m = textValue.match(extractAttrsFromBlockRegExp)
        if (m) {
          ret.extracted = true
          ret.range[1] = idx
          ret.range[2] = m[3]
          ret.attrs = m[2].replace(extractAttrsFromBlockRegRemoveNbsp, ' ')
          break
        }
      } else if (n.type === 'element' && (n as Element).tagName === 'br') {
        textValue = textValue + '\n'
      } else {
        break
      }
    }
  }
  return ret
}

export function attrsFromAlt(alt: string): AttrsResultFromAlt {
  try {
    const ret: AttrsResultFromAlt = {
      alt,
      properties: {}
    }

    const a = extractAttrsFromAlt(alt)
    if (a.extracted) {
      Object.assign(ret.properties, decodeAttrs(a.attrs))
      ret.alt = `${a.start}${a.end}`
    }
    return ret
  } catch (err: any) {
    throw new Error(`attrsFromAlt: ${err}`)
  }
}

export function attrsFromBlock(
  parents: Parent[],
  children: Node[],
  startIdx: number
): AttrsResultFromBlock {
  try {
    const ret: AttrsResultFromBlock = {
      blockBy: 'none',
      properties: {}
    }
    const childrenLen = children.length
    const following: Element = children[startIdx] as Element

    if (startIdx >= childrenLen) {
      // ?????????????????? slibing ??? paragraph ?????????.
      const slibingP = slibingParagraph(parents)
      if (slibingP) {
        const b = extractAttrsFromBlock(slibingP[0].children, 0)
        if (b.extracted) {
          // ?????????????????????????????? 'slibing' 'following' 'text' ??????????????????????????????
          // ??????????????????????
          ret.blockBy = 'slibing'
          Object.assign(ret.properties, decodeAttrs(b.attrs))
          ret.removeRange = {
            startIdx: b.range[0],
            endIdx: b.range[1],
            keepText: b.range[2], // ????????? node ????????? text
            count: b.range[1] - b.range[0] + (b.range[2] ? 0 : 1)
          }
          ret.slibingP = slibingP
        }
      }
    } else if (
      following &&
      following.type === 'element' &&
      following.tagName === 'p'
    ) {
      // ????????? paragrah ???????????????????????????????????????.
      // ??????????????? paragraph ????????? 0.
      const b = extractAttrsFromBlock(following.children, 0)
      if (b.extracted) {
        ret.blockBy = 'following'
        Object.assign(ret.properties, decodeAttrs(b.attrs))
        ret.removeRange = {
          startIdx: b.range[0],
          endIdx: b.range[1],
          keepText: b.range[2], // ????????? node ????????? text
          count: b.range[1] - b.range[0] + (b.range[2] ? 0 : 1)
        }
      }
    } else {
      const b = extractAttrsFromBlock(children, startIdx)
      if (b.extracted) {
        ret.blockBy = 'text'
        Object.assign(ret.properties, decodeAttrs(b.attrs))
        ret.removeRange = {
          startIdx: b.range[0],
          endIdx: b.range[1],
          keepText: b.range[2], // ????????? node ????????? text
          count: b.range[1] - b.range[0] + (b.range[2] ? 0 : 1)
        }
      }
    }
    return ret
  } catch (err: any) {
    throw new Error(`attrsFromBlock: ${err}`)
  }
}

export function salt(ex: ExtractAttrsFromAlt, propertiess: Properties): string {
  const attrText = encodeAttrs(propertiess)
  if (attrText) {
    if (ex.extracted) {
      return `${ex.start}${ex.surrounded[0]}${attrText}${ex.surrounded[1]}${ex.end}`
    }
    return `${ex.source}{${attrText}}`
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
