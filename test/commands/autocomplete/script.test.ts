import * as path from 'path'

import {expect, test} from '@oclif/test'
// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../../helpers/runtest')

skipWindows('autocomplete:script', () => {
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
  .command(['autocomplete:script', 'powershell'])
  .it('outputs powershell profile config', ctx => {
    expect(ctx.stdout).to.contain(`
$env:OCLIF_EXAMPLE_AC_POWERSHELL_COMPFUNC_PATH="${path.join(
    ctx.config.cacheDir, 'autocomplete', 'functions', 'powershell', 'oclif-example.ps1',
  )}"; .$env:OCLIF_EXAMPLE_AC_POWERSHELL_COMPFUNC_PATH
`)
  })

  test
  .stdout()
  .command(['autocomplete:script', 'fish'])
  .catch(error => {
    expect(error.message).to.contain('fish is not a supported shell for autocomplete')
  })
  .it('errors on unsupported shell')
})
