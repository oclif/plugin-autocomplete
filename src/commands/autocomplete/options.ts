import {Args, Command, Flags, Interfaces} from '@oclif/core'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

export default class Options extends Command {
  static args = {
    command: Args.string({
      description: 'Command name or ID',
      required: true,
    }),
    flag: Args.string({
      description: 'Flag name',
      required: true,
    }),
  }
  static description = 'Display dynamic flag value completions'
  static flags = {
    'current-line': Flags.string({
      description: 'Current command line being completed',
    }),
  }
  static hidden = true

  private get cacheDir(): string {
    return path.join(this.config.cacheDir, 'autocomplete', 'completions')
  }

  // Cache duration in seconds - can be configured via env var
  private get cacheDuration(): number {
    const envDuration = process.env.OCLIF_AUTOCOMPLETE_CACHE_DURATION
    return envDuration ? Number.parseInt(envDuration, 10) : 60 * 60 * 24 // Default: 24 hours
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Options)
    const commandId = args.command
    const flagName = args.flag

    try {
      // Find the command
      const command = this.config.findCommand(commandId)
      if (!command) {
        this.log('')
        return
      }

      // Load the actual command class to get the completion function
      // The manifest doesn't include functions, so we need to load the command class
      const CommandClass = await command.load()

      // Get the flag definition from the loaded command class
      const flagDef = CommandClass.flags?.[flagName] as Interfaces.OptionFlag<any>
      if (!flagDef || !flagDef.completion) {
        this.log('')
        return
      }

      // Parse the current command line to extract context
      const currentLine = flags['current-line'] || ''
      const context = this.parseCommandLine(currentLine)

      // Generate cache key
      const cacheKey = `${commandId}:${flagName}`

      // Check cache
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        this.log(cached.join('\n'))
        return
      }

      // Execute the completion function
      const completionContext: Interfaces.CompletionContext = {
        args: context.args,
        argv: context.argv,
        config: this.config,
        flags: context.flags,
      }

      const options = await flagDef.completion.options(completionContext)

      // Cache the results
      this.saveToCache(cacheKey, options)

      // Output the options
      this.log(options.join('\n'))
    } catch {
      // Silently fail and return empty completions
      this.log('')
    }
  }

  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${Buffer.from(key).toString('base64')}.json`)
  }

  private getFromCache(key: string): null | string[] {
    const cachePath = this.getCachePath(key)
    if (!existsSync(cachePath)) return null

    try {
      const {options, timestamp} = JSON.parse(readFileSync(cachePath, 'utf8'))
      const age = Date.now() - timestamp
      const maxAge = this.cacheDuration * 1000

      if (age < maxAge) {
        return options
      }

      return null
    } catch {
      return null
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

  private saveToCache(key: string, options: string[]): void {
    const cachePath = this.getCachePath(key)
    const {cacheDir} = this

    try {
      mkdirSync(cacheDir, {recursive: true})
      writeFileSync(
        cachePath,
        JSON.stringify({
          options,
          timestamp: Date.now(),
        }),
      )
    } catch {
      // Silently fail if we can't write to cache
    }
  }
}
