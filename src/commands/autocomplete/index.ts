import {Args, ux, Flags} from '@oclif/core'
import * as chalk from 'chalk'

import {AutocompleteBase} from '../../base'

import Create from './create'

export default class Index extends AutocompleteBase {
  static description = 'display autocomplete installation instructions'

  static args = {
    shell: Args.string({
      description: 'Shell type',
      options: ['zsh', 'bash', 'powershell'],
      required: false,
    }),
  }

  static flags = {
    'refresh-cache': Flags.boolean({description: 'Refresh cache (ignores displaying instructions)', char: 'r'}),
  }

  static examples = [
    '$ <%= config.bin %> autocomplete',
    '$ <%= config.bin %> autocomplete bash',
    '$ <%= config.bin %> autocomplete zsh',
    '$ <%= config.bin %> autocomplete powershell',
    '$ <%= config.bin %> autocomplete --refresh-cache',
  ]

  async run() {
    const {args, flags} = await this.parse(Index)
    const shell = args.shell || this.determineShell(this.config.shell)

    ux.action.start(`${chalk.bold('Building the autocomplete cache')}`)
    await Create.run([], this.config)
    ux.action.stop()

    if (!flags['refresh-cache']) {
      const bin = this.config.bin
      const tabStr = shell === 'bash' ? '<TAB><TAB>' : '<TAB>'

      const instructions = shell === 'powershell' ?
        `New-Item -Type Directory -Path (Split-Path -Parent $PROFILE) -ErrorAction SilentlyContinue
Add-Content -Path $PROFILE -Value (Invoke-Expression -Command "${bin} autocomplete${this.config.topicSeparator}script ${shell}"); .$PROFILE` :
        `$ printf "eval $(${bin} autocomplete${this.config.topicSeparator}script ${shell})" >> ~/.${shell}rc; source ~/.${shell}rc`

      let note = ''

      switch (shell) {
      case 'zsh':
        note = `After sourcing, you can run \`${chalk.cyan('$ compaudit -D')}\` to ensure no permissions conflicts are present`
        break
      case 'bash':
        note = 'If your terminal starts as a login shell you may need to print the init script into ~/.bash_profile or ~/.profile.'
        break
      case 'powershell':
        note = 'hehe'
        break
      }

      this.log(`
${chalk.bold(`Setup Instructions for ${bin.toUpperCase()} CLI Autocomplete ---`)}

1) Add the autocomplete env var to your ${shell} profile and source it

${chalk.cyan(instructions)}

NOTE: ${note}

2) Test it out, e.g.:
${chalk.cyan(`$ ${bin} ${tabStr}`)}                 # Command completion
${chalk.cyan(`$ ${bin} command --${tabStr}`)}       # Flag completion

Enjoy!
`)
    }
  }
}
