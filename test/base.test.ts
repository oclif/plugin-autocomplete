import {Config} from '@oclif/core'
import * as Chai from 'chai'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as Sinon from 'sinon'
import * as SinonChai from 'sinon-chai'

import {AutocompleteBase} from '../src/base'

Chai.use(SinonChai)
const expect = Chai.expect

// autocomplete will throw error on windows
const {default: runtest} = require('./helpers/runtest')

class AutocompleteTest extends AutocompleteBase {
  async run() {
    return null
  }
}

const root = path.resolve(__dirname, '../package.json')
const config = new Config({root})

const cmd = new AutocompleteTest([], config)

runtest('AutocompleteBase', () => {
  let fsWriteStub: Sinon.SinonStub
  let fsOpenSyncStub: Sinon.SinonStub

  before(() => {
    fsWriteStub = Sinon.stub(fs, 'write')
    fsOpenSyncStub = Sinon.stub(fs, 'openSync').returns(7)
  })

  beforeEach(async () => {
    await config.load()
  })

  it('#convertWindowsBash', async () => {
    expect(cmd.determineShell('bash')).to.eq('bash')
    expect(cmd.determineShell('zsh')).to.eq('zsh')
    expect(cmd.determineShell('fish')).to.eq('fish')
    expect(cmd.determineShell('C:\\Users\\someone\\bin\\bash.exe')).to.eq('bash')
    expect(() => {
      cmd.determineShell('')
    }).to.throw()
  })

  it('#errorIfWindows', async () => {
    cmd.config.windows = true
    expect(() => {
      cmd.errorIfWindows()
    }).to.throw('Autocomplete is not currently supported in Windows')
  })

  it('#errorIfWindows no error with bash on windows', async () => {
    cmd.config.windows = true
    cmd.config.shell = 'C:\\bin\\bash.exe'
    expect(() => {
      cmd.errorIfWindows()
    }).to.not.throw('Autocomplete is not currently supported in Windows')
  })

  it('#errorIfNotSupportedShell', async () => {
    try {
      cmd.errorIfNotSupportedShell('fish')
    } catch (error: any) {
      expect(error.message).to.eq('fish is not a supported shell for autocomplete')
    }
  })

  it('#autocompleteCacheDir', async () => {
    expect(cmd.autocompleteCacheDir).to.eq(path.join(config.cacheDir, 'autocomplete'))
  })

  it('#acLogfile', async () => {
    expect(cmd.acLogfilePath).to.eq(path.join(config.cacheDir, 'autocomplete.log'))

    cmd.writeLogFile('testing')
    expect(fsOpenSyncStub).to.have.been.calledOnce
    expect(fsWriteStub).to.be.been.calledWith(7)
  })
})
