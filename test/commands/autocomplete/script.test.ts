import {expect, test} from '@oclif/test'

// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../../helpers/runtest')

skipWindows('autocomplete:script', () => {
  test
  .stdout()
  .command(['autocomplete:script', 'bash'])
  .it('outputs bash profile config', ctx => {
    expect(ctx.stdout).to.contain(`
# oclif autocomplete setup
OCLIF_AC_BASH_SETUP_PATH=${
    ctx.config.cacheDir
  }/autocomplete/bash_setup && test -f $OCLIF_AC_BASH_SETUP_PATH && source $OCLIF_AC_BASH_SETUP_PATH;
`
    )
  })

  test
  .stdout()
  .command(['autocomplete:script', 'zsh'])
  .it('outputs zsh profile config', ctx => {
    expect(ctx.stdout).to.contain(`
# oclif autocomplete setup
OCLIF_AC_ZSH_SETUP_PATH=${
    ctx.config.cacheDir
  }/autocomplete/zsh_setup && test -f $OCLIF_AC_ZSH_SETUP_PATH && source $OCLIF_AC_ZSH_SETUP_PATH;
`
    )
  })

  test
  .stdout()
  .command(['autocomplete:script', 'fish'])
  .catch(e => {
    expect(e.message).to.contain('fish is not a supported shell for autocomplete')
  })
  .it('errors on unsupported shell')
})
