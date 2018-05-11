import {expect, test} from '@oclif/test'

describe('autocomplete index', () => {
  test
  .stdout()
  .command(['autocomplete', 'bash'])
  .it('provides bash instructions', ctx => {
    expect(ctx.stdout).to.contain(`
Setup Instructions for OCLIF CLI Autocomplete ---

1) Add the autocomplete env var to your bash profile and source it
$ printf \"$(oclif autocomplete:script bash)\" >> ~/.bashrc; source ~/.bashrc

NOTE: If your terminal starts as a login shell you may need to print the init script into ~/.bash_profile or ~/.profile.

2) Test it out, e.g.:
$ oclif <TAB><TAB>                 # Command completion
$ oclif command --<TAB><TAB>       # Flag completion

Enjoy!

`
    )
  })

  test
  .stdout()
  .command(['autocomplete', 'zsh'])
  .it('provides zsh instructions', ctx => {
    expect(ctx.stdout).to.contain(`
Setup Instructions for OCLIF CLI Autocomplete ---

1) Add the autocomplete env var to your zsh profile and source it
$ printf \"$(oclif autocomplete:script zsh)\" >> ~/.zshrc; source ~/.zshrc

NOTE: After sourcing, you can run \`$ compaudit -D\` to ensure no permissions conflicts are present

2) Test it out, e.g.:
$ oclif <TAB>                 # Command completion
$ oclif command --<TAB>       # Flag completion

Enjoy!

`
    )
  })
})
