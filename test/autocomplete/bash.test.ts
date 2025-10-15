import {Command, Config} from '@oclif/core'
import {Plugin as IPlugin} from '@oclif/core/interfaces'
import {expect} from 'chai'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import Create from '../../src/commands/autocomplete/create.js'
// autocomplete will throw error on windows ci
import {default as skipWindows} from '../helpers/runtest.js'

class MyCommandClass implements Command.Cached {
  [key: string]: unknown

  _base = ''
  aliases: string[] = []
  args: {[name: string]: Command.Arg.Cached} = {}
  flags = {}
  hidden = false
  hiddenAliases!: string[]
  id = 'foo:bar'

  new(): Command.Cached {
    // @ts-expect-error this is not the full interface but enough for testing
    return {
      _run(): Promise<any> {
        return Promise.resolve()
      },
    }
  }

  run(): PromiseLike<any> {
    return Promise.resolve()
  }
}

const commandPluginA: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {
    'api-version': {
      char: 'a',
      multiple: false,
      name: 'api-version',
      type: 'option',
    },
    'ignore-errors': {
      allowNo: false,
      char: 'i',
      name: 'ignore-errors',
      summary: 'Ignore errors.',
      type: 'boolean',
    },
    json: {
      allowNo: false,
      name: 'json',
      summary: 'Format output as json.',
      type: 'boolean',
    },
    metadata: {
      char: 'm',
      multiple: true,
      name: 'metadata',
      type: 'option',
    },
  },
  hidden: false,
  hiddenAliases: [],
  id: 'deploy',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/plugina',
  pluginType: 'core',
  strict: false,
  summary: 'Deploy a project',
}

const commandPluginB: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {
    branch: {
      char: 'b',
      multiple: false,
      name: 'branch',
      type: 'option',
    },
  },
  hidden: false,
  hiddenAliases: [],
  id: 'deploy:functions',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/pluginb',
  pluginType: 'core',
  strict: false,
  summary: 'Deploy a function.',
}

const commandPluginC: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  hiddenAliases: [],
  id: 'search',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/pluginc',
  pluginType: 'core',
  strict: false,
  summary: 'Search for a command',
}

const commandPluginD: Command.Loadable = {
  aliases: [],
  args: {},
  flags: {},
  hidden: false,
  hiddenAliases: [],
  id: 'app:execute:code',
  async load(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  pluginAlias: '@My/plugind',
  pluginType: 'core',
  strict: false,
  summary: 'execute code',
}

const pluginA: IPlugin = {
  _base: '',
  alias: '@My/plugina',
  commandIDs: ['deploy'],
  commands: [commandPluginA, commandPluginB, commandPluginC, commandPluginD],
  commandsDir: '',
  async findCommand(): Promise<Command.Class> {
    return new MyCommandClass() as unknown as Command.Class
  },
  hasManifest: true,
  hooks: {},
  isRoot: false,
  async load(): Promise<void> {},
  moduleType: 'commonjs',
  name: '@My/plugina',
  options: {root: ''},
  pjson: {} as any,
  root: '',
  tag: 'tag',
  topics: [
    {
      description: 'foo commands',
      name: 'foo',
    },
  ],
  type: 'core',
  valid: true,
  version: '0.0.0',
}

const plugins: IPlugin[] = [pluginA]

skipWindows('bash comp', () => {
  describe('bash completion', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json')
    const config = new Config({root})

    before(async () => {
      await config.load()
      for (const plugin of plugins) config.plugins.set(plugin.name, plugin)
      config.pjson.oclif.plugins = ['@My/pluginb']
      config.pjson.dependencies = {'@My/pluginb': '0.0.0'}
      for (const plugin of config.getPluginsList()) {
        // @ts-expect-error private method
        config.loadCommands(plugin)
        // @ts-expect-error private method
        config.loadTopics(plugin)
      }
    })

    it('generates a valid completion file.', async () => {
      config.bin = 'test-cli'
      const create = new Create([], config)

      // @ts-expect-error because it's a private method
      const bashCompletionFunction = await create.getBashCompletionFunction()
      expect(bashCompletionFunction.trim()).to.equal(`#!/usr/bin/env bash

_test-cli_autocomplete()
{

  local cur="$\{COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
autocomplete --refresh-cache
deploy --api-version --ignore-errors --json --metadata
deploy:functions --branch
${'search '}
${'app:execute:code '}
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    # Check if we're completing a flag value (previous word is a flag)
    local prev="$\{COMP_WORDS[COMP_CWORD-1]}"
    if [[ "$prev" == --* ]] && [[ "$cur" != "-"* ]]; then
      # We're completing a flag value, try dynamic completion
      local __COMP_WORDS
      if [[ $\{COMP_WORDS[2]} == ":" ]]; then
        #subcommand
        __COMP_WORDS=$(printf "%s" "$\{COMP_WORDS[@]:1:3}")
      else
        #simple command
        __COMP_WORDS="$\{COMP_WORDS[@]:1:1}"
      fi

      local flagName="$\{prev#--}"
      # Try to get dynamic completions
      local dynamicOpts=$(test-cli autocomplete:options --command="$\{__COMP_WORDS}" --flag="$\{flagName}" --current-line="$\{COMP_LINE}" 2>/dev/null)

      if [[ -n "$dynamicOpts" ]]; then
        # Handle dynamic options line-by-line to properly support special characters
        # This avoids issues with spaces, dollar signs, and other shell metacharacters
        COMPREPLY=()
        while IFS= read -r option; do
          # Only add options that match the current word being completed
          if [[ -z "$cur" ]] || [[ "$option" == "$cur"* ]]; then
            COMPREPLY+=("$option")
          fi
        done <<< "$dynamicOpts"
        return 0
      else
        # Fall back to file completion
        COMPREPLY=($(compgen -f -- "$\{cur}"))
        return 0
      fi
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
      // @ts-expect-error because it's a private method
      const bashCompletionFunction = await create.getBashCompletionFunction()
      expect(bashCompletionFunction.trim()).to.equal(`#!/usr/bin/env bash

_test-cli_autocomplete()
{

  local cur="$\{COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
autocomplete --refresh-cache
deploy --api-version --ignore-errors --json --metadata
deploy:functions --branch
${'search '}
${'app:execute:code '}
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    # Check if we're completing a flag value (previous word is a flag)
    local prev="$\{COMP_WORDS[COMP_CWORD-1]}"
    if [[ "$prev" == --* ]] && [[ "$cur" != "-"* ]]; then
      # We're completing a flag value, try dynamic completion
      local __COMP_WORDS
      if [[ $\{COMP_WORDS[2]} == ":" ]]; then
        #subcommand
        __COMP_WORDS=$(printf "%s" "$\{COMP_WORDS[@]:1:3}")
      else
        #simple command
        __COMP_WORDS="$\{COMP_WORDS[@]:1:1}"
      fi

      local flagName="$\{prev#--}"
      # Try to get dynamic completions
      local dynamicOpts=$(test-cli autocomplete:options --command="$\{__COMP_WORDS}" --flag="$\{flagName}" --current-line="$\{COMP_LINE}" 2>/dev/null)

      if [[ -n "$dynamicOpts" ]]; then
        # Handle dynamic options line-by-line to properly support special characters
        # This avoids issues with spaces, dollar signs, and other shell metacharacters
        COMPREPLY=()
        while IFS= read -r option; do
          # Only add options that match the current word being completed
          if [[ -z "$cur" ]] || [[ "$option" == "$cur"* ]]; then
            COMPREPLY+=("$option")
          fi
        done <<< "$dynamicOpts"
        return 0
      else
        # Fall back to file completion
        COMPREPLY=($(compgen -f -- "$\{cur}"))
        return 0
      fi
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
      // @ts-expect-error because it's a private method
      const bashCompletionFunction = await create.getBashCompletionFunction()
      expect(bashCompletionFunction).to.equal(`#!/usr/bin/env bash

_test-cli_autocomplete()
{

  local cur="$\{COMP_WORDS[COMP_CWORD]}" opts IFS=$' \\t\\n'
  COMPREPLY=()

  local commands="
autocomplete --refresh-cache
deploy --api-version --ignore-errors --json --metadata
deploy:functions --branch
${'search '}
${'app:execute:code '}
"

  if [[ "$cur" != "-"* ]]; then
    opts=$(printf "$commands" | grep -Eo '^[a-zA-Z0-9:_-]+')
  else
    # Check if we're completing a flag value (previous word is a flag)
    local prev="$\{COMP_WORDS[COMP_CWORD-1]}"
    if [[ "$prev" == --* ]] && [[ "$cur" != "-"* ]]; then
      # We're completing a flag value, try dynamic completion
      local __COMP_WORDS
      if [[ $\{COMP_WORDS[2]} == ":" ]]; then
        #subcommand
        __COMP_WORDS=$(printf "%s" "$\{COMP_WORDS[@]:1:3}")
      else
        #simple command
        __COMP_WORDS="$\{COMP_WORDS[@]:1:1}"
      fi

      local flagName="$\{prev#--}"
      # Try to get dynamic completions
      local dynamicOpts=$(test-cli autocomplete:options --command="$\{__COMP_WORDS}" --flag="$\{flagName}" --current-line="$\{COMP_LINE}" 2>/dev/null)

      if [[ -n "$dynamicOpts" ]]; then
        # Handle dynamic options line-by-line to properly support special characters
        # This avoids issues with spaces, dollar signs, and other shell metacharacters
        COMPREPLY=()
        while IFS= read -r option; do
          # Only add options that match the current word being completed
          if [[ -z "$cur" ]] || [[ "$option" == "$cur"* ]]; then
            COMPREPLY+=("$option")
          fi
        done <<< "$dynamicOpts"
        return 0
      else
        # Fall back to file completion
        COMPREPLY=($(compgen -f -- "$\{cur}"))
        return 0
      fi
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
