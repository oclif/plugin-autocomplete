@oclif/plugin-autocomplete
==========================

autocomplte plugin for oclif

[![Version](https://img.shields.io/npm/v/@oclif/plugin-autocomplete.svg)](https://npmjs.org/package/@oclif/plugin-autocomplete)
[![CircleCI](https://circleci.com/gh/oclif/plugin-autocomplete/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/plugin-autocomplete/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/plugin-autocomplete?branch=master&svg=true)](https://ci.appveyor.com/project/oclif/plugin-autocomplete/branch/master)
[![Codecov](https://codecov.io/gh/oclif/plugin-autocomplete/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/plugin-autocomplete)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-autocomplete.svg)](https://npmjs.org/package/@oclif/plugin-autocomplete)
[![License](https://img.shields.io/npm/l/@oclif/plugin-autocomplete.svg)](https://github.com/oclif/plugin-autocomplete/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @oclif/plugin-autocomplete
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@oclif/plugin-autocomplete/0.0.0 darwin-x64 node-v9.3.0
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`oclif-example hello [FILE]`](#oclif-example-hello-file)

## `oclif-example hello [FILE]`

describe the command here

```
USAGE
  $ oclif-example hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ oclif-example hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/oclif/plugin-autocomplete/blob/v0.0.0/src/commands/hello.ts)_
<!-- commandsstop -->
