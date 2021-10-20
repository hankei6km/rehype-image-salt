import { trimBaseURL } from '../src/util.js'

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
