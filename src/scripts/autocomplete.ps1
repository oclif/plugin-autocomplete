# PowerShell parameter completion shim for the sf CLI
Register-ArgumentCompleter -Native -CommandName sf -ScriptBlock {
	param($commandName, $parameterName, $wordToComplete, $cursorPosition)
		sf complete --position $cursorPosition "$wordToComplete" | 
		
		ForEach-Object {
		   [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
		}
}