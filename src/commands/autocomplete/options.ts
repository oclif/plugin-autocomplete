import {Command, Config, Flags, Interfaces} from '@oclif/core'

export default class Options extends Command {
  static description = 'Display dynamic flag value completions'
  static flags = {
    command: Flags.string({
      char: 'c',
      description: 'Command name or ID',
      required: true,
    }),
    flag: Flags.string({
      char: 'f',
      description: 'Flag name',
      required: true,
    }),
  }
  static hidden = true

  /**
   * Get completion options for a specific command flag
   * @param config - The oclif config
   * @param commandId - The command ID
   * @param flagName - The flag name
   * @param currentLine - Optional current command line for context
   * @returns Array of completion options, or empty array if none available
   */
  static async getCompletionOptions(config: Config, commandId: string, flagName: string): Promise<string[]> {
    try {
      const command = config.findCommand(commandId)
      if (!command) {
        return []
      }

      // Load the actual command class to get the completion definition
      const CommandClass = await command.load()

      // Get the flag definition
      const flagDef = CommandClass.flags?.[flagName] as Interfaces.OptionFlag<any>
      if (!flagDef || !flagDef.completion) {
        return []
      }

      // Handle dynamic completions (or legacy completions without type)
      const optionsFunc = flagDef.completion.options
      if (typeof optionsFunc !== 'function') {
        return []
      }

      // Execute the completion function
      const completionContext: Interfaces.CompletionContext = {
        config,
      }

      const options = await optionsFunc(completionContext)
      return options
    } catch {
      // Silently fail and return empty completions
      return []
    }
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Options)
    const commandId = flags.command
    const flagName = flags.flag

    const options = await Options.getCompletionOptions(this.config, commandId, flagName)
    this.log(options.join('\n'))
  }
}
