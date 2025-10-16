import {Config} from '@oclif/core'
import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('autocomplete:options', () => {
  let config: Config

  before(async () => {
    config = await Config.load()
  })

  it('returns empty string for non-existent command', async () => {
    const {stdout} = await runCommand<{name: string}>(
      ['autocomplete:options', '--command', 'nonexistent', '--flag', 'someflag'],
      config,
    )
    expect(stdout).to.equal('')
  })

  it('returns empty string for command without flag', async () => {
    const {stdout} = await runCommand<{name: string}>(
      ['autocomplete:options', '--command', 'autocomplete', '--flag', 'nonexistentflag'],
      config,
    )
    expect(stdout).to.equal('')
  })

  it('returns empty string for flag without completion', async () => {
    const {stdout} = await runCommand<{name: string}>(
      ['autocomplete:options', '--command', 'autocomplete', '--flag', 'refresh-cache'],
      config,
    )
    expect(stdout).to.equal('')
  })

  it('handles errors gracefully', async () => {
    // Test with invalid arguments - should return empty string
    const {stdout} = await runCommand<{name: string}>(
      ['autocomplete:options', '--command', 'invalid:command:that:does:not:exist', '--flag', 'flag'],
      config,
    )
    // Should return empty string on error
    expect(stdout).to.equal('')
  })

  // Note: We can't easily test actual completion results without creating a test command
  // with a completion function. The test manifest doesn't include commands with dynamic completions.
  // In a real scenario, you would:
  // 1. Create a command with a completion function in your plugin
  // 2. Add it to the test manifest
  // 3. Test that calling options returns the expected results
})
