import {Args, Flags, ux} from '@oclif/core'
import {bold, cyan} from 'ansis'
import {EOL} from 'node:os'

import {AutocompleteBase} from '../../base.js'
import Create from './create.js'
import Options from './options.js'

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

    ux.action.start(`${bold('Building the autocomplete cache')}`)
    await Create.run([], this.config)

    ux.action.status = 'Generating dynamic completion caches'
    await this.generateCompletionCaches()

    if (!flags['refresh-cache']) {
      this.printShellInstructions(shell)
    }

    ux.action.stop()
  }

  private async generateCompletionCaches(): Promise<void> {
    const commandsWithDynamicCompletions: Array<{commandId: string; flagName: string}> = []

    // Find all commands with flags that have completion functions
    // This ONLY loads command classes, doesn't affect existing functionality
    for (const commandId of this.config.commandIDs) {
      const command = this.config.findCommand(commandId)
      if (!command) continue

      try {
        // Load the actual command class to access completion functions
        // Falls back gracefully if loading fails - no impact on existing commands
        // eslint-disable-next-line no-await-in-loop
        const CommandClass = await command.load()
        const flags = CommandClass.flags || {}

        for (const [flagName, flag] of Object.entries(flags)) {
          if (flag.type !== 'option') continue

          const {completion} = flag as any
          // Skip flags without completion property - no extra work for existing flags
          if (!completion) continue

          // Check if it has dynamic completion or legacy options function
          const isDynamic = completion.type === 'dynamic' || typeof completion.options === 'function'

          if (isDynamic) {
            commandsWithDynamicCompletions.push({commandId, flagName})
          }
        }
      } catch {
        // Silently ignore errors loading command class
        // Existing commands continue to work with manifest-based completions
        continue
      }
    }

    // Early exit if no dynamic completions found - zero impact on existing functionality
    if (commandsWithDynamicCompletions.length === 0) {
      return
    }

    const total = commandsWithDynamicCompletions.length
    const startTime = Date.now()

    ux.action.start(`${bold('Generating')} ${total} ${bold('dynamic completion caches')} ${cyan('(in parallel)')}`)

    const results = await this.runWithConcurrency(
      commandsWithDynamicCompletions,
      10,
      async ({commandId, flagName}, index) => {
        ux.action.status = `${index + 1}/${total}`
        try {
          // Get completion options
          const options = await Options.getCompletionOptions(this.config, commandId, flagName)

          // Write to cache file (same location and format as shell helper)
          if (options.length > 0) {
            await this.writeCacheFile(commandId, flagName, options)
            return {commandId, count: options.length, flagName, success: true}
          }

          // No options returned - log for debugging
          return {commandId, count: 0, flagName, success: true}
        } catch (error) {
          // Log error for debugging
          return {commandId, error: (error as Error).message, flagName, success: false}
        }
      },
    )

    const withOptions = results.filter((r) => (r as any).count > 0).length
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    ux.action.stop(
      `${bold('✓')} Generated ${withOptions}/${total} caches in ${cyan(duration + 's')} ${cyan(`(~${(total / Number(duration)).toFixed(0)}/s)`)}`,
    )

    // Show details for all caches
    this.log('')
    this.log(bold('Cache generation details:'))
    for (const result of results as any[]) {
      if (result.success && result.count > 0) {
        // this.log(`  ✓ ${result.commandId} --${result.flagName}: ${result.count} options cached`)
      } else if (result.count === 0) {
        this.log(`  ⚠️  ${result.commandId} --${result.flagName}: No options returned`)
      } else {
        this.log(`  ❌ ${result.commandId} --${result.flagName}: ${result.error}`)
      }
    }
  }

  private printShellInstructions(shell: string): void {
    const setupEnvVar = this.getSetupEnvVar(shell)
    const tabStr = shell === 'bash' ? '<TAB><TAB>' : '<TAB>'
    const scriptCommand = `${this.config.bin} autocomplete${this.config.topicSeparator}script ${shell}`

    let instructions = `
Setup Instructions for ${this.config.bin.toUpperCase()} CLI Autocomplete ---
==============================================
`

    switch (shell) {
      case 'bash': {
        instructions += `
1) Run this command in your terminal window:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.bashrc; source ~/.bashrc`)}

  The previous command adds the ${cyan(setupEnvVar)} environment variable to your Bash config file and then sources the file.

  ${bold('NOTE')}: If you've configured your terminal to start as a login shell, you may need to modify the command so it updates either the ~/.bash_profile or ~/.profile file. For example:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.bash_profile; source ~/.bash_profile`)}

  Or:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.profile; source ~/.profile`)}

2) Start using autocomplete:

  ${cyan(`${this.config.bin} ${tabStr}`)}                  # Command completion
  ${cyan(`${this.config.bin} command --${tabStr}`)}        # Flag completion
  `
        break
      }

      case 'powershell': {
        instructions += `
1) Run these two cmdlets in your PowerShell window in the order shown:

  ${cyan(`New-Item -Type Directory -Path (Split-Path -Parent $PROFILE) -ErrorAction SilentlyContinue
  Add-Content -Path $PROFILE -Value (Invoke-Expression -Command "${scriptCommand}"); .$PROFILE`)}

2) (Optional) If you want matching completions printed below the command line, run this cmdlet:

  ${cyan('Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete')}

3) Start using autocomplete:

  ${cyan(`${this.config.bin} ${tabStr}`)}                  # Command completion
  ${cyan(`${this.config.bin} command --${tabStr}`)}        # Flag completion
  `
        break
      }

      case 'zsh': {
        instructions += `
1) Run this command in your terminal window:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.zshrc; source ~/.zshrc`)}

  The previous command adds the ${cyan(setupEnvVar)} environment variable to your zsh config file and then sources the file.

2) (Optional) Run this command to ensure that you have no permissions conflicts:

  ${cyan('compaudit -D')}

3) Start using autocomplete:

  ${cyan(`${this.config.bin} ${tabStr}`)}                  # Command completion
  ${cyan(`${this.config.bin} command --${tabStr}`)}        # Flag completion
  `
        break
      }
    }

    instructions += `
  Every time you enter ${tabStr}, the autocomplete feature displays a list of commands (or flags if you type --), along with their summaries. Enter a letter and then ${tabStr} again to narrow down the list until you end up with the complete command that you want to execute.

  Enjoy!
`
    this.log(instructions)
  }

  /**
   * Run async tasks with concurrency limit
   */
  private async runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = []
    const executing: Array<Promise<void>> = []

    for (const [index, item] of items.entries()) {
      const promise = fn(item, index).then((result) => {
        results[index] = result
        executing.splice(executing.indexOf(promise), 1)
      })

      executing.push(promise)

      if (executing.length >= concurrency) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.race(executing)
      }
    }

    await Promise.all(executing)
    return results
  }

  private async writeCacheFile(commandId: string, flagName: string, options: string[]): Promise<void> {
    const {join} = await import('node:path')
    const {mkdir, writeFile} = await import('node:fs/promises')

    // Match the shell helper's cache directory structure
    const cacheDir = join(this.autocompleteCacheDir, 'flag_completions')
    await mkdir(cacheDir, {recursive: true})

    // Match the shell helper's filename format (replace colons with underscores)
    const cacheFilename = `${commandId.replaceAll(':', '_')}_${flagName}.cache`
    const cacheFile = join(cacheDir, cacheFilename)

    // Write cache file with timestamp (same format as shell helper)
    const timestamp = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
    const content = `${timestamp}\n${options.join('\n')}\n`

    await writeFile(cacheFile, content, 'utf8')
  }
}
