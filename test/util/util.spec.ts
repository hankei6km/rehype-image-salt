import { defaultOpts } from '../../src/image-salt.js'
import { normalizeOpts, trimBaseURL } from '../../src/util/util.js'

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
