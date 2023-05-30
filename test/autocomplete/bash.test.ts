import {Config, Command} from '@oclif/core'
import * as path from 'path'
import {Plugin as IPlugin} from '@oclif/core/lib/interfaces'
import {expect} from 'chai'
import Create from '../../src/commands/autocomplete/create'

// autocomplete will throw error on windows ci
const {default: skipWindows} = require('../helpers/runtest')

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
      summary: 'Format output as json.',
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

skipWindows('bash comp', () => {
  describe('bash completion', () => {
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

    it('generates a valid completion file.', async () => {
      config.bin = 'test-cli'
      const create = new Create([], config)

      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      expect(create.bashCompletionFunction.trim()).to.equal(`#!/usr/bin/env bash

_test-cli_autocomplete()
{

  local cur="$\{COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
deploy --metadata --api-version --json --ignore-errors
deploy:functions --branch
${'search '}
${'app:execute:code '}
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    local __COMP_WORDS
    if [[ $\{COMP_WORDS[2]} == ":" ]]; then
      #subcommand
      __COMP_WORDS=$(printf "%s" "$\{COMP_WORDS[@]:1:3}")
    else
      #simple command
      __COMP_WORDS="$\{COMP_WORDS[@]:1:1}"
    fi
    opts=$(printf "$commands" | grep "$\{__COMP_WORDS}" | sed -n "s/^$\{__COMP_WORDS} //p")
  fi
  _get_comp_words_by_ref -n : cur
  COMPREPLY=( $(compgen -W "$\{opts}" -- $\{cur}) )
  __ltrim_colon_completions "$cur"
  return 0

}

complete -o default -F _test-cli_autocomplete test-cli`)
    })
    it('generates a valid completion file with an alias.', async () => {
      config.bin = 'test-cli'
      config.binAliases = ['alias']
      const create = new Create([], config)
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      expect(create.bashCompletionFunction.trim()).to.equal(`#!/usr/bin/env bash

_test-cli_autocomplete()
{

  local cur="$\{COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
deploy --metadata --api-version --json --ignore-errors
deploy:functions --branch
${'search '}
${'app:execute:code '}
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    local __COMP_WORDS
    if [[ $\{COMP_WORDS[2]} == ":" ]]; then
      #subcommand
      __COMP_WORDS=$(printf "%s" "$\{COMP_WORDS[@]:1:3}")
    else
      #simple command
      __COMP_WORDS="$\{COMP_WORDS[@]:1:1}"
    fi
    opts=$(printf "$commands" | grep "$\{__COMP_WORDS}" | sed -n "s/^$\{__COMP_WORDS} //p")
  fi
  _get_comp_words_by_ref -n : cur
  COMPREPLY=( $(compgen -W "$\{opts}" -- $\{cur}) )
  __ltrim_colon_completions "$cur"
  return 0

}

complete -o default -F _test-cli_autocomplete test-cli
complete -F _test-cli_autocomplete alias`)
    })
    it('generates a valid completion file with multiple aliases.', async () => {
      config.bin = 'test-cli'
      config.binAliases = ['alias', 'alias2']
      const create = new Create([], config)
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      expect(create.bashCompletionFunction).to.equal(`#!/usr/bin/env bash

_test-cli_autocomplete()
{

  local cur="$\{COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
deploy --metadata --api-version --json --ignore-errors
deploy:functions --branch
${'search '}
${'app:execute:code '}
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    local __COMP_WORDS
    if [[ $\{COMP_WORDS[2]} == ":" ]]; then
      #subcommand
      __COMP_WORDS=$(printf "%s" "$\{COMP_WORDS[@]:1:3}")
    else
      #simple command
      __COMP_WORDS="$\{COMP_WORDS[@]:1:1}"
    fi
    opts=$(printf "$commands" | grep "$\{__COMP_WORDS}" | sed -n "s/^$\{__COMP_WORDS} //p")
  fi
  _get_comp_words_by_ref -n : cur
  COMPREPLY=( $(compgen -W "$\{opts}" -- $\{cur}) )
  __ltrim_colon_completions "$cur"
  return 0

}

complete -o default -F _test-cli_autocomplete test-cli
complete -F _test-cli_autocomplete alias
complete -F _test-cli_autocomplete alias2`)
    })
  })
})
