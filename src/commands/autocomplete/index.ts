import {Args, Flags, ux} from '@oclif/core'
import chalk from 'chalk'
import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {EOL} from 'node:os'
import {default as path} from 'node:path'

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
    'display-orgs': Flags.boolean({char: 'd', description: 'Display authenticated orgs.'}),
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

    if (flags['display-orgs']) {
      const sfDir = path.join(this.config.home, '.sfdx')
      const orgs: string[] = readdirSync(sfDir)
        .filter((element) => element.match(/^.*@.*\.json/) !== null)
        .map((element) => element.replace('.json', ''))

      let orgsAliases = []
      const aliasFilename = path.join(sfDir, 'alias.json')
      if (existsSync(aliasFilename)) {
        orgsAliases = JSON.parse(readFileSync(aliasFilename).toString()).orgs
        for (const [alias, username] of Object.entries(orgsAliases)) {
          const i = orgs.indexOf(username as string)
          if (i > -1) {
            orgs[i] = alias
          }
        }
      }

      this.log(
        orgs.join(`
`),
      )
    } else {
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
}
