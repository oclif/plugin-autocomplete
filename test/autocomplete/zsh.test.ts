import {Command, Config} from '@oclif/core'
import {Deprecation, Plugin as IPlugin} from '@oclif/core/interfaces'
import {expect} from 'chai'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import ZshCompWithSpaces from '../../src/autocomplete/zsh.js'
// autocomplete will throw error on windows ci
import {default as skipWindows} from '../helpers/runtest.js'

class MyCommandClass implements Command.Cached {
  [key: string]: unknown
  _base = ''
  aliases: string[] = []
  aliasPermutations?: string[] | undefined
  args: {[name: string]: Command.Arg.Cached} = {}
  deprecateAliases?: boolean | undefined
  deprecationOptions?: Deprecation | undefined
  description?: string | undefined
  examples?: Command.Example[] | undefined
  flags = {}
  hasDynamicHelp?: boolean | undefined
  hidden = false
  hiddenAliases!: string[]
  id = 'foo:bar'
  isESM?: boolean | undefined
  permutations?: string[] | undefined
  pluginAlias?: string | undefined
  pluginName?: string | undefined
  pluginType?: string | undefined
  relativePath?: string[] | undefined
  state?: string | undefined
  strict?: boolean | undefined
  summary?: string | undefined
  type?: string | undefined
  usage?: string | string[] | undefined

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
      completion: {
        options: async () => ['50.0', '51.0', '52.0'],
      },
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
      completion: {
        options: async () => ['ApexClass', 'CustomObject', 'Profile'],
      },
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
      completion: {
        options: async () => ['main', 'develop', 'feature'],
      },
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
  hasManifest: false,
  hooks: {},
  isRoot: false,
  async load(): Promise<void> {},
  moduleType: 'commonjs',
  name: '@My/plugina',
  options: {
    root: '',
  },
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

skipWindows('zsh comp', () => {
  describe('zsh completion with spaces', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json')
    const config = new Config({root})

    before(async () => {
      await config.load()

      for (const plugin of plugins) config.plugins.set(plugin.name, plugin)
      config.plugins.delete('@oclif/plugin-autocomplete')
      config.pjson.oclif.plugins = ['@My/pluginb']
      config.pjson.dependencies = {'@My/pluginb': '0.0.0'}
      for (const plugin of config.getPluginsList()) {
        // @ts-expect-error private method
        config.loadCommands(plugin)
        // @ts-expect-error private method
        config.loadTopics(plugin)
      }
    })

    it('generates a valid completion file.', () => {
      config.bin = 'test-cli'
      const zshCompWithSpaces = new ZshCompWithSpaces(config as Config)
      expect(zshCompWithSpaces.generate()).to.equal(`#compdef test-cli



# Dynamic completion helper with timestamp-based caching
_test-cli_dynamic_comp() {
  local cmd_id="$1"
  local flag_name="$2"
  local cache_duration="$3"
  local cache_dir="$HOME/.cache/test-cli/autocomplete/flag_completions"
  local cache_file="$cache_dir/\${cmd_id//[:]/_}_\${flag_name}.cache"
  local -a opts
  
  # Check if cache file exists and is valid
  if [[ -f "$cache_file" ]]; then
    # Read timestamp from first line
    local cache_timestamp=$(head -n 1 "$cache_file" 2>/dev/null)
    local current_timestamp=$(date +%s)
    local age=$((current_timestamp - cache_timestamp))
    
    # Check if cache is still valid
    if [[ -n "$cache_timestamp" ]] && (( age < cache_duration )); then
      # Cache valid - read options (skip first line)
      opts=("\${(@f)$(tail -n +2 "$cache_file")}")
      
      # Check if this is a "no completion" marker
      if [[ "\${opts[1]}" == "__NO_COMPLETION__" ]]; then
        # No completion available - use file completion
        _files
        return 0
      fi
      
      if [[ \${#opts[@]} -gt 0 ]]; then
        _describe "\${flag_name} options" opts
        return 0
      fi
    fi
  fi
  
  # Cache miss or expired - call Node.js
  mkdir -p "$cache_dir" 2>/dev/null
  local raw_output=$(test-cli autocomplete:options \${cmd_id} \${flag_name} --current-line="$words" 2>/dev/null)
  
  if [[ -n "$raw_output" ]]; then
    # Save to cache with timestamp
    {
      echo "$(date +%s)"
      echo "$raw_output"
    } > "$cache_file"
    
    # Provide completions
    opts=("\${(@f)$raw_output}")
    _describe "\${flag_name} options" opts
  else
    # No completion available - cache empty result to avoid repeated Node.js calls
    {
      echo "$(date +%s)"
      echo "__NO_COMPLETION__"
    } > "$cache_file"
    
    # Fall back to file completion
    _files
  fi
}


_test-cli_app() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"execute[execute code]"

      ;;
    args)
      case $line[1] in
        "execute")
          _test-cli_app_execute
        ;;

      esac
      ;;
  esac
}

_test-cli_app_execute() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"code[execute code]" \\

      ;;
    args)
      case $line[1] in
        "code")
          _arguments -S \\
--help"[Show help for command]" \\
"*: :_files"
        ;;

      esac
      ;;
  esac
}

_test-cli_deploy() {
  _test-cli_deploy_flags() {
    local context state state_descr line
    typeset -A opt_args

    _arguments -S \\
"(-a --api-version)"{-a,--api-version}"[]": :_test-cli_dynamic_comp deploy api-version 86400" \\
"(-i --ignore-errors)"{-i,--ignore-errors}"[Ignore errors.]" \\
--json"[Format output as json.]" \\
"*"{-m,--metadata}"[]": :_test-cli_dynamic_comp deploy metadata 86400" \\
--help"[Show help for command]" \\
"*: :_files"
  }

  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*: :->args"

  case "$state" in
    cmds)
      if [[ "\${words[CURRENT]}" == -* ]]; then
        _test-cli_deploy_flags
      else
_values "completions" \\
"functions[Deploy a function.]" \\

      fi
      ;;
    args)
      case $line[1] in
        "functions")
          _arguments -S \\
"(-b --branch)"{-b,--branch}"[]": :_test-cli_dynamic_comp deploy:functions branch 86400" \\
--help"[Show help for command]" \\
"*: :_files"
        ;;

      *)
        _test-cli_deploy_flags
      ;;
      esac
      ;;
  esac
}


_test-cli() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      _values "completions" \\
"app[execute code]" \\
"deploy[Deploy a project]" \\
"search[Search for a command]"

    ;;
    args)
      case $line[1] in
app)
  _test-cli_app
  ;;
deploy)
  _test-cli_deploy
  ;;
esac

    ;;
  esac
}

_test-cli
`)
    })

    it('generates a valid completion file with a bin alias.', () => {
      config.bin = 'test-cli'
      config.binAliases = ['testing']
      const zshCompWithSpaces = new ZshCompWithSpaces(config as Config)
      expect(zshCompWithSpaces.generate()).to.equal(`#compdef test-cli
compdef testing=test-cli


# Dynamic completion helper with timestamp-based caching
_test-cli_dynamic_comp() {
  local cmd_id="$1"
  local flag_name="$2"
  local cache_duration="$3"
  local cache_dir="$HOME/.cache/test-cli/autocomplete/flag_completions"
  local cache_file="$cache_dir/\${cmd_id//[:]/_}_\${flag_name}.cache"
  local -a opts
  
  # Check if cache file exists and is valid
  if [[ -f "$cache_file" ]]; then
    # Read timestamp from first line
    local cache_timestamp=$(head -n 1 "$cache_file" 2>/dev/null)
    local current_timestamp=$(date +%s)
    local age=$((current_timestamp - cache_timestamp))
    
    # Check if cache is still valid
    if [[ -n "$cache_timestamp" ]] && (( age < cache_duration )); then
      # Cache valid - read options (skip first line)
      opts=("\${(@f)$(tail -n +2 "$cache_file")}")
      
      # Check if this is a "no completion" marker
      if [[ "\${opts[1]}" == "__NO_COMPLETION__" ]]; then
        # No completion available - use file completion
        _files
        return 0
      fi
      
      if [[ \${#opts[@]} -gt 0 ]]; then
        _describe "\${flag_name} options" opts
        return 0
      fi
    fi
  fi
  
  # Cache miss or expired - call Node.js
  mkdir -p "$cache_dir" 2>/dev/null
  local raw_output=$(test-cli autocomplete:options \${cmd_id} \${flag_name} --current-line="$words" 2>/dev/null)
  
  if [[ -n "$raw_output" ]]; then
    # Save to cache with timestamp
    {
      echo "$(date +%s)"
      echo "$raw_output"
    } > "$cache_file"
    
    # Provide completions
    opts=("\${(@f)$raw_output}")
    _describe "\${flag_name} options" opts
  else
    # No completion available - cache empty result to avoid repeated Node.js calls
    {
      echo "$(date +%s)"
      echo "__NO_COMPLETION__"
    } > "$cache_file"
    
    # Fall back to file completion
    _files
  fi
}


_test-cli_app() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"execute[execute code]"

      ;;
    args)
      case $line[1] in
        "execute")
          _test-cli_app_execute
        ;;

      esac
      ;;
  esac
}

_test-cli_app_execute() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"code[execute code]" \\

      ;;
    args)
      case $line[1] in
        "code")
          _arguments -S \\
--help"[Show help for command]" \\
"*: :_files"
        ;;

      esac
      ;;
  esac
}

_test-cli_deploy() {
  _test-cli_deploy_flags() {
    local context state state_descr line
    typeset -A opt_args

    _arguments -S \\
"(-a --api-version)"{-a,--api-version}"[]": :_test-cli_dynamic_comp deploy api-version 86400" \\
"(-i --ignore-errors)"{-i,--ignore-errors}"[Ignore errors.]" \\
--json"[Format output as json.]" \\
"*"{-m,--metadata}"[]": :_test-cli_dynamic_comp deploy metadata 86400" \\
--help"[Show help for command]" \\
"*: :_files"
  }

  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*: :->args"

  case "$state" in
    cmds)
      if [[ "\${words[CURRENT]}" == -* ]]; then
        _test-cli_deploy_flags
      else
_values "completions" \\
"functions[Deploy a function.]" \\

      fi
      ;;
    args)
      case $line[1] in
        "functions")
          _arguments -S \\
"(-b --branch)"{-b,--branch}"[]": :_test-cli_dynamic_comp deploy:functions branch 86400" \\
--help"[Show help for command]" \\
"*: :_files"
        ;;

      *)
        _test-cli_deploy_flags
      ;;
      esac
      ;;
  esac
}


_test-cli() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      _values "completions" \\
"app[execute code]" \\
"deploy[Deploy a project]" \\
"search[Search for a command]"

    ;;
    args)
      case $line[1] in
app)
  _test-cli_app
  ;;
deploy)
  _test-cli_deploy
  ;;
esac

    ;;
  esac
}

_test-cli
`)
    })

    it('generates a valid completion file with multiple bin aliases.', () => {
      config.bin = 'test-cli'
      config.binAliases = ['testing', 'testing2']
      const zshCompWithSpaces = new ZshCompWithSpaces(config as Config)
      expect(zshCompWithSpaces.generate()).to.equal(`#compdef test-cli
compdef testing=test-cli
compdef testing2=test-cli


# Dynamic completion helper with timestamp-based caching
_test-cli_dynamic_comp() {
  local cmd_id="$1"
  local flag_name="$2"
  local cache_duration="$3"
  local cache_dir="$HOME/.cache/test-cli/autocomplete/flag_completions"
  local cache_file="$cache_dir/\${cmd_id//[:]/_}_\${flag_name}.cache"
  local -a opts
  
  # Check if cache file exists and is valid
  if [[ -f "$cache_file" ]]; then
    # Read timestamp from first line
    local cache_timestamp=$(head -n 1 "$cache_file" 2>/dev/null)
    local current_timestamp=$(date +%s)
    local age=$((current_timestamp - cache_timestamp))
    
    # Check if cache is still valid
    if [[ -n "$cache_timestamp" ]] && (( age < cache_duration )); then
      # Cache valid - read options (skip first line)
      opts=("\${(@f)$(tail -n +2 "$cache_file")}")
      
      # Check if this is a "no completion" marker
      if [[ "\${opts[1]}" == "__NO_COMPLETION__" ]]; then
        # No completion available - use file completion
        _files
        return 0
      fi
      
      if [[ \${#opts[@]} -gt 0 ]]; then
        _describe "\${flag_name} options" opts
        return 0
      fi
    fi
  fi
  
  # Cache miss or expired - call Node.js
  mkdir -p "$cache_dir" 2>/dev/null
  local raw_output=$(test-cli autocomplete:options \${cmd_id} \${flag_name} --current-line="$words" 2>/dev/null)
  
  if [[ -n "$raw_output" ]]; then
    # Save to cache with timestamp
    {
      echo "$(date +%s)"
      echo "$raw_output"
    } > "$cache_file"
    
    # Provide completions
    opts=("\${(@f)$raw_output}")
    _describe "\${flag_name} options" opts
  else
    # No completion available - cache empty result to avoid repeated Node.js calls
    {
      echo "$(date +%s)"
      echo "__NO_COMPLETION__"
    } > "$cache_file"
    
    # Fall back to file completion
    _files
  fi
}


_test-cli_app() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"execute[execute code]"

      ;;
    args)
      case $line[1] in
        "execute")
          _test-cli_app_execute
        ;;

      esac
      ;;
  esac
}

_test-cli_app_execute() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"code[execute code]" \\

      ;;
    args)
      case $line[1] in
        "code")
          _arguments -S \\
--help"[Show help for command]" \\
"*: :_files"
        ;;

      esac
      ;;
  esac
}

_test-cli_deploy() {
  _test-cli_deploy_flags() {
    local context state state_descr line
    typeset -A opt_args

    _arguments -S \\
"(-a --api-version)"{-a,--api-version}"[]": :_test-cli_dynamic_comp deploy api-version 86400" \\
"(-i --ignore-errors)"{-i,--ignore-errors}"[Ignore errors.]" \\
--json"[Format output as json.]" \\
"*"{-m,--metadata}"[]": :_test-cli_dynamic_comp deploy metadata 86400" \\
--help"[Show help for command]" \\
"*: :_files"
  }

  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*: :->args"

  case "$state" in
    cmds)
      if [[ "\${words[CURRENT]}" == -* ]]; then
        _test-cli_deploy_flags
      else
_values "completions" \\
"functions[Deploy a function.]" \\

      fi
      ;;
    args)
      case $line[1] in
        "functions")
          _arguments -S \\
"(-b --branch)"{-b,--branch}"[]": :_test-cli_dynamic_comp deploy:functions branch 86400" \\
--help"[Show help for command]" \\
"*: :_files"
        ;;

      *)
        _test-cli_deploy_flags
      ;;
      esac
      ;;
  esac
}


_test-cli() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
      _values "completions" \\
"app[execute code]" \\
"deploy[Deploy a project]" \\
"search[Search for a command]"

    ;;
    args)
      case $line[1] in
app)
  _test-cli_app
  ;;
deploy)
  _test-cli_deploy
  ;;
esac

    ;;
  esac
}

_test-cli
`)
    })
  })
})
