import {Config} from '@oclif/core'
import {runCommand} from '@oclif/test'
import {expect} from 'chai'

// autocomplete will throw error on windows ci
import {default as skipWindows} from '../../helpers/runtest.js'

skipWindows('autocomplete:script', () => {
  it('provides bash profile config', async () => {
    const config = await Config.load(import.meta.url)
    const {stdout} = await runCommand('autocomplete:script bash', config)
    expect(stdout).to.contain(`
OCLIF_EXAMPLE_AC_BASH_SETUP_PATH=${config.cacheDir}/autocomplete/bash_setup && test -f $OCLIF_EXAMPLE_AC_BASH_SETUP_PATH && source $OCLIF_EXAMPLE_AC_BASH_SETUP_PATH; # oclif-example autocomplete setup
`)
  })

  it('provides zsh profile config', async () => {
    const config = await Config.load(import.meta.url)
    const {stdout} = await runCommand('autocomplete:script zsh', config)
    expect(stdout).to.contain(`
OCLIF_EXAMPLE_AC_ZSH_SETUP_PATH=${config.cacheDir}/autocomplete/zsh_setup && test -f $OCLIF_EXAMPLE_AC_ZSH_SETUP_PATH && source $OCLIF_EXAMPLE_AC_ZSH_SETUP_PATH; # oclif-example autocomplete setup
`)
  })
})
