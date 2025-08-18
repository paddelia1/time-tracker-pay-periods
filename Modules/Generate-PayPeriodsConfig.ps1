<#
Script: Generate-PayPeriodsConfig.ps1
FileName: Generate-PayPeriodsConfig.ps1
Philippe Addelia
Created: 2025-08-15 10:00 PST
Modified: 2025-08-15 10:00 PST
Preferred location: Modules\Time Tracker
Purpose: Generate pay periods configuration file for Time Tracker application with bi-weekly periods
Version: 1.1.1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [DateTime]$StartDate,
    
    [Parameter(Mandatory = $false)]
    [int]$NumberOfPeriods = 26,
    
    [Parameter(Mandatory = $false)]
    [string]$OutputPath = ".\pay-periods-config.json",
    
    [Parameter(Mandatory = $false)]
    [string]$CompanyName = "Your Company",
    
    [Parameter(Mandatory = $false)]
    [int]$PeriodLengthDays = 14,
    
    [Parameter(Mandatory = $false)]
    [int]$PayDelayDays = 7,
    
    [Parameter(Mandatory = $false)]
    [switch]$IncludeSampleHolidays,
    
    [Parameter(Mandatory = $false)]
    [switch]$Overwrite
)

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-ConfigExists {
    param([string]$Path)
    
    if (Test-Path $Path) {
        if (-not $Overwrite) {
            Write-ColorOutput "Error: Configuration file already exists at: $Path" "Red"
            Write-ColorOutput "Use -Overwrite switch to replace existing file" "Yellow"
            return $true
        }
        Write-ColorOutput "Warning: Overwriting existing configuration file" "Yellow"
    }
    return $false
}

function Get-PayPeriodId {
    param(
        [DateTime]$StartDate,
        [int]$PeriodNumber
    )
    
    $year = $StartDate.Year
    return "PP-$year-$PeriodNumber"
}

function Get-StandardHolidays {
    param([int]$Year)
    
    $holidays = @()
    
    # Federal holidays that are commonly observed
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
    
    # Columbus Day (2nd Monday in October) - marked as not observed by default
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
    
    # Day After Thanksgiving (Company Holiday)
    $dayAfterThanksgiving = $thanksgiving.AddDays(1)
    $holidays += @{
        date = $dayAfterThanksgiving.ToString("yyyy-MM-dd")
        name = "Day After Thanksgiving"
        type = "company"
        observed = $true
    }
    
    # Christmas Eve (Company Holiday)
    $holidays += @{
        date = "$Year-12-24"
        name = "Christmas Eve"
        type = "company"
        observed = $true
    }
    
    # Christmas Day
    $holidays += @{
        date = "$Year-12-25"
        name = "Christmas Day"
        type = "federal"
        observed = $true
    }
    
    # New Year's Eve (Company Holiday)
    $holidays += @{
        date = "$Year-12-31"
        name = "New Year's Eve"
        type = "company"
        observed = $true
    }
    
    return $holidays
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

function New-PayPeriodsConfig {
    param(
        [DateTime]$StartDate,
        [int]$NumberOfPeriods,
        [string]$CompanyName,
        [int]$PeriodLengthDays,
        [int]$PayDelayDays,
        [bool]$IncludeSampleHolidays
    )
    
    Write-ColorOutput "Generating pay periods configuration..." "Cyan"
    Write-ColorOutput "Start Date: $($StartDate.ToString('yyyy-MM-dd'))" "Gray"
    Write-ColorOutput "Number of Periods: $NumberOfPeriods" "Gray"
    Write-ColorOutput "Period Length: $PeriodLengthDays days" "Gray"
    Write-ColorOutput "Pay Delay: $PayDelayDays days" "Gray"
    
    $payPeriods = @()
    $currentStart = $StartDate
    
    # Calculate year for pay period numbering
    $startYear = $StartDate.Year
    $startPeriodNumber = [Math]::Ceiling($StartDate.DayOfYear / $PeriodLengthDays)
    
    for ($i = 0; $i -lt $NumberOfPeriods; $i++) {
        $currentEnd = $currentStart.AddDays($PeriodLengthDays - 1)
        $timesheetDue = $currentEnd
        $payDay = $currentEnd.AddDays($PayDelayDays)
        
        # Adjust pay period number if we cross into a new year
        $periodYear = $currentStart.Year
        $periodNumber = $startPeriodNumber + $i
        
        if ($periodYear -gt $startYear) {
            $periodNumber = $i - ([Math]::Floor(($startYear + 1 - $startYear) * 365 / $PeriodLengthDays))
            if ($periodNumber -lt 1) { $periodNumber = $i + 1 }
        }
        
        $payPeriod = @{
            id = Get-PayPeriodId -StartDate $currentStart -PeriodNumber $periodNumber
            startDate = $currentStart.ToString("yyyy-MM-dd")
            endDate = $currentEnd.ToString("yyyy-MM-dd")
            timesheetDue = $timesheetDue.ToString("yyyy-MM-dd")
            payDay = $payDay.ToString("yyyy-MM-dd")
            description = "Pay Period $periodNumber - $($currentStart.ToString('MMMM d')) to $($currentEnd.ToString('MMMM d'))"
        }
        
        $payPeriods += $payPeriod
        $currentStart = $currentEnd.AddDays(1)
    }
    
    # Generate holidays if requested
    $holidays = @()
    if ($IncludeSampleHolidays) {
        Write-ColorOutput "Including standard federal and company holidays..." "Cyan"
        
        $yearsToInclude = @($StartDate.Year)
        if ($payPeriods[-1].endDate.Split('-')[0] -ne $StartDate.Year.ToString()) {
            $yearsToInclude += [int]$payPeriods[-1].endDate.Split('-')[0]
        }
        
        foreach ($year in $yearsToInclude) {
            $holidays += Get-StandardHolidays -Year $year
        }
    }
    
    $config = @{
        version = "1.1.1"
        lastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
        company = @{
            name = $CompanyName
            payrollCycle = "bi-weekly"
            timeZone = "PST"
        }
        payPeriods = $payPeriods
    }
    
    if ($holidays.Count -gt 0) {
        $config.holidays = $holidays
    }
    
    return $config
}

function Save-ConfigToFile {
    param(
        [hashtable]$Config,
        [string]$OutputPath
    )
    
    try {
        $json = $Config | ConvertTo-Json -Depth 10
        $json | Out-File -FilePath $OutputPath -Encoding UTF8
        
        Write-ColorOutput "Configuration saved successfully!" "Green"
        Write-ColorOutput "File: $OutputPath" "Gray"
        Write-ColorOutput "Pay Periods: $($Config.payPeriods.Count)" "Gray"
        if ($Config.holidays) {
            Write-ColorOutput "Holidays: $($Config.holidays.Count)" "Gray"
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "Error saving configuration: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Show-Summary {
    param([hashtable]$Config)
    
    Write-ColorOutput "`n=== Pay Periods Configuration Summary ===" "Yellow"
    Write-ColorOutput "Company: $($Config.company.name)" "White"
    Write-ColorOutput "Total Pay Periods: $($Config.payPeriods.Count)" "White"
    
    $firstPeriod = $Config.payPeriods[0]
    $lastPeriod = $Config.payPeriods[-1]
    
    Write-ColorOutput "Date Range: $($firstPeriod.startDate) to $($lastPeriod.endDate)" "White"
    Write-ColorOutput "First Pay Day: $($firstPeriod.payDay)" "White"
    Write-ColorOutput "Last Pay Day: $($lastPeriod.payDay)" "White"
    
    if ($Config.holidays) {
        $observedHolidays = $Config.holidays | Where-Object { $_.observed -eq $true }
        Write-ColorOutput "Observed Holidays: $($observedHolidays.Count)" "White"
    }
    
    Write-ColorOutput "`n=== Next Steps ===" "Cyan"
    Write-ColorOutput "1. Place the generated file in the same folder as your time tracker HTML" "Gray"
    Write-ColorOutput "2. Open the time tracker in your browser" "Gray"
    Write-ColorOutput "3. The app will automatically load and use the pay periods" "Gray"
    Write-ColorOutput "4. Use Update-PayPeriodsConfig.ps1 to modify or extend periods" "Gray"
}

# Main execution
try {
    Write-ColorOutput "=== Pay Periods Configuration Generator ===" "Yellow"
    Write-ColorOutput "Version 1.1.1 - Created by Philippe Addelia" "Gray"
    Write-ColorOutput ""
    
    # Validate parameters
    if ($StartDate -lt (Get-Date).AddYears(-1)) {
        Write-ColorOutput "Warning: Start date is more than a year in the past" "Yellow"
    }
    
    if ($NumberOfPeriods -lt 1 -or $NumberOfPeriods -gt 52) {
        Write-ColorOutput "Error: Number of periods must be between 1 and 52" "Red"
        exit 1
    }
    
    # Check if file exists
    if (Test-ConfigExists -Path $OutputPath) {
        exit 1
    }
    
    # Generate configuration
    $config = New-PayPeriodsConfig -StartDate $StartDate -NumberOfPeriods $NumberOfPeriods -CompanyName $CompanyName -PeriodLengthDays $PeriodLengthDays -PayDelayDays $PayDelayDays -IncludeSampleHolidays $IncludeSampleHolidays
    
    # Save to file
    if (Save-ConfigToFile -Config $config -OutputPath $OutputPath) {
        Show-Summary -Config $config
    }
    else {
        exit 1
    }
}
catch {
    Write-ColorOutput "Unexpected error: $($_.Exception.Message)" "Red"
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" "Gray"
    exit 1
}

Write-ColorOutput "`nConfiguration generation completed successfully!" "Green"