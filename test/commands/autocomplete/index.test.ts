import {expect, test} from '@oclif/test'

// autocomplete will throw error on windows ci
import {default as skipWindows} from '../../helpers/runtest.js'

skipWindows('autocomplete index', () => {
  test
    .stdout()
    .command(['autocomplete', 'bash'])
    .it('provides bash instructions', (ctx) => {
      expect(ctx.stdout).to.contain(`Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---`)
    })

  test
    .stdout()
    .command(['autocomplete', 'zsh'])
    .it('provides zsh instructions', (ctx) => {
      expect(ctx.stdout).to.contain(`Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---`)
    })
})
