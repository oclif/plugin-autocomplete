import {expect, test} from '@oclif/test'

// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../../helpers/runtest')

skipWindows('autocomplete:script', () => {
  test
  .stdout()
  .command(['autocomplete:script', 'bash'])
  .it('outputs bash profile config', ctx => {
    expect(ctx.stdout).to.contain(`
OCLIF_EXAMPLE_AC_BASH_SETUP_PATH=${
  ctx.config.cacheDir
}/autocomplete/bash_setup && test -f $OCLIF_EXAMPLE_AC_BASH_SETUP_PATH && source $OCLIF_EXAMPLE_AC_BASH_SETUP_PATH; # oclif-example autocomplete setup
`,
    )
  })

  test
  .stdout()
  .command(['autocomplete:script', 'zsh'])
  .it('outputs zsh profile config', ctx => {
    expect(ctx.stdout).to.contain(`
OCLIF_EXAMPLE_AC_ZSH_SETUP_PATH=${
  ctx.config.cacheDir
}/autocomplete/zsh_setup && test -f $OCLIF_EXAMPLE_AC_ZSH_SETUP_PATH && source $OCLIF_EXAMPLE_AC_ZSH_SETUP_PATH; # oclif-example autocomplete setup
`,
    )
  })

  test
  .stdout()
  .command(['autocomplete:script', 'fish'])
  .it('outputs fish profile config', ctx => {
    expect(ctx.stdout).to.contain(`
OCLIF_EXAMPLE_AC_FISH_SETUP_PATH=${
  ctx.config.cacheDir
}/autocomplete/fish_setup && test -f $OCLIF_EXAMPLE_AC_FISH_SETUP_PATH && source $OCLIF_EXAMPLE_AC_FISH_SETUP_PATH; # oclif-example autocomplete setup
`,
    )
  })
})
