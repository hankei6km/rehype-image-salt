import parse5 from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { Node } from 'unist'
import { Element, Parent, Root } from 'hast'
import { defaultOpts } from '../../src/image-salt.js'
import {
  customAttrName,
  fitToMax,
  normalizeOpts,
  removeBlock,
  slibingParagraph,
  trimBaseURL
} from '../../src/util/util.js'
import { attrsFromBlock } from '../../src/util/attrs.js'

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
    expect(fitToMax([4000, 2000], '0')).toEqual([0, 0])
    expect(fitToMax([4000, undefined], '600')).toEqual([600, undefined])
  })
  it('should passthru dimension', async () => {
    expect(fitToMax([4000, 2000], 600)).toEqual([4000, 2000])
    expect(fitToMax([4000, 2000], -1)).toEqual([4000, 2000])
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
      2,
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
      2,
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

describe('removeBlock()', () => {
  const f = (h: string): Node[] => {
    const p5ast = parse5.parseFragment(String(h), {
      sourceCodeLocationInfo: true
    })
    return (fromParse5(p5ast) as Root).children
  }
  it('should remove block from text', () => {
    const n: Parent[] = f(
      '<div><p><img src="image.jpg">{class="light-img" sizes="sm:100vw md:50vw lg:400px"}</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(f('<div><p><img src="image.jpg"></p></div>'))
  })
  it('should remove block from text(keep text)', () => {
    const n: Parent[] = f(
      '<div><p><img src="image.jpg">{class="light-img" sizes="sm:100vw md:50vw lg:400px"}text1</p><p>text2</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(
      f('<div><p><img src="image.jpg">text1</p><p>text2</p></div>')
    )
  })
  it('should remove block from text(trim as blank)', () => {
    const n: Parent[] = f(
      '<div><p><img src="image.jpg">\n{class="light-img" sizes="sm:100vw md:50vw lg:400px"}<br>text<br>text</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(
      f('<div><p><img src="image.jpg"><br>text<br>text</p></div>')
    )
  })
  it('should remove block from following paragraph', () => {
    const n: Parent[] = f(
      '<div><img src="image.jpg"><p>{class="light-img" sizes="sm:100vw md:50vw lg:400px"}</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(f('<div><img src="image.jpg"></div>'))
  })
  it('should remove block from following paragraph(keep txt)', () => {
    const n: Parent[] = f(
      '<div><img src="image.jpg"><p>{class="light-img" sizes="sm:100vw md:50vw lg:400px"}text1</p><p>text2</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(
      f('<div><img src="image.jpg"><p>text1</p><p>text2</p></div>')
    )
  })
  it('should remove block from following paragraph(trim as blank)', () => {
    // following の場合は image と paragraph の間に text は入らない.
    const n: Parent[] = f(
      '<div><img src="image.jpg"><p>\n{class="light-img" sizes="sm:100vw md:50vw lg:400px"}text<br>text</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(f('<div><img src="image.jpg"><p>text<br>text</p></div>'))
  })
  it('should remove block from slibing paragraph', () => {
    const n: Parent[] = f(
      '<div><p><img src="image.jpg"></p><p>{class="light-img" sizes="sm:100vw md:50vw lg:400px"}</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(f('<div><p><img src="image.jpg"></p></div>'))
  })
  it('should remove block from slibing paragraph(keep text)', () => {
    const n: Parent[] = f(
      '<div><p><img src="image.jpg"></p><p>{class="light-img" sizes="sm:100vw md:50vw lg:400px"}text1</p><p>text2</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(
      f('<div><p><img src="image.jpg"></p><p>text1</p><p>text2</p></div>')
    )
  })
  it('should remove block from slibing paragraph(trim as blank)', () => {
    const n: Parent[] = f(
      '<div><p><img src="image.jpg"></p>\n<p>{class="light-img" sizes="sm:100vw md:50vw lg:400px"}text</p></div>'
    ) as Parent[]
    const parents = [n[0], n[0].children[0] as Parent]
    const parent = parents[1]
    const imageIdx = 0
    removeBlock(
      parents,
      parent,
      imageIdx,
      attrsFromBlock(parents, parent.children, imageIdx + 1)
    )
    expect(n).toEqual(f('<div><p><img src="image.jpg"></p>\n<p>text</p></div>'))
  })
})
