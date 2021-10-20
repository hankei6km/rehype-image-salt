import typescript from '@rollup/plugin-typescript'

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.cjs',
    format: 'cjs'
  },
  plugins: [typescript()],
  external: ['parse5', 'hast-util-from-parse5', 'unist-util-visit-parents']
}
