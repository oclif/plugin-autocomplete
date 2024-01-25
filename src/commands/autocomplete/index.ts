import {Args, Flags, ux} from '@oclif/core'
import chalk from 'chalk'
import {execSync} from 'node:child_process'
import {EOL} from 'node:os'

import {AutocompleteBase} from '../../base.js'
import Create from './create.js'

const noteFromShell = (shell: string) => {
  switch (shell) {
    case 'zsh': {
      return `After sourcing, you can run \`${chalk.cyan(
        '$ compaudit -D',
      )}\` to ensure no permissions conflicts are present`
    }

    case 'bash': {
      return 'If your terminal starts as a login shell you may need to print the init script into ~/.bash_profile or ~/.profile.'
    }

    case 'powershell': {
      return `Use the \`MenuComplete\` mode to get matching completions printed below the command line:\n${chalk.cyan(
        'Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete',
      )}`
    }

    default: {
      return ''
    }
  }
}

export default class Index extends AutocompleteBase {
  static args = {
    shell: Args.string({
      description: 'Shell type',
      options: ['zsh', 'bash', 'powershell'],
      required: false,
    }),
  }

  static description = 'Display autocomplete installation instructions.'

  static examples = [
    '$ <%= config.bin %> autocomplete',
    '$ <%= config.bin %> autocomplete bash',
    '$ <%= config.bin %> autocomplete zsh',
    '$ <%= config.bin %> autocomplete powershell',
    '$ <%= config.bin %> autocomplete --refresh-cache',
  ]

  static flags = {
    orgs: Flags.boolean({char: 'o', description: 'Get authenticated orgs'}),
    'refresh-cache': Flags.boolean({char: 'r', description: 'Refresh cache (ignores displaying instructions)'}),
  }

  async run() {
    const {args, flags} = await this.parse(Index)
    const shell = args.shell ?? this.determineShell(this.config.shell)

    if (shell === 'powershell' && this.config?.topicSeparator === ':') {
      this.error(
        `PowerShell completion is not supported in CLIs using colon as the topic separator.${EOL}See: https://oclif.io/docs/topic_separator`,
      )
    }

    // Build the current list of authenticated orgs
    if (flags.orgs) {
      const orgsJson = JSON.parse(execSync('sf org list auth --json').toString())
      let result: string = ''
      for (const element of orgsJson.result) {
        result += (element.alias ? element.alias + ':' + element.username : element.username + ':') + '\n'
      }

      this.log(result)
      this.exit()
    }

    ux.action.start(`${chalk.bold('Building the autocomplete cache')}`)
    await Create.run([], this.config)
    ux.action.stop()

    if (!flags['refresh-cache']) {
      const {bin} = this.config
      const tabStr = shell === 'bash' ? '<TAB><TAB>' : '<TAB>'

      const instructions =
        shell === 'powershell'
          ? `New-Item -Type Directory -Path (Split-Path -Parent $PROFILE) -ErrorAction SilentlyContinue
Add-Content -Path $PROFILE -Value (Invoke-Expression -Command "${bin} autocomplete${this.config.topicSeparator}script ${shell}"); .$PROFILE`
          : `$ printf "eval $(${bin} autocomplete${this.config.topicSeparator}script ${shell})" >> ~/.${shell}rc; source ~/.${shell}rc`

      const note = noteFromShell(shell)

      this.log(`
${chalk.bold(`Setup Instructions for ${bin.toUpperCase()} CLI Autocomplete ---`)}

1) Add the autocomplete ${shell === 'powershell' ? 'file' : 'env var'} to your ${shell} profile and source it

${chalk.cyan(instructions)}

${chalk.bold('NOTE')}: ${note}

2) Test it out, e.g.:
${chalk.cyan(`$ ${bin} ${tabStr}`)}                 # Command completion
${chalk.cyan(`$ ${bin} command --${tabStr}`)}       # Flag completion

Enjoy!
`)
    }
  }
}
