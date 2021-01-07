/* eslint-disable no-useless-escape */
import {expect, test} from '@oclif/test'

// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../../helpers/runtest')

skipWindows('autocomplete index', () => {
  test
  .stdout()
  .command(['autocomplete', 'bash'])
  .it('provides bash instructions', ctx => {
    expect(ctx.stdout).to.contain(`
Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---

1) Add the autocomplete env var to your bash profile and source it
$ printf \"$(oclif-example autocomplete:script bash)\" >> ~/.bashrc; source ~/.bashrc

NOTE: If your terminal starts as a login shell you may need to print the init script into ~/.bash_profile or ~/.profile.

2) Test it out, e.g.:
$ oclif-example <TAB><TAB>                 # Command completion
$ oclif-example command --<TAB><TAB>       # Flag completion

Enjoy!

`)
  })

  test
  .stdout()
  .command(['autocomplete', 'zsh'])
  .it('provides zsh instructions', ctx => {
    expect(ctx.stdout).to.contain(`
Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---

1) Add the autocomplete env var to your zsh profile and source it
$ printf \"$(oclif-example autocomplete:script zsh)\" >> ~/.zshrc; source ~/.zshrc

NOTE: After sourcing, you can run \`$ compaudit -D\` to ensure no permissions conflicts are present

2) Test it out, e.g.:
$ oclif-example <TAB>                 # Command completion
$ oclif-example command --<TAB>       # Flag completion

Enjoy!

`,
    )
  })

  test
  .stdout()
  .command(['autocomplete', 'fish'])
  .it('provides fish instructions', ctx => {
    expect(ctx.stdout).to.equal(`
Setup Instructions for OCLIF-EXAMPLE CLI Autocomplete ---

1) Update your shell to load the new completions
source ~/.config/fish/config.fish

NOTE: This assumes your Fish configuration is stored at ~/.config/fish/config.fish

2) Test it out, e.g.:
$ oclif-example <TAB>                 # Command completion
$ oclif-example command --<TAB>       # Flag completion

Enjoy!

`,
    )
  })
})
