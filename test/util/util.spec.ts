import { Element, Parent } from 'hast'
import { defaultOpts } from '../../src/image-salt.js'
import {
  customAttrName,
  fitToMax,
  normalizeOpts,
  slibingParagraph,
  trimBaseURL
} from '../../src/util/util.js'

describe('normalizeOpts()', () => {
  it('should normalize opts', () => {
    expect(normalizeOpts({})).toEqual([
      {
        ...defaultOpts,
        rebuild: { ...defaultOpts.rebuild, baseProperties: {} }
      }
    ])
    expect(normalizeOpts({ command: 'embed' })).toEqual([
      {
        ...defaultOpts,
        command: 'embed',
        rebuild: { ...defaultOpts.rebuild, baseProperties: {} }
      }
    ])
  })
  it('should normalize opts[]', () => {
    expect(
      normalizeOpts([
        { command: 'embed', embed: { pickAttrs: ['class'] } },
        { baseURL: 'https://localhost:3000', rebuild: { tagName: 'nuxt-img' } }
      ])
    ).toEqual([
      {
        ...defaultOpts,
        command: 'embed',
        rebuild: { ...defaultOpts.rebuild, baseProperties: {} },
        embed: { ...defaultOpts.embed, pickAttrs: ['class'] }
      },
      {
        ...defaultOpts,
        baseURL: 'https://localhost:3000',
        rebuild: {
          ...defaultOpts.rebuild,
          tagName: 'nuxt-img',
          baseProperties: {}
        }
      }
    ])
  })
  it('should expand baseAttrs to baseProperties', () => {
    expect(
      normalizeOpts([
        { rebuild: { baseAttrs: 'class="light-img"' } },
        { rebuild: { baseAttrs: 'class="dark-img"' } }
      ])
    ).toEqual([
      {
        ...defaultOpts,
        rebuild: {
          ...defaultOpts.rebuild,
          baseAttrs: 'class="light-img"',
          baseProperties: { className: ['light-img'] }
        }
      },
      {
        ...defaultOpts,
        rebuild: {
          ...defaultOpts.rebuild,
          baseAttrs: 'class="dark-img"',
          baseProperties: { className: ['dark-img'] }
        }
      }
    ])
  })
})

describe('customAttrName()', () => {
  it('should return custom attr name as camelCase style', () => {
    expect(customAttrName('salt', 'qq')).toEqual('dataSaltQq')
    expect(customAttrName('salt', 'q')).toEqual('dataSaltQ')
    expect(customAttrName('salt', 'thumb')).toEqual('dataSaltThumb')
  })
})

describe('trimBaseURL()', () => {
  it('should trim url by baseURL', async () => {
    expect(
      trimBaseURL(
        'https://localhost:3000',
        'https://localhost:3000/path/to/image.jpg'
      )
    ).toEqual('/path/to/image.jpg')
    expect(
      trimBaseURL(
        'https://localhost:3000/',
        'https://localhost:3000/path/to/image.jpg'
      )
    ).toEqual('/path/to/image.jpg')
  })
  it('should return url if baseURL is blank', async () => {
    expect(trimBaseURL('', 'https://localhost:3000/path/to/image.jpg')).toEqual(
      'https://localhost:3000/path/to/image.jpg'
    )
  })
})

describe('fitToMax()', () => {
  it('should fit dimension to max-*', async () => {
    expect(fitToMax([4000, 2000], '600')).toEqual([600, 300])
    expect(fitToMax([4000, undefined], '600')).toEqual([600, undefined])
  })
  it('should passthru dimension', async () => {
    expect(fitToMax([4000, 2000], 600)).toEqual([4000, 2000])
    expect(fitToMax(['4000', '2000'], 600)).toEqual(['4000', '2000'])
    expect(fitToMax([400, 200], '600')).toEqual([400, 200])
    expect(fitToMax([undefined, 2000], '600')).toEqual([undefined, 2000])
    expect(fitToMax([undefined, undefined], '600')).toEqual([
      undefined,
      undefined
    ])
  })
})

describe('slibingParagraph()', () => {
  it('should return slibing paragraph', async () => {
    const curNode: Element = {
      type: 'element',
      tagName: 'p',
      children: [
        {
          type: 'element',
          tagName: 'img',
          children: []
        }
      ] as Element[]
    }
    expect(
      slibingParagraph([
        {
          type: 'element',
          children: [
            { type: 'element', tagName: 'p', children: [] },
            curNode,
            { type: 'element', tagName: 'p', children: [] } // <= これが目的の node.
          ]
        },
        curNode
      ])
    ).toEqual([
      {
        type: 'element',
        tagName: 'p',
        children: []
      },
      2
    ])
    expect(
      slibingParagraph([
        {
          type: 'element',
          children: [
            { type: 'element', tagName: 'p', children: [] },
            curNode,
            { type: 'text', value: '\n \u00A0' }, // <= これは飛ばされる.
            { type: 'element', tagName: 'p', children: [] } // <= これが目的の node.
          ]
        },
        curNode
      ])
    ).toEqual([
      {
        type: 'element',
        tagName: 'p',
        children: []
      },
      3
    ])
  })
  it('should return undefined', async () => {
    const curNode: Element = {
      type: 'element',
      tagName: 'p',
      children: [
        {
          type: 'element',
          tagName: 'img',
          children: []
        }
      ] as Element[]
    }
    expect(
      slibingParagraph([
        {
          type: 'element',
          children: [
            { type: 'element', tagName: 'p', children: [] },
            curNode // <= 次の node が存在しない.
          ]
        },
        curNode
      ])
    ).toEqual(undefined)
    expect(
      slibingParagraph([
        {
          type: 'element',
          children: [
            { type: 'element', tagName: 'p', children: [] },
            curNode,
            { type: 'element', tagName: 'div', children: [] } // <= p でない.
          ]
        },
        curNode
      ])
    ).toEqual(undefined)
    expect(
      slibingParagraph([
        {
          type: 'element',
          children: [
            { type: 'element', tagName: 'p', children: [] },
            curNode,
            { type: 'text', value: '\n \n \u00A0text' }, // <= white space 的なテキストでない.
            { type: 'element', tagName: 'p', children: [] }
          ]
        },
        curNode
      ])
    ).toEqual(undefined)
  })
})
