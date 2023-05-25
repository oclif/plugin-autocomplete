import {Config, Command} from '@oclif/core'
import * as path from 'path'
import {Plugin as IPlugin} from '@oclif/core/lib/interfaces'
import {expect} from 'chai'
import ZshCompWithSpaces from '../../src/autocomplete/zsh'

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

skipWindows('zsh comp', () => {
  describe('zsh completion with spaces', () => {
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
      const zshCompWithSpaces = new ZshCompWithSpaces(config as Config)
      expect(zshCompWithSpaces.generate()).to.equal(`#compdef test-cli


_test-cli_app() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C "1: :->cmds" "*::arg:->args"

  case "$state" in
    cmds)
_values "completions" \\
"execute[execute code]" \\

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
"*"{-m,--metadata}"[]:file:_files" \\
"(-a --api-version)"{-a,--api-version}"[]:file:_files" \\
--json"[Format output as json.]" \\
"(-i --ignore-errors)"{-i,--ignore-errors}"[Ignore errors.]" \\
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
"(-b --branch)"{-b,--branch}"[]:file:_files" \\
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
"search[Search for a command]" \\

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
