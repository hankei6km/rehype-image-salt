import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import stringify from 'rehype-stringify'
import { rehypeImageSalt, RehypeImageSaltOptions } from '../src/image-salt.js'

const f = async (
  markdown: string,
  opts?: RehypeImageSaltOptions | RehypeImageSaltOptions[]
): Promise<string> => {
  return await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeImageSalt, opts || {})
    .use(stringify, {})
    .freeze()
    .process(markdown)
    .then(
      (file) => {
        return String(file)
      },
      (error) => {
        throw error
      }
    )
}

describe('rehypeImageSalt rebuild', () => {
  // attrs がこの順番で出力されるとは限らない.
  // 変化するようならユーティリティを利用.
  it('should rebuild img tag', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt=""></p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt=""></p>'
    )
  })
  it('should rebuild img tag with attrs from alt', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="{sizes=&#x22;sm:100vw md:50vw lg:400px&#x22;}"></p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" class="light-img"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="" sizes="sm:100vw md:50vw lg:400px"></p>'
    )
  })
  it('should rebuild img tag with attrs from block', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1">{class="light-img"}</p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="">{ sizes="sm:100vw md:50vw lg:400px"}</p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" class="light-img"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="" sizes="sm:100vw md:50vw lg:400px"></p>'
    )
  })
  it('should rebuild slibing img by each block', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1<img src="/path/to/image1.jpg" alt="image1">{class="light-img"} <img src="/path/to/image2.jpg" alt="">{ sizes="sm:100vw md:50vw lg:400px"}</p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1<img src="/path/to/image1.jpg" alt="image1" class="light-img"> <img src="/path/to/image2.jpg" alt="" sizes="sm:100vw md:50vw lg:400px"></p>'
    )
  })
  it('should rebuild img tag with attrs from both alt and block', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{width=&#x22;300&#x22; height=&#x22;200&#x22;}">{class="light-img"}</p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="">{ sizes="sm:100vw md:50vw lg:400px"}</p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200" class="light-img"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="" sizes="sm:100vw md:50vw lg:400px"></p>'
    )
  })
  it('should rebuild to nuxt-img tag', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1"></p>',
        { rebuild: { tagName: 'nuxt-img' } }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><nuxt-img src="/path/to/image1.jpg" alt="image1"></nuxt-img></p>'
    )
  })
  it('should convert(decode) modifiers to :modifiers', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{modifiers=&#x22;blur=100&#x22;}"></p>',
        { rebuild: { tagName: 'nuxt-img' } }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><nuxt-img src="/path/to/image1.jpg" alt="image1" :modifiers="{&#x22;blur&#x22;:&#x22;100&#x22;}"></nuxt-img></p>'
    )
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1">{modifiers="blur=100"}</p>',
        { rebuild: { tagName: 'nuxt-img' } }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><nuxt-img src="/path/to/image1.jpg" alt="image1" :modifiers="{&#x22;blur&#x22;:&#x22;100&#x22;}"></nuxt-img></p>'
    )
  })
  it('should replace query parameter', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300" alt="image1{data-salt-qq=&#x22;blur=100&#x22;}"></p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?blur=100" alt="image1"></p>'
    )
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300" alt="image1">{data-salt-qq="blur=100"}</p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?blur=100" alt="image1"></p>'
    )
  })
  it('should merge query parameter', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300&blur=200" alt="image1{data-salt-q=&#x22;blur=100&#x22;}"></p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300&#x26;blur=100" alt="image1"></p>'
    )
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300&blur=200" alt="image1">{data-salt-q="blur=100"}</p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300&#x26;blur=100" alt="image1"></p>'
    )
  })
  it('should trim baseURL', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p>',
        {
          baseURL: 'https://localhost:3000/',
          rebuild: {}
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" class="light-img"></p>'
    )
  })
  it('should skip url that was not matched baseURL', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2{class=&#x22;light-img&#x22;}"></p>',
        {
          baseURL: 'https://localhost:3000/',
          rebuild: {}
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" class="light-img"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2{class=&#x22;light-img&#x22;}"></p>'
    )
  })
  it('should keep baseURL', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p>',
        {
          baseURL: 'https://localhost:3000/',
          rebuild: {
            keepBaseURL: true
          }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1" class="light-img"></p>'
    )
  })
  it('should apply baseAttrs', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{modifiers=&#x22;blur=100&#x22;}"></p>',
        {
          rebuild: {
            tagName: 'nuxt-img',
            baseAttrs: 'provider="imgix"'
          }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><nuxt-img src="/path/to/image1.jpg" alt="image1" provider="imgix" :modifiers="{&#x22;blur&#x22;:&#x22;100&#x22;}"></nuxt-img></p>'
    )
  })
  it('should overwrite baseAttrs', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{class=&#x22;dark-img&#x22; modifiers=&#x22;blur=100&#x22;}"></p>',
        {
          rebuild: {
            tagName: 'nuxt-img',
            baseAttrs: 'provider="imgix" class="light-img"'
          }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><nuxt-img src="/path/to/image1.jpg" alt="image1" provider="imgix" class="dark-img" :modifiers="{&#x22;blur&#x22;:&#x22;100&#x22;}"></nuxt-img></p>'
    )
  })
  it('should rebuild into anchor tag', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300&h=200" alt="image1{data-salt-thumb}"></p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><a href="/path/to/image1.jpg" target="_blank" rel="noopener noreferrer"><img src="/path/to/image1.jpg?w=300&#x26;h=200" alt="image1"></a></p>'
    )
  })
  it('should rebuild into anchor tag(query)', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg?w=300&h=200" alt="image1{data-salt-thumb=&#x22;w=600&#x22;}"></p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><a href="/path/to/image1.jpg?w=600" target="_blank" rel="noopener noreferrer"><img src="/path/to/image1.jpg?w=300&#x26;h=200" alt="image1"></a></p>'
    )
  })
  it('should skip text node that is not match block', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1">text1{class="light-img"}test2</p>'
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1">text1{class="light-img"}test2</p>'
    )
  })
  it('should accept array opts', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2"></p>',
        [
          {
            baseURL: 'https://localhost:3000/',
            rebuild: {
              keepBaseURL: true,
              baseAttrs: 'class="light-img"'
            }
          },
          {
            baseURL: 'https://localhost:3001/',
            rebuild: {
              keepBaseURL: true,
              baseAttrs: 'class="dark-img"'
            }
          }
        ]
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1" class="light-img"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2" class="dark-img"></p>'
    )
  })
})

describe('rehypeImageSalt embed', () => {
  // attrs がこの順番で出力されるとは限らない.
  // 変化するようならユーティリティを利用.
  it('should embed attrs to img tag', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt=""></p>',
        { command: 'embed', embed: {} }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{width=&#x22;300&#x22; height=&#x22;200&#x22;}" width="300" height="200"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt=""></p>'
    )
  })
  it('should embed attrs to block', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt=""></p>',
        { command: 'embed', embed: { embedTo: 'block' } }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200">{width="300" height="200"}</p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt=""></p>'
    )
  })
  it('should pick attrs to embed', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200" class="light-img"></p>',
        {
          command: 'embed',
          embed: { pickAttrs: ['width', 'class'] }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{width=&#x22;300&#x22; class=&#x22;light-img&#x22;}" width="300" height="200" class="light-img"></p>'
    )
  })
  it('should add alt when alt does not exist', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" width="300" height="200" class="light-img"></p>',
        {
          command: 'embed',
          embed: { pickAttrs: ['width', 'class'] }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="{width=&#x22;300&#x22; class=&#x22;light-img&#x22;}" width="300" height="200" class="light-img"></p>'
    )
  })
  it('should merge attrs to embedded attrs', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{height=&#x22;400&#x22;}" width="300" height="200" class="light-img"></p>',
        {
          command: 'embed',
          embed: { pickAttrs: ['width', 'class'] }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{height=&#x22;400&#x22; width=&#x22;300&#x22; class=&#x22;light-img&#x22;}" width="300" height="200" class="light-img"></p>'
    )
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200" class="light-img">{height="400"}</p>',
        {
          command: 'embed',
          embed: { pickAttrs: ['width', 'class'] }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{height=&#x22;400&#x22; width=&#x22;300&#x22; class=&#x22;light-img&#x22;}" width="300" height="200" class="light-img"></p>'
    )
  })
  it('should merge attrs to embedded attrs then embed to block', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200" class="light-img">{height="400"}</p>',
        {
          command: 'embed',
          embed: { embedTo: 'block', pickAttrs: ['width', 'class'] }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1" width="300" height="200" class="light-img">{height="400" width="300" class="light-img"}</p>'
    )
  })
  it('should protect embedded attrs', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{width=&#x22;600&#x22; height=&#x22;400&#x22;}" width="300" height="200" class="light-img"></p>',
        {
          command: 'embed',
          embed: { pickAttrs: ['width', 'height', 'class'] }
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{width=&#x22;600&#x22; height=&#x22;400&#x22; class=&#x22;light-img&#x22;}" width="300" height="200" class="light-img"></p>'
    )
  })
  it('should skip url that was not matched baseURL', async () => {
    expect(
      await f(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1" width="300" height="200"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2" width="300" height="200"></p>',
        {
          command: 'embed',
          baseURL: 'https://localhost:3000/',
          embed: {}
        }
      )
    ).toEqual(
      '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{width=&#x22;300&#x22; height=&#x22;200&#x22;}" width="300" height="200"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2" width="300" height="200"></p>'
    )
  })
})
