import parse5 from 'parse5'
import { fromParse5 } from 'hast-util-from-parse5'
import { Node } from 'unist'
import { Root } from 'hast'
import { attrsFromAlt, attrsFromBlock, salt } from '../../src/util/attrs.js'

describe('attrsFromAlt()', () => {
  it('should extract attrs', async () => {
    expect(
      attrsFromAlt('abc{class="light-img" sizes="sm:100vw md:50vw lg:400px"}')
    ).toEqual({
      alt: 'abc',
      properties: {
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
    expect(
      attrsFromAlt('{class="light-img" sizes="sm:100vw md:50vw lg:400px"}ABC')
    ).toEqual({
      alt: 'ABC',
      properties: {
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
    expect(
      attrsFromAlt(
        'abc{class="light-img" sizes="sm:100vw md:50vw lg:400px"}ABC'
      )
    ).toEqual({
      alt: 'abcABC',
      properties: {
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
  })
  it('should extract attrs as enpty', async () => {
    expect(attrsFromAlt('abc{ }')).toEqual({
      alt: 'abc',
      properties: {}
    })
  })
  it('should extract attrs with query', async () => {
    expect(
      attrsFromAlt(
        'abc{width="300" height="200" class="light-img" q="auto=compress%2Cformat&crop64=Zm9jYWxwb2ludA&fit64=Y3JvcA&fp-x64=MC42&fp-z64=MS4z" sizes="sm:100vw md:50vw lg:400px"}'
      )
    ).toEqual({
      alt: 'abc',
      properties: {
        width: 300,
        height: 200,
        q: 'auto=compress%2Cformat&crop64=Zm9jYWxwb2ludA&fit64=Y3JvcA&fp-x64=MC42&fp-z64=MS4z',
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
  })
  it('should extract attrs with query(encoded)', async () => {
    expect(
      attrsFromAlt(
        'abc{width="300" height="200" class="light-img" q="auto=compress%2Cformat&#x26;crop64=Zm9jYWxwb2ludA&#x26;fit64=Y3JvcA&#x26;fp-x64=MC42&#x26;fp-z64=MS4z" sizes="sm:100vw md:50vw lg:400px"}'
      )
    ).toEqual({
      alt: 'abc',
      properties: {
        width: 300,
        height: 200,
        q: 'auto=compress%2Cformat&crop64=Zm9jYWxwb2ludA&fit64=Y3JvcA&fp-x64=MC42&fp-z64=MS4z',
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
  })
  it('should return just alt', async () => {
    expect(attrsFromAlt('abc')).toEqual({ alt: 'abc', properties: {} })
    expect(attrsFromAlt('abc{')).toEqual({ alt: 'abc{', properties: {} })
    expect(attrsFromAlt('abc{}')).toEqual({
      alt: 'abc{}',
      properties: {}
    })
    expect(attrsFromAlt('abc{ABC')).toEqual({
      alt: 'abc{ABC',
      properties: {}
    })
    expect(attrsFromAlt('abc{}ABC')).toEqual({
      alt: 'abc{}ABC',
      properties: {}
    })
  })
  it('should trhow error when invalid attrs has injected', async () => {
    expect(() =>
      attrsFromAlt(
        'abc{width="300" height="200" class="light-img" sizes="sm:100vw md:50vw lg:400px" >}'
      )
    ).toThrowError(
      'attrsFromAlt: Error: extractAttrs: invalid attrs has injected'
    )
  })
})

describe('attrsFromBlock()', () => {
  const f = (h: string): Node[] => {
    const p5ast = parse5.parseFragment(String(h), {
      sourceCodeLocationInfo: true
    })
    return (fromParse5(p5ast) as Root).children
  }
  it('should extract attrs from block', async () => {
    expect(
      attrsFromBlock(
        f(
          '<img src="image.jpg">{class="light-img" sizes="sm:100vw md:50vw lg:400px"}'
        ),
        1
      )
    ).toEqual({
      removeRange: { startIdx: 1, endIdx: 1, keepText: '', count: 1 },
      properties: {
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
  })
  it('should trim blank node', async () => {
    expect(
      attrsFromBlock(
        f(
          '<img src="image.jpg"><br>{<br>class="light-img" sizes="sm:100vw md:50vw lg:400px"<br>}'
        ),
        1
      )
    ).toEqual({
      removeRange: { startIdx: 2, endIdx: 6, keepText: '', count: 5 },
      properties: {
        className: ['light-img'],
        sizes: 'sm:100vw md:50vw lg:400px'
      }
    })
  })
  it('should separate attrs by <br>', async () => {
    expect(
      attrsFromBlock(f('<img src="image.jpg"><br>{<br>attr1<br>attr2<br>}'), 1)
    ).toEqual({
      removeRange: { startIdx: 2, endIdx: 8, keepText: '', count: 7 },
      properties: {
        attr1: '',
        attr2: ''
      }
    })
  })
  it('should set range with text value', async () => {
    expect(
      attrsFromBlock(f('<img src="image.jpg">{class="light-img"}text'), 1)
    ).toEqual({
      removeRange: { startIdx: 1, endIdx: 1, keepText: 'text', count: 0 },
      properties: { className: ['light-img'] }
    })
  })
  it('should set range by just block', async () => {
    expect(
      attrsFromBlock(
        f('<img src="image.jpg">{class="light-img"}text1<br>text2'),
        1
      )
    ).toEqual({
      removeRange: { startIdx: 1, endIdx: 1, keepText: 'text1', count: 0 },
      properties: { className: ['light-img'] }
    })
    expect(
      attrsFromBlock(
        f('<img src="image.jpg"><br>{<br>class="light-img"<br>}<br>text'),
        1
      )
    ).toEqual({
      removeRange: { startIdx: 2, endIdx: 6, keepText: '', count: 5 },
      properties: { className: ['light-img'] }
    })
    expect(() =>
      attrsFromBlock(
        f('<img src="image.jpg"><br>{<br>class="light-img"><br>}<br>text'),
        1
      )
    ).toThrowError(
      'attrsFromBlock: Error: extractAttrs: invalid attrs has injected'
    )
  })
  it('should not extract block when can not close block', async () => {
    expect(
      attrsFromBlock(
        f(
          '<img src="image1.jpg"><br>{<br>class="light-img"<br><img src="image2.jpg">'
        ),
        1
      )
    ).toEqual({
      properties: {}
    })
  })
  it('should not extract block when can not trimed', async () => {
    expect(
      attrsFromBlock(
        f('<img src="image.jpg">text<br>{<br>class="light-img"<br>}<br>text'),
        1
      )
    ).toEqual({
      properties: {}
    })
  })
})

describe('salt()', () => {
  it('should embed attr to alt', async () => {
    expect(
      salt(
        {
          source: 'river',
          extracted: false,
          surrounded: ['', ''],
          start: '',
          attrs: '',
          end: ''
        },
        { class: 'light-img' }
      )
    ).toEqual('river{class="light-img"}')
  })
  it('should embed "clasName:[]" as "class:string"', async () => {
    expect(
      salt(
        {
          source: 'river',
          extracted: false,
          surrounded: ['', ''],
          start: '',
          attrs: '',
          end: ''
        },
        { className: ['light-img', 'w-full'] }
      )
    ).toEqual('river{class="light-img w-full"}')
  })
  it('should drop undefined', async () => {
    expect(
      salt(
        {
          source: 'river',
          extracted: false,
          surrounded: ['', ''],
          start: '',
          attrs: '',
          end: ''
        },
        { class: ['light-img'], name: undefined }
      )
    ).toEqual('river{class="light-img"}')
  })
  it('should replace embedded', async () => {
    expect(
      salt(
        {
          source: 'river{class="light-img"} side',
          extracted: true,
          surrounded: ['{', '}'],
          start: 'river',
          attrs: 'class="light-img"',
          end: ' side'
        },
        { class: ['light-img'], width: '300', height: '200' }
      )
    ).toEqual('river{class="light-img" width="300" height="200"} side')
  })
})
