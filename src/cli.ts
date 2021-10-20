import { Readable, Writable } from 'stream'
import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import stringify from 'rehype-stringify'
import { remarkImageSalt, RemarkImageSaltOptions } from './image-salt.js'

type Opts = {
  stdin: Readable
  stdout: Writable
  stderr: Writable
} & RemarkImageSaltOptions
const cli = async (opts: Opts): Promise<number> => {
  const { stdin, stdout, stderr, ...imageSaltOpts } = opts
  try {
    let source = ''
    await new Promise((resolve) => {
      stdin.on('data', (d) => (source = source + d))
      stdin.on('end', () => resolve(source))
    })
    const m = await unified()
      .use(rehypeParse, { fragment: true })
      .use(remarkImageSalt, { ...imageSaltOpts })
      .use(stringify)
      .freeze()
      .process(source)
      .then(
        (file) => {
          return String(file)
        },
        (error) => {
          throw error
        }
      )
    stdout.write(m)
  } catch (err: any) {
    stderr.write(err.toString())
    stderr.write('\n')
    return 1
  }
  return 0
}

export default cli
