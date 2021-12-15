import { ReadStream } from 'fs'
import { PassThrough } from 'stream'
import cli from '../src/cli.js'

describe('cli()', () => {
  const io: Record<'stdin' | 'stdout' | 'stderr', PassThrough> = {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough()
  }
  beforeEach(() => {
    io.stdin = new PassThrough()
    io.stdout = new PassThrough()
    io.stderr = new PassThrough()
  })

  it('should return stdout from rebuild command with exitcode=0', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="{sizes=&#x22;sm:100vw md:50vw lg:400px&#x22;}"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        rebuild: {},
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should return stdout from rebuild command with exitcode=0 (block style)', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1">{class="light-img"}</p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="">{sizes="sm:100vw md:50vw lg:400px"}</p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        rebuild: {},
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should skip url was not matched baseURL', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2{class=&#x22;light-img&#x22;}"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {},
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should trim baseURL', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {
          keepBaseURL: false
        },
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should rebuild to nuxt-img', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;}"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {
          tagName: 'nuxt-img',
          baseAttrs: 'provider="imgix"'
        },
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should apply baseAttrs', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;dark-img&#x22; modifiers=&#x22;blur=100&#x22;}"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {
          keepBaseURL: true,
          baseAttrs: 'provider="imgix" class="rounded"'
        },
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should return stdout from embed command with exitcode=0', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1{class=&#x22;dark-img&#x22; modifiers=&#x22;blur=100&#x22;}" width="300" height="200"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        command: 'embed',
        baseURL: 'https://localhost:3000/',
        rebuild: {
          keepBaseURL: true,
          baseAttrs: 'provider="imgix" class="light-img"'
        },
        embed: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should return stderr with exitcode=1', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1{class=&#x22;light-img&#x22;&gt;}"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: '',
        rebuild: {
          tagName: '',
          keepBaseURL: false,
          baseAttrs: ''
        },
        embed: {}
      })
    ).toEqual(1)
    expect(outData).toEqual('')
    expect(errData).toMatchSnapshot()
  })
})
