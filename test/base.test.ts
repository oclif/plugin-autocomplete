import {Config} from '@oclif/config'
import {expect} from 'chai'
import * as path from 'path'

import {AutocompleteBase} from '../src/base'

// autocomplete will throw error on windows
const {default: runtest} = require('./helpers/runtest')

class AutocompleteTest extends AutocompleteBase {
  async run() {}
}

const root = path.resolve(__dirname, '../package.json')
const config = new Config({root})

const cmd = new AutocompleteTest([], config)

runtest('AutocompleteBase', () => {
  beforeEach(async () => {
    await config.load()
  })

  it('#convertWindowsBash', async () => {
    expect(cmd.convertWindowsBash('bash')).to.eq('bash')
    expect(cmd.convertWindowsBash('zsh')).to.eq('zsh')
    expect(cmd.convertWindowsBash('fish')).to.eq('fish')
    expect(cmd.convertWindowsBash('C:\\Users\\someone\\bin\\bash.exe')).to.eq('bash')
  })

  it('#errorIfWindows', async () => {
    let lastError
    cmd.config.windows = true
    try {
      cmd.errorIfWindows()
    } catch (e) {
      lastError = e
    }
    expect(lastError.message).to.eq('Autocomplete is not currently supported in Windows')
  })

  it('#errorIfWindows no error with bash on windows', async () => {
    let lastError
    cmd.config.windows = true
    cmd.config.shell = 'C:\\bin\\bash.exe'
    try {
      cmd.errorIfWindows()
    } catch (e) {
      lastError = e
    }
    expect(lastError).to.eq(undefined)
  })

  it('#errorIfNotSupportedShell', async () => {
    try {
      cmd.errorIfNotSupportedShell('fish')
    } catch (e) {
      expect(e.message).to.eq('fish is not a supported shell for autocomplete')
    }
  })

  it('#autocompleteCacheDir', async () => {
    expect(cmd.autocompleteCacheDir).to.eq(path.join(config.cacheDir, 'autocomplete'))
  })

  it('#acLogfile', async () => {
    expect(cmd.acLogfilePath).to.eq(path.join(config.cacheDir, 'autocomplete.log'))
  })
})
