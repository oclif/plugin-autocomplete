import {Args, ux, Flags} from '@oclif/core'
import * as chalk from 'chalk'

import {AutocompleteBase} from '../../base'

import Create from './create'

export default class Index extends AutocompleteBase {
  static description = 'display autocomplete installation instructions'

  static args = {
    shell: Args.string({description: 'shell type', required: false}),
  }

  static flags = {
    'refresh-cache': Flags.boolean({description: 'Refresh cache (ignores displaying instructions)', char: 'r'}),
  }

  static examples = [
    '$ <%= config.bin %> autocomplete',
    '$ <%= config.bin %> autocomplete bash',
    '$ <%= config.bin %> autocomplete zsh',
    '$ <%= config.bin %> autocomplete --refresh-cache',
  ]

  async run() {
    const {args, flags} = await this.parse(Index)
    const shell = args.shell || this.determineShell(this.config.shell)
    this.errorIfNotSupportedShell(shell)

    ux.action.start(`${chalk.bold('Building the autocomplete cache')}`)
    await Create.run([], this.config)
    ux.action.stop()

    if (!flags['refresh-cache']) {
      const bin = this.config.bin
      const tabStr = shell === 'bash' ? '<TAB><TAB>' : '<TAB>'
      const note = shell === 'zsh' ? `After sourcing, you can run \`${chalk.cyan('$ compaudit -D')}\` to ensure no permissions conflicts are present` : 'If your terminal starts as a login shell you may need to print the init script into ~/.bash_profile or ~/.profile.'

      this.log(`
${chalk.bold(`Setup Instructions for ${bin.toUpperCase()} CLI Autocomplete ---`)}

1) Add the autocomplete env var to your ${shell} profile and source it
${chalk.cyan(`$ printf "eval $(${bin} autocomplete:script ${shell})" >> ~/.${shell}rc; source ~/.${shell}rc`)}

NOTE: ${note}

2) Test it out, e.g.:
${chalk.cyan(`$ ${bin} ${tabStr}`)}                 # Command completion
${chalk.cyan(`$ ${bin} command --${tabStr}`)}       # Flag completion

Enjoy!
`)
    }
  }
}
