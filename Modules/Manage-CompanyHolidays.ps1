<#
Script: Manage-CompanyHolidays.ps1
FileName: Manage-CompanyHolidays.ps1
Philippe Addelia
Created: 2025-08-15 11:00 PST
Modified: 2025-08-15 11:00 PST
Preferred location: Modules\Time Tracker
Purpose: Manage company holiday calendar for Time Tracker application
Version: 1.1.1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("GenerateStandard", "AddCompanyHolidays", "Add", "Remove", "List", "Toggle")]
    [string]$Action,
    
    [Parameter(Mandatory = $false)]
    [string]$ConfigPath = ".\pay-periods-config.json",
    
    [Parameter(Mandatory = $false)]
    [int]$Year = (Get-Date).Year,
    
    [Parameter(Mandatory = $false)]
    [string[]]$CompanyHolidays = @(),
    
    [Parameter(Mandatory = $false)]
    [string]$HolidayDate,
    
    [Parameter(Mandatory = $false)]
    [string]$HolidayName,
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("federal", "company", "religious", "cultural")]
    [string]$HolidayType = "company",
    
    [Parameter(Mandatory = $false)]
    [switch]$Observed = $true,
    
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

function Get-NthWeekdayOfMonth {
    param(
        [int]$Year,
        [int]$Month,
        [int]$DayOfWeek,  # 0=Sunday, 1=Monday, etc.
        [int]$WeekNumber
    )
    
    $firstDay = Get-Date -Year $Year -Month $Month -Day 1
    $firstWeekday = $firstDay
    
    # Find the first occurrence of the desired weekday
    while ($firstWeekday.DayOfWeek.value__ -ne $DayOfWeek) {
        $firstWeekday = $firstWeekday.AddDays(1)
    }
    
    # Add weeks to get the nth occurrence
    return $firstWeekday.AddDays(($WeekNumber - 1) * 7)
}

function Get-LastWeekdayOfMonth {
    param(
        [int]$Year,
        [int]$Month,
        [int]$DayOfWeek
    )
    
    $lastDay = Get-Date -Year $Year -Month $Month -Day 1
    $lastDay = $lastDay.AddMonths(1).AddDays(-1)
    
    while ($lastDay.DayOfWeek.value__ -ne $DayOfWeek) {
        $lastDay = $lastDay.AddDays(-1)
    }
    
    return $lastDay
}

function Get-StandardFederalHolidays {
    param([int]$Year)
    
    $holidays = @()
    
    # New Year's Day
    $holidays += @{
        date = "$Year-01-01"
        name = "New Year's Day"
        type = "federal"
        observed = $true
    }
    
    # Martin Luther King Jr. Day (3rd Monday in January)
    $mlkDay = Get-NthWeekdayOfMonth -Year $Year -Month 1 -DayOfWeek 1 -WeekNumber 3
    $holidays += @{
        date = $mlkDay.ToString("yyyy-MM-dd")
        name = "Martin Luther King Jr. Day"
        type = "federal"
        observed = $true
    }
    
    # Presidents Day (3rd Monday in February)
    $presidentsDay = Get-NthWeekdayOfMonth -Year $Year -Month 2 -DayOfWeek 1 -WeekNumber 3
    $holidays += @{
        date = $presidentsDay.ToString("yyyy-MM-dd")
        name = "Presidents Day"
        type = "federal"
        observed = $true
    }
    
    # Memorial Day (Last Monday in May)
    $memorialDay = Get-LastWeekdayOfMonth -Year $Year -Month 5 -DayOfWeek 1
    $holidays += @{
        date = $memorialDay.ToString("yyyy-MM-dd")
        name = "Memorial Day"
        type = "federal"
        observed = $true
    }
    
    # Juneteenth
    $holidays += @{
        date = "$Year-06-19"
        name = "Juneteenth"
        type = "federal"
        observed = $true
    }
    
    # Independence Day
    $holidays += @{
        date = "$Year-07-04"
        name = "Independence Day"
        type = "federal"
        observed = $true
    }
    
    # Labor Day (1st Monday in September)
    $laborDay = Get-NthWeekdayOfMonth -Year $Year -Month 9 -DayOfWeek 1 -WeekNumber 1
    $holidays += @{
        date = $laborDay.ToString("yyyy-MM-dd")
        name = "Labor Day"
        type = "federal"
        observed = $true
    }
    
    # Columbus Day (2nd Monday in October) - not observed by many companies
    $columbusDay = Get-NthWeekdayOfMonth -Year $Year -Month 10 -DayOfWeek 1 -WeekNumber 2
    $holidays += @{
        date = $columbusDay.ToString("yyyy-MM-dd")
        name = "Columbus Day"
        type = "federal"
        observed = $false
    }
    
    # Veterans Day
    $holidays += @{
        date = "$Year-11-11"
        name = "Veterans Day"
        type = "federal"
        observed = $true
    }
    
    # Thanksgiving (4th Thursday in November)
    $thanksgiving = Get-NthWeekdayOfMonth -Year $Year -Month 11 -DayOfWeek 4 -WeekNumber 4
    $holidays += @{
        date = $thanksgiving.ToString("yyyy-MM-dd")
        name = "Thanksgiving Day"
        type = "federal"
        observed = $true
    }
    
    # Christmas Day
    $holidays += @{
        date = "$Year-12-25"
        name = "Christmas Day"
        type = "federal"
        observed = $true
    }
    
    return $holidays
}

function Get-CompanyHolidayDefinitions {
    param([int]$Year)
    
    # Calculate Thanksgiving for company holidays that depend on it
    $thanksgiving = Get-NthWeekdayOfMonth -Year $Year -Month 11 -DayOfWeek 4 -WeekNumber 4
    
    $companyHolidays = @{
        "DayAfterThanksgiving" = @{
            date = $thanksgiving.AddDays(1).ToString("yyyy-MM-dd")
            name = "Day After Thanksgiving"
            type = "company"
            observed = $true
        }
        "ChristmasEve" = @{
            date = "$Year-12-24"
            name = "Christmas Eve"
            type = "company"
            observed = $true
        }
        "NewYearsEve" = @{
            date = "$Year-12-31"
            name = "New Year's Eve"
            type = "company"
            observed = $true
        }
        "GoodFriday" = @{
            date = (Get-EasterSunday -Year $Year).AddDays(-2).ToString("yyyy-MM-dd")
            name = "Good Friday"
            type = "religious"
            observed = $true
        }
        "EasterMonday" = @{
            date = (Get-EasterSunday -Year $Year).AddDays(1).ToString("yyyy-MM-dd")
            name = "Easter Monday"
            type = "religious"
            observed = $true
        }
        "BoxingDay" = @{
            date = "$Year-12-26"
            name = "Boxing Day"
            type = "cultural"
            observed = $true
        }
    }
    
    return $companyHolidays
}

function Get-EasterSunday {
    param([int]$Year)
    
    # Algorithm to calculate Easter Sunday
    $a = $Year % 19
    $b = [Math]::Floor($Year / 100)
    $c = $Year % 100
    $d = [Math]::Floor($b / 4)
    $e = $b % 4
    $f = [Math]::Floor(($b + 8) / 25)
    $g = [Math]::Floor(($b - $f + 1) / 3)
    $h = (19 * $a + $b - $d - $g + 15) % 30
    $i = [Math]::Floor($c / 4)
    $k = $c % 4
    $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7
    $m = [Math]::Floor(($a + 11 * $h + 22 * $l) / 451)
    $month = [Math]::Floor(($h + $l - 7 * $m + 114) / 31)
    $day = (($h + $l - 7 * $m + 114) % 31) + 1
    
    return Get-Date -Year $Year -Month $month -Day $day
}

function Generate-StandardHolidays {
    param(
        [hashtable]$Config,
        [int]$Year
    )
    
    Write-ColorOutput "Generating standard federal holidays for $Year..." "Cyan"
    
    # Initialize holidays array if it doesn't exist
    if (-not $Config.holidays) {
        $Config.holidays = @()
    }
    
    # Remove existing holidays for this year
    $Config.holidays = $Config.holidays | Where-Object { 
        $holidayYear = ([DateTime]$_.date).Year
        $holidayYear -ne $Year
    }
    
    # Add federal holidays
    $federalHolidays = Get-StandardFederalHolidays -Year $Year
    foreach ($holiday in $federalHolidays) {
        $Config.holidays += $holiday
        $status = if ($holiday.observed) { "observed" } else { "not observed" }
        Write-ColorOutput "Added: $($holiday.name) ($($holiday.date)) - $status" "Green"
    }
    
    Write-ColorOutput "Added $($federalHolidays.Count) federal holidays" "Gray"
    return $true
}

function Add-CompanyHolidaysToConfig {
    param(
        [hashtable]$Config,
        [int]$Year,
        [string[]]$HolidayKeys
    )
    
    Write-ColorOutput "Adding company holidays for $Year..." "Cyan"
    
    # Initialize holidays array if it doesn't exist
    if (-not $Config.holidays) {
        $Config.holidays = @()
    }
    
    $companyDefinitions = Get-CompanyHolidayDefinitions -Year $Year
    
    foreach ($key in $HolidayKeys) {
        if ($companyDefinitions.ContainsKey($key)) {
            $holiday = $companyDefinitions[$key]
            
            # Check if holiday already exists
            $existing = $Config.holidays | Where-Object { $_.date -eq $holiday.date }
            if ($existing) {
                Write-ColorOutput "Holiday already exists: $($holiday.name) ($($holiday.date))" "Yellow"
                continue
            }
            
            $Config.holidays += $holiday
            Write-ColorOutput "Added: $($holiday.name) ($($holiday.date))" "Green"
        }
        else {
            Write-ColorOutput "Unknown company holiday key: $key" "Red"
            Write-ColorOutput "Available keys: $($companyDefinitions.Keys -join ', ')" "Gray"
        }
    }
    
    return $true
}

function Add-CustomHoliday {
    param(
        [hashtable]$Config,
        [string]$Date,
        [string]$Name,
        [string]$Type,
        [bool]$IsObserved
    )
    
    Write-ColorOutput "Adding custom holiday: $Name" "Cyan"
    
    # Initialize holidays array if it doesn't exist
    if (-not $Config.holidays) {
        $Config.holidays = @()
    }
    
    # Validate date format
    try {
        $parsedDate = [DateTime]$Date
        $formattedDate = $parsedDate.ToString("yyyy-MM-dd")
    }
    catch {
        Write-ColorOutput "Error: Invalid date format. Use YYYY-MM-DD format." "Red"
        return $false
    }
    
    # Check if holiday already exists
    $existing = $Config.holidays | Where-Object { $_.date -eq $formattedDate }
    if ($existing) {
        Write-ColorOutput "Holiday already exists on $formattedDate`: $($existing.name)" "Yellow"
        return $false
    }
    
    $holiday = @{
        date = $formattedDate
        name = $Name
        type = $Type
        observed = $IsObserved
    }
    
    $Config.holidays += $holiday
    Write-ColorOutput "Added: $Name ($formattedDate)" "Green"
    return $true
}

function Remove-Holiday {
    param(
        [hashtable]$Config,
        [string]$Date
    )
    
    Write-ColorOutput "Removing holiday on: $Date" "Cyan"
    
    if (-not $Config.holidays) {
        Write-ColorOutput "No holidays found in configuration" "Yellow"
        return $false
    }
    
    # Validate date format
    try {
        $parsedDate = [DateTime]$Date
        $formattedDate = $parsedDate.ToString("yyyy-MM-dd")
    }
    catch {
        Write-ColorOutput "Error: Invalid date format. Use YYYY-MM-DD format." "Red"
        return $false
    }
    
    $holidayToRemove = $Config.holidays | Where-Object { $_.date -eq $formattedDate }
    if (-not $holidayToRemove) {
        Write-ColorOutput "No holiday found on $formattedDate" "Yellow"
        return $false
    }
    
    $Config.holidays = $Config.holidays | Where-Object { $_.date -ne $formattedDate }
    Write-ColorOutput "Removed: $($holidayToRemove.name) ($formattedDate)" "Green"
    return $true
}

function Toggle-HolidayObservance {
    param(
        [hashtable]$Config,
        [string]$Date
    )
    
    Write-ColorOutput "Toggling holiday observance for: $Date" "Cyan"
    
    if (-not $Config.holidays) {
        Write-ColorOutput "No holidays found in configuration" "Yellow"
        return $false
    }
    
    # Validate date format
    try {
        $parsedDate = [DateTime]$Date
        $formattedDate = $parsedDate.ToString("yyyy-MM-dd")
    }
    catch {
        Write-ColorOutput "Error: Invalid date format. Use YYYY-MM-DD format." "Red"
        return $false
    }
    
    $holiday = $Config.holidays | Where-Object { $_.date -eq $formattedDate }
    if (-not $holiday) {
        Write-ColorOutput "No holiday found on $formattedDate" "Yellow"
        return $false
    }
    
    $holiday.observed = -not $holiday.observed
    $status = if ($holiday.observed) { "now observed" } else { "no longer observed" }
    Write-ColorOutput "Updated: $($holiday.name) is $status" "Green"
    return $true
}

function Show-HolidaysList {
    param([hashtable]$Config)
    
    Write-ColorOutput "`n=== Company Holiday Calendar ===" "Yellow"
    
    if (-not $Config.holidays -or $Config.holidays.Count -eq 0) {
        Write-ColorOutput "No holidays configured" "Gray"
        return
    }
    
    $sortedHolidays = $Config.holidays | Sort-Object date
    $currentYear = ""
    
    foreach ($holiday in $sortedHolidays) {
        $holidayDate = [DateTime]$holiday.date
        $year = $holidayDate.Year.ToString()
        
        if ($year -ne $currentYear) {
            Write-ColorOutput "`n=== $year ===" "Cyan"
            $currentYear = $year
        }
        
        $observedText = if ($holiday.observed) { "✓" } else { "✗" }
        $typeColor = switch ($holiday.type) {
            "federal" { "Yellow" }
            "company" { "Magenta" }
            "religious" { "Blue" }
            "cultural" { "Green" }
            default { "White" }
        }
        
        $dateText = $holidayDate.ToString("MMM dd")
        Write-ColorOutput "$observedText $dateText - $($holiday.name) [$($holiday.type)]" $typeColor
    }
    
    $observedCount = ($Config.holidays | Where-Object { $_.observed -eq $true }).Count
    Write-ColorOutput "`nTotal holidays: $($Config.holidays.Count)" "Gray"
    Write-ColorOutput "Observed holidays: $observedCount" "Gray"
    
    Write-ColorOutput "`n=== Available Company Holiday Templates ===" "Cyan"
    $templates = Get-CompanyHolidayDefinitions -Year (Get-Date).Year
    foreach ($key in $templates.Keys) {
        Write-ColorOutput "- $key`: $($templates[$key].name)" "Gray"
    }
}

# Main execution
try {
    Write-ColorOutput "=== Company Holiday Manager ===" "Yellow"
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
        "GenerateStandard" {
            $success = Generate-StandardHolidays -Config $config -Year $Year
        }
        
        "AddCompanyHolidays" {
            if ($CompanyHolidays.Count -eq 0) {
                Write-ColorOutput "Error: -CompanyHolidays parameter required" "Red"
                Write-ColorOutput "Available options: DayAfterThanksgiving, ChristmasEve, NewYearsEve, GoodFriday, EasterMonday, BoxingDay" "Gray"
                exit 1
            }
            $success = Add-CompanyHolidaysToConfig -Config $config -Year $Year -HolidayKeys $CompanyHolidays
        }
        
        "Add" {
            if (-not $HolidayDate -or -not $HolidayName) {
                Write-ColorOutput "Error: -HolidayDate and -HolidayName parameters required for Add action" "Red"
                exit 1
            }
            $success = Add-CustomHoliday -Config $config -Date $HolidayDate -Name $HolidayName -Type $HolidayType -IsObserved $Observed
        }
        
        "Remove" {
            if (-not $HolidayDate) {
                Write-ColorOutput "Error: -HolidayDate parameter required for Remove action" "Red"
                exit 1
            }
            $success = Remove-Holiday -Config $config -Date $HolidayDate
        }
        
        "List" {
            Show-HolidaysList -Config $config
            $success = $true
        }
        
        "Toggle" {
            if (-not $HolidayDate) {
                Write-ColorOutput "Error: -HolidayDate parameter required for Toggle action" "Red"
                exit 1
            }
            $success = Toggle-HolidayObservance -Config $config -Date $HolidayDate
        }
    }
    
    # Save changes if successful and not just listing
    if ($success -and $Action -ne "List") {
        if (Save-ConfigFile -Config $config -Path $ConfigPath) {
            Write-ColorOutput "`nHoliday management completed successfully!" "Green"
            
            if ($config.holidays) {
                $observedCount = ($config.holidays | Where-Object { $_.observed -eq $true }).Count
                Write-ColorOutput "Total holidays: $($config.holidays.Count)" "Gray"
                Write-ColorOutput "Observed holidays: $observedCount" "Gray"
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

Write-ColorOutput "`nHoliday management completed!" "Green"