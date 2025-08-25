/*
Time Tracker Functions v1.1.10
Author: Philippe Addelia
Company: CAND, LLC
Created: August 17, 2025 PST
Modified: August 24, 2025 PST
Preferred location: Modules\Time Tracker\time_tracker_functions.js
Purpose: JavaScript functionality for Employee Time Tracker - Complete Unified Version
*/

// Company Configuration
const COMPANY_CONFIG = {
    "companyName": "CAND, LLC",
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

// Admin variables
let currentMode = 'employee';
let allTimeEntries = [];
let employeeEntries = [];
let filteredEntries = [];
let employees = new Set();
let projects = new Set();
let categories = new Set();
let duplicateCount = 0;
let invalidCount = 0;
let storedCredential = null;
let isAdminAuthenticated = false;

// Timer variables
let timerRunning = false;
let timerStart = null;

// Application configuration
let appConfig = {
    companyName: 'CAND, LLC',
    allowEdit: true,
    allowDelete: true,
    allowEmployeeEdit: true,
    allowEmployeeDelete: true,
    isLicensed: false,
    licensedCompany: '',
    licenseKey: ''
};

// Default Pay Periods Configuration
const DEFAULT_PAY_PERIODS_CONFIG = {
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
    ]
};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Time tracker v1.1.10 initializing...');
    
    // Set current mode to employee by default
    currentMode = 'employee';
    
    // Ensure employee section is visible by default - FORCE IT
    const employeeSection = document.getElementById('employeeSection');
    if (employeeSection) {
        employeeSection.style.display = 'block';
        employeeSection.classList.add('active');
        console.log('Employee section forced visible');
    } else {
        console.error('Employee section not found!');
    }
    
    // Hide other sections
    const adminSection = document.getElementById('adminSection');
    const webauthnSection = document.getElementById('webauthnEnrollment');
    if (adminSection) {
        adminSection.style.display = 'none';
        adminSection.classList.remove('active');
    }
    if (webauthnSection) {
        webauthnSection.style.display = 'none';
        webauthnSection.classList.remove('active');
    }
    
    // Force a clean start by removing any existing titles
    const headerTopRow = document.querySelector('.header-top-row');
    if (headerTopRow) {
        const existingEmployee = headerTopRow.querySelector('.employee-title');
        const existingAdmin = headerTopRow.querySelector('.admin-title');
        if (existingEmployee) existingEmployee.remove();
        if (existingAdmin) existingAdmin.remove();
    }
    
    loadAppConfiguration();
    loadPayPeriodsConfig();
    loadPersistedData();
    loadEmployeeSettings();
    
    // Set initial employee mode styling
    updateModeIndicator('employee');
    
    // Check for admin access after everything else is set up
    checkAdminAccess();
    
    updateDisplay();
    updateEmployeeDisplay();
    setTodayDate();
    
    // Add escape key handler for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Setup timer interval
    updateTimerDisplay();
    
    // Save employee name on change
    const employeeNameInput = document.getElementById('employeeName');
    if (employeeNameInput) {
        employeeNameInput.addEventListener('blur', saveEmployeeSettings);
        employeeNameInput.addEventListener('input', saveEmployeeSettings);
    }
    
    console.log('Time tracker initialization complete');
    console.log('Current mode:', currentMode);
    console.log('Employee section classes:', employeeSection ? employeeSection.className : 'not found');
    console.log('Employee section style:', employeeSection ? employeeSection.style.display : 'not found');
});

// ============================================================================
// EMPLOYEE SETTINGS MANAGEMENT
// ============================================================================

function loadEmployeeSettings() {
    try {
        const settings = localStorage.getItem('employeeSettings');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.employeeName) {
                const nameInput = document.getElementById('employeeName');
                if (nameInput) {
                    nameInput.value = parsed.employeeName;
                }
            }
        }
    } catch (error) {
        console.error('Error loading employee settings:', error);
    }
}

function saveEmployeeSettings() {
    try {
        const employeeNameInput = document.getElementById('employeeName');
        if (!employeeNameInput) return;
        
        const employeeName = employeeNameInput.value.trim();
        const settings = {
            employeeName: employeeName,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('employeeSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving employee settings:', error);
    }
}

// ============================================================================
// APPLICATION CONFIGURATION MANAGEMENT
// ============================================================================

function loadAppConfiguration() {
    try {
        const savedConfig = localStorage.getItem('adminAppConfig');
        if (savedConfig) {
            const loaded = JSON.parse(savedConfig);
            appConfig = Object.assign({}, appConfig, loaded);
        }
        applyConfiguration();
    } catch (error) {
        console.error('Error loading app configuration:', error);
    }
}

function saveAppConfiguration() {
    try {
        localStorage.setItem('adminAppConfig', JSON.stringify(appConfig));
    } catch (error) {
        console.error('Error saving app configuration:', error);
    }
}

function applyConfiguration() {
    updateDisplay();
    updateLicenseWatermark();
    
    // Update page title if company name changed
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const currentTitle = pageTitle.textContent;
        if (currentTitle.includes('Employee')) {
            pageTitle.textContent = 'Employee Time Tracker v1.1.10';
        } else if (currentTitle.includes('Admin')) {
            pageTitle.textContent = 'Time Tracker Admin Console v1.1.10';
        }
    }
}

function updateDisplay() {
    // Determine display name - licensed company name takes priority
    const displayName = appConfig.isLicensed && appConfig.licensedCompany 
        ? appConfig.licensedCompany 
        : (appConfig.companyName || 'CAND, LLC');
        
    const companyDisplay = document.getElementById('companyNameDisplay');
    if (companyDisplay) {
        companyDisplay.textContent = displayName;
    }
    
    updateLicenseWatermark();
    console.log('Display updated with company name:', displayName);
}

function updateModeIndicator(mode) {
    const indicator = document.getElementById('modeIndicator');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const employeeControls = document.getElementById('employeeControls');
    const headerTopRow = document.querySelector('.header-top-row');
    const header = document.querySelector('.header');
    
    if (!indicator) return;
    
    switch(mode) {
        case 'admin':
            indicator.textContent = 'Admin Mode';
            indicator.className = 'mode-indicator admin';
            indicator.style.display = 'block';
            if (headerSubtitle) {
                headerSubtitle.textContent = '';  // Clear any existing text
                headerSubtitle.style.display = 'none';
            }
            if (employeeControls) employeeControls.style.display = 'none';
            if (headerTopRow) {
                headerTopRow.className = 'header-top-row admin-mode';
                
                // Remove existing titles
                const existingEmployee = headerTopRow.querySelector('.employee-title');
                const existingAdmin = headerTopRow.querySelector('.admin-title');
                if (existingEmployee) existingEmployee.remove();
                if (existingAdmin) existingAdmin.remove();
                
                // Add centered admin title
                const adminTitle = document.createElement('div');
                adminTitle.className = 'admin-title';
                adminTitle.textContent = 'Admin Console';
                headerTopRow.appendChild(adminTitle);
            }
            if (header) {
                header.classList.remove('employee-header');
                header.classList.add('admin-header');
            }
            break;
        case 'enrollment':
            indicator.textContent = 'Admin Setup';
            indicator.className = 'mode-indicator admin';
            indicator.style.display = 'block';
            if (headerSubtitle) {
                headerSubtitle.textContent = '';  // Clear any existing text
                headerSubtitle.style.display = 'none';
            }
            if (employeeControls) employeeControls.style.display = 'none';
            if (headerTopRow) {
                headerTopRow.className = 'header-top-row admin-mode';
                
                // Remove existing titles
                const existingEmployee = headerTopRow.querySelector('.employee-title');
                const existingAdmin = headerTopRow.querySelector('.admin-title');
                if (existingEmployee) existingEmployee.remove();
                if (existingAdmin) existingAdmin.remove();
                
                // Add centered enrollment title
                const enrollmentTitle = document.createElement('div');
                enrollmentTitle.className = 'admin-title';
                enrollmentTitle.textContent = 'Admin Enrollment';
                headerTopRow.appendChild(enrollmentTitle);
            }
            if (header) {
                header.classList.remove('employee-header');
                header.classList.add('admin-header');
            }
            break;
        default:
            // Employee mode - hide indicator and subtitle, add centered title
            indicator.style.display = 'none';
            if (headerSubtitle) {
                headerSubtitle.textContent = '';  // Clear any existing text
                headerSubtitle.style.display = 'none';
            }
            if (employeeControls) {
                employeeControls.style.display = 'grid';
                console.log('Employee controls should be visible');
            }
            if (headerTopRow) {
                headerTopRow.className = 'header-top-row employee-mode';
                
                // Remove existing titles
                const existingEmployee = headerTopRow.querySelector('.employee-title');
                const existingAdmin = headerTopRow.querySelector('.admin-title');
                if (existingEmployee) existingEmployee.remove();
                if (existingAdmin) existingAdmin.remove();
                
                // Add centered employee title
                const employeeTitle = document.createElement('div');
                employeeTitle.className = 'employee-title';
                employeeTitle.textContent = 'Employee Time Tracker';
                headerTopRow.appendChild(employeeTitle);
            }
            if (header) {
                header.classList.remove('admin-header');
                header.classList.add('employee-header');
            }
    }
    
    console.log(`Mode indicator updated to: ${mode}`);
    console.log('Employee controls display:', employeeControls ? employeeControls.style.display : 'not found');
}

// ============================================================================
// PAY PERIODS CONFIGURATION
// ============================================================================

function loadPayPeriodsConfig() {
    try {
        const savedConfig = localStorage.getItem('payPeriodsConfig');
        const savedConfigName = localStorage.getItem('payPeriodsConfigName');
        
        if (savedConfig) {
            payPeriodsConfig = JSON.parse(savedConfig);
            if (savedConfigName) {
                const configNameEl = document.getElementById('currentConfigName');
                if (configNameEl) {
                    configNameEl.textContent = savedConfigName;
                }
            }
        } else {
            payPeriodsConfig = DEFAULT_PAY_PERIODS_CONFIG;
            localStorage.setItem('payPeriodsConfigName', 'Default 2025 Pay Periods');
        }
        
        populatePayPeriods();
        setDefaultPeriod();
        console.log('Pay periods config loaded:', payPeriodsConfig);
    } catch (error) {
        console.error('Error loading pay periods config:', error);
        payPeriodsConfig = DEFAULT_PAY_PERIODS_CONFIG;
        populatePayPeriods();
        setDefaultPeriod();
    }
}

function populatePayPeriods() {
    const employeeSelect = document.getElementById('payPeriodSelect');
    const adminSelect = document.getElementById('payPeriodFilter');
    
    if (employeeSelect) {
        employeeSelect.innerHTML = '<option value="">Select Pay Period</option>';
        
        if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
            payPeriodsConfig.payPeriods.forEach(function(period) {
                const option = document.createElement('option');
                option.value = period.id;
                option.textContent = period.description;
                employeeSelect.appendChild(option);
            });
        }
        console.log('Populated employee pay periods:', employeeSelect.options.length - 1);
    }
    
    if (adminSelect) {
        adminSelect.innerHTML = '<option value="">All Pay Periods</option>';
        
        if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
            payPeriodsConfig.payPeriods.forEach(function(period) {
                const option = document.createElement('option');
                option.value = period.id;
                option.textContent = period.description;
                adminSelect.appendChild(option);
            });
        }
        console.log('Populated admin pay periods:', adminSelect.options.length - 1);
    }
}

function setSelectedPayPeriod() {
    const select = document.getElementById('payPeriodSelect');
    if (!select || !payPeriodsConfig || !payPeriodsConfig.payPeriods) {
        console.log('Pay period selection failed - missing elements');
        return;
    }
    
    const selectedId = select.value;
    console.log('Selected pay period ID:', selectedId);
    
    if (!selectedId) {
        selectedPayPeriod = null;
        const info = document.getElementById('payPeriodInfo');
        if (info) {
            info.style.display = 'none';
        }
        return;
    }
    
    selectedPayPeriod = payPeriodsConfig.payPeriods.find(p => p.id === selectedId);
    console.log('Found pay period:', selectedPayPeriod);
    
    if (selectedPayPeriod) {
        // Update date inputs
        const periodStart = document.getElementById('periodStart');
        const periodEnd = document.getElementById('periodEnd');
        
        if (periodStart) periodStart.value = selectedPayPeriod.periodStart;
        if (periodEnd) periodEnd.value = selectedPayPeriod.periodEnd;
        
        // Show pay period info
        const info = document.getElementById('payPeriodInfo');
        if (info) {
            const periodRange = document.getElementById('periodRange');
            const timesheetDue = document.getElementById('timesheetDue');
            const payDay = document.getElementById('payDay');
            const daysRemaining = document.getElementById('daysRemaining');
            
            if (periodRange) {
                periodRange.textContent = `${selectedPayPeriod.periodStart} to ${selectedPayPeriod.periodEnd}`;
            }
            if (timesheetDue) {
                timesheetDue.textContent = selectedPayPeriod.timesheetDue;
            }
            if (payDay) {
                payDay.textContent = selectedPayPeriod.payDay;
            }
            if (daysRemaining) {
                // Calculate days remaining
                const dueDate = new Date(selectedPayPeriod.timesheetDue);
                const today = new Date();
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysRemaining.textContent = diffDays > 0 ? diffDays : 0;
            }
            
            info.style.display = 'grid';
        }
        
        updateEmployeeDisplay();
    }
}

function setDefaultPeriod() {
    const today = new Date().toISOString().split('T')[0];
    
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        // Find current pay period
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            return today >= period.periodStart && today <= period.periodEnd;
        });
        
        const selectElement = document.getElementById('payPeriodSelect');
        if (selectElement) {
            if (currentPeriod) {
                selectElement.value = currentPeriod.id;
                setSelectedPayPeriod();
                console.log('Auto-selected current pay period:', currentPeriod.description);
            } else {
                // If no current period, select the next upcoming one
                const futurePeriods = payPeriodsConfig.payPeriods.filter(p => p.periodStart > today);
                if (futurePeriods.length > 0) {
                    selectElement.value = futurePeriods[0].id;
                    setSelectedPayPeriod();
                    console.log('Auto-selected next pay period:', futurePeriods[0].description);
                } else {
                    // Ensure pay period info is hidden if no periods are available
                    const info = document.getElementById('payPeriodInfo');
                    if (info) {
                        info.style.display = 'none';
                    }
                }
            }
        }
    } else {
        // Ensure pay period info is hidden if no config is available
        const info = document.getElementById('payPeriodInfo');
        if (info) {
            info.style.display = 'none';
        }
    }
}

function parsePayPeriodsCSV(csvContent, configName = 'Custom Configuration') {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have header row and at least one data row');
        }
        
        const periods = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 6) {
                periods.push({
                    id: values[0].replace(/"/g, '').trim(),
                    description: values[1].replace(/"/g, '').trim(),
                    periodStart: values[2].replace(/"/g, '').trim(),
                    periodEnd: values[3].replace(/"/g, '').trim(),
                    timesheetDue: values[4].replace(/"/g, '').trim(),
                    payDay: values[5].replace(/"/g, '').trim()
                });
            }
        }
        
        if (periods.length > 0) {
            payPeriodsConfig = { payPeriods: periods };
            localStorage.setItem('payPeriodsConfig', JSON.stringify(payPeriodsConfig));
            localStorage.setItem('payPeriodsConfigName', configName);
            
            const configNameEl = document.getElementById('currentConfigName');
            if (configNameEl) {
                configNameEl.textContent = configName;
            }
            
            populatePayPeriods();
            setDefaultPeriod();
            console.log(`Loaded ${periods.length} pay periods from CSV`);
            return { payPeriods: periods };
        }
        
        throw new Error('No valid periods found in CSV');
    } catch (error) {
        console.error('Error parsing CSV:', error);
        throw error;
    }
}

function exportPayPeriodsConfig() {
    const configData = {
        version: '1.1.10',
        exportDate: new Date().toISOString(),
        payPeriodsConfig: payPeriodsConfig
    };
    
    const jsonStr = JSON.stringify(configData, null, 2);
    downloadFile(jsonStr, 'pay_periods_config_' + new Date().toISOString().split('T')[0] + '.json', 'application/json');
    showStatus('Pay periods configuration exported successfully', 'success');
}

function importPayPeriodsConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let configData;
            let configName = file.name.replace(/\.[^/.]+$/, "");
            
            if (file.name.endsWith('.csv')) {
                const csvContent = e.target.result;
                configData = parsePayPeriodsCSV(csvContent, configName);
            } else {
                configData = JSON.parse(e.target.result);
                if (configData.payPeriodsConfig) {
                    configData = configData.payPeriodsConfig;
                }
            }
            
            if (configData && configData.payPeriods && configData.payPeriods.length > 0) {
                payPeriodsConfig = configData;
                localStorage.setItem('payPeriodsConfig', JSON.stringify(payPeriodsConfig));
                localStorage.setItem('payPeriodsConfigName', configName);
                populatePayPeriods();
                setDefaultPeriod();
                
                showStatus(`Pay periods configuration imported successfully (${configData.payPeriods.length} periods loaded)`, 'success');
            } else {
                showStatus('Invalid pay periods configuration file', 'error');
            }
            
            event.target.value = '';
        } catch (error) {
            console.error('Error importing pay periods config:', error);
            showStatus('Error importing configuration: ' + error.message, 'error');
            event.target.value = '';
        }
    };
    
    reader.readAsText(file);
}

function downloadPayPeriodTemplate() {
    const templateCSV = 'ID,Description,Period Start,Period End,Timesheet Due,Pay Day\n' +
        '2025-01,"Pay Period 1 - Jan 1-15 2025",2025-01-01,2025-01-15,2025-01-15,2025-01-22\n' +
        '2025-02,"Pay Period 2 - Jan 16-31 2025",2025-01-16,2025-01-31,2025-01-31,2025-02-07\n' +
        '2025-03,"Pay Period 3 - Feb 1-15 2025",2025-02-01,2025-02-15,2025-02-15,2025-02-22';
    
    downloadFile(templateCSV, 'pay_periods_template.csv', 'text/csv');
    showStatus('Pay periods template downloaded', 'success');
}

// ============================================================================
// TIMER FUNCTIONALITY
// ============================================================================

function toggleTimer() {
    if (timerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    const employeeNameInput = document.getElementById('employeeName');
    if (!employeeNameInput) return;
    
    const employeeName = employeeNameInput.value.trim();
    
    if (!employeeName) {
        showStatus('Please enter your name before starting the timer', 'error');
        employeeNameInput.focus();
        return;
    }
    
    timerRunning = true;
    timerStart = new Date();
    
    const timerButton = document.getElementById('timerButton');
    if (timerButton) {
        timerButton.textContent = 'Stop';
        timerButton.classList.add('stop-state');
    }
    
    timerInterval = setInterval(updateTimerDisplay, 1000);
    showStatus('Timer started', 'success');
}

function stopTimer() {
    if (!timerRunning || !timerStart) return;
    
    timerRunning = false;
    const timerEnd = new Date();
    const duration = (timerEnd - timerStart) / (1000 * 60 * 60);
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerButton = document.getElementById('timerButton');
    if (timerButton) {
        timerButton.textContent = 'Start';
        timerButton.classList.remove('stop-state');
    }
    
    const employeeName = document.getElementById('employeeName').value.trim();
    const category = document.getElementById('categorySelect').value;
    const project = document.getElementById('projectInput').value.trim() || 'No Project';
    
    const entry = {
        id: Date.now() + Math.random(),
        employee: employeeName,
        date: new Date().toISOString().split('T')[0],
        category: category,
        project: project,
        startTime: timerStart.toTimeString().substring(0, 5),
        endTime: timerEnd.toTimeString().substring(0, 5),
        duration: Math.round(duration * 2) / 2,
        description: 'Timer entry',
        timestamp: new Date().toISOString(),
        source: 'timer'
    };
    
    employeeEntries.push(entry);
    allTimeEntries.push(entry);
    
    employees.add(entry.employee);
    projects.add(entry.project);
    categories.add(entry.category);
    
    saveTimeEntries();
    updateEmployeeDisplay();
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = '00:00:00';
    }
    
    showStatus(`Timer stopped. ${duration.toFixed(1)} hours logged for ${entry.project}`, 'success');
}

function updateTimerDisplay() {
    if (!timerRunning || !timerStart) return;
    
    const now = new Date();
    const elapsed = now - timerStart;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = 
            hours.toString().padStart(2, '0') + ':' +
            minutes.toString().padStart(2, '0') + ':' +
            seconds.toString().padStart(2, '0');
    }
}

// ============================================================================
// EMPLOYEE DISPLAY FUNCTIONS
// ============================================================================

function updateEmployeeDisplay() {
    updateEmployeeStats();
    updateEmployeeEntries();
}

function updateEmployeeStats() {
    const startDate = document.getElementById('periodStart')?.value;
    const endDate = document.getElementById('periodEnd')?.value;
    const currentEmployee = document.getElementById('employeeName')?.value.trim();
    
    let relevantEntries = employeeEntries.filter(entry => {
        if (currentEmployee && entry.employee !== currentEmployee) return false;
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
        return true;
    });
    
    const totalHours = relevantEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const uniqueDates = new Set(relevantEntries.map(entry => entry.date));
    const workDays = uniqueDates.size;
    
    let periodDays = 0;
    let daysElapsed = 0;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        
        periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        daysElapsed = Math.min(Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1, periodDays);
        daysElapsed = Math.max(0, daysElapsed);
    }
    
    // Update display elements
    const elements = {
        'totalHours': totalHours.toFixed(1),
        'periodDays': periodDays,
        'workDays': workDays,
        'daysElapsed': daysElapsed
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Update daily progress
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = relevantEntries.filter(entry => entry.date === today);
    const todayHours = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const dailyTarget = parseFloat(document.getElementById('dailyTarget')?.value) || 8;
    
    const dailyCounter = document.getElementById('dailyCounter');
    if (dailyCounter) {
        let displayHours = todayHours;
        
        // Add current timer session if running
        if (timerRunning && timerStart) {
            const currentSession = (new Date() - timerStart) / (1000 * 60 * 60);
            displayHours = todayHours + currentSession;
            dailyCounter.textContent = `${todayHours.toFixed(1)} (+${currentSession.toFixed(1)}) / ${dailyTarget.toFixed(1)}h`;
        } else {
            dailyCounter.textContent = `${todayHours.toFixed(1)} / ${dailyTarget.toFixed(1)}h`;
        }
    }
    
    const progressPercent = Math.min((todayHours / dailyTarget) * 100, 100);
    const progressFill = document.getElementById('progressFillSmall');
    if (progressFill) {
        progressFill.style.width = progressPercent + '%';
    }
}

function updateEmployeeEntries() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;
    
    const currentEmployee = document.getElementById('employeeName')?.value.trim();
    
    let relevantEntries = employeeEntries.filter(entry => {
        return !currentEmployee || entry.employee === currentEmployee;
    });
    
    relevantEntries.sort((a, b) => {
        return new Date(b.date) - new Date(a.date) || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
    
    if (relevantEntries.length === 0) {
        entriesList.innerHTML = '<div class="no-entries">No time entries found</div>';
        return;
    }
    
    const showEmployeeActions = appConfig.allowEmployeeEdit || appConfig.allowEmployeeDelete;
    
    let html = '<table class="data-table"><thead><tr><th>Date</th><th>Category</th><th>Project</th><th>Start</th><th>End</th><th>Hours</th><th>Description</th>';
    
    if (showEmployeeActions) {
        html += '<th>Actions</th>';
    }
    
    html += '</tr></thead><tbody>';
    
    relevantEntries.forEach(entry => {
        html += `<tr id="employee-entry-row-${entry.id}">
            <td>${entry.date}</td>
            <td>${entry.category}</td>
            <td>${entry.project}</td>
            <td>${entry.startTime || '-'}</td>
            <td>${entry.endTime || '-'}</td>
            <td>${entry.duration.toFixed(1)}</td>
            <td>${entry.description || '-'}</td>`;
        
        if (showEmployeeActions) {
            html += '<td><div class="action-buttons">';
            if (appConfig.allowEmployeeEdit) {
                html += `<button class="action-button edit" onclick="editEmployeeEntry('${entry.id}')">Edit</button>`;
            }
            if (appConfig.allowEmployeeDelete) {
                html += `<button class="action-button delete" onclick="deleteEmployeeEntry('${entry.id}')">Delete</button>`;
            }
            html += '</div></td>';
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    entriesList.innerHTML = html;
}

function setEmployeeView(viewType, event) {
    document.querySelectorAll('.view-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    if (viewType === 'daily') {
        showDailySummary();
    } else {
        updateEmployeeEntries();
    }
}

function showDailySummary() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;
    
    const currentEmployee = document.getElementById('employeeName')?.value.trim();
    
    let relevantEntries = employeeEntries.filter(entry => {
        return !currentEmployee || entry.employee === currentEmployee;
    });
    
    const dailyGroups = {};
    relevantEntries.forEach(entry => {
        if (!dailyGroups[entry.date]) {
            dailyGroups[entry.date] = [];
        }
        dailyGroups[entry.date].push(entry);
    });
    
    if (Object.keys(dailyGroups).length === 0) {
        entriesList.innerHTML = '<div class="no-entries">No time entries found</div>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Date</th><th>Total Hours</th><th>Entries</th><th>Projects</th></tr></thead><tbody>';
    
    Object.keys(dailyGroups).sort().reverse().forEach(date => {
        const dayEntries = dailyGroups[date];
        const totalHours = dayEntries.reduce((sum, entry) => sum + entry.duration, 0);
        const projects = Array.from(new Set(dayEntries.map(entry => entry.project))).join(', ');
        
        html += `<tr>
            <td>${date}</td>
            <td>${totalHours.toFixed(1)}</td>
            <td>${dayEntries.length}</td>
            <td>${projects}</td>
            </tr>`;
    });
    
    html += '</tbody></table>';
    entriesList.innerHTML = html;
}

// ============================================================================
// EMPLOYEE ENTRY MANAGEMENT
// ============================================================================

function editEmployeeEntry(entryId) {
    if (!appConfig.allowEmployeeEdit) {
        showStatus('Editing is currently disabled by administrator.', 'error');
        return;
    }
    
    const entry = employeeEntries.find(e => e.id == entryId);
    if (!entry) {
        showStatus('Entry not found', 'error');
        return;
    }
    
    const row = document.getElementById('employee-entry-row-' + entryId);
    if (!row) return;
    
    const showEmployeeActions = appConfig.allowEmployeeEdit || appConfig.allowEmployeeDelete;
    
    row.innerHTML = `
        <td><input type="date" class="edit-input" id="emp-edit-date-${entryId}" value="${entry.date}"></td>
        <td><select class="edit-input" id="emp-edit-category-${entryId}">
            <option value="work"${entry.category === 'work' ? ' selected' : ''}>Work</option>
            <option value="overhead"${entry.category === 'overhead' ? ' selected' : ''}>Overhead</option>
            <option value="travel"${entry.category === 'travel' ? ' selected' : ''}>Travel</option>
            <option value="pto"${entry.category === 'pto' ? ' selected' : ''}>PTO</option>
            <option value="sick"${entry.category === 'sick' ? ' selected' : ''}>Sick</option>
            <option value="holiday"${entry.category === 'holiday' ? ' selected' : ''}>Holiday</option>
            <option value="bereavement"${entry.category === 'bereavement' ? ' selected' : ''}>Bereavement</option>
            <option value="jury"${entry.category === 'jury' ? ' selected' : ''}>Jury</option>
        </select></td>
        <td><input type="text" class="edit-input" id="emp-edit-project-${entryId}" value="${entry.project}"></td>
        <td><input type="time" class="edit-input" id="emp-edit-start-${entryId}" value="${entry.startTime || ''}"></td>
        <td><input type="time" class="edit-input" id="emp-edit-end-${entryId}" value="${entry.endTime || ''}"></td>
        <td><input type="number" class="edit-input" id="emp-edit-duration-${entryId}" value="${entry.duration}" step="0.5"></td>
        <td><input type="text" class="edit-input" id="emp-edit-description-${entryId}" value="${entry.description || ''}"></td>
        ${showEmployeeActions ? `<td><div class="action-buttons">
            <button class="action-button" style="background: #28a745;" onclick="saveEmployeeEntry('${entryId}')">Save</button>
            <button class="action-button" style="background: #6c757d;" onclick="cancelEmployeeEdit('${entryId}')">Cancel</button>
        </div></td>` : ''}`;
}

function saveEmployeeEntry(entryId) {
    const entry = employeeEntries.find(e => e.id == entryId);
    const adminEntry = allTimeEntries.find(e => e.id == entryId);
    
    if (!entry) return;
    
    const newData = {
        date: document.getElementById('emp-edit-date-' + entryId)?.value,
        category: document.getElementById('emp-edit-category-' + entryId)?.value,
        project: document.getElementById('emp-edit-project-' + entryId)?.value,
        startTime: document.getElementById('emp-edit-start-' + entryId)?.value,
        endTime: document.getElementById('emp-edit-end-' + entryId)?.value,
        duration: parseFloat(document.getElementById('emp-edit-duration-' + entryId)?.value),
        description: document.getElementById('emp-edit-description-' + entryId)?.value
    };
    
    Object.assign(entry, newData);
    if (adminEntry) {
        Object.assign(adminEntry, newData);
    }
    
    projects.add(entry.project);
    categories.add(entry.category);
    
    saveTimeEntries();
    updateEmployeeDisplay();
    
    if (currentMode === 'admin') {
        refreshAdminData();
        updateAdminFilters();
    }
    
    showStatus('Entry updated successfully', 'success');
}

function cancelEmployeeEdit(entryId) {
    updateEmployeeEntries();
}

function deleteEmployeeEntry(entryId) {
    if (!appConfig.allowEmployeeDelete) {
        showStatus('Deleting is currently disabled by administrator.', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    employeeEntries = employeeEntries.filter(e => e.id != entryId);
    allTimeEntries = allTimeEntries.filter(e => e.id != entryId);
    filteredEntries = filteredEntries.filter(e => e.id != entryId);
    
    saveTimeEntries();
    updateEmployeeDisplay();
    
    if (currentMode === 'admin') {
        refreshAdminData();
        updateAdminFilters();
    }
    
    showStatus('Entry deleted successfully', 'success');
}

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

function exportToCSV() {
    const currentEmployee = document.getElementById('employeeName')?.value.trim();
    let relevantEntries = employeeEntries.filter(entry => {
        return !currentEmployee || entry.employee === currentEmployee;
    });
    
    if (relevantEntries.length === 0) {
        showStatus('No data to export', 'error');
        return;
    }
    
    let csv = 'Employee,Date,Category,Project,Start Time,End Time,Duration,Description\n';
    relevantEntries.forEach(entry => {
        csv += `"${entry.employee}","${entry.date}","${entry.category}","${entry.project}","${entry.startTime || ''}","${entry.endTime || ''}",${entry.duration},"${entry.description || ''}"\n`;
    });
    
    downloadFile(csv, `timesheet_${currentEmployee || 'employee'}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showStatus('Data exported successfully', 'success');
}

function importEmployeeCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    parseEmployeeCSV(event.target.result);
                    showStatus('CSV imported successfully', 'success');
                } catch (error) {
                    showStatus('Error importing CSV: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function parseEmployeeCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('Invalid CSV file');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    let importedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;
        
        const entry = {
            id: Date.now() + Math.random() + i,
            employee: values[0].replace(/"/g, '').trim(),
            date: values[1].replace(/"/g, '').trim(),
            category: values[2].replace(/"/g, '').trim(),
            project: values[3].replace(/"/g, '').trim(),
            startTime: values[4].replace(/"/g, '').trim(),
            endTime: values[5].replace(/"/g, '').trim(),
            duration: parseFloat(values[6]) || 0,
            description: values[7] ? values[7].replace(/"/g, '').trim() : '',
            timestamp: new Date().toISOString(),
            source: 'import'
        };
        
        employeeEntries.push(entry);
        allTimeEntries.push(entry);
        employees.add(entry.employee);
        projects.add(entry.project);
        categories.add(entry.category);
        importedCount++;
    }
    
    saveTimeEntries();
    updateEmployeeDisplay();
    
    if (currentMode === 'admin') {
        refreshAdminData();
    }
    
    showStatus(`Imported ${importedCount} entries`, 'success');
}

function clearAllEmployeeData() {
    if (employeeEntries.length === 0) {
        showStatus('No data to clear', 'info');
        return;
    }
    
    if (confirm(`Delete all ${employeeEntries.length} time entries? This cannot be undone.`)) {
        employeeEntries = [];
        allTimeEntries = [];
        employees.clear();
        projects.clear();
        categories.clear();
        
        saveTimeEntries();
        updateEmployeeDisplay();
        
        if (currentMode === 'admin') {
            refreshAdminData();
        }
        
        showStatus('All data cleared successfully', 'success');
    }
}

// ============================================================================
// ADMIN ACCESS MANAGEMENT
// ============================================================================

function checkAdminAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    const isAdminRequested = urlParams.has('setup') || 
                           hash === '#admin-setup' || 
                           urlParams.get('config') === 'x7k9m';
    
    if (isAdminRequested) {
        if (checkWebAuthnSupport()) {
            handleAdminAccess();
        } else {
            showStatus('WebAuthn not supported in this browser', 'error');
        }
    } else {
        // No admin access requested, ensure we stay in employee mode
        console.log('No admin access requested, staying in employee mode');
    }
}

async function handleAdminAccess() {
    const stored = localStorage.getItem('webauthnCredential');
    
    if (!stored) {
        showSection('webauthnEnrollment');
        updateModeIndicator('enrollment');
    } else {
        try {
            storedCredential = JSON.parse(stored);
            await authenticateAdmin();
        } catch (error) {
            console.error('Error loading credential:', error);
            showSection('webauthnEnrollment');
            updateModeIndicator('enrollment');
        }
    }
}

function showSection(sectionId) {
    // Hide all sections first
    document.querySelectorAll('.section').forEach(function(section) {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
        console.log('Showing section:', sectionId);
    } else {
        console.error('Section not found:', sectionId);
    }
}

// WebAuthn functions
function checkWebAuthnSupport() {
    return window.PublicKeyCredential !== undefined;
}

function generateRandomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function enrollAdminDevice() {
    const enrollBtn = document.getElementById('enrollBtn');
    if (enrollBtn) {
        enrollBtn.disabled = true;
        enrollBtn.textContent = 'Enrolling...';
    }

    try {
        showEnrollmentStatus('Setting up device authentication. Follow your browser prompts.', 'info');

        const challenge = generateRandomBytes(32);
        const userId = generateRandomBytes(16);

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: {
                    name: "Time Tracker Admin Panel",
                    id: location.hostname
                },
                user: {
                    id: userId,
                    name: "admin",
                    displayName: "Administrator"
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },
                    { alg: -257, type: "public-key" }
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                },
                timeout: 60000,
                attestation: "direct"
            }
        });

        // Store credential
        storedCredential = {
            id: credential.id,
            rawId: arrayBufferToBase64(credential.rawId),
            type: credential.type
        };

        localStorage.setItem('webauthnCredential', JSON.stringify(storedCredential));

        // Show success
        const enrollmentSuccess = document.getElementById('enrollmentSuccess');
        if (enrollmentSuccess) {
            enrollmentSuccess.style.display = 'block';
        }
        showEnrollmentStatus('Device enrolled successfully!', 'success');
        if (enrollBtn) {
            enrollBtn.textContent = 'Device Already Enrolled';
        }

    } catch (error) {
        console.error('Enrollment error:', error);
        showEnrollmentStatus('Enrollment failed: ' + (error.message || 'Unknown error'), 'error');
        if (enrollBtn) {
            enrollBtn.disabled = false;
            enrollBtn.textContent = 'Enroll This Device for Admin Access';
        }
    }
}

async function authenticateAdmin() {
    try {
        showStatus('Authenticate using your PIN or biometric authentication.', 'info');

        const challenge = generateRandomBytes(32);
        const credentialRawId = base64ToArrayBuffer(storedCredential.rawId);

        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: challenge,
                allowCredentials: [{
                    id: credentialRawId,
                    type: "public-key"
                }],
                userVerification: "required",
                timeout: 60000
            }
        });

        // Authentication successful
        isAdminAuthenticated = true;
        enterAdminMode();

    } catch (error) {
        console.error('Authentication error:', error);
        showStatus('Authentication failed: ' + (error.message || 'Unknown error'), 'error');
        
        // Clear URL parameters on auth failure
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function enterAdminMode() {
    currentMode = 'admin';
    showSection('adminSection');
    updateModeIndicator('admin');
    document.getElementById('pageTitle').textContent = 'Time Tracker Admin Console v1.1.10';
    refreshAdminData();
    showStatus('Admin access granted', 'success');
}

function exitAdminMode() {
    currentMode = 'employee';
    isAdminAuthenticated = false;
    showSection('employeeSection');
    updateModeIndicator('employee');
    document.getElementById('pageTitle').textContent = 'Employee Time Tracker v1.1.10';
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
}

function exitToEmployee() {
    currentMode = 'employee';
    showSection('employeeSection');
    updateModeIndicator('employee');
    document.getElementById('pageTitle').textContent = 'Employee Time Tracker v1.1.10';
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
}

function showEnrollmentStatus(message, type) {
    const statusEl = document.getElementById('enrollmentStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'status-message ' + type;
        statusEl.style.display = 'block';
    }
}

// ============================================================================
// LICENSE MANAGEMENT
// ============================================================================

function generateLicenseKey(companyName) {
    if (!companyName || companyName.trim() === '') return null;
    return btoa(companyName.toUpperCase() + "CAND2025PAY").substring(0, 12);
}

function validateLicenseKey(companyName, licenseKey) {
    const expectedKey = generateLicenseKey(companyName);
    return expectedKey === licenseKey;
}

function showLicenseModal() {
    updateLicenseModalContent();
    const modal = document.getElementById('licenseModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeLicenseModal() {
    const modal = document.getElementById('licenseModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function updateLicenseModalContent() {
    const statusDisplay = document.getElementById('licenseStatusDisplay');
    const resetBtn = document.getElementById('resetLicenseBtn');
    const companyInput = document.getElementById('licenseCompanyName');
    const keyInput = document.getElementById('licenseKey');
    
    if (appConfig.isLicensed) {
        if (statusDisplay) {
            statusDisplay.innerHTML = `<strong>✅ Licensed Version</strong><br>Licensed to: <strong>${appConfig.licensedCompany}</strong><br>Watermark removed permanently. Thank you for your support!`;
            statusDisplay.className = 'status-message success';
            statusDisplay.style.display = 'block';
        }
        if (resetBtn) resetBtn.style.display = 'inline-block';
        if (companyInput) companyInput.value = appConfig.licensedCompany;
        if (keyInput) keyInput.value = appConfig.licenseKey;
    } else {
        if (statusDisplay) {
            statusDisplay.innerHTML = '<strong>🔒 Free Version (Unlicensed)</strong><br>This software is running in free mode with watermark display. Purchase a license to remove the watermark and customize your company name.';
            statusDisplay.className = 'status-message info';
            statusDisplay.style.display = 'block';
        }
        if (resetBtn) resetBtn.style.display = 'none';
        if (companyInput) companyInput.value = '';
        if (keyInput) keyInput.value = '';
    }
}

function activateLicense() {
    const companyInput = document.getElementById('licenseCompanyName');
    const keyInput = document.getElementById('licenseKey');
    
    if (!companyInput || !keyInput) return;
    
    const companyName = companyInput.value.trim();
    const licenseKey = keyInput.value.trim();
    
    if (!companyName) {
        showStatus('Please enter your company name exactly as provided.', 'error');
        return;
    }
    
    if (!licenseKey) {
        showStatus('Please enter your license key.', 'error');
        return;
    }
    
    if (validateLicenseKey(companyName, licenseKey)) {
        appConfig.isLicensed = true;
        appConfig.licensedCompany = companyName;
        appConfig.licenseKey = licenseKey;
        appConfig.companyName = companyName; // Also update the general company name setting
        
        saveAppConfiguration();
        updateDisplay();
        updateLicenseWatermark();
        updateLicenseModalContent();
        closeLicenseModal();
        
        showStatus('License activated successfully! Watermark removed and company name updated.', 'success');
        console.log('License activated for:', companyName);
    } else {
        showStatus('Invalid license key for the provided company name. Please check your details and try again.', 'error');
    }
}

function resetLicense() {
    if (confirm('Are you sure you want to reset the license? This will restore the watermark and revert to the free version.')) {
        appConfig.isLicensed = false;
        appConfig.licensedCompany = '';
        appConfig.licenseKey = '';
        appConfig.companyName = 'CAND, LLC';
        
        saveAppConfiguration();
        updateDisplay();
        updateLicenseWatermark();
        updateLicenseModalContent();
        closeLicenseModal();
        
        showStatus('License reset successfully. Application reverted to free version.', 'info');
    }
}

function updateLicenseWatermark() {
    const watermark = document.getElementById('licenseWatermark');
    const watermarkText = document.getElementById('watermarkText');
    
    if (!watermark || !watermarkText) return;
    
    if (appConfig.isLicensed) {
        watermarkText.textContent = 'Licensed to ' + appConfig.licensedCompany;
        watermark.className = 'license-watermark licensed';
        watermark.title = 'Licensed Version - Click for license details';
    } else {
        watermarkText.textContent = 'Powered by CAND, LLC - Unlicensed';
        watermark.className = 'license-watermark';
        watermark.title = 'Free Version - Click to purchase license ($9.95)';
    }
}

// ============================================================================
// ADMIN FUNCTIONS (BASIC IMPLEMENTATIONS)
// ============================================================================

function refreshAdminData() {
    updateAdminStats();
    displayAdminData();
    updateAdminFilters();
}

function updateAdminStats() {
    const validEntries = filteredEntries.filter(e => !e.isDuplicate && e.isValid !== false);
    const totalHours = validEntries.reduce((sum, e) => sum + e.duration, 0);
    const uniqueEmployees = new Set(filteredEntries.map(e => e.employee)).size;
    const uniqueProjects = new Set(filteredEntries.map(e => e.project)).size;
    const dataQuality = filteredEntries.length > 0 
        ? Math.round((validEntries.length / filteredEntries.length) * 100) 
        : 100;
    
    const elements = {
        'totalEntries': filteredEntries.length,
        'totalAdminHours': totalHours.toFixed(1),
        'totalEmployees': uniqueEmployees,
        'totalProjects': uniqueProjects,
        'dataQuality': dataQuality + '%'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function updateAdminFilters() {
    // Update filter dropdowns with current data
    const employeeFilter = document.getElementById('employeeFilter');
    const projectFilter = document.getElementById('projectFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (employeeFilter) {
        employeeFilter.innerHTML = '<option value="">All Employees</option>';
        Array.from(employees).sort().forEach(emp => {
            const option = document.createElement('option');
            option.value = emp;
            option.textContent = emp;
            employeeFilter.appendChild(option);
        });
    }
    
    if (projectFilter) {
        projectFilter.innerHTML = '<option value="">All Projects</option>';
        Array.from(projects).sort().forEach(proj => {
            const option = document.createElement('option');
            option.value = proj;
            option.textContent = proj;
            projectFilter.appendChild(option);
        });
    }
    
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        Array.from(categories).sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }
}

function displayAdminData() {
    const dataContent = document.getElementById('dataContent');
    if (!dataContent) return;
    
    if (filteredEntries.length === 0) {
        dataContent.innerHTML = '<div class="no-data"><div class="no-data-icon">📂</div><div>No data to display</div><div style="font-size: 1rem; margin-top: 10px; opacity: 0.7;">Import timesheets or adjust filters</div></div>';
        return;
    }
    
    // Simple table view for now
    let html = '<table class="data-table"><thead><tr><th>Employee</th><th>Date</th><th>Category</th><th>Project</th><th>Duration</th></tr></thead><tbody>';
    
    filteredEntries.forEach(entry => {
        html += `<tr>
            <td>${entry.employee}</td>
            <td>${entry.date}</td>
            <td>${entry.category}</td>
            <td>${entry.project}</td>
            <td>${entry.duration.toFixed(1)}h</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    dataContent.innerHTML = html;
}

// Basic admin functions
function triggerImport() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
    }
}

function handleFileImport(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    showStatus('File import feature coming soon in admin mode', 'info');
}

function applyFilters() {
    filteredEntries = allTimeEntries.slice();
    updateAdminStats();
    displayAdminData();
}

function resetFilters() {
    const filters = ['payPeriodFilter', 'employeeFilter', 'projectFilter', 'categoryFilter', 'startDate', 'endDate'];
    filters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    applyFilters();
}

function switchView() {
    displayAdminData();
}

function showConfigureApp() {
    // Populate current configuration values
    const companyNameInput = document.getElementById('companyNameInput');
    const allowEmployeeEdit = document.getElementById('allowEmployeeEdit');
    const allowEmployeeDelete = document.getElementById('allowEmployeeDelete');
    const configLicenseStatus = document.getElementById('configLicenseStatus');
    
    if (companyNameInput) {
        companyNameInput.value = appConfig.companyName || 'CAND, LLC';
    }
    
    if (allowEmployeeEdit) {
        allowEmployeeEdit.checked = appConfig.allowEmployeeEdit;
    }
    
    if (allowEmployeeDelete) {
        allowEmployeeDelete.checked = appConfig.allowEmployeeDelete;
    }
    
    if (configLicenseStatus) {
        if (appConfig.isLicensed) {
            configLicenseStatus.textContent = `Licensed to ${appConfig.licensedCompany}`;
            configLicenseStatus.style.color = '#28a745';
        } else {
            configLicenseStatus.textContent = 'Unlicensed';
            configLicenseStatus.style.color = '#dc3545';
        }
    }
    
    const modal = document.getElementById('configureModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeConfigureModal() {
    const modal = document.getElementById('configureModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function saveConfiguration() {
    // Read values from form
    const companyNameInput = document.getElementById('companyNameInput');
    const allowEmployeeEdit = document.getElementById('allowEmployeeEdit');
    const allowEmployeeDelete = document.getElementById('allowEmployeeDelete');
    
    // Update configuration
    if (companyNameInput) {
        const newCompanyName = companyNameInput.value.trim();
        if (newCompanyName) {
            appConfig.companyName = newCompanyName;
        }
    }
    
    if (allowEmployeeEdit) {
        appConfig.allowEmployeeEdit = allowEmployeeEdit.checked;
    }
    
    if (allowEmployeeDelete) {
        appConfig.allowEmployeeDelete = allowEmployeeDelete.checked;
    }
    
    // Save to localStorage
    saveAppConfiguration();
    
    // Apply changes immediately
    applyConfiguration();
    
    // Close modal
    closeConfigureModal();
    
    showStatus('Configuration saved successfully', 'success');
}

function resetToDefaults() {
    if (confirm('Reset all settings to default values? This will clear your company name and reset all permissions.')) {
        // Reset appConfig to defaults
        appConfig.companyName = 'CAND, LLC';
        appConfig.allowEmployeeEdit = true;
        appConfig.allowEmployeeDelete = true;
        appConfig.allowEdit = true;
        appConfig.allowDelete = true;
        // Don't reset license info
        
        // Update form fields
        const companyNameInput = document.getElementById('companyNameInput');
        const allowEmployeeEdit = document.getElementById('allowEmployeeEdit');
        const allowEmployeeDelete = document.getElementById('allowEmployeeDelete');
        
        if (companyNameInput) {
            companyNameInput.value = appConfig.companyName;
        }
        
        if (allowEmployeeEdit) {
            allowEmployeeEdit.checked = appConfig.allowEmployeeEdit;
        }
        
        if (allowEmployeeDelete) {
            allowEmployeeDelete.checked = appConfig.allowEmployeeDelete;
        }
        
        // Save to localStorage
        saveAppConfiguration();
        
        // Apply changes immediately
        applyConfiguration();
        
        showStatus('Settings reset to defaults', 'success');
    }
}

function showDataCleanup() {
    const modal = document.getElementById('cleanupModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function performCleanup() {
    showStatus('Data cleanup performed', 'success');
    closeModal();
}

function showSummary() {
    alert('Basic summary: ' + allTimeEntries.length + ' total entries');
}

function clearAllData() {
    if (confirm('Clear all data?')) {
        allTimeEntries = [];
        employeeEntries = [];
        filteredEntries = [];
        employees.clear();
        projects.clear();
        categories.clear();
        
        saveTimeEntries();
        refreshAdminData();
        updateEmployeeDisplay();
        
        showStatus('All data cleared', 'success');
    }
}

function setCurrentPayPeriod() {
    showStatus('Current pay period filter applied', 'info');
}

function exportExcel() {
    showStatus('Excel export coming soon', 'info');
}

function exportJSON() {
    showStatus('JSON export coming soon', 'info');
}

function exportAccess() {
    showStatus('Access export coming soon', 'info');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

function showStatus(message, type) {
    const statusEl = document.getElementById('globalStatus');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = 'status-message ' + type;
    statusEl.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

function showStatusInElement(message, type, elementId) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = 'status-message ' + type;
    statusEl.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

function setTodayDate() {
    const periodStart = document.getElementById('periodStart');
    if (periodStart && !periodStart.value) {
        periodStart.value = new Date().toISOString().split('T')[0];
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function saveTimeEntries() {
    try {
        const dataToSave = {
            allEntries: allTimeEntries,
            employeeEntries: employeeEntries,
            lastUpdate: new Date().toISOString(),
            version: '1.1.10'
        };
        localStorage.setItem('unifiedTimeEntries', JSON.stringify(dataToSave));
    } catch (e) {
        console.error('Failed to persist data:', e);
    }
}

function loadPersistedData() {
    try {
        const stored = localStorage.getItem('unifiedTimeEntries');
        if (stored) {
            const data = JSON.parse(stored);
            allTimeEntries = data.allEntries || [];
            employeeEntries = data.employeeEntries || [];
            
            // Rebuild collections
            allTimeEntries.forEach(entry => {
                employees.add(entry.employee);
                projects.add(entry.project);
                categories.add(entry.category);
            });
            
            filteredEntries = allTimeEntries.slice();
        }
    } catch (e) {
        console.error('Failed to load persisted data:', e);
    }
}

// ============================================================================
// GLOBAL FUNCTION EXPORTS - MUST BE AT END
// ============================================================================

// Critical functions that must be available immediately
if (typeof window !== 'undefined') {
    // Timer functions
    window.toggleTimer = toggleTimer;
    window.setSelectedPayPeriod = setSelectedPayPeriod;
    window.setEmployeeView = setEmployeeView;
    window.exportToCSV = exportToCSV;
    window.importEmployeeCSV = importEmployeeCSV;
    window.clearAllEmployeeData = clearAllEmployeeData;
    window.editEmployeeEntry = editEmployeeEntry;
    window.saveEmployeeEntry = saveEmployeeEntry;
    window.cancelEmployeeEdit = cancelEmployeeEdit;
    window.deleteEmployeeEntry = deleteEmployeeEntry;

    // License functions
    window.showLicenseModal = showLicenseModal;
    window.closeLicenseModal = closeLicenseModal;
    window.activateLicense = activateLicense;
    window.resetLicense = resetLicense;

    // Admin functions
    window.triggerImport = triggerImport;
    window.handleFileImport = handleFileImport;
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;
    window.switchView = switchView;
    window.showConfigureApp = showConfigureApp;
    window.closeConfigureModal = closeConfigureModal;
    window.saveConfiguration = saveConfiguration;
    window.resetToDefaults = resetToDefaults;
    window.showDataCleanup = showDataCleanup;
    window.closeModal = closeModal;
    window.performCleanup = performCleanup;
    window.showSummary = showSummary;
    window.clearAllData = clearAllData;
    window.setCurrentPayPeriod = setCurrentPayPeriod;
    window.exportExcel = exportExcel;
    window.exportJSON = exportJSON;
    window.exportAccess = exportAccess;
    window.exitAdminMode = exitAdminMode;
    window.exitToEmployee = exitToEmployee;
    window.enrollAdminDevice = enrollAdminDevice;
    window.enterAdminMode = enterAdminMode;

    // Configuration functions
    window.exportPayPeriodsConfig = exportPayPeriodsConfig;
    window.importPayPeriodsConfig = importPayPeriodsConfig;
    window.downloadPayPeriodTemplate = downloadPayPeriodTemplate;

    // For admin key generation
    window.generateKeyForCustomer = function(customerCompanyName) {
        const key = generateLicenseKey(customerCompanyName);
        console.log(`License Key for "${customerCompanyName}": ${key}`);
        console.log('Share this key with your customer along with their exact company name.');
        return key;
    };
    
    console.log('Time Tracker Functions v1.1.10 loaded successfully');
    console.log('toggleTimer function available:', typeof window.toggleTimer);
    console.log('Admin access: Add ?setup=maintenance or ?config=x7k9m to URL');
    console.log('Generate license keys: generateKeyForCustomer("Company Name")');
} else {
    console.error('Window object not available');
}

console.log('Time Tracker Functions v1.1.10 loaded successfully');
console.log('Admin access: Add ?setup=maintenance or ?config=x7k9m to URL');
console.log('Generate license keys: generateKeyForCustomer("Company Name")');
