import {expect} from 'chai'
import {ChildProcess, exec, spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {promisify} from 'node:util'

const execAsync = promisify(exec)

interface FlagInfo {
  char?: string
  hidden?: boolean
  multiple?: boolean
  name: string
  options?: string[]
  type: 'boolean' | 'option'
}

interface TestExpectations {
  allFlags: string[] // For '-' completion
  flagsWithValues: {
    // For flag value completion
    [flagName: string]: string[]
  }
  longFlags: string[] // For '--' completion
  multipleFlags: string[] // Flags that can be used multiple times
}

class CommandInfoHelper {
  private commandsCache: any[] | null = null

  extractFlags(command: any): FlagInfo[] {
    if (!command.flags) return []

    const flags: FlagInfo[] = []

    for (const [flagName, flagData] of Object.entries(command.flags as any)) {
      const flagDataTyped = flagData as any
      const flag: FlagInfo = {
        hidden: flagDataTyped.hidden || false,
        name: flagName,
        type: flagDataTyped.type === 'boolean' ? 'boolean' : 'option',
      }

      if (flagDataTyped.char) {
        flag.char = flagDataTyped.char
      }

      if (flagDataTyped.options && Array.isArray(flagDataTyped.options)) {
        flag.options = flagDataTyped.options
      }

      if (flagDataTyped.multiple) {
        flag.multiple = flagDataTyped.multiple
      }

      flags.push(flag)
    }

    return flags.filter((flag) => !flag.hidden)
  }

  async fetchCommandInfo(): Promise<any[]> {
    if (this.commandsCache) {
      return this.commandsCache as any[]
    }

    try {
      const {stdout} = await execAsync('sf commands --json')
      this.commandsCache = JSON.parse(stdout)
      return this.commandsCache!
    } catch (error) {
      throw new Error(`Failed to fetch SF command info: ${error}`)
    }
  }

  generateExpectations(command: any): TestExpectations {
    const flags = this.extractFlags(command)

    const allFlags: string[] = []
    const longFlags: string[] = []
    const flagsWithValues: {[key: string]: string[]} = {}
    const multipleFlags: string[] = []

    for (const flag of flags) {
      // Add long flag
      const longFlag = `--${flag.name}`
      allFlags.push(longFlag)
      longFlags.push(longFlag)

      // Add short flag if available
      if (flag.char) {
        const shortFlag = `-${flag.char}`
        allFlags.push(shortFlag)
      }

      // Track flags with known values
      if (flag.options && flag.options.length > 0) {
        flagsWithValues[flag.name] = flag.options
      }

      // Track multiple flags
      if (flag.multiple) {
        multipleFlags.push(longFlag)
        if (flag.char) {
          multipleFlags.push(`-${flag.char}`)
        }
      }
    }

    return {
      allFlags,
      flagsWithValues,
      longFlags,
      multipleFlags,
    }
  }

  async getCommandById(id: string): Promise<any | null> {
    const commands = await this.fetchCommandInfo()
    return commands.find((cmd) => cmd.id === id) || null
  }
}

class BashCompletionHelper {
  private bashProcess: ChildProcess | null = null
  private lastCommand = ''
  private output = ''
  private stderr = ''

  async cleanup(): Promise<void> {
    if (this.bashProcess) {
      this.bashProcess.kill('SIGKILL')
      this.bashProcess = null
    }
  }

  parseCompletionOutput(output: string): string[] {
    // Look for our specific completion output pattern
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.includes('COMPLETIONS:')) {
        // Extract completions from our echo output
        const match = line.match(/COMPLETIONS:\s*(.*)/)
        if (match && match[1]) {
          const completionsStr = match[1].trim()
          if (completionsStr) {
            return completionsStr.split(/\s+/).filter((c) => c.length > 0)
          }
        }
      }
    }

    // Fallback to the old parsing method
    const completions: string[] = []
    for (const line of lines) {
      const trimmedLine = line.trim()

      // Skip empty lines and command echoes
      if (!trimmedLine || trimmedLine.startsWith('$') || trimmedLine.startsWith('sf org create scratch')) {
        continue
      }

      // Check if this line contains multiple completions separated by whitespace
      if (trimmedLine.includes('--') || /\s+[a-z-]+\s+/.test(trimmedLine)) {
        // Split by multiple whitespaces to get completion items
        const tokens = trimmedLine
          .split(/\s{2,}/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0)

        for (const token of tokens) {
          // Extract individual flags/values from each token
          const subTokens = token.split(/\s+/)
          for (const subToken of subTokens) {
            if (subToken.startsWith('--') || (subToken.startsWith('-') && subToken.length === 2)) {
              completions.push(subToken)
            } else if (/^[a-z][a-z-]*[a-z]?$/.test(subToken)) {
              // For flag values like "developer", "enterprise", etc.
              completions.push(subToken)
            }
          }
        }
      }
    }

    // Remove duplicates and return
    return [...new Set(completions)]
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.bashProcess || !this.bashProcess.stdin) {
      throw new Error('Bash session not started')
    }

    // Store the command for completion
    this.lastCommand = command

    // Clear previous output
    this.output = ''
    this.stderr = ''
  }

  async startBashSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      // this needs to be a non-interactive process to avoid conflicts with the current shell environment.
      this.bashProcess = spawn('bash', [], {
        detached: false,
        env: {...process.env, PS1: '$ '},
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.output = ''
      this.stderr = ''

      this.bashProcess.stdout?.on('data', (data) => {
        const str = data.toString()
        this.output += str
        if (process.env.DEBUG_COMPLETION) {
          console.log('STDOUT:', str)
        }
      })

      this.bashProcess.stderr?.on('data', (data) => {
        const str = data.toString()
        this.stderr += str
        if (process.env.DEBUG_COMPLETION) {
          console.log('STDERR:', str)
        }
      })

      this.bashProcess.on('error', reject)

      // Wait for bash to initialize and source completion scripts
      setTimeout(() => {
        this.bashProcess?.stdin?.write(`echo "INIT: Starting bash setup"\n`)

        // Enable bash completion features for non-interactive mode
        this.bashProcess?.stdin?.write(`set +h\n`)
        this.bashProcess?.stdin?.write(`shopt -s expand_aliases\n`)
        this.bashProcess?.stdin?.write(`shopt -s extglob\n`)

        // Source the SF completion scripts
        const homeDir = process.env.HOME
        const completionSetup = `${homeDir}/.cache/sf/autocomplete/bash_setup`
        this.bashProcess?.stdin?.write(`source ${completionSetup}\n`)

        this.bashProcess?.stdin?.write(`echo "INIT: Bash setup complete"\n`)

        setTimeout(() => {
          resolve()
        }, 500)
      }, 1000)
    })
  }

  async triggerCompletion(): Promise<string> {
    if (!this.bashProcess || !this.bashProcess.stdin) {
      throw new Error('Bash session not started')
    }

    // Clear previous output
    this.output = ''

    // Clear any previous state
    this.bashProcess.stdin.write(`unset COMPREPLY\n`)

    // Set completion variables and call function directly
    const currentLine = this.lastCommand || ''
    this.bashProcess.stdin.write(
      `COMP_LINE="${currentLine}" COMP_POINT=${currentLine.length} COMP_WORDS=(${currentLine
        .split(' ')
        .map((w) => `"${w}"`)
        .join(' ')}) COMP_CWORD=$((${currentLine.split(' ').length} - 1))\n`,
    )
    await sleep(100)

    // Call completion function and capture results
    this.bashProcess.stdin.write(`echo "COMP: Calling completion for: ${currentLine}"\n`)
    this.bashProcess.stdin.write(`_sf_autocomplete 2>/dev/null || echo "COMP: Function failed"\n`)
    this.bashProcess.stdin.write(`echo "COMPLETIONS: \${COMPREPLY[@]}"\n`)

    // Wait for completion output
    await sleep(1000)

    return this.output
  }
}

const isLinuxOrMac = process.platform === 'linux' || process.platform === 'darwin'

;(isLinuxOrMac ? describe : describe.skip)('Bash Completion E2E Tests', () => {
  let helper: BashCompletionHelper
  let commandHelper: CommandInfoHelper
  let expectations: TestExpectations

  // Setup command info and refresh cache before all tests
  before(async function () {
    this.timeout(15_000)

    commandHelper = new CommandInfoHelper()

    try {
      // Fetch command metadata
      const command = await commandHelper.getCommandById('org:create:scratch')
      if (!command) {
        this.skip() // Skip if command not found
      }

      expectations = commandHelper.generateExpectations(command)

      // Debug info for CI (minimal)
      if (process.env.DEBUG_COMPLETION && process.env.CI) {
        console.log(`CI: Found ${Object.keys(command.flags || {}).length} flags for org:create:scratch`)
      }

      // Refresh autocomplete cache
      await execAsync('sf autocomplete --refresh-cache')
    } catch (error) {
      console.warn('Could not setup test environment:', error)
      this.skip()
    }
  })

  beforeEach(() => {
    helper = new BashCompletionHelper()
  })

  afterEach(async () => {
    await helper.cleanup()
  })

  describe('sf org create scratch', function () {
    this.timeout(15_000) // Longer timeout for E2E tests

    it('completes both long and short flags with single dash', async () => {
      await helper.startBashSession()
      await helper.sendCommand('sf org create scratch -')
      const output = await helper.triggerCompletion()
      const completions = helper.parseCompletionOutput(output)

      // Only show debug output if test fails
      if (completions.length === 0) {
        console.log('Raw output:', JSON.stringify(output))
        console.log('Completions found:', completions)
      }

      // Check that all expected flags are present
      const expectedFlags = expectations.allFlags
      const foundFlags = expectedFlags.filter((flag) => completions.includes(flag))

      expect(foundFlags.length).to.equal(
        expectedFlags.length,
        `Expected all flags ${expectedFlags.join(', ')} but found: ${foundFlags.join(', ')}. Missing: ${expectedFlags.filter((f) => !foundFlags.includes(f)).join(', ')}`,
      )
    })

    it('completes only long flags with double dash', async () => {
      await helper.startBashSession()
      await helper.sendCommand('sf org create scratch --')
      const output = await helper.triggerCompletion()
      const completions = helper.parseCompletionOutput(output)

      // Should include all long flags
      const expectedLongFlags = expectations.longFlags
      const foundLongFlags = expectedLongFlags.filter((flag) => completions.includes(flag))

      // Should NOT include any short flags
      const allShortFlags = expectations.allFlags.filter((flag) => flag.startsWith('-') && !flag.startsWith('--'))
      const foundShortFlags = allShortFlags.filter((flag) => completions.includes(flag))

      expect(foundLongFlags.length).to.equal(
        expectedLongFlags.length,
        `Expected all long flags ${expectedLongFlags.join(', ')} but found: ${foundLongFlags.join(', ')}. Missing: ${expectedLongFlags.filter((f) => !foundLongFlags.includes(f)).join(', ')}`,
      )

      expect(foundShortFlags.length).to.equal(0, `Should not find short flags but found: ${foundShortFlags.join(', ')}`)
    })

    it('completes known flag values', async function () {
      // Find the first flag with known values to test
      const flagsWithValues = Object.keys(expectations.flagsWithValues)

      if (flagsWithValues.length === 0) {
        this.skip() // Skip if no flags have known values
      }

      const testFlag = flagsWithValues[0]
      const expectedValues = expectations.flagsWithValues[testFlag]

      await helper.startBashSession()
      await helper.sendCommand(`sf org create scratch --${testFlag} `)
      const output = await helper.triggerCompletion()
      const completions = helper.parseCompletionOutput(output)

      const foundValues = expectedValues.filter((value) => completions.includes(value))

      expect(foundValues.length).to.equal(
        expectedValues.length,
        `Expected all values for --${testFlag}: ${expectedValues.join(', ')} but found: ${foundValues.join(', ')}. Missing: ${expectedValues.filter((v) => !foundValues.includes(v)).join(', ')}`,
      )
    })

    it('completes flag values when other flags are present', async function () {
      // Find the first flag with known values to test
      const flagsWithValues = Object.keys(expectations.flagsWithValues)

      if (flagsWithValues.length === 0) {
        this.skip() // Skip if no flags have known values
      }

      const testFlag = flagsWithValues[0]
      const expectedValues = expectations.flagsWithValues[testFlag]

      await helper.startBashSession()
      await helper.sendCommand(`sf org create scratch --json --${testFlag} `)
      const output = await helper.triggerCompletion()
      const completions = helper.parseCompletionOutput(output)

      const foundValues = expectedValues.filter((value) => completions.includes(value))

      expect(foundValues.length).to.equal(
        expectedValues.length,
        `Expected all values for --${testFlag} with other flags present: ${expectedValues.join(', ')} but found: ${foundValues.join(', ')}. Missing: ${expectedValues.filter((v) => !foundValues.includes(v)).join(', ')}`,
      )
    })
  })
})
