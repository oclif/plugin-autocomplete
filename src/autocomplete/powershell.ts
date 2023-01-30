const script = `# <CLI_BIN> Autocomplete
Register-ArgumentCompleter -Native -CommandName ("<CLI_BIN>", "<CLI_BIN>.cmd", "<CLI_BIN>.ps1") -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
	
	$matchingCommands = @()
  $rootCommand = $commandAst.CommandElements[0]
  $fullCommand = $commandAst.CommandElements[1..($commandAst.CommandElements.Count-1)]

  $commandList = @(<POWERSHELL_COMMANDS_WITH_FLAGS_LIST>)

  foreach ($command in $commandList) {
		if ($command.StartsWith($fullCommand)) {
			$matchingCommands += $command
		}
  }

  foreach ($command in $matchingCommands) {
  	$summary = 'This is the summary for "' + $command + '".'

  	$rootCmdLength = $rootCommand.ToString().Length + 1
  	$suggestionIndex = $cursorPosition - $rootCmdLength

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
