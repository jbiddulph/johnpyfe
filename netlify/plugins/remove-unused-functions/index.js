// The Netlify Emails plugin (installed from the Netlify UI) always creates a Lambda-compatible
// `emails` function. It's unused here, and Lambda functions fail to deploy once the site's
// env vars exceed AWS's 4KB limit. UI plugins run before netlify.toml plugins, so remove it here.
import fs from 'node:fs'
import path from 'node:path'

export const onBuild = () => {
  const dir = path.join('.netlify', 'functions-internal', 'emails')
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log('Removed unused Lambda-compatible emails function')
  }
}
