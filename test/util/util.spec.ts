import { defaultOpts } from '../../src/image-salt.js'
import {
  customAttrName,
  fitToMax,
  normalizeOpts,
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
