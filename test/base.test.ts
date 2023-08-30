import {Config} from '@oclif/core'
import * as Chai from 'chai'
import * as path from 'path'
import * as fs from 'fs'
import * as Sinon from 'sinon'
import * as SinonChai from 'sinon-chai'

import {AutocompleteBase} from '../src/base'

Chai.use(SinonChai)
const expect = Chai.expect

class AutocompleteTest extends AutocompleteBase {
  async run() {
    return null
  }
}

const root = path.resolve(__dirname, '../package.json')
const config = new Config({root})

const cmd = new AutocompleteTest([], config)

describe('AutocompleteBase', () => {
  let fsWriteStub: Sinon.SinonStub
  let fsOpenSyncStub: Sinon.SinonStub

  before(() => {
    fsWriteStub = Sinon.stub(fs, 'writeSync')
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
