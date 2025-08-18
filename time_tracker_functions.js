/*
Time Tracker Functions v1.1.3
Author: Philippe Addelia
Company: NAKUPUNA CONSULTING
Created: August 17, 2025 PST
Modified: August 18, 2025 PST
Preferred location: Modules\Time Tracker\time_tracker_functions.js
Purpose: All JavaScript functionality for the Employee Time Tracker application - FIXED GRID INTERFACE
*/

// Company Configuration - EDIT THIS SECTION TO CUSTOMIZE FOR YOUR COMPANY
const COMPANY_CONFIG = {
    "companyName": "NAKUPUNA CONSULTING",
    "companyLogoPath": "Company_logo.png",
    "companyTagline": "",
    "showTagline": false,
    "logoMaxHeight": "60px",
    "logoMaxWidth": "200px"
};

// Built-in pay periods configuration
const DEFAULT_PAY_PERIODS_CONFIG = {
    "version": "1.1.3",
    "lastUpdated": "2025-08-18T12:00:00-08:00",
    "company": {
        "name": COMPANY_CONFIG.companyName || "NAKUPUNA CONSULTING",
        "payrollCycle": "bi-weekly",
        "timeZone": "PST"
    },
    "payPeriods": [
        {
            "id": "2025-15",
            "periodStart": "2025-08-02",
            "periodEnd": "2025-08-15",
            "timesheetDue": "2025-08-15",
            "payDay": "2025-08-22",
            "description": "Pay Period 15 - Aug 2-15, 2025"
        },
        {
            "id": "2025-16",
            "periodStart": "2025-08-16",
            "periodEnd": "2025-08-29",
            "timesheetDue": "2025-08-29",
            "payDay": "2025-09-05",
            "description": "Pay Period 16 - Aug 16-29, 2025"
        },
        {
            "id": "2025-17",
            "periodStart": "2025-08-30",
            "periodEnd": "2025-09-15",
            "timesheetDue": "2025-09-15",
            "payDay": "2025-09-22",
            "description": "Pay Period 17 - Aug 30 - Sep 15, 2025"
        },
        {
            "id": "2025-18",
            "periodStart": "2025-09-16",
            "periodEnd": "2025-09-30",
            "timesheetDue": "2025-09-30",
            "payDay": "2025-10-07",
            "description": "Pay Period 18 - Sep 16-30, 2025"
        },
        {
            "id": "2025-19",
            "periodStart": "2025-10-01",
            "periodEnd": "2025-10-15",
            "timesheetDue": "2025-10-15",
            "payDay": "2025-10-22",
            "description": "Pay Period 19 - Oct 1-15, 2025"
        },
        {
            "id": "2025-20",
            "periodStart": "2025-10-16",
            "periodEnd": "2025-10-31",
            "timesheetDue": "2025-10-31",
            "payDay": "2025-11-07",
            "description": "Pay Period 20 - Oct 16-31, 2025"
        }
    ],
    "holidays": [
        {
            "date": "2025-01-01",
            "name": "New Year's Day",
            "type": "federal"
        },
        {
            "date": "2025-01-20",
            "name": "Martin Luther King Jr. Day",
            "type": "federal"
        },
        {
            "date": "2025-02-17",
            "name": "Presidents Day",
            "type": "federal"
        },
        {
            "date": "2025-05-26",
            "name": "Memorial Day",
            "type": "federal"
        },
        {
            "date": "2025-06-19",
            "name": "Juneteenth",
            "type": "federal"
        },
        {
            "date": "2025-07-04",
            "name": "Independence Day",
            "type": "federal"
        },
        {
            "date": "2025-09-01",
            "name": "Labor Day",
            "type": "federal"
        },
        {
            "date": "2025-10-13",
            "name": "Columbus Day",
            "type": "federal"
        },
        {
            "date": "2025-11-11",
            "name": "Veteran's Day",
            "type": "federal"
        },
        {
            "date": "2025-11-27",
            "name": "Thanksgiving Day",
            "type": "federal"
        },
        {
            "date": "2025-12-25",
            "name": "Christmas Day",
            "type": "federal"
        }
    ],
    "configVersion": "1.1.3",
    "lastUpdated": "2025-08-18",
    "company": COMPANY_CONFIG.companyName || "NAKUPUNA CONSULTING"
};

// Global state variables
let isTracking = false;
let startTime = null;
let timerInterval = null;
let timeEntries = [];
let warningShown = false;
let autoSaveInterval = null;
let currentView = 'detailed';
let selectedImportMode = 'append';
let payPeriodsConfig = null;
let selectedPayPeriod = null;
let companyHolidays = [];

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Time tracker initializing...');
    loadData();
    loadPayPeriodsConfig();
    setupEventListeners();
    setupBeforeUnload();
    checkForIncompleteSession();
    console.log('Time tracker initialization complete');
});

// ============================================================================
// PAY PERIODS AND CONFIGURATION MANAGEMENT
// ============================================================================

function loadPayPeriodsConfig() {
    try {
        const savedConfig = localStorage.getItem('payPeriodsConfig');
        if (savedConfig) {
            payPeriodsConfig = JSON.parse(savedConfig);
            console.log('Loaded pay periods config from localStorage');
        } else {
            payPeriodsConfig = DEFAULT_PAY_PERIODS_CONFIG;
            console.log('Using default pay periods config');
        }
        
        companyHolidays = payPeriodsConfig.holidays || [];
        populatePayPeriods();
        setDefaultPeriod();
        
    } catch (error) {
        console.error('Error loading pay periods config:', error);
        payPeriodsConfig = DEFAULT_PAY_PERIODS_CONFIG;
        companyHolidays = payPeriodsConfig.holidays || [];
        populatePayPeriods();
        setDefaultPeriod();
    }
}

function populatePayPeriods() {
    const select = document.getElementById('payPeriodSelect');
    if (!select) {
        console.log('Pay period select element not found');
        return; // Element doesn't exist in employee version
    }
    
    select.innerHTML = '<option value="">Select Pay Period</option>';
    
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        payPeriodsConfig.payPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period.id;
            option.textContent = period.description;
            select.appendChild(option);
        });
        console.log(`Populated ${payPeriodsConfig.payPeriods.length} pay periods`);
    }
}

function setSelectedPayPeriod() {
    const selectElement = document.getElementById('payPeriodSelect');
    if (!selectElement) return; // Element doesn't exist in employee version
    
    const selectedId = selectElement.value;
    selectedPayPeriod = payPeriodsConfig.payPeriods.find(p => p.id === selectedId);
    
    if (selectedPayPeriod) {
        // Set period dates
        const periodEndEl = document.getElementById('periodEnd');
        if (periodEndEl) {
            periodEndEl.value = selectedPayPeriod.periodEnd;
        }
        
        // Show pay period info
        updatePayPeriodInfo();
        const infoElement = document.getElementById('payPeriodInfo');
        if (infoElement) {
            infoElement.style.display = 'grid';
        }
    } else {
        const infoElement = document.getElementById('payPeriodInfo');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }
    
    updateDisplay();
}

// Make function globally available
window.setSelectedPayPeriod = setSelectedPayPeriod;

function updatePayPeriodInfo() {
    if (!selectedPayPeriod) return;
    
    const today = new Date();
    const endDate = new Date(selectedPayPeriod.periodEnd);
    const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    
    const elements = {
        'periodRange': `${selectedPayPeriod.periodStart} to ${selectedPayPeriod.periodEnd}`,
        'timesheetDue': selectedPayPeriod.timesheetDue,
        'payDay': selectedPayPeriod.payDay,
        'daysRemaining': daysRemaining
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function setDefaultPeriod() {
    const today = new Date();
    
    // Try to find current pay period
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            const start = new Date(period.periodStart);
            const end = new Date(period.periodEnd);
            return today >= start && today <= end;
        });
        
        if (currentPeriod) {
            const selectElement = document.getElementById('payPeriodSelect');
            if (selectElement) {
                selectElement.value = currentPeriod.id;
                setSelectedPayPeriod();
                return;
            }
        }
    }
    
    // Fallback to manual dates
    const periodEndElement = document.getElementById('periodEnd');
    if (periodEndElement) {
        periodEndElement.value = formatDate(today);
    }
}

// ============================================================================
// EVENT LISTENERS AND SETUP
// ============================================================================

function setupEventListeners() {
    const employeeNameEl = document.getElementById('employeeName');
    const dailyTargetEl = document.getElementById('dailyTarget');
    const periodEndEl = document.getElementById('periodEnd');
    
    if (employeeNameEl) employeeNameEl.addEventListener('input', saveData);
    if (dailyTargetEl) dailyTargetEl.addEventListener('input', saveData);
    if (periodEndEl) periodEndEl.addEventListener('change', updateDisplay);
}

function setupBeforeUnload() {
    window.addEventListener('beforeunload', function(e) {
        if (isTracking) {
            saveTrackingState();
            e.returnValue = 'You have an active time tracking session. Are you sure you want to leave?';
        }
    });
}

// ============================================================================
// TIMER FUNCTIONALITY
// ============================================================================

function toggleTimer() {
    const timerButton = document.getElementById('timerButton');
    
    if (timerButton && timerButton.disabled) return;
    if (timerButton) timerButton.disabled = true;
    
    setTimeout(() => {
        if (timerButton) timerButton.disabled = false;
    }, 500);
    
    if (isTracking) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    // Validation
    const employeeName = document.getElementById('employeeName').value;
    if (!employeeName.trim()) {
        alert('Please enter your employee name before starting the timer.');
        document.getElementById('employeeName').focus();
        return;
    }

    isTracking = true;
    startTime = new Date();
    warningShown = false;
    
    const timerButton = document.getElementById('timerButton');
    if (timerButton) {
        timerButton.textContent = 'Stop';
        timerButton.classList.add('stop');
    }
    
    timerInterval = setInterval(updateTimer, 1000);
    saveTrackingState();
    autoSaveInterval = setInterval(saveTrackingState, 60000);
}

function stopTimer() {
    if (!isTracking) return;
    
    isTracking = false;
    const endTime = new Date();
    const category = document.getElementById('categorySelect').value;
    const project = document.getElementById('projectInput').value || 'No Project';
    
    const entry = {
        id: Date.now(),
        date: formatDate(startTime),
        category: category,
        project: project,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        duration: calculateDuration(startTime, endTime)
    };
    
    timeEntries = [...timeEntries, entry];
    
    clearInterval(timerInterval);
    clearInterval(autoSaveInterval);
    
    const timerButton = document.getElementById('timerButton');
    if (timerButton) {
        timerButton.textContent = 'Start';
        timerButton.classList.remove('stop');
        timerButton.disabled = false;
    }
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = '00:00:00';
    }
    
    saveData();
    
    setTimeout(() => {
        updateDisplay();
        setTimeout(() => {
            updateEntriesList();
        }, 100);
    }, 100);
    
    clearTrackingState();
    clearWarning();
}

function updateTimer() {
    if (!isTracking) return;
    
    const now = new Date();
    const elapsed = now - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateDailyCounter();
    
    const filteredEntries = getFilteredEntries();
    const todayEntries = filteredEntries.filter(entry => entry.date === formatDate(new Date()));
    const todayHours = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const dailyTarget = parseFloat(document.getElementById('dailyTarget').value) || 8;
    const currentSession = elapsed / 3600000;
    const projectedTotal = todayHours + currentSession;
    
    if (projectedTotal >= dailyTarget && !warningShown) {
        showDailyTargetWarning(projectedTotal, dailyTarget);
        warningShown = true;
    }
    
    if (now.getHours() >= 18 && !warningShown) {
        showWarning();
        warningShown = true;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateDuration(start, end) {
    const diff = end - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return parseFloat((hours + minutes / 60).toFixed(2));
}

function formatDate(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    return date.toTimeString().split(' ')[0].substring(0, 5);
}

function formatDateTime(date) {
    return date.toLocaleDateString() + ' ' + formatTime(date);
}

// ============================================================================
// DISPLAY UPDATE FUNCTIONS
// ============================================================================

function updateDisplay() {
    updateStats();
    updateDailyCounter();
    updateEntriesList();
    updatePayPeriodInfo();
}

function updateStats() {
    const filteredEntries = getFilteredEntries();
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const workDays = new Set(filteredEntries.map(entry => entry.date)).size;
    
    const periodEnd = document.getElementById('periodEnd').value;
    const today = formatDate(new Date());
    
    let periodDays = 0;
    let daysElapsed = 0;
    
    if (selectedPayPeriod) {
        const start = new Date(selectedPayPeriod.periodStart);
        const end = new Date(selectedPayPeriod.periodEnd);
        periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const currentDate = new Date(today);
        if (currentDate >= start && currentDate <= end) {
            daysElapsed = Math.ceil((currentDate - start) / (1000 * 60 * 60 * 24)) + 1;
        } else if (currentDate > end) {
            daysElapsed = periodDays;
        }
    } else if (periodEnd) {
        // Fallback calculation for manual period
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const start = twoWeeksAgo;
        const end = new Date(periodEnd);
        periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const currentDate = new Date(today);
        if (currentDate >= start && currentDate <= end) {
            daysElapsed = Math.ceil((currentDate - start) / (1000 * 60 * 60 * 24)) + 1;
        } else if (currentDate > end) {
            daysElapsed = periodDays;
        }
    }

    const statElements = {
        'totalHours': totalHours.toFixed(1),
        'periodDays': periodDays,
        'workDays': workDays,
        'daysElapsed': daysElapsed
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function updateDailyCounter() {
    const filteredEntries = getFilteredEntries();
    const todayEntries = filteredEntries.filter(entry => entry.date === formatDate(new Date()));
    const todayHours = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const dailyTarget = parseFloat(document.getElementById('dailyTarget').value) || 8;
    
    const dailyCounter = document.getElementById('dailyCounter');
    const progressFill = document.getElementById('progressFillSmall');
    
    let displayHours = todayHours;
    let progressPercent = (todayHours / dailyTarget) * 100;
    
    if (isTracking && startTime) {
        const currentSession = (new Date() - startTime) / 3600000;
        displayHours = todayHours + currentSession;
        progressPercent = (displayHours / dailyTarget) * 100;
        if (dailyCounter) {
            dailyCounter.textContent = `${todayHours.toFixed(1)} (+${currentSession.toFixed(1)}) / ${dailyTarget.toFixed(1)}h`;
        }
    } else {
        if (dailyCounter) {
            dailyCounter.textContent = `${todayHours.toFixed(1)} / ${dailyTarget.toFixed(1)}h`;
        }
    }
    
    if (progressFill) {
        progressFill.style.width = Math.min(progressPercent, 100) + '%';
        
        if (displayHours >= dailyTarget) {
            progressFill.className = 'progress-fill-small exceeded';
        } else if (displayHours >= dailyTarget * 0.9) {
            progressFill.className = 'progress-fill-small approaching';
        } else {
            progressFill.className = 'progress-fill-small';
        }
    }
}

function getFilteredEntries() {
    if (selectedPayPeriod) {
        return timeEntries.filter(entry => {
            return entry.date >= selectedPayPeriod.periodStart && entry.date <= selectedPayPeriod.periodEnd;
        });
    } else {
        // Fallback to period end date
        const periodEnd = document.getElementById('periodEnd').value;
        if (!periodEnd) return timeEntries;
        
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const startDate = formatDate(twoWeeksAgo);
        
        return timeEntries.filter(entry => {
            return entry.date >= startDate && entry.date <= periodEnd;
        });
    }
}

// ============================================================================
// FIXED ENTRIES LIST DISPLAY - THIS WAS THE MAIN ISSUE
// ============================================================================

function updateEntriesList() {
    const container = document.getElementById('entriesList');
    if (!container) return;
    
    const filteredEntries = getFilteredEntries();
    
    if (filteredEntries.length === 0) {
        container.innerHTML = '<div class="no-entries">No time entries found for this period</div>';
        return;
    }
    
    if (currentView === 'detailed') {
        showDetailedView(container, filteredEntries);
    } else {
        showDailySummaryView(container, filteredEntries);
    }
}

function showDetailedView(container, filteredEntries) {
    // Create proper table structure with headers
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time Period</th>
                    <th>Duration</th>
                    <th>Category</th>
                    <th>Project</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Sort entries by date and time (newest first)
    const sortedEntries = filteredEntries.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.startTime.localeCompare(a.startTime);
    });
    
    // Add table rows
    sortedEntries.forEach(entry => {
        tableHTML += `
            <tr>
                <td><strong>${entry.date}</strong></td>
                <td>${entry.startTime} - ${entry.endTime}</td>
                <td><strong>${entry.duration.toFixed(1)}h</strong></td>
                <td><span class="category-badge category-${entry.category}">${entry.category.toUpperCase()}</span></td>
                <td>${entry.project || 'No Project'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

function showDailySummaryView(container, filteredEntries) {
    // Group entries by date
    const dailyTotals = {};
    filteredEntries.forEach(entry => {
        if (!dailyTotals[entry.date]) {
            dailyTotals[entry.date] = {
                hours: 0,
                categories: new Set()
            };
        }
        dailyTotals[entry.date].hours += entry.duration;
        dailyTotals[entry.date].categories.add(entry.category);
    });
    
    // Create table structure for daily summary
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Day of Week</th>
                    <th>Total Hours</th>
                    <th>Categories</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Sort by date (newest first)
    Object.entries(dailyTotals)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .forEach(([date, data]) => {
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
            const categoriesHTML = Array.from(data.categories)
                .map(cat => `<span class="category-badge category-${cat}">${cat.toUpperCase()}</span>`)
                .join(' ');
                
            tableHTML += `
                <tr>
                    <td><strong>${date}</strong></td>
                    <td>${dayOfWeek}</td>
                    <td><strong>${data.hours.toFixed(1)}h</strong></td>
                    <td>${categoriesHTML}</td>
                </tr>
            `;
        });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

function setView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find the clicked button and make it active
    event.target.classList.add('active');
    
    // Update the display
    updateEntriesList();
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

function exportToCSV() {
    const employeeName = document.getElementById('employeeName').value || 'Employee';
    const filteredEntries = getFilteredEntries();
    
    if (filteredEntries.length === 0) {
        alert('No data to export for the selected period.');
        return;
    }
    
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const workDays = new Set(filteredEntries.map(entry => entry.date)).size;
    const avgDaily = workDays > 0 ? totalHours / workDays : 0;
    
    let csvContent = `Employee Name,Date,Category,Project,Start Time,End Time,Duration (Hours)\n`;
    
    filteredEntries
        .sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime))
        .forEach(entry => {
            csvContent += `"${employeeName}","${entry.date}","${entry.category}","${entry.project}","${entry.startTime}","${entry.endTime}",${entry.duration}\n`;
        });
    
    if (selectedPayPeriod) {
        csvContent += `\nSUMMARY\n`;
        csvContent += `Period,"${selectedPayPeriod.periodStart} to ${selectedPayPeriod.periodEnd}"\n`;
        csvContent += `Total Hours,${totalHours.toFixed(1)}\n`;
        csvContent += `Work Days,${workDays}\n`;
        csvContent += `Average Daily Hours,${avgDaily.toFixed(2)}\n`;
        csvContent += `Export Date,"${new Date().toISOString().split('T')[0]}"\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = selectedPayPeriod ? 
        `${employeeName.replace(/\s+/g, '_')}_${selectedPayPeriod.id}.csv` :
        `${employeeName.replace(/\s+/g, '_')}_Timesheet.csv`;
    link.href = url;
    link.download = fileName;
    link.click();
    
    window.URL.revokeObjectURL(url);
}

// ============================================================================
// IMPORT FUNCTIONALITY
// ============================================================================

function importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                parseCSVImport(e.target.result);
            } catch (error) {
                alert('Error reading CSV file: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function parseCSVImport(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid.');
        return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.toLowerCase().includes('summary')) break;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < headers.length) continue;
        
        try {
            const entry = {
                id: Date.now() + Math.random(),
                date: values[1],
                category: values[2] || 'work',
                project: values[3] || 'No Project',
                startTime: values[4],
                endTime: values[5],
                duration: parseFloat(values[6]) || 0
            };
            
            if (entry.date && entry.startTime && entry.endTime && entry.duration > 0) {
                timeEntries.push(entry);
                importedCount++;
            }
        } catch (error) {
            console.warn('Skipped invalid line:', line);
        }
    }
    
    if (importedCount > 0) {
        saveData();
        updateDisplay();
        alert(`Successfully imported ${importedCount} time entries.`);
    } else {
        alert('No valid entries found in the CSV file.');
    }
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

function clearAllData() {
    if (confirm('Are you sure you want to clear ALL time tracking data? This cannot be undone.')) {
        timeEntries = [];
        saveData();
        updateDisplay();
        alert('All data has been cleared.');
    }
}

function saveData() {
    try {
        if (typeof(Storage) === "undefined" || !localStorage) {
            console.warn('localStorage not available');
            return;
        }
        
        const dataToSave = {
            employeeName: document.getElementById('employeeName').value,
            dailyTarget: document.getElementById('dailyTarget').value,
            timeEntries: timeEntries.map(entry => ({
                id: entry.id,
                date: entry.date,
                category: entry.category,
                project: entry.project,
                startTime: entry.startTime,
                endTime: entry.endTime,
                duration: entry.duration
            }))
        };
        
        localStorage.setItem('timeTrackerData', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadData() {
    try {
        if (typeof(Storage) === "undefined" || !localStorage) {
            console.warn('localStorage not available');
            return;
        }
        
        const data = localStorage.getItem('timeTrackerData');
        if (data) {
            const parsed = JSON.parse(data);
            const employeeNameEl = document.getElementById('employeeName');
            const dailyTargetEl = document.getElementById('dailyTarget');
            
            if (employeeNameEl) employeeNameEl.value = parsed.employeeName || '';
            if (dailyTargetEl) dailyTargetEl.value = parsed.dailyTarget || '8';
            
            timeEntries = (parsed.timeEntries || []).map(entry => ({
                id: entry.id,
                date: entry.date,
                category: entry.category,
                project: entry.project,
                startTime: entry.startTime,
                endTime: entry.endTime,
                duration: parseFloat(entry.duration)
            }));
        }
    } catch (error) {
        console.error('Error loading data:', error);
        timeEntries = [];
        const employeeNameEl = document.getElementById('employeeName');
        const dailyTargetEl = document.getElementById('dailyTarget');
        
        if (employeeNameEl) employeeNameEl.value = '';
        if (dailyTargetEl) dailyTargetEl.value = '8';
    }
}

// ============================================================================
// SESSION RECOVERY AND TRACKING STATE
// ============================================================================

function saveTrackingState() {
    try {
        if (!isTracking || !startTime) return;
        if (typeof(Storage) === "undefined" || !localStorage) return;
        
        const state = {
            isTracking: true,
            startTime: startTime.toISOString(),
            category: document.getElementById('categorySelect').value,
            project: document.getElementById('projectInput').value || 'No Project',
            dailyTarget: document.getElementById('dailyTarget').value,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('timeTrackerState', JSON.stringify(state));
    } catch (error) {
        console.error('Error saving tracking state:', error);
    }
}

function clearTrackingState() {
    try {
        if (typeof(Storage) === "undefined" || !localStorage) return;
        localStorage.removeItem('timeTrackerState');
    } catch (error) {
        console.error('Error clearing tracking state:', error);
    }
}

function checkForIncompleteSession() {
    try {
        if (typeof(Storage) === "undefined" || !localStorage) return;
        const state = localStorage.getItem('timeTrackerState');
        if (state) {
            const savedState = JSON.parse(state);
            if (savedState && savedState.isTracking) {
                showRecoveryModal(savedState);
                return;
            }
        }
    } catch (error) {
        console.error('Error checking incomplete session:', error);
    }
    
    // Set initial state
    const timerButton = document.getElementById('timerButton');
    if (timerButton) {
        timerButton.textContent = 'Start';
        timerButton.classList.remove('stop');
        timerButton.disabled = false;
    }
    updateDisplay();
}

function showRecoveryModal(savedState) {
    const now = new Date();
    const savedStart = new Date(savedState.startTime);
    const elapsedHours = ((now - savedStart) / 3600000).toFixed(2);
    
    const dailyTargetEl = document.getElementById('dailyTarget');
    if (savedState.dailyTarget && dailyTargetEl) {
        dailyTargetEl.value = savedState.dailyTarget;
    }
    
    const modal = document.createElement('div');
    modal.className = 'recovery-modal';
    modal.innerHTML = `
        <div class="recovery-content">
            <h3>Incomplete Time Session Detected</h3>
            <div class="recovery-info">
                <strong>Category:</strong> ${savedState.category.toUpperCase()}<br>
                <strong>Project:</strong> ${savedState.project || 'No Project'}<br>
                <strong>Started:</strong> ${formatDateTime(savedStart)}<br>
                <strong>Calculated Duration:</strong> ${elapsedHours} hours<br>
                <strong>Estimated End:</strong> ${formatDateTime(now)}
            </div>
            
            <div class="adjust-section" id="adjustSection">
                <h4>Adjust End Time:</h4>
                <div class="time-inputs">
                    <label>End Date:</label>
                    <input type="date" id="adjustDate" value="${formatDate(now)}">
                    <label>End Time:</label>
                    <input type="time" id="adjustTime" value="${formatTime(now)}">
                </div>
                <div style="margin-top: 15px;">
                    <strong>Adjusted Duration: <span id="adjustedDuration">${elapsedHours}h</span></strong>
                </div>
            </div>
            
            <div class="recovery-buttons">
                <button class="recovery-btn btn-save" onclick="recoverSession('save')">
                    Save As-Is
                </button>
                <button class="recovery-btn btn-adjust" onclick="showAdjustSection()">
                    Adjust Time
                </button>
                <button class="recovery-btn btn-discard" onclick="recoverSession('discard')">
                    Discard
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store state for recovery
    window.pendingRecoveryState = savedState;
}

function showAdjustSection() {
    const adjustSection = document.getElementById('adjustSection');
    if (adjustSection) {
        adjustSection.classList.add('show');
    }
}

function recoverSession(action) {
    const savedState = window.pendingRecoveryState;
    const modal = document.querySelector('.recovery-modal');
    
    if (action === 'save') {
        saveRecoveredSession(savedState, new Date());
    } else if (action === 'adjust') {
        const adjustDate = document.getElementById('adjustDate').value;
        const adjustTime = document.getElementById('adjustTime').value;
        const adjustedEnd = new Date(`${adjustDate}T${adjustTime}`);
        saveRecoveredSession(savedState, adjustedEnd);
    }
    
    clearTrackingState();
    if (modal) modal.remove();
    
    const timerButton = document.getElementById('timerButton');
    if (timerButton) {
        timerButton.textContent = 'Start';
        timerButton.classList.remove('stop');
        timerButton.disabled = false;
    }
    
    updateDisplay();
}

function saveRecoveredSession(savedState, endTime) {
    const startTime = new Date(savedState.startTime);
    const entry = {
        id: Date.now(),
        date: formatDate(startTime),
        category: savedState.category,
        project: savedState.project || 'No Project',
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        duration: calculateDuration(startTime, endTime)
    };
    
    timeEntries = [...timeEntries, entry];
    saveData();
}

// ============================================================================
// WARNING AND NOTIFICATION FUNCTIONS
// ============================================================================

function showDailyTargetWarning(currentHours, targetHours) {
    const warning = document.createElement('div');
    warning.className = 'warning';
    warning.innerHTML = `Daily target of ${targetHours}h reached! Current: ${currentHours.toFixed(1)}h`;
    document.body.appendChild(warning);
    
    setTimeout(() => {
        if (warning.parentNode) {
            warning.parentNode.removeChild(warning);
        }
    }, 8000);
}

function showWarning() {
    const warning = document.createElement('div');
    warning.className = 'warning';
    warning.innerHTML = 'It\'s past 6:00 PM - Don\'t forget to stop your timer!';
    document.body.appendChild(warning);
    
    setTimeout(() => {
        if (warning.parentNode) {
            warning.parentNode.removeChild(warning);
        }
    }, 10000);
}

function clearWarning() {
    const warnings = document.querySelectorAll('.warning');
    warnings.forEach(warning => {
        if (warning.parentNode) {
            warning.parentNode.removeChild(warning);
        }
    });
}