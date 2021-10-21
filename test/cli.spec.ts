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

  it('should return stdout with exitcode=0', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1#class=&#x22;light-img&#x22;#"></p><h2>test2</h2><p>image-salt-2</p><p><img src="/path/to/image2.jpg" alt="#sizes=&#x22;sm:100vw md:50vw lg:400px&#x22;#"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        rebuild: {}
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
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1#class=&#x22;light-img&#x22;#"></p><h2>test2</h2><p>image-salt-2</p><p><img src="https://localhost:3001/path/to/image2.jpg" alt="image2#class=&#x22;light-img&#x22;#"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {}
      })
    ).toEqual(0)
    expect(outData).toMatchSnapshot()
    expect(errData).toEqual('')
  })
  it('should keep baseURL', async () => {
    let outData = ''
    io.stdout.on('data', (d) => (outData = outData + d))
    let errData = ''
    io.stderr.on('data', (d) => (errData = errData + d))
    process.nextTick(() => {
      io.stdin.write(
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1#class=&#x22;light-img&#x22;#"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {
          keepBaseURL: true
        }
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
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="https://localhost:3000/path/to/image1.jpg" alt="image1#class=&#x22;dark-img&#x22; modifiers=&#x22;blur=100&#x22;#"></p>'
      )
      io.stdin.end()
    })

    expect(
      await cli({
        ...io,
        baseURL: 'https://localhost:3000/',
        rebuild: {
          keepBaseURL: true,
          baseAttrs: 'provider="imgix" class="light-img"'
        }
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
        '<h1>test</h1><h2>test1</h2><p>image-salt-1</p><p><img src="/path/to/image1.jpg" alt="image1#class=&#x22;light-img&#x22;&gt;#"></p>'
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
        }
      })
    ).toEqual(1)
    expect(outData).toEqual('')
    expect(errData).toMatchSnapshot()
  })
})
