import {flags} from '@oclif/command'
import chalk from 'chalk'
import {cli} from 'cli-ux'

import {AutocompleteBase} from '../../base'

import Create from './create'

export default class Index extends AutocompleteBase {
  static description = 'display autocomplete installation instructions'

  static args = [{name: 'shell', description: 'shell type', required: false}]

  static flags = {
    'refresh-cache': flags.boolean({description: 'Refresh cache (ignores displaying instructions)', char: 'r'}),
  }

  static examples = [
    '$ <%= config.bin %> autocomplete',
    '$ <%= config.bin %> autocomplete bash',
    '$ <%= config.bin %> autocomplete fish',
    '$ <%= config.bin %> autocomplete zsh',
    '$ <%= config.bin %> autocomplete --refresh-cache'
  ]

  async run() {
    const {args, flags} = this.parse(Index)
    const shell = args.shell || this.config.shell
    this.errorIfNotSupportedShell(shell)

    cli.action.start(`${chalk.bold('Building the autocomplete cache')}`)
    await Create.run([], this.config)
    cli.action.stop()

    if (!flags['refresh-cache']) {
      const bin = this.config.bin
      const tabStr = this.getTabStr(shell)
      const note = this.getNote(shell)

      this.log(`
${chalk.bold(`Setup Instructions for ${bin.toUpperCase()} CLI Autocomplete ---`)}

1) Add the autocomplete env var to your ${shell} profile and source it
${chalk.cyan(`$ printf "$(${bin} autocomplete:script ${shell})" >> ~/.${shell}rc; source ~/.${shell}rc`)}

NOTE: ${note}

2) Test it out, e.g.:
${chalk.cyan(`$ ${bin} ${tabStr}`)}                 # Command completion
${chalk.cyan(`$ ${bin} command --${tabStr}`)}       # Flag completion

Enjoy!
`)
    }
  }

  private getNote(shell: string): string {
    switch (shell) {
      case 'bash':
        return 'If your terminal starts as a login shell you may need to print the init script into ~/.bash_profile or ~/.profile.'
      case 'fish':
        return 'TODO: Fill this in'
      case 'zsh':
        return `After sourcing, you can run \`${chalk.cyan('$ compaudit -D')}\` to ensure no permissions conflicts are present`
      default:
        return ''
    }
  }

  private getTabStr(shell: string): string {
    switch (shell) {
      case 'bash':
        return '<TAB><TAB>'
      case 'fish':
      case 'zsh':
        return '<TAB>'
      default:
        return ''
    }
  }
}
