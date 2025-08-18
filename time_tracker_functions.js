/*
Time Tracker Functions v1.1.2
Author: Philippe Addelia
Company: NAKUPUNA CONSULTING
Created: August 17, 2025 PST
Modified: August 17, 2025 PST
Preferred location: Modules\Time Tracker\time_tracker_functions.js
Purpose: All JavaScript functionality for the Employee Time Tracker application
*/

// Company Configuration - EDIT THIS SECTION TO CUSTOMIZE FOR YOUR COMPANY
const COMPANY_CONFIG = {
    "companyName": "NAKUPUNA CONSULTING",
    "companyLogoPath": "Company_logo.png",
    "companyTagline": "Time Management Solutions",
    "showTagline": false,
    "logoMaxHeight": "60px",
    "logoMaxWidth": "200px"
};

// Built-in pay periods configuration
const DEFAULT_PAY_PERIODS_CONFIG = {
    "version": "1.1.2",
    "lastUpdated": "2025-08-17T12:00:00-08:00",
    "company": {
        "name": COMPANY_CONFIG.companyName || "NAKUPUNA CONSULTING",
        "payrollCycle": "bi-weekly",
        "timeZone": "PST"
    },
    "payPeriods": [
        {
            "id": "PP-2025-16",
            "startDate": "2025-08-02",
            "endDate": "2025-08-15",
            "timesheetDue": "2025-08-15",
            "payDay": "2025-08-22",
            "description": "Pay Period 16 - August 2nd to 15th"
        },
        {
            "id": "PP-2025-17",
            "startDate": "2025-08-16",
            "endDate": "2025-08-29",
            "timesheetDue": "2025-08-29",
            "payDay": "2025-09-05",
            "description": "Pay Period 17 - August 16th to 29th"
        },
        {
            "id": "PP-2025-18",
            "startDate": "2025-08-30",
            "endDate": "2025-09-12",
            "timesheetDue": "2025-09-12",
            "payDay": "2025-09-19",
            "description": "Pay Period 18 - August 30th to September 12th"
        },
        {
            "id": "PP-2025-19",
            "startDate": "2025-09-13",
            "endDate": "2025-09-26",
            "timesheetDue": "2025-09-26",
            "payDay": "2025-10-03",
            "description": "Pay Period 19 - September 13th to 26th"
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
    "configVersion": "1.1.2",
    "lastUpdated": "2025-08-17",
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
    select.innerHTML = '<option value="">Select Pay Period</option>';
    
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        payPeriodsConfig.payPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period.id;
            option.textContent = period.description;
            select.appendChild(option);
        });
    }
}

function setSelectedPayPeriod() {
    const selectedId = document.getElementById('payPeriodSelect').value;
    selectedPayPeriod = payPeriodsConfig.payPeriods.find(p => p.id === selectedId);
    
    if (selectedPayPeriod) {
        // Set period dates
        document.getElementById('periodEnd').value = selectedPayPeriod.endDate;
        
        // Show pay period info
        updatePayPeriodInfo();
        document.getElementById('payPeriodInfo').style.display = 'grid';
    } else {
        document.getElementById('payPeriodInfo').style.display = 'none';
    }
    
    updateDisplay();
}

function updatePayPeriodInfo() {
    if (!selectedPayPeriod) return;
    
    const today = new Date();
    const endDate = new Date(selectedPayPeriod.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    
    document.getElementById('periodRange').textContent = 
        `${selectedPayPeriod.startDate} to ${selectedPayPeriod.endDate}`;
    document.getElementById('timesheetDue').textContent = selectedPayPeriod.timesheetDue;
    document.getElementById('payDay').textContent = selectedPayPeriod.payDay;
    document.getElementById('daysRemaining').textContent = daysRemaining;
}

function setDefaultPeriod() {
    const today = new Date();
    
    // Try to find current pay period
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            return today >= start && today <= end;
        });
        
        if (currentPeriod) {
            document.getElementById('payPeriodSelect').value = currentPeriod.id;
            setSelectedPayPeriod();
            return;
        }
    }
    
    // Fallback to manual dates
    document.getElementById('periodEnd').value = formatDate(today);
}

// ============================================================================
// EVENT LISTENERS AND SETUP
// ============================================================================

function setupEventListeners() {
    document.getElementById('employeeName').addEventListener('input', saveData);
    document.getElementById('dailyTarget').addEventListener('input', saveData);
    document.getElementById('periodEnd').addEventListener('change', updateDisplay);
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
    
    if (timerButton.disabled) return;
    timerButton.disabled = true;
    
    setTimeout(() => {
        timerButton.disabled = false;
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
    timerButton.textContent = 'Stop';
    timerButton.classList.add('stop');
    
    setTimeout(() => {
        timerButton.textContent = 'Stop';
        timerButton.classList.add('stop');
    }, 50);
    
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
    timerButton.textContent = 'Start';
    timerButton.classList.remove('stop');
    
    setTimeout(() => {
        timerButton.textContent = 'Start';
        timerButton.classList.remove('stop');
        timerButton.disabled = false;
    }, 50);
    
    document.getElementById('timerDisplay').textContent = '00:00:00';
    
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
    
    document.getElementById('timerDisplay').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
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
        const start = new Date(selectedPayPeriod.startDate);
        const end = new Date(selectedPayPeriod.endDate);
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

    document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    document.getElementById('periodDays').textContent = periodDays;
    document.getElementById('workDays').textContent = workDays;
    document.getElementById('daysElapsed').textContent = daysElapsed;
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
        dailyCounter.textContent = `${todayHours.toFixed(1)} (+${currentSession.toFixed(1)}) / ${dailyTarget.toFixed(1)}h`;
    } else {
        dailyCounter.textContent = `${todayHours.toFixed(1)} / ${dailyTarget.toFixed(1)}h`;
    }
    
    progressFill.style.width = Math.min(progressPercent, 100) + '%';
    
    if (displayHours >= dailyTarget) {
        progressFill.className = 'progress-fill-small exceeded';
    } else if (displayHours >= dailyTarget * 0.9) {
        progressFill.className = 'progress-fill-small approaching';
    } else {
        progressFill.className = 'progress-fill-small';
    }
}

function getFilteredEntries() {
    if (selectedPayPeriod) {
        return timeEntries.filter(entry => {
            return entry.date >= selectedPayPeriod.startDate && entry.date <= selectedPayPeriod.endDate;
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

function updateEntriesList() {
    const container = document.getElementById('entriesList');
    const filteredEntries = getFilteredEntries();
    
    if (filteredEntries.length === 0) {
        container.innerHTML = '<div class="no-entries">No time entries found for this period</div>';
        return;
    }
    
    if (currentView === 'detailed') {
        // Add table header for detailed view
        let tableHTML = `
            <div class="entries-table-header">
                <div class="header-cell">Date</div>
                <div class="header-cell">Time Period</div>
                <div class="header-cell">Duration</div>
                <div class="header-cell">Category</div>
                <div class="header-cell">Project</div>
            </div>
        `;
        
        tableHTML += filteredEntries
            .sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime))
            .map(entry => `
                <div class="entry-item">
                    <div class="entry-date">${entry.date}</div>
                    <div class="entry-time">${entry.startTime} - ${entry.endTime}</div>
                    <div class="entry-duration">${entry.duration.toFixed(1)}h</div>
                    <div class="entry-category category-${entry.category}">${entry.category.toUpperCase()}</div>
                    <div class="entry-project">${entry.project || 'No Project'}</div>
                </div>
            `).join('');
            
        container.innerHTML = tableHTML;
    } else {
        // Daily summary view - also as a table
        let tableHTML = `
            <div class="entries-table-header">
                <div class="header-cell">Date</div>
                <div class="header-cell">Day of Week</div>
                <div class="header-cell">Total Hours</div>
                <div class="header-cell">Categories</div>
            </div>
        `;
        
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
        
        tableHTML += Object.entries(dailyTotals)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, data]) => `
                <div class="entry-item">
                    <div class="entry-date">${date}</div>
                    <div class="entry-day">${new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div class="entry-duration">${data.hours.toFixed(1)}h</div>
                    <div class="entry-categories">
                        ${Array.from(data.categories).map(cat => 
                            `<span class="entry-category category-${cat}">${cat.toUpperCase()}</span>`
                        ).join(' ')}
                    </div>
                </div>
            `).join('');
            
        container.innerHTML = tableHTML;
    }
}

function setView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
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
        csvContent += `Period,"${selectedPayPeriod.startDate} to ${selectedPayPeriod.endDate}"\n`;
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
            document.getElementById('employeeName').value = parsed.employeeName || '';
            document.getElementById('dailyTarget').value = parsed.dailyTarget || '8';
            
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
        document.getElementById('employeeName').value = '';
        document.getElementById('dailyTarget').value = '8';
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
    timerButton.textContent = 'Start';
    timerButton.classList.remove('stop');
    timerButton.disabled = false;
    updateDisplay();
}

function showRecoveryModal(savedState) {
    const now = new Date();
    const savedStart = new Date(savedState.startTime);
    const elapsedHours = ((now - savedStart) / 3600000).toFixed(2);
    
    if (savedState.dailyTarget) {
        document.getElementById('dailyTarget').value = savedState.dailyTarget;
    }
    
    const modal = document.createElement('div');
    modal.className = 'recovery-modal';
    modal.innerHTML = `
        <div class="recovery-content">
            <h3>🔄 Incomplete Time Session Detected</h3>
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
                    💾 Save As-Is
                </button>
                <button class="recovery-btn btn-adjust" onclick="showAdjustSection()">
                    ⏰ Adjust Time
                </button>
                <button class="recovery-btn btn-discard" onclick="recoverSession('discard')">
                    🗑️ Discard
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store state for recovery
    window.pendingRecoveryState = savedState;
}

function showAdjustSection() {
    document.getElementById('adjustSection').classList.add('show');
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
    modal.remove();
    
    const timerButton = document.getElementById('timerButton');
    timerButton.textContent = 'Start';
    timerButton.classList.remove('stop');
    timerButton.disabled = false;
    
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
    warning.innerHTML = `🎯 Daily target of ${targetHours}h reached! Current: ${currentHours.toFixed(1)}h`;
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
    warning.innerHTML = '⚠️ It\'s past 6:00 PM - Don\'t forget to stop your timer!';
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