/*
Time Tracker Functions v1.1.7
Author: Philippe Addelia
Company: NAKUPUNA CONSULTING
Created: August 17, 2025 PST
Modified: August 18, 2025 PST
Preferred location: Modules\Time Tracker\time_tracker_functions.js
Purpose: JavaScript functionality for Employee Time Tracker - CSV Configuration Version
*/

// Company Configuration
const COMPANY_CONFIG = {
    "companyName": "NAKUPUNA CONSULTING",
    "companyLogoPath": "Company_logo.png",
    "defaultCSVFile": "pay_periods_2025.csv",
    "fallbackCSVFile": "pay_periods_2026.csv"
};

// Global state variables
let isTracking = false;
let startTime = null;
let timerInterval = null;
let timeEntries = [];
let warningShown = false;
let currentView = 'detailed';
let payPeriodsConfig = null;
let selectedPayPeriod = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Time tracker v1.1.7 initializing...');
    loadData();
    loadPayPeriodsConfig();
    setupEventListeners();
    setupBeforeUnload();
    checkForIncompleteSession();
    console.log('Time tracker initialization complete');
});

// ============================================================================
// CSV CONFIGURATION MANAGEMENT
// ============================================================================

async function loadPayPeriodsConfig() {
    try {
        // First check localStorage for saved config
        const savedConfig = localStorage.getItem('payPeriodsConfig');
        const savedConfigName = localStorage.getItem('payPeriodsConfigName');
        
        if (savedConfig) {
            payPeriodsConfig = JSON.parse(savedConfig);
            if (savedConfigName && document.getElementById('currentConfigName')) {
                document.getElementById('currentConfigName').textContent = savedConfigName;
            }
            populatePayPeriods();
            setDefaultPeriod();
            console.log('Loaded saved configuration:', savedConfigName);
            return;
        }
        
        // Try to auto-load default CSV file
        console.log('Attempting to load default CSV:', COMPANY_CONFIG.defaultCSVFile);
        await loadDefaultCSVFile(COMPANY_CONFIG.defaultCSVFile);
        
    } catch (error) {
        console.log('Could not auto-load CSV, using built-in defaults');
        loadBuiltInDefaults();
    }
}

async function loadDefaultCSVFile(filename) {
    try {
        const response = await fetch(filename);
        if (response.ok) {
            const csvText = await response.text();
            const configName = filename.includes('2025') ? '2025 Pay Periods' : 
                              filename.includes('2026') ? '2026 Pay Periods' : 
                              'Custom Pay Periods';
            parsePayPeriodsCSV(csvText, configName);
            console.log('Successfully loaded CSV file:', filename);
        } else {
            throw new Error('File not found: ' + filename);
        }
    } catch (error) {
        console.error('Error loading CSV file:', error);
        throw error;
    }
}

function parsePayPeriodsCSV(csvContent, configName = 'Custom Configuration') {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('Invalid CSV file: No data found');
        }

        const periods = [];
        
        // Parse CSV lines (skip header)
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 6) {
                periods.push({
                    id: values[0].trim(),
                    description: values[1].trim(),
                    periodStart: values[2].trim(),
                    periodEnd: values[3].trim(),
                    timesheetDue: values[4].trim(),
                    payDay: values[5].trim()
                });
            }
        }

        if (periods.length > 0) {
            payPeriodsConfig = { payPeriods: periods };
            localStorage.setItem('payPeriodsConfig', JSON.stringify(payPeriodsConfig));
            localStorage.setItem('payPeriodsConfigName', configName);
            
            if (document.getElementById('currentConfigName')) {
                document.getElementById('currentConfigName').textContent = configName;
            }
            
            populatePayPeriods();
            setDefaultPeriod();
            console.log(`Loaded ${periods.length} pay periods from CSV`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return false;
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function loadBuiltInDefaults() {
    // Built-in default pay periods as fallback
    payPeriodsConfig = {
        payPeriods: [
            {
                id: "2025-15",
                description: "Pay Period 15 - Aug 2-15, 2025",
                periodStart: "2025-08-02",
                periodEnd: "2025-08-15",
                timesheetDue: "2025-08-15",
                payDay: "2025-08-22"
            },
            {
                id: "2025-16",
                description: "Pay Period 16 - Aug 16-29, 2025",
                periodStart: "2025-08-16",
                periodEnd: "2025-08-29",
                timesheetDue: "2025-08-29",
                payDay: "2025-09-05"
            },
            {
                id: "2025-17",
                description: "Pay Period 17 - Aug 30 - Sep 15, 2025",
                periodStart: "2025-08-30",
                periodEnd: "2025-09-15",
                timesheetDue: "2025-09-15",
                payDay: "2025-09-22"
            },
            {
                id: "2025-18",
                description: "Pay Period 18 - Sep 16-30, 2025",
                periodStart: "2025-09-16",
                periodEnd: "2025-09-30",
                timesheetDue: "2025-09-30",
                payDay: "2025-10-07"
            }
        ]
    };
    
    localStorage.setItem('payPeriodsConfigName', 'Built-in Defaults');
    if (document.getElementById('currentConfigName')) {
        document.getElementById('currentConfigName').textContent = 'Built-in Defaults';
    }
    populatePayPeriods();
    setDefaultPeriod();
    console.log('Using built-in default pay periods');
}

function populatePayPeriods() {
    const select = document.getElementById('payPeriodSelect');
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '<option value="">Select Pay Period</option>';
    
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        payPeriodsConfig.payPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period.id;
            option.textContent = period.description;
            select.appendChild(option);
        });
        console.log(`Populated ${payPeriodsConfig.payPeriods.length} pay periods in dropdown`);
    }
}

function setSelectedPayPeriod() {
    const selectElement = document.getElementById('payPeriodSelect');
    if (!selectElement) return;
    
    const selectedId = selectElement.value;
    
    if (!selectedId) {
        selectedPayPeriod = null;
        document.getElementById('payPeriodInfo').style.display = 'none';
        return;
    }
    
    selectedPayPeriod = payPeriodsConfig.payPeriods.find(p => p.id === selectedId);
    
    if (selectedPayPeriod) {
        document.getElementById('periodStart').value = selectedPayPeriod.periodStart;
        document.getElementById('periodEnd').value = selectedPayPeriod.periodEnd;
        updatePayPeriodInfo();
        document.getElementById('payPeriodInfo').style.display = 'grid';
    }
    
    updateDisplay();
}

function updatePayPeriodInfo() {
    if (!selectedPayPeriod) return;
    
    const today = new Date();
    const endDate = new Date(selectedPayPeriod.periodEnd);
    const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    
    document.getElementById('periodRange').textContent = 
        `${selectedPayPeriod.periodStart} to ${selectedPayPeriod.periodEnd}`;
    document.getElementById('timesheetDue').textContent = selectedPayPeriod.timesheetDue;
    document.getElementById('payDay').textContent = selectedPayPeriod.payDay;
    document.getElementById('daysRemaining').textContent = daysRemaining;
}

function setDefaultPeriod() {
    const today = new Date().toISOString().split('T')[0];
    
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        // Find current pay period
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            return today >= period.periodStart && today <= period.periodEnd;
        });
        
        if (currentPeriod) {
            const selectElement = document.getElementById('payPeriodSelect');
            if (selectElement) {
                selectElement.value = currentPeriod.id;
                setSelectedPayPeriod();
                console.log('Auto-selected current pay period:', currentPeriod.description);
            }
        } else {
            // If no current period, select the most recent or upcoming one
            const futurePeriods = payPeriodsConfig.payPeriods.filter(p => p.periodStart > today);
            if (futurePeriods.length > 0) {
                const selectElement = document.getElementById('payPeriodSelect');
                if (selectElement) {
                    selectElement.value = futurePeriods[0].id;
                    setSelectedPayPeriod();
                }
            }
        }
    }
}

// ============================================================================
// EVENT LISTENERS AND SETUP
// ============================================================================

function setupEventListeners() {
    const employeeNameEl = document.getElementById('employeeName');
    const dailyTargetEl = document.getElementById('dailyTarget');
    const periodStartEl = document.getElementById('periodStart');
    const periodEndEl = document.getElementById('periodEnd');
    
    if (employeeNameEl) employeeNameEl.addEventListener('input', saveData);
    if (dailyTargetEl) dailyTargetEl.addEventListener('input', saveData);
    if (periodStartEl) periodStartEl.addEventListener('change', updateDisplay);
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
    
    timeEntries.push(entry);
    
    clearInterval(timerInterval);
    
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
    updateDisplay();
    clearTrackingState();
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
    
    // Check for daily target warning
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
}

// ============================================================================
// DISPLAY UPDATE FUNCTIONS
// ============================================================================

function updateDisplay() {
    updateStats();
    updateDailyCounter();
    updateEntriesList();
    if (selectedPayPeriod) {
        updatePayPeriodInfo();
    }
}

function updateStats() {
    const filteredEntries = getFilteredEntries();
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const workDays = new Set(filteredEntries.map(entry => entry.date)).size;
    
    let periodDays = 0;
    let daysElapsed = 0;
    
    if (selectedPayPeriod) {
        const start = new Date(selectedPayPeriod.periodStart);
        const end = new Date(selectedPayPeriod.periodEnd);
        const today = new Date();
        
        periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        if (today >= start && today <= end) {
            daysElapsed = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
        } else if (today > end) {
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
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time Period</th>
                    <th>Duration</th>
                    <th>Category</th>
                    <th>Project</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const sortedEntries = filteredEntries.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.startTime.localeCompare(a.startTime);
    });
    
    sortedEntries.forEach(entry => {
        tableHTML += `
            <tr id="entry-${entry.id}">
                <td><strong>${entry.date}</strong></td>
                <td>${entry.startTime} - ${entry.endTime}</td>
                <td><strong>${entry.duration.toFixed(1)}h</strong></td>
                <td><span class="category-badge category-${entry.category}">${entry.category.toUpperCase()}</span></td>
                <td>${entry.project || 'No Project'}</td>
                <td class="actions-cell">
                    <button class="action-button edit-btn" onclick="editEntry(${entry.id})">✏️ Edit</button>
                    <button class="action-button delete-btn" onclick="deleteEntry(${entry.id})">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function showDailySummaryView(container, filteredEntries) {
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
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function setView(view, event) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    updateEntriesList();
}

function getFilteredEntries() {
    if (selectedPayPeriod) {
        return timeEntries.filter(entry => {
            return entry.date >= selectedPayPeriod.periodStart && 
                   entry.date <= selectedPayPeriod.periodEnd;
        });
    }
    
    const periodStart = document.getElementById('periodStart').value;
    const periodEnd = document.getElementById('periodEnd').value;
    
    if (periodStart && periodEnd) {
        return timeEntries.filter(entry => {
            return entry.date >= periodStart && entry.date <= periodEnd;
        });
    }
    
    return timeEntries;
}

// ============================================================================
// ENTRY MANAGEMENT FUNCTIONS
// ============================================================================

function editEntry(entryId) {
    const entry = timeEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    const row = document.getElementById(`entry-${entryId}`);
    if (!row) return;
    
    // Replace row with edit form
    row.innerHTML = `
        <td><input type="date" class="edit-input" value="${entry.date}" id="edit-date-${entryId}"></td>
        <td>
            <input type="time" class="edit-input" value="${entry.startTime}" id="edit-start-${entryId}" style="width: 70px;">
            -
            <input type="time" class="edit-input" value="${entry.endTime}" id="edit-end-${entryId}" style="width: 70px;">
        </td>
        <td><input type="number" class="edit-input" value="${entry.duration}" step="0.1" min="0" id="edit-duration-${entryId}" style="width: 80px;"></td>
        <td>
            <select class="edit-input" id="edit-category-${entryId}">
                <option value="work" ${entry.category === 'work' ? 'selected' : ''}>Work</option>
                <option value="overhead" ${entry.category === 'overhead' ? 'selected' : ''}>Overhead</option>
                <option value="travel" ${entry.category === 'travel' ? 'selected' : ''}>Travel</option>
                <option value="pto" ${entry.category === 'pto' ? 'selected' : ''}>PTO</option>
                <option value="sick" ${entry.category === 'sick' ? 'selected' : ''}>Sick</option>
                <option value="holiday" ${entry.category === 'holiday' ? 'selected' : ''}>Holiday</option>
                <option value="bereavement" ${entry.category === 'bereavement' ? 'selected' : ''}>Bereavement</option>
                <option value="jury" ${entry.category === 'jury' ? 'selected' : ''}>Jury Duty</option>
            </select>
        </td>
        <td><input type="text" class="edit-input" value="${entry.project || ''}" placeholder="Project name" id="edit-project-${entryId}"></td>
        <td class="actions-cell">
            <button class="action-button save-btn" onclick="saveEntry(${entryId})">💾 Save</button>
            <button class="action-button cancel-btn" onclick="cancelEdit()">❌ Cancel</button>
        </td>
    `;
}

function saveEntry(entryId) {
    const entry = timeEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    // Get updated values
    entry.date = document.getElementById(`edit-date-${entryId}`).value;
    entry.startTime = document.getElementById(`edit-start-${entryId}`).value;
    entry.endTime = document.getElementById(`edit-end-${entryId}`).value;
    entry.duration = parseFloat(document.getElementById(`edit-duration-${entryId}`).value);
    entry.category = document.getElementById(`edit-category-${entryId}`).value;
    entry.project = document.getElementById(`edit-project-${entryId}`).value || 'No Project';
    
    saveData();
    updateDisplay();
    showTemporaryMessage('Entry updated successfully!', 'success');
}

function cancelEdit() {
    updateEntriesList();
}

function deleteEntry(entryId) {
    if (confirm('Are you sure you want to delete this entry?')) {
        timeEntries = timeEntries.filter(e => e.id !== entryId);
        saveData();
        updateDisplay();
        showTemporaryMessage('Entry deleted successfully!', 'success');
    }
}

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

function exportToCSV() {
    const employeeName = document.getElementById('employeeName').value || 'Employee';
    const filteredEntries = getFilteredEntries();
    
    if (filteredEntries.length === 0) {
        alert('No data to export for the selected period.');
        return;
    }
    
    let csvContent = `Employee Name,Date,Category,Project,Start Time,End Time,Duration (Hours)\n`;
    
    filteredEntries
        .sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime))
        .forEach(entry => {
            csvContent += `"${employeeName}","${entry.date}","${entry.category}","${entry.project}","${entry.startTime}","${entry.endTime}",${entry.duration}\n`;
        });
    
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
                parseTimeEntriesCSV(e.target.result);
            } catch (error) {
                alert('Error reading CSV file: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function parseTimeEntriesCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid.');
        return;
    }
    
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= 7) {
            const entry = {
                id: Date.now() + Math.random(),
                date: values[1].trim(),
                category: values[2].trim() || 'work',
                project: values[3].trim() || 'No Project',
                startTime: values[4].trim(),
                endTime: values[5].trim(),
                duration: parseFloat(values[6]) || 0
            };
            
            if (entry.date && entry.startTime && entry.endTime && entry.duration > 0) {
                timeEntries.push(entry);
                importedCount++;
            }
        }
    }
    
    if (importedCount > 0) {
        saveData();
        updateDisplay();
        showTemporaryMessage(`Successfully imported ${importedCount} time entries.`, 'success');
    } else {
        alert('No valid entries found in the CSV file.');
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to clear ALL time tracking data? This cannot be undone.')) {
        timeEntries = [];
        saveData();
        updateDisplay();
        showTemporaryMessage('All data has been cleared.', 'info');
    }
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function saveData() {
    try {
        const dataToSave = {
            employeeName: document.getElementById('employeeName').value,
            dailyTarget: document.getElementById('dailyTarget').value,
            periodStart: document.getElementById('periodStart')?.value || '',
            periodEnd: document.getElementById('periodEnd')?.value || '',
            timeEntries: timeEntries
        };
        
        localStorage.setItem('timeTrackerData', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadData() {
    try {
        const data = localStorage.getItem('timeTrackerData');
        if (data) {
            const parsed = JSON.parse(data);
            
            if (document.getElementById('employeeName')) {
                document.getElementById('employeeName').value = parsed.employeeName || '';
            }
            if (document.getElementById('dailyTarget')) {
                document.getElementById('dailyTarget').value = parsed.dailyTarget || '8';
            }
            if (document.getElementById('periodStart')) {
                document.getElementById('periodStart').value = parsed.periodStart || '';
            }
            if (document.getElementById('periodEnd')) {
                document.getElementById('periodEnd').value = parsed.periodEnd || '';
            }
            
            timeEntries = parsed.timeEntries || [];
        }
    } catch (error) {
        console.error('Error loading data:', error);
        timeEntries = [];
    }
}

function saveTrackingState() {
    try {
        if (!isTracking || !startTime) return;
        
        const state = {
            isTracking: true,
            startTime: startTime.toISOString(),
            category: document.getElementById('categorySelect').value,
            project: document.getElementById('projectInput').value || 'No Project',
            dailyTarget: document.getElementById('dailyTarget').value
        };
        
        localStorage.setItem('timeTrackerState', JSON.stringify(state));
    } catch (error) {
        console.error('Error saving tracking state:', error);
    }
}

function clearTrackingState() {
    try {
        localStorage.removeItem('timeTrackerState');
    } catch (error) {
        console.error('Error clearing tracking state:', error);
    }
}

function checkForIncompleteSession() {
    try {
        const state = localStorage.getItem('timeTrackerState');
        if (state) {
            const savedState = JSON.parse(state);
            if (savedState && savedState.isTracking) {
                recoverIncompleteSession(savedState);
                return;
            }
        }
    } catch (error) {
        console.error('Error checking incomplete session:', error);
    }
    
    updateDisplay();
}

function recoverIncompleteSession(savedState) {
    const savedStart = new Date(savedState.startTime);
    const now = new Date();
    const elapsedHours = ((now - savedStart) / 3600000).toFixed(2);
    
    if (confirm(`Incomplete session detected!\n\nStarted: ${formatDateTime(savedStart)}\nElapsed: ${elapsedHours} hours\n\nWould you like to save this session?`)) {
        const entry = {
            id: Date.now(),
            date: formatDate(savedStart),
            category: savedState.category,
            project: savedState.project || 'No Project',
            startTime: formatTime(savedStart),
            endTime: formatTime(now),
            duration: parseFloat(elapsedHours)
        };
        
        timeEntries.push(entry);
        saveData();
    }
    
    clearTrackingState();
    updateDisplay();
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

function showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `temporary-message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

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

// ============================================================================
// GLOBAL FUNCTION EXPORTS
// ============================================================================

// Make functions available globally for HTML onclick handlers
window.toggleTimer = toggleTimer;
window.setSelectedPayPeriod = setSelectedPayPeriod;
window.setView = setView;
window.exportToCSV = exportToCSV;
window.importCSV = importCSV;
window.clearAllData = clearAllData;
window.editEntry = editEntry;
window.saveEntry = saveEntry;
window.cancelEdit = cancelEdit;
window.deleteEntry = deleteEntry;

console.log('Time Tracker Functions v1.1.7 loaded successfully');