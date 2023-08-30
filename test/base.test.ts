import {Config} from '@oclif/core'
import {expect} from 'chai'
import * as path from 'path'
import {readFile, rm} from 'fs/promises'

import {AutocompleteBase} from '../src/base'

class AutocompleteTest extends AutocompleteBase {
  async run() {
    return null
  }
}

const root = path.resolve(__dirname, '../package.json')
const config = new Config({root})

const cmd = new AutocompleteTest([], config)

describe('AutocompleteBase', () => {
  beforeEach(async () => {
    await config.load()
  })

  it('#convertWindowsBash',  () => {
    expect(cmd.determineShell('bash')).to.eq('bash')
    expect(cmd.determineShell('zsh')).to.eq('zsh')
    expect(cmd.determineShell('fish')).to.eq('fish')
    expect(cmd.determineShell('C:\\Users\\someone\\bin\\bash.exe')).to.eq('bash')
    expect(() => {
      cmd.determineShell('')
    }).to.throw()
  })

  it('#autocompleteCacheDir',  () => {
    expect(cmd.autocompleteCacheDir).to.eq(path.join(config.cacheDir, 'autocomplete'))
  })

  it('#acLogfile', async () => {
    expect(cmd.acLogfilePath).to.eq(path.join(config.cacheDir, 'autocomplete.log'))
    await rm(cmd.acLogfilePath, {force: true, recursive: true})
    cmd.writeLogFile('testing')

    const logs = await readFile(cmd.acLogfilePath, 'utf8')
    expect(logs).to.include('testing')
  })
})
