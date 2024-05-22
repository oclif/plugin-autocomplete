import {runCommand} from '@oclif/test'
import {expect} from 'chai'

// autocomplete will throw error on windows ci
import {default as skipWindows} from '../../helpers/runtest.js'

skipWindows('autocomplete index', () => {
  it('provides bash instructions', async () => {
    const {stdout} = await runCommand('autocomplete bash')
    expect(stdout).to.contain(`Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---`)
  })

  it('provides zsh instructions', async () => {
    const {stdout} = await runCommand('autocomplete zsh')
    expect(stdout).to.contain(`Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---`)
  })
})
