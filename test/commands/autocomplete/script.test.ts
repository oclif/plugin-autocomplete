import * as path from 'path'

import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'

import {Config, expect, test} from '@oclif/test'

import ScriptCommand from '../../../src/commands/autocomplete/script'

chai.use(sinonChai)

describe('autocomplete:script', () => {
  test
  .stdout()
  .command(['autocomplete:script', 'bash'])
  .it('outputs bash profile config', ctx => {
    expect(ctx.stdout).to.contain(`
OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH=${path.join(
    ctx.config.cacheDir, 'autocomplete', 'functions', 'bash', 'oclif-example.bash',
  )} && test -f $OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH && source $OCLIF_EXAMPLE_AC_BASH_COMPFUNC_PATH;
`,
    )
  })

  test
  .stdout()
  .command(['autocomplete:script', 'zsh'])
  .it('outputs zsh profile config', ctx => {
    expect(ctx.stdout).to.contain(`
fpath=(
${path.join(ctx.config.cacheDir, 'autocomplete', 'functions', 'zsh')}
$fpath
);
autoload -Uz compinit;
compinit;
`,
    )
  })

  test
  .stdout()
  .command(['autocomplete:script', 'fish'])
  .catch(error => {
    expect(error.message).to.contain('fish is not a supported shell for autocomplete')
  })
  .it('errors on unsupported shell')

  // TODO: Change all the above tests that use fancy-test to use the new style as shown below
  // This allows us to spoof the oclif config and test the output of the script command with the topicSeparator either being ':' or ' '

  let ScriptCommandLogStub: sinon.SinonStub
  const sandbox = sinon.createSandbox()

  afterEach(() => {
    sandbox.restore()
  })

  it('outputs powershell profile config', async () => {
    ScriptCommandLogStub = sandbox.stub(ScriptCommand.prototype, 'log')

    const config = new Config({root: path.resolve(__dirname, '../../../package.json')})
    config.topicSeparator = ' '
    await config.load()

    const cmdWithSpaces = new ScriptCommand(['powershell'], config)
    await cmdWithSpaces.run()

    expect(ScriptCommandLogStub.args[0][0]).to.contain(`
$env:OCLIF_EXAMPLE_AC_POWERSHELL_COMPFUNC_PATH="${path.join(
    cmdWithSpaces.config.cacheDir, 'autocomplete', 'functions', 'powershell', 'oclif-example.ps1',
  )}"; .$env:OCLIF_EXAMPLE_AC_POWERSHELL_COMPFUNC_PATH`)
  })
})
