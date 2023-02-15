@oclif/plugin-autocomplete
==========================

autocomplete plugin for oclif (bash & zsh)

[![Version](https://img.shields.io/npm/v/@oclif/plugin-autocomplete.svg)](https://npmjs.org/package/@oclif/plugin-autocomplete)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-autocomplete.svg)](https://npmjs.org/package/@oclif/plugin-autocomplete)
[![License](https://img.shields.io/npm/l/@oclif/plugin-autocomplete.svg)](https://github.com/oclif/plugin-autocomplete/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage

Run `<cli> autocomplete` to generate the autocomplete files for your current shell.

## Topic separator
Since oclif v2 it's possible to use spaces as a topic separator in addition to colons.

For bash and zsh each topic separator has different autocomplete implementations, if the CLI supports using a space as the separator, plugin-autocomplete will generate completion for that topic.

If you still want to use the colon-separated autocomplete you can set `OCLIF_AUTOCOMPLETE_TOPIC_SEPARATOR` to `colon` and re-generate the autocomplete files.

Docs: https://oclif.io/docs/topic_separator

# Commands
<!-- commands -->
* [`oclif-example autocomplete [SHELL]`](#oclif-example-autocomplete-shell)

## `oclif-example autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ oclif-example autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ oclif-example autocomplete

  $ oclif-example autocomplete bash

  $ oclif-example autocomplete zsh

  $ oclif-example autocomplete --refresh-cache
```

_See code: [src/commands/autocomplete/index.ts](https://github.com/oclif/plugin-autocomplete/blob/v1.2.0/src/commands/autocomplete/index.ts)_
<!-- commandsstop -->
