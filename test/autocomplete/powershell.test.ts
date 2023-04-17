import {Config, Command} from '@oclif/core'
import * as path from 'path'
import {Plugin as IPlugin} from '@oclif/core/lib/interfaces'
import {expect} from 'chai'
import PowerShellComp from '../../src/autocomplete/powershell'

class MyCommandClass implements Command.Cached {
  [key: string]: unknown;

  args: {[name: string]: Command.Arg.Cached} = {}

  _base = ''

  aliases: string[] = []

  hidden = false

  id = 'foo:bar'

  flags = {}

  new(): Command.Cached {
    // @ts-expect-error this is not the full interface but enough for testing
    return {
      _run(): Promise<any> {
        return Promise.resolve()
      }}
  }

  run(): PromiseLike<any> {
    return Promise.resolve()
  }
}

const commandPluginA: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {
    metadata: {
      name: 'metadata',
      type: 'option',
      char: 'm',
      multiple: true,
    },
    'api-version': {
      name: 'api-version',
      type: 'option',
      char: 'a',
      multiple: false,
    },
    json: {
      name: 'json',
      type: 'boolean',
      summary: 'Format output as "json".',
      allowNo: false,
    },
    'ignore-errors': {
      name: 'ignore-errors',
      type: 'boolean',
      char: 'i',
      summary: 'Ignore errors.',
      allowNo: false,
    },
  },
  hidden: false,
  id: 'deploy',
  summary: 'Deploy a project',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/plugina',
}

const commandPluginB: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {
    branch: {
      name: 'branch',
      type: 'option',
      char: 'b',
      multiple: false,
    },
  },
  hidden: false,
  id: 'deploy:functions',
  summary: 'Deploy a function.',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/pluginb',
}

const commandPluginC: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  id: 'search',
  summary: 'Search for a command',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/pluginc',
}

const commandPluginD: Command.Loadable = {
  strict: false,
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  id: 'app:execute:code',
  summary: 'execute code',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginType: 'core',
  pluginAlias: '@My/plugind',
}

const pluginA: IPlugin = {
  load: async (): Promise<void> => {},
  findCommand: async (): Promise<Command.Class> => {
    return new MyCommandClass() as unknown as Command.Class
  },
  name: '@My/plugina',
  alias: '@My/plugina',
  commands: [commandPluginA, commandPluginB, commandPluginC, commandPluginD],
  _base: '',
  pjson: {} as any,
  commandIDs: ['deploy'],
  root: '',
  version: '0.0.0',
  type: 'core',
  hooks: {},
  topics: [{
    name: 'foo',
    description: 'foo commands',
  }],
  valid: true,
  tag: 'tag',
}

const plugins: IPlugin[] = [pluginA]

describe('powershell completion', () => {
  const root = path.resolve(__dirname, '../../package.json')
  const config = new Config({root})

  before(async () => {
    await config.load()
    /* eslint-disable require-atomic-updates */
    config.plugins = plugins
    config.pjson.oclif.plugins = ['@My/pluginb']
    config.pjson.dependencies = {'@My/pluginb': '0.0.0'}
    for (const plugin of config.plugins) {
      // @ts-expect-error private method
      config.loadCommands(plugin)
      // @ts-expect-error private method
      config.loadTopics(plugin)
    }
  })

  it('generates a valid completion file.', () => {
    config.bin = 'test-cli'
    const powerShellComp = new PowerShellComp(config as Config)
    expect(powerShellComp.generate()).to.equal(`
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

$scriptblock = {
    param($WordToComplete, $CommandAst, $CursorPosition)

    $Commands = 
@{

"app" = @{
"_summary" = "execute code"

"execute" = @{
"_summary" = "execute code"

"code" = @{
"_command" = @{
  "summary" = "execute code"
  "flags" = @{

  }
}

}

}

}


"deploy" = @{
"_command" = @{
  "summary" = "Deploy a project"
  "flags" = @{
    "metadata" = @{
      "summary" = " "
      "multiple" = $true
}
    "api-version" = @{ "summary" = " " }
    "json" = @{ "summary" = "Format output as ""json""." }
    "ignore-errors" = @{ "summary" = "Ignore errors." }
  }
}

"functions" = @{
"_command" = @{
  "summary" = "Deploy a function."
  "flags" = @{
    "branch" = @{ "summary" = " " }
  }
}

}
}


"search" = @{
"_command" = @{
  "summary" = "Search for a command"
  "flags" = @{

  }
}

}

}


    # Everything in the current line except the CLI executable name.
    $CurrentLine = $commandAst.CommandElements[1..$commandAst.CommandElements.Count] -split " "

    # Save flags in current line without the \`--\` prefix.
    $Flags = $CurrentLine | Where-Object {
      $_ -Match "^-{1,2}(\\w+)"
    } | ForEach-Object {
      $_.trim("-")
    }
    # Set $flags to an empty hashtable if there are no flags in the current line.
    if ($Flags -eq $null) {
      $Flags = @{}
    }

    # No command in the current line, suggest top-level args.
    if ($CurrentLine.Count -eq 0) {
        $Commands.GetEnumerator() | Sort-Object -Property key | ForEach-Object {
          New-Object -Type CompletionResult -ArgumentList \`
              "$($_.Key) ",
              $_.Key,
              "ParameterValue",
              "$($_.Value._summary ?? $_.Value._command.summary ?? " ")"
          }
    } else {
      # Start completing command/topic/coTopic

      $NextArg = $null
      $PrevNode = $null

      # Iterate over the current line to find the command/topic/coTopic hashtable
      $CurrentLine | ForEach-Object {
        if ($NextArg -eq $null) {
          $NextArg = $Commands[$_]
        } elseif ($PrevNode[$_] -ne $null) {
          $NextArg = $PrevNode[$_]
        } elseif ($_.StartsWith('-')) {
          return
        } else {
          $NextArg = $PrevNode
        }

        $PrevNode = $NextArg
      }

      # Start completing command.
      if ($NextArg._command -ne $null) {
          # Complete flags
          # \`cli config list -<TAB>\`
          if ($WordToComplete -like '-*') {
              $NextArg._command.flags.GetEnumerator() | Sort-Object -Property key 
                  | Where-Object {
                      # Filter out already used flags (unless \`flag.multiple = true\`).
                      $_.Value.multiple -eq $true -or !$flags.Contains($_.Key)
                  } 
                  | ForEach-Object {
                      New-Object -Type CompletionResult -ArgumentList \`
                          "--$($_.Key) ",
                          $_.Key,
                          "ParameterValue",
                          "$($NextArg._command.flags[$_.Key].summary ?? " ")"
                  }
          } else {
              # This could be a coTopic. We remove the "_command" hashtable
              # from $NextArg and check if there's a command under the current partial ID.
              $NextArg.remove("_command")

              if ($NextArg.keys -gt 0) {
                  $NextArg.GetEnumerator() | Sort-Object -Property key | ForEach-Object {
                    New-Object -Type CompletionResult -ArgumentList \`
                      "$($_.Key) ",
                      $_.Key,
                      "ParameterValue",
                      "$($NextArg[$_.Key]._summary ?? " ")"
                  }
              }
          }
      } else {
          # Start completing topic.

          # Topic summary is stored as "_summary" in the hashtable.
          # At this stage it is no longer needed so we remove it
          # so that $NextArg contains only commands/topics hashtables

          $NextArg.remove("_summary")

          $NextArg.GetEnumerator() | Sort-Object -Property key | ForEach-Object {
              New-Object -Type CompletionResult -ArgumentList \`
                  "$($_.Key) ",
                  $_.Key,
                  "ParameterValue",
                  "$($NextArg[$_.Key]._summary ?? $NextArg[$_.Key]._command.summary ?? " ")"
          }
      }
    }
}
Register-ArgumentCompleter -Native -CommandName test-cli -ScriptBlock $scriptblock
`)
  })
})
