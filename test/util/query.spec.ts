import { decodeBase64Url, toModifiers } from '../../src/util/query.js'

describe('decodeBase64Url()', () => {
  it('should decode base64 url string', async () => {
    expect(decodeBase64Url('Zm9jYWxwb2ludA')).toEqual('focalpoint')
  })
})

describe('toModifiers()', () => {
  it('should convert query to modifiers', async () => {
    expect(
      toModifiers(
        'auto=compress%2Cformat&crop64=Zm9jYWxwb2ludA&fit64=Y3JvcA&fp-x64=MC42&fp-z64=MS4z'
      )
    ).toEqual({
      auto: 'compress,format',
      crop: 'focalpoint',
      fit: 'crop',
      'fp-x': '0.6',
      'fp-z': '1.3'
    })
  })
})
