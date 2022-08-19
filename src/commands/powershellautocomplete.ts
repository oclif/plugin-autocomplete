import {Command} from '@oclif/core'

export default class PowershellAutocomplete extends Command {
  static hidden = true;

  static description = 'Return values for autocomplete in Powershell'

  async run() {
    const commands = this.config.plugins.flatMap(plugin => plugin.commands)
    const commandNames = []

    for (const command of commands) {
      if (!command.hidden) {
        commandNames.push(command.id.replace(/:/g, this.config.topicSeparator))
      }
    }

    process.stdout.write(commandNames.join(','))
  }
}
