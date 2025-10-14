import {Command, Flags, Interfaces} from '@oclif/core'

export default class Options extends Command {
  static description = 'Display dynamic flag value completions'
  static flags = {
    command: Flags.string({
      char: 'c',
      description: 'Command name or ID',
      required: true,
    }),
    'current-line': Flags.string({
      description: 'Current command line being completed',
    }),
    flag: Flags.string({
      char: 'f',
      description: 'Flag name',
      required: true,
    }),
  }
  static hidden = true

  async run(): Promise<void> {
    const {flags} = await this.parse(Options)
    const commandId = flags.command
    const flagName = flags.flag

    try {
      const command = this.config.findCommand(commandId)
      if (!command) {
        this.log('')
        return
      }

      // Load the actual command class to get the completion definition
      const CommandClass = await command.load()

      // Get the flag definition
      const flagDef = CommandClass.flags?.[flagName] as Interfaces.OptionFlag<any>
      if (!flagDef || !flagDef.completion) {
        this.log('')
        return
      }

      // Check completion type
      // @ts-expect-error - completion.type may not exist yet in types
      const completionType = flagDef.completion.type

      // Handle static completions
      if (completionType === 'static') {
        const {options} = flagDef.completion
        if (Array.isArray(options)) {
          this.log(options.join('\n'))
        } else {
          this.log('')
        }

        return
      }

      // Handle dynamic completions (or legacy completions without type)
      const optionsFunc = flagDef.completion.options
      if (typeof optionsFunc !== 'function') {
        this.log('')
        return
      }

      // Parse command line for context
      const currentLine = flags['current-line'] || ''
      const context = this.parseCommandLine(currentLine)

      // Execute the completion function
      const completionContext: Interfaces.CompletionContext = {
        args: context.args,
        argv: context.argv,
        config: this.config,
        flags: context.flags,
      }

      const options = await optionsFunc(completionContext)
      this.log(options.join('\n'))
    } catch {
      // Silently fail and return empty completions
      this.log('')
    }
  }

  private parseCommandLine(line: string): {
    args: {[name: string]: string}
    argv: string[]
    flags: {[name: string]: string}
  } {
    const args: {[name: string]: string} = {}
    const flags: {[name: string]: string} = {}
    const argv: string[] = []
    const parts = line.split(/\s+/).filter(Boolean)

    let i = 0
    // Skip the CLI bin name
    if (parts.length > 0) i++

    while (i < parts.length) {
      const part = parts[i]
      if (part.startsWith('--')) {
        const flagName = part.slice(2)
        if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
          flags[flagName] = parts[i + 1]
          i += 2
        } else {
          flags[flagName] = 'true'
          i++
        }
      } else if (part.startsWith('-') && part.length === 2) {
        const flagChar = part.slice(1)
        if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
          flags[flagChar] = parts[i + 1]
          i += 2
        } else {
          flags[flagChar] = 'true'
          i++
        }
      } else {
        argv.push(part)
        i++
      }
    }

    return {args, argv, flags}
  }
}
