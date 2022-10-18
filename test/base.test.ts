import {Config} from '@oclif/core'
import * as Chai from 'chai'
import * as path from 'path'
import * as fs from 'fs-extra'
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

const configWithSpaces = Object.create(config)
configWithSpaces.topicSeparator = ' '

const cmd = new AutocompleteTest([], config)
const cmdWithSpaces = new AutocompleteTest([], configWithSpaces)

describe('AutocompleteBase', () => {
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

  describe('#errorIfNotSupported', async () => {
    it('should throw error if shell is not supported', async () => {
      try {
        cmd.errorIfNotSupported('fish')
        expect('This should throw an error but it did not').to.be.empty // If this expect statement is reached, the test fails
      } catch (error: any) {
        expect(error.message).to.eq('fish is not a supported shell for autocomplete')
      }
    })

    it('should throw if powershell & topicSeparator is a colon', async () => {
      try {
        cmd.errorIfNotSupported('powershell')
        expect('This should throw an error but it did not').to.be.empty // If this expect statement is reached, the test fails
      } catch (error: any) {
        expect(error.message).to.eq('Autocomplete for powershell is not supported in CLIs with commands separated by colons')
      }
    })

    it('should not throw if zsh & topicSeparator is a space', async () => {
      await configWithSpaces.load()
      try {
        cmdWithSpaces.errorIfNotSupported('zsh')
        expect('This should throw an error but it did not').to.be.empty // If this expect statement is reached, the test fails
      } catch (error: any) {
        expect(error.message).to.eq('Autocomplete for zsh is not supported in CLIs with commands separated by spaces')
      }
    })
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
