/*
Time Tracker Functions v1.1.10.5
Author: Philippe Addelia
Company: CAND, LLC
Created: August 17, 2025 PST
Modified: August 30, 2025 PST
Preferred location: Modules\Time Tracker\time_tracker_functions.js
Purpose: JavaScript functionality for Employee Time Tracker - Complete Unified Version with $49.95 pricing
*/

// Company Configuration
const COMPANY_CONFIG = {
    "companyName": "CAND, LLC",
    "companyLogoPath": "Company_logo.png",
    "defaultCSVFile": "pay_periods_2025.csv",
    "fallbackCSVFile": "pay_periods_2026.csv",
    "defaultHolidaysFile": "company_holidays_2025.csv"
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
let holidaysConfig = null;

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
    licenseKey: '',
    holidaysConfig: null,
    logoUrl: '' // External logo URL (Imgur, etc.)
};

// Default Holidays Configuration
const DEFAULT_HOLIDAYS_CONFIG = {
    "holidays": [
        {
            "id": "new-years-2025",
            "date": "2025-01-01",
            "name": "New Year's Day",
            "type": "federal",
            "description": "Federal Holiday - New Year's Day"
        },
        {
            "id": "mlk-2025",
            "date": "2025-01-20",
            "name": "Martin Luther King Jr. Day",
            "type": "federal",
            "description": "Federal Holiday - Martin Luther King Jr. Day"
        },
        {
            "id": "presidents-2025",
            "date": "2025-02-17",
            "name": "Presidents Day",
            "type": "federal",
            "description": "Federal Holiday - Presidents Day"
        },
        {
            "id": "memorial-2025",
            "date": "2025-05-26",
            "name": "Memorial Day",
            "type": "federal",
            "description": "Federal Holiday - Memorial Day"
        },
        {
            "id": "juneteenth-2025",
            "date": "2025-06-19",
            "name": "Juneteenth",
            "type": "federal",
            "description": "Federal Holiday - Juneteenth National Independence Day"
        },
        {
            "id": "independence-2025",
            "date": "2025-07-04",
            "name": "Independence Day",
            "type": "federal",
            "description": "Federal Holiday - Independence Day"
        },
        {
            "id": "labor-2025",
            "date": "2025-09-01",
            "name": "Labor Day",
            "type": "federal",
            "description": "Federal Holiday - Labor Day"
        },
        {
            "id": "columbus-2025",
            "date": "2025-10-13",
            "name": "Columbus Day",
            "type": "federal",
            "description": "Federal Holiday - Columbus Day"
        },
        {
            "id": "veterans-2025",
            "date": "2025-11-11",
            "name": "Veterans Day",
            "type": "federal",
            "description": "Federal Holiday - Veterans Day"
        },
        {
            "id": "thanksgiving-2025",
            "date": "2025-11-27",
            "name": "Thanksgiving Day",
            "type": "federal",
            "description": "Federal Holiday - Thanksgiving Day"
        },
        {
            "id": "black-friday-2025",
            "date": "2025-11-28",
            "name": "Day After Thanksgiving",
            "type": "company",
            "description": "Company Holiday - Day After Thanksgiving"
        },
        {
            "id": "christmas-2025",
            "date": "2025-12-25",
            "name": "Christmas Day",
            "type": "federal",
            "description": "Federal Holiday - Christmas Day"
        }
    ]
};

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Time tracker v1.1.10.5 initializing...');
    
    // Set mode to employee
    currentMode = 'employee';
    updateModeIndicator('employee');
    
    // Simple initialization - just load data and settings
    loadAppConfiguration();
    loadPayPeriodsConfig();
    loadHolidaysConfig(); // Load holidays configuration
    loadPersistedData();
    loadEmployeeSettings();
    updateDisplay();
    updateCompanyLogo(); // Load external logo if configured
    updateEmployeeDisplay();
    setTodayDate();
    
    // Setup timer
    updateTimerDisplay();
    
    // Save employee name on change
    const employeeNameInput = document.getElementById('employeeName');
    if (employeeNameInput) {
        employeeNameInput.addEventListener('blur', saveEmployeeSettings);
        employeeNameInput.addEventListener('input', saveEmployeeSettings);
    }
    
    // Add escape key handler for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Check for admin access only if URL parameters present
    checkAdminAccess();
    
    console.log('Time tracker initialization complete');
    console.log('Employee section should be visible');
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
    updateCompanyLogo(); // Update logo when configuration changes
    
    // Update page title if company name changed
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const currentTitle = pageTitle.textContent;
        if (currentTitle.includes('Employee')) {
            pageTitle.textContent = 'Employee Time Tracker v1.1.10.5';
        } else if (currentTitle.includes('Admin')) {
            pageTitle.textContent = 'Time Tracker Admin Console v1.1.10.5';
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
    const pageSubtitle = document.getElementById('pageSubtitle');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const employeeControls = document.getElementById('employeeControls');
    const adminControls = document.getElementById('adminControls');
    
    if (!indicator) return;
    
    switch(mode) {
        case 'admin':
            indicator.textContent = 'Admin Mode';
            indicator.className = 'mode-indicator admin';
            indicator.style.display = 'block';
            if (pageSubtitle) pageSubtitle.textContent = 'Admin Console';
            if (headerSubtitle) headerSubtitle.style.display = 'none';
            if (employeeControls) employeeControls.style.display = 'none';
            if (adminControls) adminControls.style.display = 'grid';
            
            // Show current pay period info if available (for visual consistency)
            setTimeout(() => {
                const today = new Date().toISOString().split('T')[0];
                if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
                    const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
                        return today >= period.periodStart && today <= period.periodEnd;
                    });
                    if (currentPeriod) {
                        const payPeriodFilter = document.getElementById('payPeriodFilter');
                        if (payPeriodFilter) {
                            payPeriodFilter.value = currentPeriod.id;
                            showPayPeriodInfoForAdmin(currentPeriod);
                        }
                    }
                }
            }, 100);
            break;
        case 'enrollment':
            indicator.textContent = 'Admin Setup';
            indicator.className = 'mode-indicator admin';
            indicator.style.display = 'block';
            if (pageSubtitle) pageSubtitle.textContent = 'Admin Enrollment';
            if (headerSubtitle) headerSubtitle.style.display = 'none';
            if (employeeControls) employeeControls.style.display = 'none';
            if (adminControls) adminControls.style.display = 'none';
            break;
        default:
            // Employee mode
            indicator.textContent = 'Employee Mode';
            indicator.className = 'mode-indicator';
            indicator.style.display = 'none'; // Hide in employee mode
            if (pageSubtitle) pageSubtitle.textContent = 'Employee Time Tracker';
            if (headerSubtitle) headerSubtitle.style.display = 'none'; // Hide subtitle
            if (employeeControls) employeeControls.style.display = 'grid';
            if (adminControls) adminControls.style.display = 'none';
            // Refresh pay period display for employee mode (with button if needed)
            if (selectedPayPeriod) {
                updatePayPeriodHolidaysDisplay();
                const info = document.getElementById('payPeriodInfo');
                if (info) {
                    info.style.display = 'grid';
                }
            }
            break;
    }
    
    console.log(`Mode indicator updated to: ${mode}`);
}

// ============================================================================
// LOGO MANAGEMENT
// ============================================================================

function updateCompanyLogo() {
    const logoImg = document.getElementById('companyLogo');
    if (!logoImg) return;
    
    const logoUrl = appConfig.logoUrl && appConfig.logoUrl.trim();
    
    if (logoUrl) {
        // Test if the external URL is valid
        const testImg = new Image();
        testImg.onload = function() {
            logoImg.src = logoUrl;
            logoImg.style.display = 'block';
            console.log('External logo loaded successfully:', logoUrl);
        };
        testImg.onerror = function() {
            console.warn('External logo failed to load, using fallback:', logoUrl);
            logoImg.src = 'Company_logo.png'; // Fallback to local file
            logoImg.style.display = 'block';
        };
        testImg.src = logoUrl;
    } else {
        // Use default local logo
        logoImg.src = 'Company_logo.png';
        logoImg.style.display = 'block';
    }
}

function validateLogoUrl(url) {
    if (!url || !url.trim()) return true; // Empty URL is valid (use default)
    
    // Basic URL validation
    try {
        const urlObj = new URL(url);
        
        // Must be HTTPS
        if (urlObj.protocol !== 'https:') {
            console.log('Logo URL validation failed: Not HTTPS');
            return false;
        }
        
        // Check if it's a common image hosting service
        const lowerUrl = url.toLowerCase();
        const validHosts = [
            'imgur.com', 'i.imgur.com', 
            'github.com', 'githubusercontent.com', 
            'cloudinary.com', 'res.cloudinary.com',
            'images.unsplash.com', 'unsplash.com'
        ];
        
        const isValidHost = validHosts.some(host => lowerUrl.includes(host));
        const isImageFile = /\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i.test(url);
        
        const isValid = isValidHost || isImageFile;
        
        if (!isValid) {
            console.log('Logo URL validation failed: Invalid host or file type');
        }
        
        return isValid;
    } catch (e) {
        console.log('Logo URL validation failed: Invalid URL format', e);
        return false;
    }
}

function previewLogo() {
    const logoUrlInput = document.getElementById('logoUrlInput');
    const previewImg = document.getElementById('logoPreview');
    const previewStatus = document.getElementById('logoPreviewStatus');
    
    if (!logoUrlInput || !previewImg || !previewStatus) return;
    
    const url = logoUrlInput.value.trim();
    
    if (!url) {
        previewImg.style.display = 'none';
        previewStatus.textContent = 'Enter a logo URL to see preview';
        previewStatus.className = 'logo-preview-status';
        return;
    }
    
    if (!validateLogoUrl(url)) {
        previewImg.style.display = 'none';
        previewStatus.textContent = '⚠ Invalid URL format or unsupported host';
        previewStatus.className = 'logo-preview-status error';
        return;
    }
    
    previewStatus.textContent = '⏳ Loading preview...';
    previewStatus.className = 'logo-preview-status loading';
    
    const testImg = new Image();
    testImg.onload = function() {
        previewImg.src = url;
        previewImg.style.display = 'block';
        previewStatus.textContent = '✅ Logo preview loaded successfully';
        previewStatus.className = 'logo-preview-status success';
    };
    testImg.onerror = function() {
        previewImg.style.display = 'none';
        previewStatus.textContent = '⚠ Could not load image from this URL';
        previewStatus.className = 'logo-preview-status error';
    };
    testImg.src = url;
}

function testLogoUrl() {
    const logoUrlInput = document.getElementById('logoUrlInput');
    if (!logoUrlInput) return;
    
    const url = logoUrlInput.value.trim();
    
    if (!url) {
        showStatus('Please enter a logo URL first', 'error');
        return;
    }
    
    if (!validateLogoUrl(url)) {
        showStatus('Invalid logo URL format or unsupported host', 'error');
        return;
    }
    
    // Test the logo URL
    const testImg = new Image();
    testImg.onload = function() {
        showStatus('✅ Logo URL is valid and accessible', 'success');
        // Trigger preview
        previewLogo();
    };
    testImg.onerror = function() {
        showStatus('❌ Could not load image from this URL', 'error');
    };
    testImg.src = url;
}

function clearLogoUrl() {
    const logoUrlInput = document.getElementById('logoUrlInput');
    const previewImg = document.getElementById('logoPreview');
    const previewStatus = document.getElementById('logoPreviewStatus');
    
    if (logoUrlInput) {
        logoUrlInput.value = '';
    }
    
    if (previewImg) {
        previewImg.style.display = 'none';
    }
    
    if (previewStatus) {
        previewStatus.textContent = 'Enter a logo URL to see preview';
        previewStatus.className = 'logo-preview-status';
    }
    
    showStatus('Logo URL cleared', 'info');
}

// ============================================================================
// HOLIDAYS CONFIGURATION MANAGEMENT
// ============================================================================

function loadHolidaysConfig() {
    try {
        const savedConfig = localStorage.getItem('holidaysConfig');
        const savedConfigName = localStorage.getItem('holidaysConfigName');
        
        if (savedConfig) {
            holidaysConfig = JSON.parse(savedConfig);
            if (savedConfigName) {
                const configNameEl = document.getElementById('currentHolidayConfigName');
                if (configNameEl) {
                    configNameEl.textContent = savedConfigName;
                }
            }
        } else {
            holidaysConfig = DEFAULT_HOLIDAYS_CONFIG;
            localStorage.setItem('holidaysConfigName', 'Default 2025 Holidays');
        }
        
        updatePayPeriodHolidaysDisplay();
        console.log('Holidays config loaded:', holidaysConfig);
    } catch (error) {
        console.error('Error loading holidays config:', error);
        holidaysConfig = DEFAULT_HOLIDAYS_CONFIG;
        updatePayPeriodHolidaysDisplay();
    }
}

function parseHolidaysCSV(csvContent, configName = 'Custom Holiday Configuration') {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have header row and at least one data row');
        }
        
        const holidays = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 4) {
                holidays.push({
                    id: values[0].replace(/"/g, '').trim(),
                    date: values[1].replace(/"/g, '').trim(),
                    name: values[2].replace(/"/g, '').trim(),
                    type: values[3].replace(/"/g, '').trim() || 'company',
                    description: values[4] ? values[4].replace(/"/g, '').trim() : values[2].replace(/"/g, '').trim()
                });
            }
        }
        
        if (holidays.length > 0) {
            holidaysConfig = { holidays: holidays };
            localStorage.setItem('holidaysConfig', JSON.stringify(holidaysConfig));
            localStorage.setItem('holidaysConfigName', configName);
            
            const configNameEl = document.getElementById('currentHolidayConfigName');
            if (configNameEl) {
                configNameEl.textContent = configName;
            }
            
            updatePayPeriodHolidaysDisplay();
            console.log(`Loaded ${holidays.length} holidays from CSV`);
            return { holidays: holidays };
        }
        
        throw new Error('No valid holidays found in CSV');
    } catch (error) {
        console.error('Error parsing holidays CSV:', error);
        throw error;
    }
}

function getHolidaysForPayPeriod(payPeriod) {
    if (!holidaysConfig || !holidaysConfig.holidays || !payPeriod) {
        return [];
    }
    
    return holidaysConfig.holidays.filter(holiday => {
        return holiday.date >= payPeriod.periodStart && holiday.date <= payPeriod.periodEnd;
    });
}

// FIXED: Format holiday display with date concatenated
function formatHolidayForDisplay(holiday) {
    // Format date as MM/DD
    const dateParts = holiday.date.split('-');
    const formattedDate = `${dateParts[1]}/${dateParts[2]}`;
    return `${formattedDate} - ${holiday.name}`;
}

function updatePayPeriodHolidaysDisplay() {
    if (!selectedPayPeriod) return;
    
    const holidays = getHolidaysForPayPeriod(selectedPayPeriod);
    const holidaysDisplay = document.getElementById('periodHolidays');
    const holidayButton = document.getElementById('holidayButton');
    
    if (holidaysDisplay) {
        if (holidays.length > 0) {
            // FIXED: Concatenate date with holiday name
            const holidayDisplayText = holidays.map(h => formatHolidayForDisplay(h)).join(', ');
            holidaysDisplay.textContent = holidayDisplayText;
            
            // Show button only in employee mode
            if (holidayButton && currentMode === 'employee') {
                holidayButton.style.display = 'inline-block';
                holidayButton.textContent = `Select Holidays (${holidays.length})`;
            } else if (holidayButton) {
                holidayButton.style.display = 'none';
            }
        } else {
            holidaysDisplay.textContent = 'No holidays in this period';
            if (holidayButton) {
                holidayButton.style.display = 'none';
            }
        }
    }
}

// FIXED: Show pay period info for admin mode with date updates
function showPayPeriodInfoForAdmin(payPeriod) {
    if (!payPeriod) return;
    
    const info = document.getElementById('payPeriodInfo');
    if (info) {
        const periodRange = document.getElementById('periodRange');
        const timesheetDue = document.getElementById('timesheetDue');
        const payDay = document.getElementById('payDay');
        const daysRemaining = document.getElementById('daysRemaining');
        const holidaysDisplay = document.getElementById('periodHolidays');
        const holidayButton = document.getElementById('holidayButton');
        
        if (periodRange) {
            periodRange.textContent = `${payPeriod.periodStart} to ${payPeriod.periodEnd}`;
        }
        if (timesheetDue) {
            timesheetDue.textContent = payPeriod.timesheetDue;
        }
        if (payDay) {
            payDay.textContent = payPeriod.payDay;
        }
        if (daysRemaining) {
            // Calculate days remaining
            const dueDate = new Date(payPeriod.timesheetDue);
            const today = new Date();
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysRemaining.textContent = diffDays > 0 ? diffDays : 0;
        }
        
        // Show holidays info (admin mode - informational only, no button)
        if (holidaysDisplay) {
            const holidays = getHolidaysForPayPeriod(payPeriod);
            if (holidays.length > 0) {
                // FIXED: Concatenate date with holiday name for admin view too
                const holidayDisplayText = holidays.map(h => formatHolidayForDisplay(h)).join(', ');
                holidaysDisplay.textContent = holidayDisplayText;
            } else {
                holidaysDisplay.textContent = 'No holidays in this period';
            }
        }
        
        // Hide holiday button in admin mode
        if (holidayButton) {
            holidayButton.style.display = 'none';
        }
        
        // FIXED: Update admin date inputs when pay period is selected
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) {
            startDateInput.value = payPeriod.periodStart;
        }
        if (endDateInput) {
            endDateInput.value = payPeriod.periodEnd;
        }
        
        info.style.display = 'grid';
    }
}

function showHolidaySelection() {
    if (!selectedPayPeriod) {
        showStatus('Please select a pay period first', 'error');
        return;
    }
    
    const holidays = getHolidaysForPayPeriod(selectedPayPeriod);
    if (holidays.length === 0) {
        showStatus('No holidays available in the selected pay period', 'info');
        return;
    }
    
    const employeeName = document.getElementById('employeeName').value.trim();
    if (!employeeName) {
        showStatus('Please enter your name first', 'error');
        return;
    }
    
    // Create modal content
    const modal = document.getElementById('holidaySelectionModal');
    if (!modal) {
        console.error('Holiday selection modal not found');
        return;
    }
    
    const holidayList = document.getElementById('holidaySelectionList');
    if (!holidayList) {
        console.error('Holiday list element not found');
        return;
    }
    
    // Clear previous content
    holidayList.innerHTML = '';
    
    // Add holiday checkboxes
    holidays.forEach(holiday => {
        const holidayItem = document.createElement('div');
        holidayItem.className = 'holiday-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `holiday-${holiday.id}`;
        checkbox.value = holiday.id;
        
        // Check if employee already has this holiday in their timesheet
        const existingEntry = employeeEntries.find(entry => 
            entry.employee === employeeName && 
            entry.date === holiday.date && 
            entry.category === 'holiday'
        );
        checkbox.checked = !!existingEntry;
        
        const label = document.createElement('label');
        label.htmlFor = `holiday-${holiday.id}`;
        label.innerHTML = `
            <strong>${holiday.name}</strong> - ${holiday.date}
            <br><small>${holiday.description}</small>
        `;
        
        holidayItem.appendChild(checkbox);
        holidayItem.appendChild(label);
        holidayList.appendChild(holidayItem);
    });
    
    // Show modal
    modal.classList.add('active');
}

function saveSelectedHolidays() {
    const employeeName = document.getElementById('employeeName').value.trim();
    if (!employeeName) {
        showStatus('Employee name is required', 'error');
        return;
    }
    
    const holidays = getHolidaysForPayPeriod(selectedPayPeriod);
    const checkboxes = document.querySelectorAll('#holidaySelectionList input[type="checkbox"]');
    let addedCount = 0;
    let removedCount = 0;
    
    checkboxes.forEach(checkbox => {
        const holiday = holidays.find(h => h.id === checkbox.value);
        if (!holiday) return;
        
        const existingEntryIndex = employeeEntries.findIndex(entry => 
            entry.employee === employeeName && 
            entry.date === holiday.date && 
            entry.category === 'holiday'
        );
        
        const existingAdminIndex = allTimeEntries.findIndex(entry => 
            entry.employee === employeeName && 
            entry.date === holiday.date && 
            entry.category === 'holiday'
        );
        
        if (checkbox.checked) {
            // Add holiday if not exists
            if (existingEntryIndex === -1) {
                const holidayEntry = {
                    id: Date.now() + Math.random(),
                    employee: employeeName,
                    date: holiday.date,
                    category: 'holiday',
                    project: holiday.name,
                    startTime: '09:00',
                    endTime: '17:00',
                    duration: 8.0,
                    description: `Holiday: ${holiday.name}`,
                    timestamp: new Date().toISOString(),
                    source: 'holiday-selection'
                };
                
                employeeEntries.push(holidayEntry);
                allTimeEntries.push(holidayEntry);
                employees.add(holidayEntry.employee);
                projects.add(holidayEntry.project);
                categories.add(holidayEntry.category);
                addedCount++;
            }
        } else {
            // Remove holiday if exists
            if (existingEntryIndex !== -1) {
                employeeEntries.splice(existingEntryIndex, 1);
                removedCount++;
            }
            if (existingAdminIndex !== -1) {
                allTimeEntries.splice(existingAdminIndex, 1);
            }
        }
    });
    
    // Save data
    saveTimeEntries();
    updateEmployeeDisplay();
    
    if (currentMode === 'admin') {
        refreshAdminData();
    }
    
    // Close modal
    document.getElementById('holidaySelectionModal').classList.remove('active');
    
    // Show status
    const messages = [];
    if (addedCount > 0) messages.push(`${addedCount} holidays added`);
    if (removedCount > 0) messages.push(`${removedCount} holidays removed`);
    
    if (messages.length > 0) {
        showStatus(messages.join(', '), 'success');
    } else {
        showStatus('No changes made', 'info');
    }
}

function exportHolidaysConfig() {
    if (!holidaysConfig || !holidaysConfig.holidays) {
        showStatus('No holidays configuration to export', 'info');
        return;
    }
    
    // Export as CSV format for easy editing
    let csvContent = 'ID,Date,Name,Type,Description\n';
    
    holidaysConfig.holidays.forEach(holiday => {
        csvContent += `"${holiday.id}","${holiday.date}","${holiday.name}","${holiday.type}","${holiday.description}"\n`;
    });
    
    downloadFile(csvContent, 'company_holidays_' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv');
    showStatus('Holidays configuration exported as CSV', 'success');
}

function importHolidaysConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let configData;
            let configName = file.name.replace(/\.[^/.]+$/, "");
            
            if (file.name.endsWith('.csv')) {
                const csvContent = e.target.result;
                configData = parseHolidaysCSV(csvContent, configName);
            } else {
                configData = JSON.parse(e.target.result);
                if (configData.holidaysConfig) {
                    configData = configData.holidaysConfig;
                }
            }
            
            if (configData && configData.holidays && configData.holidays.length > 0) {
                holidaysConfig = configData;
                localStorage.setItem('holidaysConfig', JSON.stringify(holidaysConfig));
                localStorage.setItem('holidaysConfigName', configName);
                
                const configNameEl = document.getElementById('currentHolidayConfigName');
                if (configNameEl) {
                    configNameEl.textContent = configName;
                }
                
                updatePayPeriodHolidaysDisplay();
                showStatus(`Holidays configuration imported successfully (${configData.holidays.length} holidays loaded)`, 'success');
            } else {
                showStatus('Invalid holidays configuration file', 'error');
            }
            
            event.target.value = '';
        } catch (error) {
            console.error('Error importing holidays config:', error);
            showStatus('Error importing configuration: ' + error.message, 'error');
            event.target.value = '';
        }
    };
    
    reader.readAsText(file);
}

function downloadHolidayTemplate() {
    const templateCSV = 'ID,Date,Name,Type,Description\n' +
        '2025-new-years,2025-01-01,New Year\'s Day,federal,Federal Holiday - New Year\'s Day\n' +
        '2025-mlk,2025-01-20,Martin Luther King Jr. Day,federal,Federal Holiday - MLK Day\n' +
        '2025-company-day,2025-03-15,Company Appreciation Day,company,Company Holiday - Employee Appreciation';
    
    downloadFile(templateCSV, 'company_holidays_template.csv', 'text/csv');
    showStatus('Holiday template downloaded', 'success');
}

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
        
        // Update holiday display
        updatePayPeriodHolidaysDisplay();
        
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
        version: '1.1.10.5',
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
        // Capitalize the category for display
        const displayCategory = entry.category ? 
            entry.category.charAt(0).toUpperCase() + entry.category.slice(1) : '-';
            
        html += `<tr id="employee-entry-row-${entry.id}">
            <td>${entry.date}</td>
            <td>${displayCategory}</td>
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
// ADMIN ACCESS MANAGEMENT - FIXED
// ============================================================================

function checkAdminAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // THREE-TIER ACCESS LEVELS
    
    // TIER 3: Developer Access (Highest Level - Only You)
    const devParam = urlParams.get('dev');
    if (devParam === 'ph1l1pp3_c4nd_d3v_2025_x7k9m') {
        console.log('🔓 Developer access granted - Full system access');
        isAdminAuthenticated = true;
        
        // Set a flag to indicate developer mode
        window.__developerMode = true;
        
        enterAdminMode();
        return; // Skip all other checks
    }
    
    // TIER 2: Company Admin Access (Licensed Customers)
    const configParam = urlParams.get('config');
    const setupParam = urlParams.has('setup');
    const isCompanyAdminRequested = 
        setupParam || 
        hash === '#admin-setup' || 
        configParam === 'x7k9m';
    
    if (isCompanyAdminRequested) {
        console.log('🔒 Company admin access requested - Authentication required');
        
        // Company admins must use WebAuthn
        if (checkWebAuthnSupport()) {
            handleAdminAccess();
        } else {
            showStatus('WebAuthn not supported in this browser. Please use a modern browser.', 'error');
        }
        return;
    }
    
    // TIER 1: Employee Access (Default - Everyone)
    console.log('👤 Employee mode - Standard access');
    // No special access requested, stay in employee mode
}

// ============================================================================
// ACCESS LEVEL DETECTION FUNCTIONS
// Add these helper functions after checkAdminAccess:
// ============================================================================

function getAccessLevel() {
    // Returns the current access level
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('dev') === 'ph1l1pp3_c4nd_d3v_2025_x7k9m') {
        return 'developer';
    } else if (currentMode === 'admin' && isAdminAuthenticated) {
        return 'company_admin';
    } else {
        return 'employee';
    }
}

function hasAccessTo(feature) {
    const accessLevel = getAccessLevel();
    
    const permissions = {
        'employee': [
            'timer',
            'view_own_entries',
            'export_own_data',
            'edit_own_entries'
        ],
        'company_admin': [
            'timer',
            'view_own_entries',
            'export_own_data',
            'edit_own_entries',
            'view_all_entries',
            'configure_company',
            'manage_pay_periods',
            'manage_holidays',
            'export_team_data',
            'data_cleanup'
        ],
        'developer': [
            'timer',
            'view_own_entries',
            'export_own_data',
            'edit_own_entries',
            'view_all_entries',
            'configure_company',
            'manage_pay_periods',
            'manage_holidays',
            'export_team_data',
            'data_cleanup',
            'generate_licenses',
            'developer_tools',
            'force_settings',
            'system_reset'
        ]
    };
    
    const level = accessLevel === 'developer' ? 'developer' : 
                  accessLevel === 'company_admin' ? 'company_admin' : 
                  'employee';
    
    return permissions[level].includes(feature);
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
    // Hide all sections
    document.getElementById('employeeSection').style.display = 'none';
    document.getElementById('adminSection').style.display = 'none';
    document.getElementById('webauthnEnrollment').style.display = 'none';
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
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
    
    // Customize title based on access level
    const accessLevel = getAccessLevel();
    const pageTitle = document.getElementById('pageTitle');
    
    if (accessLevel === 'developer') {
        if (pageTitle) {
            pageTitle.textContent = 'Time Tracker Developer Console v1.1.10.5';
        }
        
        // Add developer badge to UI
        const modeIndicator = document.getElementById('modeIndicator');
        if (modeIndicator) {
            modeIndicator.textContent = 'Developer Mode';
            modeIndicator.style.background = '#dc3545'; // Red for developer
        }
        
        // Show developer-only UI elements (if you add any)
        document.querySelectorAll('.dev-only').forEach(el => {
            el.style.display = 'block';
        });
        
    } else {
        if (pageTitle) {
            pageTitle.textContent = 'Time Tracker Admin Console v1.1.10.5';
        }
    }
    
    // Initialize admin data and populate admin filters
    refreshAdminData();
    
    // Auto-select current pay period for better UX
    const today = new Date().toISOString().split('T')[0];
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            return today >= period.periodStart && today <= period.periodEnd;
        });
        
        if (currentPeriod) {
            const payPeriodFilter = document.getElementById('payPeriodFilter');
            if (payPeriodFilter) {
                setTimeout(() => {
                    payPeriodFilter.value = currentPeriod.id;
                    showPayPeriodInfoForAdmin(currentPeriod);
                    applyFilters();
                }, 200);
            }
        }
    }
    
    // Show appropriate status message
    if (accessLevel === 'developer') {
        showStatus('🔓 Developer access granted - All functions available', 'success');
    } else {
        showStatus('🔒 Admin access granted', 'success');
    }
}

// ============================================================================
// SECURE FUNCTION EXAMPLE
// Example of how to secure a function to specific access levels:
// ============================================================================

function secureFunction(requiredAccess, functionToRun) {
    return function(...args) {
        if (!hasAccessTo(requiredAccess)) {
            console.error(`❌ Access denied. This function requires ${requiredAccess} permission.`);
            showStatus('Access denied. Insufficient permissions.', 'error');
            return null;
        }
        return functionToRun(...args);
    };
}
function exitAdminMode() {
    currentMode = 'employee';
    isAdminAuthenticated = false;
    showSection('employeeSection');
    updateModeIndicator('employee');
    document.getElementById('pageTitle').textContent = 'Employee Time Tracker v1.1.10.5';
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
}

function exitToEmployee() {
    currentMode = 'employee';
    showSection('employeeSection');
    updateModeIndicator('employee');
    document.getElementById('pageTitle').textContent = 'Employee Time Tracker v1.1.10.5';
    
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
// LICENSE MANAGEMENT - UPDATED PRICE TO $49.95
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
            statusDisplay.innerHTML = '<strong>🔐 Free Version (Unlicensed)</strong><br>This software is running in free mode with watermark display. Purchase a license to remove the watermark and customize your company name.';
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
        watermark.title = 'Free Version - Click to purchase license ($49.95)';
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
            // Capitalize the category for display
            option.textContent = cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : cat;
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
        // Capitalize the category for display  
        const displayCategory = entry.category ? 
            entry.category.charAt(0).toUpperCase() + entry.category.slice(1) : '-';
            
        html += `<tr>
            <td>${entry.employee}</td>
            <td>${entry.date}</td>
            <td>${displayCategory}</td>
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
    
    // Check if a pay period is selected and update the pay period info display
    const payPeriodFilter = document.getElementById('payPeriodFilter');
    if (payPeriodFilter && payPeriodFilter.value && currentMode === 'admin') {
        console.log('Admin mode: Pay period filter has value:', payPeriodFilter.value);
        // Find the selected pay period and show its info
        const selectedPeriodId = payPeriodFilter.value;
        const selectedPeriod = payPeriodsConfig?.payPeriods?.find(p => p.id === selectedPeriodId);
        if (selectedPeriod) {
            console.log('Found selected period, showing info for:', selectedPeriod.description);
            showPayPeriodInfoForAdmin(selectedPeriod);
        } else {
            console.log('Selected period not found in config');
        }
    } else if (currentMode === 'admin') {
        console.log('Admin mode: No pay period selected, hiding pay period info');
        // Hide pay period info if no period selected
        const info = document.getElementById('payPeriodInfo');
        if (info) {
            info.style.display = 'none';
        }
    }
    
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
    
    // Hide pay period info when filters are reset in admin mode
    if (currentMode === 'admin') {
        const info = document.getElementById('payPeriodInfo');
        if (info) {
            info.style.display = 'none';
        }
    }
    
    applyFilters();
}

function switchView() {
    displayAdminData();
}

// ============================================================================
// CONFIGURATION MANAGEMENT FUNCTIONS
// ============================================================================

function showConfigureApp() {
    // Populate current configuration values
    const companyNameInput = document.getElementById('companyNameInput');
    const logoUrlInput = document.getElementById('logoUrlInput');
    const allowEmployeeEdit = document.getElementById('allowEmployeeEdit');
    const allowEmployeeDelete = document.getElementById('allowEmployeeDelete');
    const configLicenseStatus = document.getElementById('configLicenseStatus');
    const logoConfigLicensed = document.getElementById('logoConfigLicensed');
    const logoConfigUnlicensed = document.getElementById('logoConfigUnlicensed');
    
    if (companyNameInput) {
        companyNameInput.value = appConfig.companyName || 'CAND, LLC';
    }
    
    // Handle logo configuration based on license status
    if (appConfig.isLicensed) {
        // Show licensed version
        if (logoConfigLicensed) logoConfigLicensed.style.display = 'block';
        if (logoConfigUnlicensed) logoConfigUnlicensed.style.display = 'none';
        
        if (logoUrlInput) {
            logoUrlInput.value = appConfig.logoUrl || '';
            // Clear preview when modal opens
            const previewImg = document.getElementById('logoPreview');
            const previewStatus = document.getElementById('logoPreviewStatus');
            if (previewImg) previewImg.style.display = 'none';
            if (previewStatus) {
                previewStatus.textContent = 'Enter a logo URL to see preview';
                previewStatus.className = 'logo-preview-status';
            }
        }
    } else {
        // Show unlicensed version
        if (logoConfigLicensed) logoConfigLicensed.style.display = 'none';
        if (logoConfigUnlicensed) logoConfigUnlicensed.style.display = 'block';
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
    
    // Update holiday config name
    const holidayConfigNameEl = document.getElementById('currentHolidayConfigName');
    if (holidayConfigNameEl) {
        const savedConfigName = localStorage.getItem('holidaysConfigName') || 'Default 2025 Holidays';
        holidayConfigNameEl.textContent = savedConfigName;
    }
    
    const modal = document.getElementById('configureModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function saveConfiguration() {
    // Read values from form
    const companyNameInput = document.getElementById('companyNameInput');
    const logoUrlInput = document.getElementById('logoUrlInput');
    const allowEmployeeEdit = document.getElementById('allowEmployeeEdit');
    const allowEmployeeDelete = document.getElementById('allowEmployeeDelete');
    
    // Update configuration
    if (companyNameInput) {
        const newCompanyName = companyNameInput.value.trim();
        if (newCompanyName) {
            appConfig.companyName = newCompanyName;
        }
    }
    
    // Only process logo URL if licensed
    if (appConfig.isLicensed && logoUrlInput) {
        const newLogoUrl = logoUrlInput.value.trim();
        if (!newLogoUrl || validateLogoUrl(newLogoUrl)) {
            appConfig.logoUrl = newLogoUrl;
        } else {
            showStatus('Invalid logo URL format or unsupported host', 'error');
            return; // Don't save if logo URL is invalid
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
    
    // Update logo display
    updateCompanyLogo();
    
    // Close modal
    closeConfigureModal();
    
    showStatus('Configuration saved successfully', 'success');
}

function closeConfigureModal() {
    const modal = document.getElementById('configureModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function resetToDefaults() {
    if (confirm('Reset all settings to default values? This will clear your company name, logo URL, and reset all permissions.')) {
        // Reset appConfig to defaults
        appConfig.companyName = 'CAND, LLC';
        appConfig.logoUrl = '';
        appConfig.allowEmployeeEdit = true;
        appConfig.allowEmployeeDelete = true;
        appConfig.allowEdit = true;
        appConfig.allowDelete = true;
        // Don't reset license info
        
        // Update form fields
        const companyNameInput = document.getElementById('companyNameInput');
        const logoUrlInput = document.getElementById('logoUrlInput');
        const allowEmployeeEdit = document.getElementById('allowEmployeeEdit');
        const allowEmployeeDelete = document.getElementById('allowEmployeeDelete');
        
        if (companyNameInput) {
            companyNameInput.value = appConfig.companyName;
        }
        
        if (logoUrlInput) {
            logoUrlInput.value = appConfig.logoUrl;
        }
        
        if (allowEmployeeEdit) {
            allowEmployeeEdit.checked = appConfig.allowEmployeeEdit;
        }
        
        if (allowEmployeeDelete) {
            allowEmployeeDelete.checked = appConfig.allowEmployeeDelete;
        }
        
        // Clear logo preview
        const previewImg = document.getElementById('logoPreview');
        const previewStatus = document.getElementById('logoPreviewStatus');
        if (previewImg) previewImg.style.display = 'none';
        if (previewStatus) {
            previewStatus.textContent = 'Enter a logo URL to see preview';
            previewStatus.className = 'logo-preview-status';
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
    const today = new Date().toISOString().split('T')[0];
    
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        // Find current pay period
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            return today >= period.periodStart && today <= period.periodEnd;
        });
        
        if (currentPeriod) {
            // In admin mode, set the filter and show pay period info
            if (currentMode === 'admin') {
                const payPeriodFilter = document.getElementById('payPeriodFilter');
                if (payPeriodFilter) {
                    payPeriodFilter.value = currentPeriod.id;
                    showPayPeriodInfoForAdmin(currentPeriod);
                    // Apply filters to refresh the data display
                    filteredEntries = allTimeEntries.slice();
                    updateAdminStats();
                    displayAdminData();
                }
            }
            
            showStatus(`Current pay period selected: ${currentPeriod.description}`, 'info');
        } else {
            showStatus('No current pay period found', 'info');
            // Hide pay period info if no current period
            if (currentMode === 'admin') {
                const info = document.getElementById('payPeriodInfo');
                if (info) {
                    info.style.display = 'none';
                }
            }
        }
    } else {
        showStatus('No pay period configuration available', 'error');
    }
}

function exportExcel() {
    showStatus('Excel export coming soon', 'info');
}

function exportCSV() {
    if (filteredEntries.length === 0) {
        showStatus('No data to export', 'error');
        return;
    }
    
    let csv = 'Employee,Date,Category,Project,Start Time,End Time,Duration,Description\n';
    filteredEntries.forEach(entry => {
        csv += `"${entry.employee}","${entry.date}","${entry.category}","${entry.project}","${entry.startTime || ''}","${entry.endTime || ''}",${entry.duration},"${entry.description || ''}"\n`;
    });
    
    downloadFile(csv, `admin_timesheet_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showStatus('Admin data exported to CSV successfully', 'success');
}

function exportJSON() {
    showStatus('JSON export coming soon', 'info');
}

function exportAccess() {
    showStatus('Access export coming soon', 'info');
}

function showSampleData() {
    const sampleCSV = 'Employee,Date,Category,Project,Start Time,End Time,Duration,Description\n' +
        '"John Doe","2025-08-25","work","Project Alpha","09:00","17:00",8,"Development work"\n' +
        '"Jane Smith","2025-08-25","overhead","Admin Tasks","13:00","15:00",2,"Team meeting"';
    
    downloadFile(sampleCSV, 'sample_timesheet.csv', 'text/csv');
    showStatus('Sample CSV downloaded', 'success');
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

function closeHolidayModal() {
    const modal = document.getElementById('holidaySelectionModal');
    if (modal) {
        modal.classList.remove('active');
    }
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
            version: '1.1.10.5'
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
    window.exportCSV = exportCSV;
    window.exportJSON = exportJSON;
    window.exportAccess = exportAccess;
    window.exitAdminMode = exitAdminMode;
    window.exitToEmployee = exitToEmployee;
    window.enrollAdminDevice = enrollAdminDevice;
    window.enterAdminMode = enterAdminMode;
    window.showSampleData = showSampleData;

    // Configuration functions
    window.exportPayPeriodsConfig = exportPayPeriodsConfig;
    window.importPayPeriodsConfig = importPayPeriodsConfig;
    window.downloadPayPeriodTemplate = downloadPayPeriodTemplate;
    
    // Holiday functions
    window.showHolidaySelection = showHolidaySelection;
    window.saveSelectedHolidays = saveSelectedHolidays;
    window.exportHolidaysConfig = exportHolidaysConfig;
    window.importHolidaysConfig = importHolidaysConfig;
    window.downloadHolidayTemplate = downloadHolidayTemplate;
    window.closeHolidayModal = closeHolidayModal;
    
    // Logo functions
    window.previewLogo = previewLogo;
    window.testLogoUrl = testLogoUrl;
    window.clearLogoUrl = clearLogoUrl;
    window.updateCompanyLogo = updateCompanyLogo;

    // ============================================================================
    // DEVELOPER-ONLY FUNCTIONS - SECURED
    // ============================================================================
    
    // Check if developer mode is active
    function isDeveloperMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const devParam = urlParams.get('dev');
        return devParam === 'ph1l1pp3_c4nd_d3v_2025_x7k9m';
    }
    
    // Initialize developer functions ONLY if in developer mode
    if (isDeveloperMode()) {
        console.log('🔓 Developer mode activated - Additional functions available');
        
        // License key generation - ONLY in developer mode
        window.generateKeyForCustomer = function(customerCompanyName) {
            if (!isDeveloperMode()) {
                console.error('❌ Access denied. This function is not available.');
                return null;
            }
            
            const key = generateLicenseKey(customerCompanyName);
            console.log(`✅ License Key for "${customerCompanyName}": ${key}`);
            console.log('Share this key with your customer along with their exact company name.');
            console.log('Price: $49.95 per license');
            return key;
        };
        
        // Developer diagnostic tools
        window.devTools = {
            // View all stored data
            inspectStorage: function() {
                console.log('=== Local Storage Contents ===');
                Object.keys(localStorage).forEach(key => {
                    console.log(`${key}: ${localStorage.getItem(key).substring(0, 100)}...`);
                });
            },
            
            // Generate multiple test entries
            generateTestData: function(numEntries = 10) {
                const testEmployees = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams'];
                const testProjects = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Admin Tasks'];
                const testCategories = ['work', 'overhead', 'travel', 'pto'];
                
                for (let i = 0; i < numEntries; i++) {
                    const entry = {
                        id: Date.now() + Math.random() + i,
                        employee: testEmployees[Math.floor(Math.random() * testEmployees.length)],
                        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        category: testCategories[Math.floor(Math.random() * testCategories.length)],
                        project: testProjects[Math.floor(Math.random() * testProjects.length)],
                        startTime: '09:00',
                        endTime: '17:00',
                        duration: 8.0,
                        description: `Test entry ${i + 1}`,
                        timestamp: new Date().toISOString(),
                        source: 'test-generator'
                    };
                    
                    allTimeEntries.push(entry);
                    employeeEntries.push(entry);
                    employees.add(entry.employee);
                    projects.add(entry.project);
                    categories.add(entry.category);
                }
                
                saveTimeEntries();
                if (currentMode === 'admin') {
                    refreshAdminData();
                } else {
                    updateEmployeeDisplay();
                }
                
                console.log(`✅ Generated ${numEntries} test entries`);
            },
            
            // Force license activation (for testing)
            forceLicense: function(companyName) {
                appConfig.isLicensed = true;
                appConfig.licensedCompany = companyName;
                appConfig.licenseKey = generateLicenseKey(companyName);
                appConfig.companyName = companyName;
                saveAppConfiguration();
                updateDisplay();
                updateLicenseWatermark();
                console.log(`✅ Force-licensed to: ${companyName}`);
            },
            
            // Reset everything
            factoryReset: function() {
                if (confirm('⚠️ This will delete ALL data and settings. Are you sure?')) {
                    localStorage.clear();
                    location.reload();
                }
            },
            
            // Export all data for backup
            exportEverything: function() {
                const backup = {
                    version: '1.1.10.5',
                    timestamp: new Date().toISOString(),
                    appConfig: appConfig,
                    allTimeEntries: allTimeEntries,
                    employeeEntries: employeeEntries,
                    payPeriodsConfig: payPeriodsConfig,
                    holidaysConfig: holidaysConfig,
                    localStorage: {}
                };
                
                Object.keys(localStorage).forEach(key => {
                    backup.localStorage[key] = localStorage.getItem(key);
                });
                
                const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `time_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                console.log('✅ Full backup exported');
            }
        };
        
        // Show available developer commands
        console.log('📋 Developer Commands Available:');
        console.log('  generateKeyForCustomer("Company Name") - Generate license key ($49.95)');
        console.log('  devTools.inspectStorage() - View all stored data');
        console.log('  devTools.generateTestData(10) - Generate test entries');
        console.log('  devTools.forceLicense("Company") - Force license activation');
        console.log('  devTools.exportEverything() - Export full backup');
        console.log('  devTools.factoryReset() - Reset everything');
        
    } else {
        // NOT in developer mode - these functions don't exist
        // Don't even define them to prevent discovery
        
        // Optionally, you can create a decoy that logs attempts
        Object.defineProperty(window, 'generateKeyForCustomer', {
            get: function() {
                console.warn('This function does not exist.');
                return undefined;
            },
            set: function() {
                console.warn('Cannot override system functions.');
                return false;
            },
            configurable: false
        });
    }
    
    // Standard console messages based on mode
    if (isDeveloperMode()) {
        console.log('Time Tracker Functions v1.1.10.5 - DEVELOPER MODE');
        console.log('You have full access to all developer tools');
        console.log('License price: $49.95 per customer');
    } else if (currentMode === 'admin') {
        console.log('Time Tracker Functions v1.1.10.5 - Admin Mode');
        console.log('Admin functions are available');
    } else {
        console.log('Time Tracker Functions v1.1.10.5');
        // Don't advertise any special functions
    }
    
} else {
    console.error('Window object not available');
}
console.log('Time Tracker Functions v1.1.10.5 loaded successfully');
console.log('Admin access: Add ?dev=ph1l1pp3_c4nd_d3v_2025_x7k9m to URL');
console.log('Generate license keys: generateKeyForCustomer("Company Name") - $49.95');