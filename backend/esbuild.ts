import esbuild from 'esbuild'

const isWatchMode = process.argv.includes('--watch')

const buildOptions: esbuild.BuildOptions = {
  entryPoints: ['src/backend/app.ts'],
  outfile: 'dist/backend.js',
  bundle: true,
  platform: 'node',
  sourcemap: true
}

const watch = async () => {
  const context = await esbuild.context(buildOptions)
  await context.watch()
  console.log('watching')
}

if (isWatchMode) {
  console.log('Watching for changes...')
  watch().then(() => console.log('done watching'))
} else {
  esbuild.build(buildOptions)
}
