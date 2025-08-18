<#
Script: Update-PayPeriodsConfig.ps1
FileName: Update-PayPeriodsConfig.ps1
Philippe Addelia
Created: 2025-08-15 10:30 PST
Modified: 2025-08-15 10:30 PST
Preferred location: Modules\Time Tracker
Purpose: Update existing pay periods configuration file with new periods or modifications
Version: 1.1.1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Add", "Remove", "Modify", "List", "Validate")]
    [string]$Action,
    
    [Parameter(Mandatory = $false)]
    [string]$ConfigPath = ".\pay-periods-config.json",
    
    [Parameter(Mandatory = $false)]
    [int]$AddPeriods,
    
    [Parameter(Mandatory = $false)]
    [string]$PeriodId,
    
    [Parameter(Mandatory = $false)]
    [DateTime]$NewStartDate,
    
    [Parameter(Mandatory = $false)]
    [DateTime]$NewEndDate,
    
    [Parameter(Mandatory = $false)]
    [DateTime]$NewTimesheetDue,
    
    [Parameter(Mandatory = $false)]
    [DateTime]$NewPayDay,
    
    [Parameter(Mandatory = $false)]
    [string]$NewDescription,
    
    [Parameter(Mandatory = $false)]
    [switch]$Backup
)

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-ConfigFile {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-ColorOutput "Error: Configuration file not found at: $Path" "Red"
        Write-ColorOutput "Use Generate-PayPeriodsConfig.ps1 to create initial configuration" "Yellow"
        return $false
    }
    return $true
}

function Read-ConfigFile {
    param([string]$Path)
    
    try {
        $content = Get-Content -Path $Path -Raw -Encoding UTF8
        $config = $content | ConvertFrom-Json
        
        # Convert to hashtable for easier manipulation
        return ConvertTo-Hashtable -InputObject $config
    }
    catch {
        Write-ColorOutput "Error reading configuration file: $($_.Exception.Message)" "Red"
        return $null
    }
}

function ConvertTo-Hashtable {
    param([Parameter(ValueFromPipeline)]$InputObject)
    
    if ($InputObject -is [System.Collections.IDictionary]) {
        $hash = @{}
        foreach ($key in $InputObject.Keys) {
            $hash[$key] = ConvertTo-Hashtable $InputObject[$key]
        }
        return $hash
    }
    elseif ($InputObject -is [Array]) {
        return $InputObject | ForEach-Object { ConvertTo-Hashtable $_ }
    }
    elseif ($InputObject -is [PSObject]) {
        $hash = @{}
        $InputObject.PSObject.Properties | ForEach-Object {
            $hash[$_.Name] = ConvertTo-Hashtable $_.Value
        }
        return $hash
    }
    else {
        return $InputObject
    }
}

function Save-ConfigFile {
    param(
        [hashtable]$Config,
        [string]$Path
    )
    
    try {
        # Update last modified timestamp
        $Config.lastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
        
        $json = $Config | ConvertTo-Json -Depth 10
        $json | Out-File -FilePath $Path -Encoding UTF8
        
        Write-ColorOutput "Configuration updated successfully!" "Green"
        return $true
    }
    catch {
        Write-ColorOutput "Error saving configuration: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Backup-ConfigFile {
    param([string]$Path)
    
    if ($Backup -and (Test-Path $Path)) {
        $timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
        $backupPath = "$Path.backup.$timestamp"
        
        try {
            Copy-Item -Path $Path -Destination $backupPath
            Write-ColorOutput "Backup created: $backupPath" "Gray"
        }
        catch {
            Write-ColorOutput "Warning: Could not create backup: $($_.Exception.Message)" "Yellow"
        }
    }
}

function Add-PayPeriods {
    param(
        [hashtable]$Config,
        [int]$NumberToAdd
    )
    
    Write-ColorOutput "Adding $NumberToAdd new pay periods..." "Cyan"
    
    $existingPeriods = $Config.payPeriods
    if (-not $existingPeriods -or $existingPeriods.Count -eq 0) {
        Write-ColorOutput "Error: No existing pay periods found in configuration" "Red"
        return $false
    }
    
    # Get the last period to continue from
    $lastPeriod = $existingPeriods[-1]
    $lastEndDate = [DateTime]$lastPeriod.endDate
    $lastPayDay = [DateTime]$lastPeriod.payDay
    
    # Calculate pay delay from existing pattern
    $payDelay = ($lastPayDay - $lastEndDate).Days
    
    # Extract period length from first period
    $firstPeriod = $existingPeriods[0]
    $firstStart = [DateTime]$firstPeriod.startDate
    $firstEnd = [DateTime]$firstPeriod.endDate
    $periodLength = ($firstEnd - $firstStart).Days + 1
    
    Write-ColorOutput "Detected period length: $periodLength days" "Gray"
    Write-ColorOutput "Detected pay delay: $payDelay days" "Gray"
    
    # Determine next period number
    $lastIdParts = $lastPeriod.id -split '-'
    $lastNumber = [int]$lastIdParts[-1]
    
    for ($i = 1; $i -le $NumberToAdd; $i++) {
        $newStart = $lastEndDate.AddDays(1)
        $newEnd = $newStart.AddDays($periodLength - 1)
        $newTimesheetDue = $newEnd
        $newPayDay = $newEnd.AddDays($payDelay)
        $newNumber = $lastNumber + $i
        $newYear = $newStart.Year
        
        $newPeriod = @{
            id = "PP-$newYear-$newNumber"
            startDate = $newStart.ToString("yyyy-MM-dd")
            endDate = $newEnd.ToString("yyyy-MM-dd")
            timesheetDue = $newTimesheetDue.ToString("yyyy-MM-dd")
            payDay = $newPayDay.ToString("yyyy-MM-dd")
            description = "Pay Period $newNumber - $($newStart.ToString('MMMM d')) to $($newEnd.ToString('MMMM d'))"
        }
        
        $Config.payPeriods += $newPeriod
        $lastEndDate = $newEnd
        
        Write-ColorOutput "Added: $($newPeriod.id) ($($newPeriod.startDate) to $($newPeriod.endDate))" "Green"
    }
    
    return $true
}

function Remove-PayPeriod {
    param(
        [hashtable]$Config,
        [string]$PeriodId
    )
    
    Write-ColorOutput "Removing pay period: $PeriodId" "Cyan"
    
    $periods = $Config.payPeriods
    $indexToRemove = -1
    
    for ($i = 0; $i -lt $periods.Count; $i++) {
        if ($periods[$i].id -eq $PeriodId) {
            $indexToRemove = $i
            break
        }
    }
    
    if ($indexToRemove -eq -1) {
        Write-ColorOutput "Error: Pay period '$PeriodId' not found" "Red"
        return $false
    }
    
    # Create new array without the specified period
    $newPeriods = @()
    for ($i = 0; $i -lt $periods.Count; $i++) {
        if ($i -ne $indexToRemove) {
            $newPeriods += $periods[$i]
        }
    }
    
    $Config.payPeriods = $newPeriods
    Write-ColorOutput "Pay period '$PeriodId' removed successfully" "Green"
    return $true
}

function Modify-PayPeriod {
    param(
        [hashtable]$Config,
        [string]$PeriodId
    )
    
    Write-ColorOutput "Modifying pay period: $PeriodId" "Cyan"
    
    $period = $Config.payPeriods | Where-Object { $_.id -eq $PeriodId }
    if (-not $period) {
        Write-ColorOutput "Error: Pay period '$PeriodId' not found" "Red"
        return $false
    }
    
    $modified = $false
    
    if ($NewStartDate) {
        $period.startDate = $NewStartDate.ToString("yyyy-MM-dd")
        Write-ColorOutput "Updated start date to: $($period.startDate)" "Green"
        $modified = $true
    }
    
    if ($NewEndDate) {
        $period.endDate = $NewEndDate.ToString("yyyy-MM-dd")
        Write-ColorOutput "Updated end date to: $($period.endDate)" "Green"
        $modified = $true
    }
    
    if ($NewTimesheetDue) {
        $period.timesheetDue = $NewTimesheetDue.ToString("yyyy-MM-dd")
        Write-ColorOutput "Updated timesheet due to: $($period.timesheetDue)" "Green"
        $modified = $true
    }
    
    if ($NewPayDay) {
        $period.payDay = $NewPayDay.ToString("yyyy-MM-dd")
        Write-ColorOutput "Updated pay day to: $($period.payDay)" "Green"
        $modified = $true
    }
    
    if ($NewDescription) {
        $period.description = $NewDescription
        Write-ColorOutput "Updated description to: $($period.description)" "Green"
        $modified = $true
    }
    
    if (-not $modified) {
        Write-ColorOutput "Warning: No modifications specified" "Yellow"
        return $false
    }
    
    return $true
}

function Show-PayPeriodsList {
    param([hashtable]$Config)
    
    Write-ColorOutput "`n=== Pay Periods Configuration ===" "Yellow"
    Write-ColorOutput "Company: $($Config.company.name)" "White"
    Write-ColorOutput "Total Periods: $($Config.payPeriods.Count)" "White"
    Write-ColorOutput "Last Updated: $($Config.lastUpdated)" "Gray"
    
    Write-ColorOutput "`n=== Pay Periods ===" "Cyan"
    $Config.payPeriods | ForEach-Object {
        Write-ColorOutput "$($_.id): $($_.startDate) to $($_.endDate) (Pay: $($_.payDay))" "White"
    }
    
    if ($Config.holidays) {
        Write-ColorOutput "`n=== Holidays ===" "Cyan"
        $observedHolidays = $Config.holidays | Where-Object { $_.observed -eq $true }
        $observedHolidays | Sort-Object date | ForEach-Object {
            $typeColor = if ($_.type -eq "federal") { "Yellow" } else { "Magenta" }
            Write-ColorOutput "$($_.date): $($_.name) [$($_.type)]" $typeColor
        }
        Write-ColorOutput "Total Observed Holidays: $($observedHolidays.Count)" "Gray"
    }
}

function Test-ConfigValidation {
    param([hashtable]$Config)
    
    Write-ColorOutput "Validating configuration..." "Cyan"
    $issues = @()
    
    # Check required fields
    if (-not $Config.payPeriods) {
        $issues += "Missing payPeriods array"
    }
    
    if (-not $Config.company) {
        $issues += "Missing company information"
    }
    
    # Validate each pay period
    foreach ($period in $Config.payPeriods) {
        if (-not $period.id) {
            $issues += "Pay period missing ID"
            continue
        }
        
        try {
            $startDate = [DateTime]$period.startDate
            $endDate = [DateTime]$period.endDate
            
            if ($endDate -le $startDate) {
                $issues += "Period $($period.id): End date must be after start date"
            }
            
            if ($period.payDay) {
                $payDay = [DateTime]$period.payDay
                if ($payDay -lt $endDate) {
                    $issues += "Period $($period.id): Pay day should be after end date"
                }
            }
        }
        catch {
            $issues += "Period $($period.id): Invalid date format"
        }
    }
    
    # Check for overlapping periods
    $sortedPeriods = $Config.payPeriods | Sort-Object startDate
    for ($i = 0; $i -lt ($sortedPeriods.Count - 1); $i++) {
        $current = $sortedPeriods[$i]
        $next = $sortedPeriods[$i + 1]
        
        $currentEnd = [DateTime]$current.endDate
        $nextStart = [DateTime]$next.startDate
        
        if ($nextStart -le $currentEnd) {
            $issues += "Overlapping periods: $($current.id) and $($next.id)"
        }
    }
    
    # Report results
    if ($issues.Count -eq 0) {
        Write-ColorOutput "Configuration validation passed!" "Green"
        return $true
    }
    else {
        Write-ColorOutput "Validation found $($issues.Count) issues:" "Red"
        $issues | ForEach-Object {
            Write-ColorOutput "- $_" "Red"
        }
        return $false
    }
}

# Main execution
try {
    Write-ColorOutput "=== Pay Periods Configuration Updater ===" "Yellow"
    Write-ColorOutput "Version 1.1.1 - Created by Philippe Addelia" "Gray"
    Write-ColorOutput ""
    
    # Validate config file exists
    if (-not (Test-ConfigFile -Path $ConfigPath)) {
        exit 1
    }
    
    # Read configuration
    $config = Read-ConfigFile -Path $ConfigPath
    if (-not $config) {
        exit 1
    }
    
    # Create backup if requested
    Backup-ConfigFile -Path $ConfigPath
    
    # Execute the requested action
    $success = $false
    
    switch ($Action) {
        "Add" {
            if (-not $AddPeriods) {
                Write-ColorOutput "Error: -AddPeriods parameter required for Add action" "Red"
                exit 1
            }
            $success = Add-PayPeriods -Config $config -NumberToAdd $AddPeriods
        }
        
        "Remove" {
            if (-not $PeriodId) {
                Write-ColorOutput "Error: -PeriodId parameter required for Remove action" "Red"
                exit 1
            }
            $success = Remove-PayPeriod -Config $config -PeriodId $PeriodId
        }
        
        "Modify" {
            if (-not $PeriodId) {
                Write-ColorOutput "Error: -PeriodId parameter required for Modify action" "Red"
                exit 1
            }
            $success = Modify-PayPeriod -Config $config -PeriodId $PeriodId
        }
        
        "List" {
            Show-PayPeriodsList -Config $config
            $success = $true
        }
        
        "Validate" {
            $success = Test-ConfigValidation -Config $config
        }
    }
    
    # Save changes if successful and not just listing
    if ($success -and $Action -ne "List" -and $Action -ne "Validate") {
        if (Save-ConfigFile -Config $config -Path $ConfigPath) {
            Write-ColorOutput "`nOperation completed successfully!" "Green"
            
            # Show summary for add operations
            if ($Action -eq "Add") {
                Write-ColorOutput "Total pay periods now: $($config.payPeriods.Count)" "Gray"
                $lastPeriod = $config.payPeriods[-1]
                Write-ColorOutput "Last period ends: $($lastPeriod.endDate)" "Gray"
                Write-ColorOutput "Last pay day: $($lastPeriod.payDay)" "Gray"
            }
        }
        else {
            exit 1
        }
    }
    elseif (-not $success) {
        Write-ColorOutput "Operation failed" "Red"
        exit 1
    }
}
catch {
    Write-ColorOutput "Unexpected error: $($_.Exception.Message)" "Red"
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" "Gray"
    exit 1
}

Write-ColorOutput "`nUpdate operation completed!" "Green"