import {Command, Config, Interfaces} from '@oclif/core'
import * as ejs from 'ejs'

type CommandCompletion = {
  flags: CommandFlags
  id: string
  summary: string
}

type CommandFlags = {
  [name: string]: Command.Flag.Cached
}

type Topic = {
  description: string
  name: string
}

export default class BashCompWithSpaces {
  protected config: Config
  private commands: CommandCompletion[]
  private topics: Topic[]

  constructor(config: Config) {
    this.config = config
    this.topics = this.getTopics()
    this.commands = this.getCommands()
  }

  public generate(): string {
    const commandsWithFlags = this.generateCommandsWithFlags()
    const flagCompletionCases = this.generateFlagCompletionCases()
    const multipleFlagsCases = this.generateMultipleFlagsCases()
    const rootTopicsCompletion = this.generateRootLevelTopics()
    const topicsMetadata = this.generateTopicsMetadata()
    const commandSummaries = this.generateCommandSummaries()
    const flagMetadataBlocks = this.generateFlagMetadataBlocks()

    return `#!/usr/bin/env bash

# bash completion for ${this.config.bin}                        -*- shell-script -*-

__${this.config.bin}_debug()
{
    if [[ -n \${BASH_COMP_DEBUG_FILE-} ]]; then
        echo "$*" >> "\${BASH_COMP_DEBUG_FILE}"
    fi
}

# Macs have bash3 for which the bash-completion package doesn't include
# _init_completion. This is a minimal version of that function.
__${this.config.bin}_init_completion()
{
    COMPREPLY=()
    if declare -F _get_comp_words_by_ref >/dev/null 2>&1; then
        _get_comp_words_by_ref "$@" cur prev words cword
    else
        # Manual initialization when bash-completion is not available
        cur="\${COMP_WORDS[COMP_CWORD]}"
        prev="\${COMP_WORDS[COMP_CWORD-1]}"
        words=("\${COMP_WORDS[@]}")
        cword=$COMP_CWORD
    fi
}

__${this.config.bin}_handle_completion_types() {
    __${this.config.bin}_debug "__${this.config.bin}_handle_completion_types: COMP_TYPE is $COMP_TYPE"

    case $COMP_TYPE in
    37|42)
        # Type: menu-complete/menu-complete-backward and insert-completions
        # If the user requested inserting one completion at a time, or all
        # completions at once on the command-line we must remove the descriptions.
        local tab=$'\\t' comp
        while IFS='' read -r comp; do
            [[ -z $comp ]] && continue
            # Strip any description
            comp=\${comp%%$tab*}
            # Only consider the completions that match
            if [[ $comp == "$cur"* ]]; then
                COMPREPLY+=("$comp")
            fi
        done < <(printf "%s\\n" "\${completions[@]}")
        ;;

    *)
        # Type: complete (normal completion)
        __${this.config.bin}_handle_standard_completion_case
        ;;
    esac
}

__${this.config.bin}_handle_standard_completion_case() {
    local tab=$'\\t' comp

    # Short circuit to optimize if we don't have descriptions
    if [[ "\${completions[*]}" != *$tab* ]]; then
        IFS=$'\\n' read -ra COMPREPLY -d '' < <(compgen -W "\${completions[*]}" -- "$cur")
        return 0
    fi

    local longest=0
    local compline
    # Look for the longest completion so that we can format things nicely
    while IFS='' read -r compline; do
        [[ -z $compline ]] && continue
        # Strip any description before checking the length
        comp=\${compline%%$tab*}
        # Only consider the completions that match
        [[ $comp == "$cur"* ]] || continue
        COMPREPLY+=("$compline")
        if ((\${#comp}>longest)); then
            longest=\${#comp}
        fi
    done < <(printf "%s\\n" "\${completions[@]}")

    # If there is a single completion left, remove the description text
    if ((\${#COMPREPLY[*]} == 1)); then
        __${this.config.bin}_debug "COMPREPLY[0]: \${COMPREPLY[0]}"
        comp="\${COMPREPLY[0]%%$tab*}"
        __${this.config.bin}_debug "Removed description from single completion, which is now: $comp"
        COMPREPLY[0]=$comp
    else # Format the descriptions
        __${this.config.bin}_format_comp_descriptions $longest
    fi
}

__${this.config.bin}_format_comp_descriptions()
{
    local tab=$'\\t'
    local comp desc maxdesclength
    local longest=$1

    local i ci
    for ci in \${!COMPREPLY[*]}; do
        comp=\${COMPREPLY[ci]}
        # Properly format the description string which follows a tab character if there is one
        if [[ "$comp" == *$tab* ]]; then
            __${this.config.bin}_debug "Original comp: $comp"
            desc=\${comp#*$tab}
            comp=\${comp%%$tab*}

            # $COLUMNS stores the current shell width.
            # Remove an extra 4 because we add 2 spaces and 2 parentheses.
            maxdesclength=$(( COLUMNS - longest - 4 ))

            # Make sure we can fit a description of at least 8 characters
            # if we are to align the descriptions.
            if ((maxdesclength > 8)); then
                # Add the proper number of spaces to align the descriptions
                for ((i = \${#comp} ; i < longest ; i++)); do
                    comp+=" "
                done
            else
                # Don't pad the descriptions so we can fit more text after the completion
                maxdesclength=$(( COLUMNS - \${#comp} - 4 ))
            fi

            # If there is enough space for any description text,
            # truncate the descriptions that are too long for the shell width
            if ((maxdesclength > 0)); then
                if ((\${#desc} > maxdesclength)); then
                    desc=\${desc:0:$(( maxdesclength - 1 ))}
                    desc+="…"
                fi
                comp+="  ($desc)"
            fi
            COMPREPLY[ci]=$comp
            __${this.config.bin}_debug "Final comp: $comp"
        fi
    done
}

# This function joins an array using a character passed in
# e.g. ARRAY=(one two three) -> join_by ":" \${ARRAY[@]} -> "one:two:three"
function join_by { local IFS="$1"; shift; echo "$*"; }


_${this.config.bin}_autocomplete()
{
    local cur prev words cword split
    COMPREPLY=()
    # Call _init_completion from the bash-completion package
    # to prepare the arguments properly
    if declare -F _init_completion >/dev/null 2>&1; then
        _init_completion -n =: || return
    else
        __${this.config.bin}_init_completion -n =: || return
    fi
    __${this.config.bin}_debug
    __${this.config.bin}_debug "========= starting completion logic =========="
    __${this.config.bin}_debug "cur is \${cur}, words[*] is \${words[*]}, #words[@] is \${#words[@]}, cword is $cword"

    # The user could have moved the cursor backwards on the command-line.
    # We need to trigger completion from the $cword location, so we need
    # to truncate the command-line ($words) up to the $cword location.
    words=("\${words[@]:0:$cword+1}")
    __${this.config.bin}_debug "Truncated words[*]: \${words[*]},"

    local commands="
${commandsWithFlags}
"

    local topics="
${topicsMetadata}
"

    local command_summaries="
${commandSummaries}
"

${flagMetadataBlocks}

    local completions=()
    __${this.config.bin}_get_completions
    
    # Force specific completion options
    if [[ $(type -t compopt) == builtin ]]; then
        compopt -o nosort
        compopt +o default
    fi
    
    __${this.config.bin}_handle_completion_types
}

__${this.config.bin}_get_completions() {
    local tab=$'\\t'
    completions=()

    # Get current position in command
    local cmd_parts=("\${words[@]:1}")  # Remove '${this.config.bin}' from beginning
    local num_parts=\${#cmd_parts[@]}
    
    # If current word is empty but we have a space, we're completing the next argument
    if [[ -z "$cur" && $cword -gt 1 ]]; then
        num_parts=$((cword - 1))
    else
        # If we're typing a word, we're still on that position
        num_parts=$((cword - 1))
    fi

    __${this.config.bin}_debug "cmd_parts: \${cmd_parts[*]}"
    __${this.config.bin}_debug "num_parts: $num_parts"
    __${this.config.bin}_debug "cword: $cword"
    __${this.config.bin}_debug "cur: '$cur'"
    
    # Get clean command words (without flags)
    local clean_cmd_parts=()
    local i=1
    while [[ i -lt cword ]]; do
        local word="\${words[i]}"
        if [[ "$word" =~ ^--[a-zA-Z0-9-]+$ ]]; then
            # Found a long flag, skip it and its potential value
            if [[ $((i+1)) -lt cword && "\${words[$((i+1))]}" != -* && -n "\${words[$((i+1))]}" ]]; then
                ((i++)) # Skip the flag value
            fi
        elif [[ "$word" =~ ^-[a-zA-Z]$ ]]; then
            # Found a short flag, skip it and its potential value
            if [[ $((i+1)) -lt cword && "\${words[$((i+1))]}" != -* && -n "\${words[$((i+1))]}" ]]; then
                ((i++)) # Skip the flag value
            fi
        elif [[ "$word" != -* ]]; then
            # This is a command word (not a flag)
            clean_cmd_parts+=("$word")
        fi
        ((i++))
    done
    
    local cmd_key="\$(join_by " " "\${clean_cmd_parts[@]}")"
    __${this.config.bin}_debug "cmd_key: '$cmd_key'"
    
    # Check if we should complete flag values
    if __${this.config.bin}_is_completing_flag_value "$cmd_key"; then
        local prev_word="\${words[$((cword - 1))]}"
        local values
        values=$(__${this.config.bin}_get_flag_values "$prev_word" "$cmd_key")
        if [[ -n "$values" ]]; then
            IFS=',' read -ra value_array <<< "$values"
            local value
            for value in "\${value_array[@]}"; do
                completions+=("\${value}")
            done
            return
        fi
        # If no known values, don't suggest anything (let user type)
        return
    fi
    
    # Check if we should suggest flags
    if __${this.config.bin}_should_suggest_flags "$cmd_key"; then
        __${this.config.bin}_get_flag_completions "$cmd_key"
        return
    fi

    # Command completion
    __${this.config.bin}_get_command_completions
}

__${this.config.bin}_is_completing_flag_value() {
    # Check if we're completing a value for an option flag
    local prev_word="\${words[$((cword - 1))]}"
    local cmd_key="$1"
    
    # Look backwards through the words to find the last flag that might expect a value
    for ((i=cword-1; i>=1; i--)); do
        local word="\${words[i]}"
        if [[ "$word" =~ ^(-[a-zA-Z]|--[a-zA-Z0-9-]+)$ ]]; then
            # Found a flag, check if it expects a value and doesn't have one yet
            local flag_has_value=false
            if [[ $((i+1)) -lt cword ]]; then
                local next_word="\${words[$((i+1))]}"
                if [[ "$next_word" != -* && -n "$next_word" ]]; then
                    flag_has_value=true
                fi
            fi
            
            # If this flag doesn't have a value yet, it might be expecting one
            if [[ "$flag_has_value" == false ]]; then
                # Check if this is an option flag (not boolean)
                if __${this.config.bin}_flag_expects_value "$word" "$cmd_key"; then
                    return 0
                fi
            fi
            break
        elif [[ "$word" != -* ]]; then
            # Hit a non-flag word, stop looking
            break
        fi
    done
    return 1
}

__${this.config.bin}_flag_expects_value() {
    local flag_name="$1"
    local cmd_key="$2"
    
    # Use the flag metadata to check if flag expects a value
    local cmd_var_name="flag_metadata_\$(echo \"$cmd_key\" | tr ' :' '_')"
    if [[ -n "\${!cmd_var_name}" ]]; then
        # Use pure bash pattern matching to find the flag
        local metadata=$'\\n'"\${!cmd_var_name}"
        local pattern=$'\\n'\${flag_name}' '
        if [[ "$metadata" == *\${pattern}* ]]; then
            # Flag is present in metadata, check if it expects a value
            local after_flag="\${metadata#*\${pattern}}"
            local flag_line="\${after_flag%%$'\\n'*}"
            
            # Check flag type from metadata
            if [[ "$flag_line" == *"|@boolean"* ]]; then
                return 1  # Boolean flags don't expect values
            elif [[ "$flag_line" == *"|@option"* ]] || [[ "$flag_line" == *"|@option-multiple"* ]]; then
                return 0  # Option flags expect values
            elif [[ "$flag_line" == *"|"* ]]; then
                return 0  # Has option values, definitely expects a value
            else
                # No type marker - fallback: assume option flags expect values
                return 0
            fi
        fi
    fi
    return 1
}

__${this.config.bin}_get_flag_values() {
    local flag_name="$1"
    local cmd_key="$2"
    
    # Extract flag option values from the enhanced metadata
    local cmd_var_name="flag_metadata_\$(echo \"$cmd_key\" | tr ' :' '_')"
    if [[ -n "\${!cmd_var_name}" ]]; then
        # Use pure bash pattern matching to find the flag
        local metadata=$'\\n'"\${!cmd_var_name}"
        local pattern=$'\\n'\${flag_name}' '
        if [[ "$metadata" == *\${pattern}* ]]; then
            # Extract the flag line
            local after_flag="\${metadata#*\${pattern}}"
            local flag_line="\${after_flag%%$'\\n'*}"
            
            # Check if flag has option values (contains "|")
            if [[ "$flag_line" == *"|"* ]]; then
                # Extract values after first "|" but before any "|@" type markers
                local values="\${flag_line#*|}"
                # Remove type markers (everything from "|@" onwards)
                values="\${values%%|@*}"
                # Only return values if they exist and don't start with "@"
                if [[ -n "$values" && "$values" != @* ]]; then
                    echo "$values"
                    return 0
                fi
            fi
        fi
    fi
    
    # No predefined values found
    echo ""
    return 1
}

__${this.config.bin}_should_suggest_flags() {
    local cmd_key="$1"
    
    # Only suggest flags when user explicitly types a dash
    if [[ "$cur" == -* ]]; then
        # Check if we have a complete command to show flags for
        local cmd_line
        cmd_line=$(printf "%s\\n" "$commands" | grep "^\$(echo "$cmd_key" | tr ' ' ':') ")
        if [[ -n "$cmd_line" ]]; then
            return 0
        fi
    fi
    
    return 1
}

__${this.config.bin}_get_flag_completions() {
    local cmd_key="$1"
    
    # Get already used flags
    local used_flags=()
    local i=1
    while [[ i -lt cword ]]; do
        local word="\${words[i]}"
        if [[ "$word" =~ ^(-[a-zA-Z]|--[a-zA-Z0-9-]+)$ ]]; then
            used_flags+=("$word")
            # Skip flag value if present
            if [[ $((i+1)) -lt cword && "\${words[$((i+1))]}" != -* && -n "\${words[$((i+1))]}" ]]; then
                ((i++))
            fi
        fi
        ((i++))
    done
    
    # Find the command and get its flags
    local cmd_line
    cmd_line=$(printf "%s\\n" "$commands" | grep "^\$(echo "$cmd_key" | tr ' ' ':') ")
    if [[ -n "$cmd_line" ]]; then
        # Extract flags from the command line (simplified - we'll enhance this)
        local all_flags
        all_flags=$(echo "$cmd_line" | sed -n "s/^\$(echo "$cmd_key" | tr ' ' ':') //p")
        
        # Add flag completions with descriptions
        local flag
        for flag in $all_flags; do
            # Check if flag is already used (skip if multiple allowed)
            local already_used=false
            local flag_allows_multiple=false
            
            # Check if this flag allows multiple values using pure bash pattern matching
            local cmd_var_name="flag_metadata_\$(echo \"$cmd_key\" | tr ' :' '_')"
            local metadata=$'\\n'"\${!cmd_var_name}"
            local pattern=$'\\n'\${flag}' '
            if [[ "$metadata" == *\${pattern}* ]]; then
                local after_flag="\${metadata#*\${pattern}}"
                local flag_line="\${after_flag%%$'\\n'*}"
                if [[ "$flag_line" == *"|@option-multiple"* ]]; then
                    flag_allows_multiple=true
                fi
            fi
            
            # Only check for previous usage if flag doesn't allow multiple
            if [[ "$flag_allows_multiple" == false ]]; then
                local used_flag
                for used_flag in "\${used_flags[@]}"; do
                    if [[ "$used_flag" == "$flag" ]]; then
                        already_used=true
                        break
                    fi
                done
            fi
            
            if [[ "$already_used" == false ]]; then
                local tab=$'\\t'
                local flag_desc="\${flag}"  # default fallback
                
                # Look up flag description from command-specific metadata
                local cmd_var_name="flag_metadata_\$(echo \"$cmd_key\" | tr ' :' '_')"
                if [[ -n "\${!cmd_var_name}" ]]; then
                    # Use pure bash pattern matching - much faster than grep
                    local metadata=$'\\n'"\${!cmd_var_name}"  # Add newline at start for consistent matching
                    # Look for lines starting with the flag followed by space  
                    local pattern=$'\\n'\${flag}' '
                    if [[ "$metadata" == *\${pattern}* ]]; then
                        # Extract the line starting with our flag
                        local after_flag="\${metadata#*\${pattern}}"
                        # Get just the first line (description)
                        local flag_line="\${after_flag%%$'\\n'*}"
                        # Remove everything after first "|" (option values and type markers) for display
                        flag_desc="\${flag_line%%|*}"
                    fi
                fi
                
                completions+=("\${flag}\${tab}\${flag_desc}")
            fi
        done
    fi
}

__${this.config.bin}_get_command_completions() {
    local tab=$'\\t'
    
    # Get current position in command - need to handle empty cur properly
    local clean_cmd_parts=()
    local i=1
    
    # Build clean command parts by filtering out flags and their values
    while [[ i -lt cword ]]; do
        local word="\${words[i]}"
        if [[ "$word" =~ ^--[a-zA-Z0-9-]+$ ]]; then
            # Found a long flag, skip it and its potential value
            if [[ $((i+1)) -lt cword && "\${words[$((i+1))]}" != -* && -n "\${words[$((i+1))]}" ]]; then
                ((i++)) # Skip the flag value
            fi
        elif [[ "$word" =~ ^-[a-zA-Z]$ ]]; then
            # Found a short flag, skip it and its potential value
            if [[ $((i+1)) -lt cword && "\${words[$((i+1))]}" != -* && -n "\${words[$((i+1))]}" ]]; then
                ((i++)) # Skip the flag value
            fi
        elif [[ "$word" != -* && -n "$word" ]]; then
            # This is a command word (not a flag and not empty)
            clean_cmd_parts+=("$word")
        fi
        ((i++))
    done
    
    # If we're completing an empty word and not at the beginning, include partially typed cur
    if [[ -n "$cur" && "$cur" != -* ]]; then
        # We're in the middle of typing a command/topic name
        local current_path="\$(join_by ":" "\${clean_cmd_parts[@]}")"
    else
        # We're completing the next command/topic after a space
        local current_path="\$(join_by ":" "\${clean_cmd_parts[@]}")"
    fi
    
    __${this.config.bin}_debug "clean_cmd_parts: \${clean_cmd_parts[*]}"
    __${this.config.bin}_debug "current_path: '$current_path'"
    
    if [[ -z "$current_path" ]]; then
        # At root level - show topics
${rootTopicsCompletion}
    else
        # Show matching commands and subtopics
        local matching_commands
        matching_commands=$(printf "%s\\n" "$commands" | grep "^$current_path:" | head -20)
        
        __${this.config.bin}_debug "matching_commands for '$current_path:':"
        __${this.config.bin}_debug "$matching_commands"
        
        if [[ -n "$matching_commands" ]]; then
            while IFS= read -r cmd_line; do
                local cmd_id="\${cmd_line%% *}"
                # Remove the current path prefix
                local remaining="\${cmd_id#$current_path:}"
                # Get just the next segment
                local next_segment="\${remaining%%:*}"
                
                __${this.config.bin}_debug "Processing cmd_id: '$cmd_id', remaining: '$remaining', next_segment: '$next_segment'"
                
                # Get description for this completion (whether topic or command)
                local completion_desc="\${next_segment}"  # default fallback
                
                if [[ -n "$next_segment" && "$next_segment" != "$remaining" ]]; then
                    # This is a topic/subtopic - look up in topics metadata
                    local topic_path="\${current_path}:\${next_segment}"
                    local topic_line
                    topic_line=$(printf "%s\\\\n" "$topics" | grep "^$topic_path ")
                    if [[ -n "$topic_line" ]]; then
                        # Extract description (everything after the topic path and space)
                        completion_desc="\${topic_line#$topic_path }"
                    else
                        completion_desc="\${next_segment} commands"
                    fi
                else
                    # This is a final command - look up in command summaries
                    local cmd_path="\${current_path}:\${next_segment}"
                    local cmd_line
                    cmd_line=$(printf "%s\\\\n" "$command_summaries" | grep "^$cmd_path ")
                    if [[ -n "$cmd_line" ]]; then
                        # Extract summary (everything after the command path and space)
                        completion_desc="\${cmd_line#$cmd_path }"
                    else
                        completion_desc="\${next_segment}"
                    fi
                fi
                
                completions+=("\${next_segment}\${tab}\${completion_desc}")
            done <<< "$matching_commands"
            
            # Remove duplicates
            local unique_completions=()
            local seen_completions=()
            for comp in "\${completions[@]}"; do
                local comp_name="\${comp%%\$'\\t'*}"
                local already_seen=false
                for seen in "\${seen_completions[@]}"; do
                    if [[ "$seen" == "$comp_name" ]]; then
                        already_seen=true
                        break
                    fi
                done
                if [[ "$already_seen" == false ]]; then
                    unique_completions+=("$comp")
                    seen_completions+=("$comp_name")
                fi
            done
            completions=("\${unique_completions[@]}")
        fi
    fi
}

if [[ $(type -t compopt) = "builtin" ]]; then
    complete -o default -F _${this.config.bin}_autocomplete ${this.config.bin}
else
    complete -o default -o nospace -F _${this.config.bin}_autocomplete ${this.config.bin}
fi
${this.config.binAliases?.map((alias) => `if [[ $(type -t compopt) = "builtin" ]]; then
    complete -o default -F _${this.config.bin}_autocomplete ${alias}
else
    complete -o default -o nospace -F _${this.config.bin}_autocomplete ${alias}
fi`).join('\n') ?? ''}
`
  }

  private genCmdPublicFlags(command: CommandCompletion): string {
    const flags = Object.keys(command.flags)
      .filter((flag) => !command.flags[flag].hidden)
      .map((flag) => {
        const f = command.flags[flag]
        const flagStr = f.char ? `-${f.char} --${flag}` : `--${flag}`
        return flagStr
      })

    return flags.join(' ')
  }

  private generateCommandsWithFlags(): string {
    return this.commands
      .map((c) => {
        const publicFlags = this.genCmdPublicFlags(c).trim()
        // Keep colon-separated format for internal bash completion logic
        return `${c.id} ${publicFlags}`
      })
      .join('\n')
  }

  private generateFlagCompletionCases(): string {
    const cases: string[] = []

    for (const cmd of this.commands) {
      const flagCases: string[] = []

      for (const [flagName, flag] of Object.entries(cmd.flags)) {
        if (flag.hidden) continue

        if (flag.type === 'option' && flag.options) {
          const options = flag.options.join(' ')

          // Handle both long and short flag forms
          if (flag.char) {
            flagCases.push(
              `        if [[ "$prev" == "--${flagName}" || "$prev" == "-${flag.char}" ]]; then`,
              `          opts="${options}"`,
              `          has_flag_values=true`,
              `        fi`,
            )
          } else {
            flagCases.push(
              `        if [[ "$prev" == "--${flagName}" ]]; then`,
              `          opts="${options}"`,
              `          has_flag_values=true`,
              `        fi`,
            )
          }
        }
      }

      if (flagCases.length > 0) {
        // Convert colon-separated command IDs to space-separated for SF CLI format
        const spaceId = cmd.id.replaceAll(':', ' ')
        cases.push(`      "${spaceId}")`, ...flagCases, `        ;;`)
      }
    }

    return cases.join('\n')
  }

  private generateMultipleFlagsCases(): string {
    const cases: string[] = []

    for (const cmd of this.commands) {
      const multipleFlags: string[] = []

      for (const [flagName, flag] of Object.entries(cmd.flags)) {
        if (flag.hidden) continue

        if ((flag as any).multiple) {
          // Handle both long and short flag forms
          if (flag.char) {
            multipleFlags.push(`"--${flagName}"`, `"-${flag.char}"`)
          } else {
            multipleFlags.push(`"--${flagName}"`)
          }
        }
      }

      if (multipleFlags.length > 0) {
        // Use colon-separated command IDs to match how normalizedCommand is built in flag completion
        const flagChecks = multipleFlags.map((flag) => `[[ "$flag" == ${flag} ]]`).join(' || ')
        cases.push(
          `      "${cmd.id}")`,
          `        if ${flagChecks}; then return 0; fi`,
          `        return 1`,
          `        ;;`,
        )
      }
    }

    return cases.join('\n')
  }

  private generateRootLevelTopics(): string {
    const topicLines: string[] = []
    
    // Get root level topics
    const rootTopics = this.topics.filter(t => !t.name.includes(':'))
    
    for (const topic of rootTopics) {
      const description = topic.description || `${topic.name.replaceAll(':', ' ')} commands`
      topicLines.push(`        completions+=("${topic.name}\${tab}${description}")`)
    }
    
    return topicLines.join('\n')
  }

  private generateTopicsMetadata(): string {
    return this.topics
      .map((topic) => {
        const description = topic.description || `${topic.name.replaceAll(':', ' ')} commands`
        return `${topic.name} ${description}`
      })
      .join('\n')
  }

  private generateCommandSummaries(): string {
    return this.commands
      .map((cmd) => {
        const summary = cmd.summary || cmd.id
        return `${cmd.id} ${summary}`
      })
      .join('\n')
  }

  private generateFlagMetadataBlocks(): string {
    const blocks: string[] = []
    
    for (const cmd of this.commands) {
      const flagEntries: string[] = []
      
      for (const [flagName, flag] of Object.entries(cmd.flags)) {
        if (flag.hidden) continue
        
        const description = this.sanitizeSummary(flag.summary || flag.description || `${flagName} flag`)
        
        // Build metadata entry with flag type information
        let metadataEntry = description
        
        // Add option values if they exist
        if (flag.type === 'option' && flag.options && flag.options.length > 0) {
          metadataEntry += `|${flag.options.join(',')}`
        }
        
        // Add flag type marker: @boolean or @option or @option-multiple
        if (flag.type === 'boolean') {
          metadataEntry += '|@boolean'
        } else if (flag.type === 'option') {
          if ((flag as any).multiple) {
            metadataEntry += '|@option-multiple'
          } else {
            metadataEntry += '|@option'
          }
        }
        
        // Add long flag form
        flagEntries.push(`--${flagName} ${metadataEntry}`)
        
        // Add short flag form if it exists
        if (flag.char) {
          flagEntries.push(`-${flag.char} ${metadataEntry}`)
        }
      }
      
      if (flagEntries.length > 0) {
        // Create a valid bash variable name from command ID
        const varName = `flag_metadata_${cmd.id.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
        
        blocks.push(`    local ${varName}="
${flagEntries.join('\n')}
"`)
      }
    }
    
    return blocks.join('\n\n')
  }

  private getCommands(): CommandCompletion[] {
    const cmds: CommandCompletion[] = []

    for (const p of this.config.getPluginsList()) {
      // For testing: only include commands from @salesforce/plugin-auth
      // if (p.name !== '@salesforce/plugin-auth') continue

      for (const c of p.commands) {
        if (c.hidden) continue
        const summary = this.sanitizeSummary(c.summary ?? c.description)
        const {flags} = c
        cmds.push({
          flags,
          id: c.id,
          summary,
        })

        if (!c.deprecateAliases) {
          for (const a of c.aliases) {
            cmds.push({
              flags,
              id: a,
              summary,
            })

            const split = a.split(':')
            let topic = split[0]

            // Add missing topics for aliases
            for (let i = 0; i < split.length - 1; i++) {
              if (!this.topics.some((t) => t.name === topic)) {
                this.topics.push({
                  description: `${topic.replaceAll(':', ' ')} commands`,
                  name: topic,
                })
              }

              topic += `:${split[i + 1]}`
            }
          }
        }
      }
    }

    return cmds
  }

  private getTopics(): Topic[] {
    const topics = this.config.topics
      .filter((topic: Interfaces.Topic) => {
        // it is assumed a topic has a child if it has children
        const hasChild = this.config.topics.some((subTopic) => subTopic.name.includes(`${topic.name}:`))
        return hasChild
      })
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1
        }

        if (a.name > b.name) {
          return 1
        }

        return 0
      })
      .map((t) => {
        const description = t.description
          ? this.sanitizeSummary(t.description)
          : `${t.name.replaceAll(':', ' ')} commands`

        return {
          description,
          name: t.name,
        }
      })

    return topics
  }

  private sanitizeSummary(summary?: string): string {
    if (summary === undefined) {
      return ''
    }

    return ejs
      .render(summary, {config: this.config})
      .replaceAll(/(["`])/g, '\\$1') // backticks and double-quotes require backslashes
      // .replaceAll(/([[\]])/g, '\\\\$1') // square brackets require double-backslashes
      .split('\n')[0] // only use the first line
  }
}
