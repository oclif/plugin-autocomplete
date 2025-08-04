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

  // Get all actual root-level completions (topics + root commands) from command metadata
  async getRootLevelCompletions(): Promise<string[]> {
    const commands = await this.fetchCommandInfo()
    const rootItems = new Set<string>()
    
    for (const command of commands) {
      if (command.id && typeof command.id === 'string') {
        const parts = command.id.split(':')
        if (parts.length > 1) {
          // This is a topic with subcommands - add the root topic
          rootItems.add(parts[0])
        } else {
          // This is a root-level command - add it directly
          rootItems.add(command.id)
        }
      }
    }
    
    return Array.from(rootItems).sort()
  }

  async getTopicCommands(topic: string): Promise<string[]> {
    const commands = await this.fetchCommandInfo()
    const topicCommands = new Set<string>()
    
    for (const command of commands) {
      if (command.id && typeof command.id === 'string') {
        const parts = command.id.split(':')
        if (parts.length >= 2 && parts[0] === topic) {
          // This is a command under the specified topic
          topicCommands.add(parts[1])
        }
      }
    }
    
    return Array.from(topicCommands).sort()
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

  parseCompletionOutput(output: string): {completions: string[], descriptions: string[]} {
    // Look for our specific completion output pattern
    const lines = output.split('\n')
    const completions: string[] = []
    const descriptions: string[] = []

    for (const line of lines) {
      if (line.includes('COMPLETIONS:')) {
        // Extract completions from our echo output
        const match = line.match(/COMPLETIONS:\s*(.*)/)
        if (match && match[1]) {
          const completionsStr = match[1].trim()
          if (completionsStr) {
            return {
              completions: completionsStr.split(/\s+/).filter((c) => c.length > 0),
              descriptions: []
            }
          }
        }
      }
    }

    // Parse bash completion output with descriptions
    for (const line of lines) {
      const trimmedLine = line.trim()

      // Skip empty lines and command echoes
      if (!trimmedLine || trimmedLine.startsWith('$') || trimmedLine.startsWith('sf ')) {
        continue
      }

      // Look for completion lines with descriptions in parentheses
      // Format: --flag-name        (Description text)
      const completionMatch = trimmedLine.match(/^(--?[\w-]+)\s+\((.+)\)\s*$/)
      if (completionMatch) {
        completions.push(completionMatch[1])
        descriptions.push(completionMatch[2])
        continue
      }

      // Look for topic/command completions with descriptions
      // Format: topic-name\tDescription text
      const topicMatch = trimmedLine.match(/^([a-z][\w-]*)\s+(.+)$/)
      if (topicMatch && !topicMatch[1].startsWith('-')) {
        completions.push(topicMatch[1])
        descriptions.push(topicMatch[2])
        continue
      }

      // Look for simple flag completions without descriptions
      if (trimmedLine.match(/^--?[\w-]+$/)) {
        completions.push(trimmedLine)
        continue
      }

      // Look for simple flag values (no dashes)
      if (trimmedLine.match(/^[a-zA-Z][\w]*$/)) {
        completions.push(trimmedLine)
        continue
      }

      // Check for multiple completions on one line (space-separated)
      if (trimmedLine.includes('--') || /\s+[a-z-]+\s+/.test(trimmedLine)) {
        const tokens = trimmedLine.split(/\s+/).filter((t) => t.length > 0)
        for (const token of tokens) {
          if (token.startsWith('--') || (token.startsWith('-') && token.length === 2)) {
            completions.push(token)
          } else if (/^[a-zA-Z][\w]*$/.test(token)) {
            completions.push(token)
          }
        }
      }
    }

    // Remove duplicates and return
    return {
      completions: [...new Set(completions)],
      descriptions: [...new Set(descriptions)]
    }
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

const isLinuxOrMac = process.platform === 'linux' || process.platform === 'darwin';

(isLinuxOrMac ? describe : describe.skip)('Bash Completion E2E Tests', () => {
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

  describe('command and topics', function () {
    this.timeout(15_000)
    // Note: Descriptions are visible in interactive completion but not in COMPREPLY array
    // This is expected behavior - the test validates that completions work correctly

    it('completes all root-level topics and commands', async () => {
      const expectedTopics = await commandHelper.getRootLevelCompletions()
      
      await helper.startBashSession()
      await helper.sendCommand('sf ')
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      // Assert that ALL root topics are present in completions
      const foundTopics = expectedTopics.filter((topic) => result.completions.includes(topic))
      const missingTopics = expectedTopics.filter((topic) => !result.completions.includes(topic))
      
      // Sort both arrays for comparison since order may differ
      const expectedSorted = [...expectedTopics].sort()
      const actualSorted = [...result.completions].sort()

      expect(actualSorted).to.deep.equal(expectedSorted, `Expected all ${expectedTopics.length} root topics: ${expectedTopics.join(', ')} but found: ${foundTopics.join(', ')}. Missing: ${missingTopics.join(', ')}`)
    })

    it('completes commands', async () => {  
      // Get all actual org commands from command metadata
      const expectedCommands = await commandHelper.getTopicCommands('org')
      
      await helper.startBashSession()
      await helper.sendCommand('sf org ')
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      // Assert that ALL org commands are present in completions
      const expectedSorted = [...expectedCommands].sort()
      const actualSorted = [...result.completions].sort()

      expect(actualSorted).to.deep.equal(expectedSorted, 
        `Expected all ${expectedCommands.length} org commands: ${expectedCommands.join(', ')} but found: ${result.completions.join(', ')}`
      )
    })
  })

  describe('flags', function () {
    this.timeout(15_000) // Longer timeout for E2E tests

    it('completes both long and short flags on single dash', async () => {
      await helper.startBashSession()
      await helper.sendCommand('sf org create scratch -')
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      // Check that all expected flags are present
      const expectedFlags = expectations.allFlags.sort()
      const foundFlags = [...result.completions].sort()
      expect(foundFlags).to.deep.equal(expectedFlags, `Expected all flags ${expectedFlags.join(', ')} but found: ${foundFlags.join(', ')}.`)
    })

    it('completes only long flags with descriptions on double dash', async () => {
      await helper.startBashSession()
      await helper.sendCommand('sf org create scratch --')
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      // Should include all long flags
      const expectedLongFlags = expectations.longFlags.sort()
      const foundFlags = result.completions.sort()
      expect(foundFlags).to.deep.equal(expectedLongFlags, `Expected only long flags ${expectedLongFlags.join(', ')} but found: ${foundFlags.join(', ')}.`)
    })

    it('completes known flag values', async function () {
      await helper.startBashSession()
      await helper.sendCommand(`sf org create scratch --edition `)
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      const expectedValues = ['developer', 'enterprise', 'group', 'professional', 'partner-developer', 'partner-enterprise', 'partner-group', 'partner-professional'].sort()
      const foundValues = result.completions.sort()

      expect(foundValues.length).to.equal(
        expectedValues.length,
        `Expected all values for --edition: ${expectedValues.join(', ')} but found: ${foundValues.join(', ')}. Missing: ${expectedValues.filter((v) => !foundValues.includes(v)).join(', ')}`,
      )
    })

    it('completes flags that can be specified multiple times', async function () {
      // Test with `sf project deploy start --metadata` which supports being passed multiple times.
      await helper.startBashSession()
      await helper.sendCommand('sf project deploy start --metadata ApexClass --m')
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      const expectedFlags = ['--manifest', '--metadata', '--metadata-dir']
      const actualSorted = [...result.completions].sort()

      expect(actualSorted).to.deep.equal(expectedFlags, 'Should find flags starting with m')
    })

    it('completes flags even when boolean flag is present', async () => {
      await helper.startBashSession()
      await helper.sendCommand('sf org create scratch --json --')
      const output = await helper.triggerCompletion()
      const result = helper.parseCompletionOutput(output)

      // Should still suggest other flags after boolean --json flag
      const expectedFlags = expectations.longFlags.filter(flag => flag !== '--json').sort()
      const foundFlags = result.completions.sort()

      expect(foundFlags).to.be.deep.equal(expectedFlags, 'Should suggest other flags after boolean flag')
    })
  })
})
