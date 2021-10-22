#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import cli from './cli.js'

// coverage が top-level await になる
import { CommandNames } from './image-salt.js'
;(async () => {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('rehype-image-salt')
    .env('REHYPE_IMAGE_SALT')
    .usage('$0 [OPTION]...')
    .example(
      'cat foo.html | $0 rebuild',
      'Rebuild img tag using attributes embedded in alt'
    )
    .command(
      'rebuild [OPTIONS]...',
      'Rebuild img tag using attributes embedded in alt',
      (yargs) => {
        return yargs.options({
          'tag-name': {
            type: 'string',
            required: false,
            description: 'tag name to rebuild img tag'
          },
          'keep-base-url': {
            type: 'boolean',
            required: false,
            description: 'keep baseURL in src of image'
          },
          'base-attrs': {
            type: 'string',
            required: false,
            description: 'base attrs to set tag generated'
          }
        })
      }
    )
    .command(
      'embed [OPTIONS]...',
      'Embed img tag attributes into alt',
      (yargs) => {
        return yargs.options({
          'pick-attrs': {
            type: 'string',
            array: true,
            required: false,
            description: 'pick attrs to embed to alt'
          }
        })
      }
    )
    .options({
      'base-url': {
        type: 'string',
        required: false,
        description: 'select image node'
      }
    })
    .help().argv

  process.exit(
    await cli({
      command: `${argv._[0]}` as CommandNames | undefined,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
      baseURL: argv['base-url'],
      rebuild: {
        tagName: argv['tag-name'],
        keepBaseURL: argv['keep-base-url'],
        baseAttrs: argv['base-attrs']
      },
      embed: {
        piackAttrs: argv['pick-attrs']
      }
    })
  )
})()
