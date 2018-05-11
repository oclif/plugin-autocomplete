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
  before(async () => {
    await config.load()
  })

  it('#errorIfWindows', async () => {
    try {
      cmd.errorIfWindows()
    } catch (e) {
      expect(e.message).to.eq('Autocomplete is not currently supported in Windows')
    }
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
