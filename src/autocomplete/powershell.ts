const script = `# <CLI_BIN> Autocomplete
Register-ArgumentCompleter -Native -CommandName ("<CLI_BIN>", "<CLI_BIN>.cmd", "<CLI_BIN>.ps1") -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
	
	$matchingCommands = @()
  $rootCommand = $commandAst.CommandElements[0]
  $fullCommand = $commandAst.CommandElements[1..($commandAst.CommandElements.Count-1)]

  $commandList = @(<POWERSHELL_COMMAND_LIST>)
  $commandSummaries = @{
<POWERSHELL_COMMAND_SUMMARIES>
  }

  if (-Not $topLevelTopic -And $fullCommand -eq $rootCommand) {
  	$matchingCommands = $commandList
  } else {
	  foreach ($command in $commandList) {
			if ($command.StartsWith($fullCommand)) {
				$matchingCommands += $command
			}
	  }
  }

  foreach ($command in $matchingCommands) {
  	$rootCmdLength = $rootCommand.ToString().Length + 1
  	$suggestionIndex = $cursorPosition - $rootCmdLength
    
    # This check is needed because [System.Management.Automation.CompletionResult] will error out if you pass in an empty string for the summary.
    if ($commandSummaries[$command]) {
			$summary = $commandSummaries[$command]
  	} else {
  		$summary = ' '
  	}

  	if ($suggestionIndex -le $command.Length) {
  		$suggestion = $wordToComplete + $command.Substring($suggestionIndex)
			[System.Management.Automation.CompletionResult]::new($suggestion, $suggestion, 'Command', $summary)
		} else {
			continue
		}
  }
}
`
export default script
