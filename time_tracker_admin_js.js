/*
Script: Time Tracker Admin Functions
FileName: time_tracker_admin_functions.js
Author: Philippe Addelia
Created: 2025-01-20 08:00 PST
Modified: 2025-01-20 08:00 PST
Preferred location: Modules\Time Tracker
Purpose: JavaScript functionality for Time Tracker Admin Console v1.1.1
*/

// ====================
// Global Variables
// ====================
let allTimeEntries = [];
let filteredEntries = [];
let employees = new Set();
let projects = new Set();
let categories = new Set(['Work', 'Overhead', 'Travel', 'Training', 'Leave', 'Holiday', 'Other']);
let payPeriodsConfig = null;
let selectedPayPeriod = null;

// ====================
// Initialization
// ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Console v1.1.1 initializing...');
    loadPersistedData();
    loadPayPeriodsConfig();
    updateStats();
    updateFilters();
    setupAutoSave();
    console.log('Admin Console initialization complete');
});

// ====================
// Pay Period Management
// ====================
async function loadPayPeriodsConfig() {
    try {
        // Try to load from external file first
        const response = await fetch('pay_periods_config.js');
        if (response.ok) {
            const scriptText = await response.text();
            // Extract the PAY_PERIODS_CONFIG object
            const configMatch = scriptText.match(/const PAY_PERIODS_CONFIG = ({[\s\S]*?});/);
            if (configMatch) {
                payPeriodsConfig = JSON.parse(configMatch[1]);
                console.log('Loaded pay periods from external config');
            }
        }
    } catch (error) {
        console.log('External pay periods config not found, using defaults');
    }
    
    // Use default configuration if not loaded
    if (!payPeriodsConfig) {
        payPeriodsConfig = generateDefaultPayPeriods();
    }
    
    populatePayPeriodDropdown();
}

function generateDefaultPayPeriods() {
    const periods = [];
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    
    let currentStart = new Date(startDate);
    let periodNumber = 1;
    
    while (currentStart <= endDate) {
        const periodEnd = new Date(currentStart);
        periodEnd.setDate(periodEnd.getDate() + 13); // 14-day periods
        
        periods.push({
            id: `PP${String(periodNumber).padStart(2, '0')}-2025`,
            name: `Pay Period ${periodNumber} - 2025`,
            startDate: currentStart.toISOString().split('T')[0],
            endDate: periodEnd.toISOString().split('T')[0],
            number: periodNumber,
            year: 2025
        });
        
        currentStart = new Date(periodEnd);
        currentStart.setDate(currentStart.getDate() + 1);
        periodNumber++;
    }
    
    return {
        payPeriods: periods,
        configVersion: "1.1.1",
        lastUpdated: new Date().toISOString().split('T')[0],
        company: "NAKUPUNA CONSULTING"
    };
}

function populatePayPeriodDropdown() {
    const select = document.getElementById('payPeriodSelect');
    if (!select || !payPeriodsConfig) return;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add pay periods
    payPeriodsConfig.payPeriods.forEach(period => {
        const option = document.createElement('option');
        option.value = period.id;
        option.textContent = `${period.name} (${formatDate(period.startDate)} - ${formatDate(period.endDate)})`;
        select.appendChild(option);
    });
}

function filterByPayPeriod() {
    const select = document.getElementById('payPeriodSelect');
    const selectedId = select.value;
    
    if (!selectedId) {
        selectedPayPeriod = null;
        document.getElementById('payPeriodInfo').innerHTML = '';
        applyFilters();
        return;
    }
    
    selectedPayPeriod = payPeriodsConfig.payPeriods.find(p => p.id === selectedId);
    if (selectedPayPeriod) {
        displayPayPeriodInfo();
        // Set date filters to match pay period
        document.getElementById('startDate').value = selectedPayPeriod.startDate;
        document.getElementById('endDate').value = selectedPayPeriod.endDate;
        applyFilters();
    }
}

function displayPayPeriodInfo() {
    if (!selectedPayPeriod) return;
    
    const infoDiv = document.getElementById('payPeriodInfo');
    const workDays = calculateWorkDays(selectedPayPeriod.startDate, selectedPayPeriod.endDate);
    const targetHours = workDays * 8;
    
    // Calculate actual hours for this period
    const periodEntries = allTimeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        const start = new Date(selectedPayPeriod.startDate);
        const end = new Date(selectedPayPeriod.endDate);
        return entryDate >= start && entryDate <= end;
    });
    
    const totalHours = periodEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const uniqueEmployees = new Set(periodEntries.map(e => e.employee)).size;
    
    infoDiv.innerHTML = `
        <div class="pay-period-detail">
            <span class="label">Period:</span>
            <span class="value">${selectedPayPeriod.name}</span>
        </div>
        <div class="pay-period-detail">
            <span class="label">Date Range:</span>
            <span class="value">${formatDate(selectedPayPeriod.startDate)} - ${formatDate(selectedPayPeriod.endDate)}</span>
        </div>
        <div class="pay-period-detail">
            <span class="label">Work Days:</span>
            <span class="value">${workDays}</span>
        </div>
        <div class="pay-period-detail">
            <span class="label">Target Hours:</span>
            <span class="value">${targetHours}h</span>
        </div>
        <div class="pay-period-detail">
            <span class="label">Actual Hours:</span>
            <span class="value">${totalHours.toFixed(1)}h</span>
        </div>
        <div class="pay-period-detail">
            <span class="label">Employees:</span>
            <span class="value">${uniqueEmployees}</span>
        </div>
    `;
}

function calculateWorkDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
            workDays++;
        }
    }
    
    return workDays;
}

// ====================
// File Import Functions
// ====================
function selectFiles() {
    document.getElementById('fileInput').click();
}

async function importFiles(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    let totalImported = 0;
    let totalSkipped = 0;
    
    showStatus(`Processing ${files.length} file(s)...`, 'info', 'importStatus');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await processCSVFile(file);
        totalImported += result.imported;
        totalSkipped += result.skipped;
    }
    
    performDataValidation();
    updateStats();
    updateFilters();
    saveDataToPersistence();
    switchView();
    
    showStatus(`Import complete: ${totalImported} entries imported, ${totalSkipped} duplicates skipped`, 'success', 'importStatus');
    
    // Clear file input for next import
    event.target.value = '';
}

async function processCSVFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                resolve({ imported: 0, skipped: 0 });
                return;
            }
            
            // Parse headers
            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
            const columnMap = mapColumns(headers);
            
            // Extract employee name from filename if not in data
            const employeeName = extractEmployeeFromFilename(file.name);
            
            let imported = 0;
            let skipped = 0;
            
            // Process data rows
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length === 0) continue;
                
                const entry = createEntryFromCSV(values, columnMap, employeeName);
                if (entry && !isDuplicate(entry)) {
                    entry.id = generateEntryId();
                    allTimeEntries.push(entry);
                    
                    // Update sets
                    employees.add(entry.employee);
                    projects.add(entry.project);
                    categories.add(entry.category);
                    
                    imported++;
                } else {
                    skipped++;
                }
            }
            
            resolve({ imported, skipped });
        };
        
        reader.readAsText(file);
    });
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    if (current) {
        result.push(current.trim());
    }
    
    return result;
}

function mapColumns(headers) {
    const map = {};
    
    // Map column indices
    headers.forEach((header, index) => {
        if (header.includes('employee') || header === 'name') {
            map.employee = index;
        } else if (header.includes('date')) {
            map.date = index;
        } else if (header.includes('start')) {
            map.startTime = index;
        } else if (header.includes('end')) {
            map.endTime = index;
        } else if (header.includes('category') || header === 'type') {
            map.category = index;
        } else if (header.includes('project')) {
            map.project = index;
        } else if (header.includes('duration') || header.includes('hours')) {
            map.duration = index;
        }
    });
    
    return map;
}

function createEntryFromCSV(values, columnMap, defaultEmployee) {
    const entry = {
        employee: values[columnMap.employee] || defaultEmployee || 'Unknown',
        date: values[columnMap.date] || '',
        startTime: values[columnMap.startTime] || '',
        endTime: values[columnMap.endTime] || '',
        category: values[columnMap.category] || 'Work',
        project: values[columnMap.project] || 'No Project',
        duration: 0,
        isValid: false
    };
    
    // Validate and format date
    if (entry.date) {
        const parsedDate = new Date(entry.date);
        if (!isNaN(parsedDate)) {
            entry.date = parsedDate.toISOString().split('T')[0];
        } else {
            return null;
        }
    } else {
        return null;
    }
    
    // Calculate duration
    if (columnMap.duration !== undefined && values[columnMap.duration]) {
        entry.duration = parseFloat(values[columnMap.duration]) || 0;
    } else if (entry.startTime && entry.endTime) {
        entry.duration = calculateDuration(entry.startTime, entry.endTime);
    }
    
    return entry;
}

function calculateDuration(startTime, endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    if (!start || !end) return 0;
    
    let duration = (end - start) / 3600000; // Convert to hours
    if (duration < 0) duration += 24; // Handle overnight shifts
    
    return Math.round(duration * 100) / 100;
}

function parseTime(timeStr) {
    if (!timeStr) return null;
    
    // Remove any whitespace
    timeStr = timeStr.trim();
    
    // Handle various time formats
    const formats = [
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/,  // HH:MM or HH:MM:SS
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,     // HH:MM AM/PM
    ];
    
    for (const format of formats) {
        const match = timeStr.match(format);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            
            // Handle AM/PM
            if (match[3] && match[3].toUpperCase() === 'PM' && hours < 12) {
                hours += 12;
            } else if (match[3] && match[3].toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
            
            const date = new Date(2000, 0, 1, hours, minutes);
            return date;
        }
    }
    
    return null;
}

function extractEmployeeFromFilename(filename) {
    // Try to extract employee name from filename
    // Expected format: "EmployeeName-TimeSheet.csv" or "EmployeeName_TimeSheet.csv"
    const match = filename.match(/^([^-_]+)[-_]/);
    return match ? match[1].replace(/([A-Z])/g, ' $1').trim() : null;
}

function isDuplicate(newEntry) {
    return allTimeEntries.some(entry => 
        entry.employee === newEntry.employee &&
        entry.date === newEntry.date &&
        entry.startTime === newEntry.startTime &&
        entry.endTime === newEntry.endTime
    );
}

function generateEntryId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// ====================
// Data Management Functions
// ====================
function cleanData() {
    showStatus('Cleaning data...', 'info', 'managementStatus');
    
    let cleaned = 0;
    
    // Remove entries with zero duration
    const beforeCount = allTimeEntries.length;
    allTimeEntries = allTimeEntries.filter(entry => entry.duration > 0);
    cleaned = beforeCount - allTimeEntries.length;
    
    // Remove duplicate entries
    const uniqueEntries = [];
    const seen = new Set();
    
    allTimeEntries.forEach(entry => {
        const key = `${entry.employee}-${entry.date}-${entry.startTime}-${entry.endTime}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueEntries.push(entry);
        } else {
            cleaned++;
        }
    });
    
    allTimeEntries = uniqueEntries;
    
    updateEmployeesAndProjects();
    performDataValidation();
    updateStats();
    updateFilters();
    saveDataToPersistence();
    switchView();
    
    showStatus(`Data cleaned: ${cleaned} entries removed`, 'success', 'managementStatus');
}

function performDataValidation() {
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    
    const seen = new Map();
    
    allTimeEntries.forEach(entry => {
        const key = `${entry.employee}-${entry.date}-${entry.startTime}`;
        
        // Check for duplicates
        if (seen.has(key)) {
            entry.isDuplicate = true;
            duplicateCount++;
        } else {
            entry.isDuplicate = false;
            seen.set(key, entry);
        }
        
        // Validate entry
        entry.isValid = validateEntry(entry);
        if (entry.isValid && !entry.isDuplicate) {
            validCount++;
        } else if (!entry.isValid) {
            invalidCount++;
        }
    });
    
    // Update data quality metric
    const totalEntries = allTimeEntries.length;
    const qualityPercentage = totalEntries > 0 ? 
        Math.round((validCount / totalEntries) * 100) : 100;
    
    document.getElementById('dataQuality').textContent = `${qualityPercentage}%`;
    
    console.log(`Validation complete: ${validCount} valid, ${invalidCount} invalid, ${duplicateCount} duplicates`);
}

function validateEntry(entry) {
    // Check required fields
    if (!entry.employee || !entry.date || !entry.startTime || !entry.endTime) {
        return false;
    }
    
    // Check duration is positive
    if (entry.duration <= 0 || entry.duration > 24) {
        return false;
    }
    
    // Check date is valid
    const date = new Date(entry.date);
    if (isNaN(date)) {
        return false;
    }
    
    return true;
}

function generateSummary() {
    showStatus('Generating summary...', 'info', 'managementStatus');
    
    const summary = {
        totalEntries: allTimeEntries.length,
        validEntries: allTimeEntries.filter(e => e.isValid && !e.isDuplicate).length,
        invalidEntries: allTimeEntries.filter(e => !e.isValid).length,
        duplicateEntries: allTimeEntries.filter(e => e.isDuplicate).length,
        totalHours: allTimeEntries.reduce((sum, e) => sum + (e.duration || 0), 0),
        employees: employees.size,
        projects: projects.size,
        categories: categories.size
    };
    
    // Display summary in data display area
    const displayArea = document.getElementById('dataDisplay');
    displayArea.innerHTML = `
        <div class="summary-grid">
            <div class="summary-card">
                <h4>Data Summary</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Total Entries:</span>
                        <span>${summary.totalEntries}</span>
                    </div>
                    <div class="summary-row">
                        <span>Valid Entries:</span>
                        <span class="status-valid">${summary.validEntries}</span>
                    </div>
                    <div class="summary-row">
                        <span>Invalid Entries:</span>
                        <span class="status-invalid">${summary.invalidEntries}</span>
                    </div>
                    <div class="summary-row">
                        <span>Duplicate Entries:</span>
                        <span class="status-duplicate">${summary.duplicateEntries}</span>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <h4>Hours Summary</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Total Hours:</span>
                        <span>${summary.totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Average per Entry:</span>
                        <span>${summary.totalEntries > 0 ? (summary.totalHours / summary.totalEntries).toFixed(1) : 0}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Average per Employee:</span>
                        <span>${summary.employees > 0 ? (summary.totalHours / summary.employees).toFixed(1) : 0}h</span>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <h4>Entities Summary</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Employees:</span>
                        <span>${summary.employees}</span>
                    </div>
                    <div class="summary-row">
                        <span>Projects:</span>
                        <span>${summary.projects}</span>
                    </div>
                    <div class="summary-row">
                        <span>Categories:</span>
                        <span>${summary.categories}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showStatus('Summary generated successfully', 'success', 'managementStatus');
}

function clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        return;
    }
    
    if (!confirm('This will permanently delete all imported time entries. Are you absolutely sure?')) {
        return;
    }
    
    allTimeEntries = [];
    filteredEntries = [];
    employees.clear();
    projects.clear();
    categories = new Set(['Work', 'Overhead', 'Travel', 'Training', 'Leave', 'Holiday', 'Other']);
    
    updateStats();
    updateFilters();
    clearPersistedData();
    switchView();
    
    showStatus('All data has been cleared', 'info', 'managementStatus');
}

// ====================
// Filter Functions
// ====================
function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const employee = document.getElementById('employeeFilter').value;
    const category = document.getElementById('categoryFilter').value;
    const project = document.getElementById('projectFilter').value;
    
    filteredEntries = allTimeEntries.filter(entry => {
        // Date filters
        if (startDate && entry.date < startDate) return false;
        if (endDate && entry.date > endDate) return false;
        
        // Employee filter
        if (employee && entry.employee !== employee) return false;
        
        // Category filter
        if (category && entry.category !== category) return false;
        
        // Project filter
        if (project && entry.project !== project) return false;
        
        return true;
    });
    
    switchView();
}

function updateFilters() {
    // Update employee filter
    const employeeFilter = document.getElementById('employeeFilter');
    const currentEmployee = employeeFilter.value;
    employeeFilter.innerHTML = '<option value="">All Employees</option>';
    
    Array.from(employees).sort().forEach(emp => {
        const option = document.createElement('option');
        option.value = emp;
        option.textContent = emp;
        if (emp === currentEmployee) option.selected = true;
        employeeFilter.appendChild(option);
    });
    
    // Update category filter
    const categoryFilter = document.getElementById('categoryFilter');
    const currentCategory = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    Array.from(categories).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === currentCategory) option.selected = true;
        categoryFilter.appendChild(option);
    });
    
    // Update project filter
    const projectFilter = document.getElementById('projectFilter');
    const currentProject = projectFilter.value;
    projectFilter.innerHTML = '<option value="">All Projects</option>';
    
    Array.from(projects).sort().forEach(proj => {
        const option = document.createElement('option');
        option.value = proj;
        option.textContent = proj;
        if (proj === currentProject) option.selected = true;
        projectFilter.appendChild(option);
    });
}

// ====================
// View Functions
// ====================
function switchView() {
    const viewMode = document.querySelector('input[name="viewMode"]:checked').value;
    const displayArea = document.getElementById('dataDisplay');
    
    const entriesToShow = filteredEntries.length > 0 ? filteredEntries : allTimeEntries;
    
    if (entriesToShow.length === 0) {
        displayArea.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>No Data Available</h3>
                <p>Import timesheet CSV files to begin analysis</p>
            </div>
        `;
        return;
    }
    
    switch (viewMode) {
        case 'all':
            displayAllEntries(entriesToShow);
            break;
        case 'individual':
            displayByIndividual(entriesToShow);
            break;
        case 'category':
            displayByCategory(entriesToShow);
            break;
        case 'project':
            displayByProject(entriesToShow);
            break;
        case 'analytics':
            displayAnalytics(entriesToShow);
            break;
        case 'payperiod':
            displayByPayPeriod(entriesToShow);
            break;
        default:
            displayAllEntries(entriesToShow);
    }
}

function displayAllEntries(entries) {
    const displayArea = document.getElementById('dataDisplay');
    
    // Sort entries by date (newest first), then by employee
    entries.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.employee.localeCompare(b.employee);
    });
    
    let html = `
        <h3>All Time Entries (${entries.length})</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Project</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    entries.forEach(entry => {
        const statusClass = entry.isDuplicate ? 'duplicate-entry' : (entry.isValid ? 'valid-entry' : 'invalid-entry');
        const statusText = entry.isDuplicate ? 'DUPLICATE' : (entry.isValid ? 'Valid' : 'Invalid');
        const statusTextClass = entry.isDuplicate ? 'status-duplicate' : (entry.isValid ? 'status-valid' : 'status-invalid');
        
        html += `
            <tr class="${statusClass}">
                <td>${entry.employee}</td>
                <td>${formatDate(entry.date)}</td>
                <td><span class="category-badge category-${entry.category.toLowerCase()}">${entry.category}</span></td>
                <td>${entry.project}</td>
                <td>${entry.startTime}</td>
                <td>${entry.endTime}</td>
                <td>${entry.duration.toFixed(1)}h</td>
                <td><span class="${statusTextClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="editEntry('${entry.id}')">Edit</button>
                        <button class="delete-btn" onclick="deleteEntry('${entry.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    displayArea.innerHTML = html;
}

function displayByIndividual(entries) {
    const displayArea = document.getElementById('dataDisplay');
    
    // Group by employee
    const byEmployee = {};
    entries.forEach(entry => {
        if (!byEmployee[entry.employee]) {
            byEmployee[entry.employee] = [];
        }
        byEmployee[entry.employee].push(entry);
    });
    
    let html = '<h3>Time Entries by Individual</h3>';
    html += '<div class="summary-grid">';
    
    Object.keys(byEmployee).sort().forEach(employee => {
        const empEntries = byEmployee[employee];
        const totalHours = empEntries.reduce((sum, e) => sum + e.duration, 0);
        const avgHours = totalHours / empEntries.length;
        
        html += `
            <div class="summary-card">
                <h4>${employee}</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Total Entries:</span>
                        <span>${empEntries.length}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Hours:</span>
                        <span>${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Average Hours:</span>
                        <span>${avgHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Projects:</span>
                        <span>${new Set(empEntries.map(e => e.project)).size}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    displayArea.innerHTML = html;
}

function displayByCategory(entries) {
    const displayArea = document.getElementById('dataDisplay');
    
    // Group by category
    const byCategory = {};
    entries.forEach(entry => {
        if (!byCategory[entry.category]) {
            byCategory[entry.category] = [];
        }
        byCategory[entry.category].push(entry);
    });
    
    let html = '<h3>Time Entries by Category</h3>';
    html += '<div class="summary-grid">';
    
    Object.keys(byCategory).sort().forEach(category => {
        const catEntries = byCategory[category];
        const totalHours = catEntries.reduce((sum, e) => sum + e.duration, 0);
        const employees = new Set(catEntries.map(e => e.employee)).size;
        
        html += `
            <div class="summary-card">
                <h4><span class="category-badge category-${category.toLowerCase()}">${category}</span></h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Total Entries:</span>
                        <span>${catEntries.length}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Hours:</span>
                        <span>${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Employees:</span>
                        <span>${employees}</span>
                    </div>
                    <div class="summary-row">
                        <span>Percentage:</span>
                        <span>${((totalHours / entries.reduce((sum, e) => sum + e.duration, 0)) * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    displayArea.innerHTML = html;
}

function displayByProject(entries) {
    const displayArea = document.getElementById('dataDisplay');
    
    // Group by project
    const byProject = {};
    entries.forEach(entry => {
        if (!byProject[entry.project]) {
            byProject[entry.project] = [];
        }
        byProject[entry.project].push(entry);
    });
    
    let html = '<h3>Time Entries by Project</h3>';
    html += '<div class="summary-grid">';
    
    Object.keys(byProject).sort().forEach(project => {
        const projEntries = byProject[project];
        const totalHours = projEntries.reduce((sum, e) => sum + e.duration, 0);
        const employees = new Set(projEntries.map(e => e.employee)).size;
        
        html += `
            <div class="summary-card">
                <h4>${project}</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Total Entries:</span>
                        <span>${projEntries.length}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Hours:</span>
                        <span>${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Employees:</span>
                        <span>${employees}</span>
                    </div>
                    <div class="summary-row">
                        <span>Avg per Entry:</span>
                        <span>${(totalHours / projEntries.length).toFixed(1)}h</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    displayArea.innerHTML = html;
}

function displayAnalytics(entries) {
    const displayArea = document.getElementById('dataDisplay');
    
    // Calculate analytics
    const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);
    const avgHoursPerEntry = totalHours / entries.length;
    const employees = new Set(entries.map(e => e.employee));
    const projects = new Set(entries.map(e => e.project));
    
    // Get date range
    const dates = entries.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Category breakdown
    const categoryBreakdown = {};
    entries.forEach(entry => {
        categoryBreakdown[entry.category] = (categoryBreakdown[entry.category] || 0) + entry.duration;
    });
    
    let html = `
        <h3>Analytics Dashboard</h3>
        <div class="summary-grid">
            <div class="summary-card">
                <h4>Overall Statistics</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Total Hours:</span>
                        <span>${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Entries:</span>
                        <span>${entries.length}</span>
                    </div>
                    <div class="summary-row">
                        <span>Unique Employees:</span>
                        <span>${employees.size}</span>
                    </div>
                    <div class="summary-row">
                        <span>Unique Projects:</span>
                        <span>${projects.size}</span>
                    </div>
                    <div class="summary-row">
                        <span>Date Range:</span>
                        <span>${daysDiff} days</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>Averages</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Avg Hours/Entry:</span>
                        <span>${avgHoursPerEntry.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Avg Hours/Employee:</span>
                        <span>${(totalHours / employees.size).toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Avg Hours/Day:</span>
                        <span>${(totalHours / daysDiff).toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Avg Entries/Day:</span>
                        <span>${(entries.length / daysDiff).toFixed(1)}</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>Category Distribution</h4>
                <div class="summary-details">
                    ${Object.entries(categoryBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, hours]) => `
                            <div class="summary-row">
                                <span>${cat}:</span>
                                <span>${hours.toFixed(1)}h (${((hours/totalHours)*100).toFixed(1)}%)</span>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
    
    displayArea.innerHTML = html;
}

function displayByPayPeriod(entries) {
    const displayArea = document.getElementById('dataDisplay');
    
    if (!payPeriodsConfig) {
        displayArea.innerHTML = '<p>Pay periods configuration not loaded</p>';
        return;
    }
    
    // Group entries by pay period
    const byPayPeriod = {};
    
    payPeriodsConfig.payPeriods.forEach(period => {
        byPayPeriod[period.id] = {
            period: period,
            entries: []
        };
    });
    
    entries.forEach(entry => {
        const entryDate = new Date(entry.date);
        
        for (const period of payPeriodsConfig.payPeriods) {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            
            if (entryDate >= start && entryDate <= end) {
                byPayPeriod[period.id].entries.push(entry);
                break;
            }
        }
    });
    
    let html = '<h3>Time Entries by Pay Period</h3>';
    html += '<div class="summary-grid">';
    
    Object.values(byPayPeriod).forEach(({period, entries: periodEntries}) => {
        if (periodEntries.length === 0) return;
        
        const totalHours = periodEntries.reduce((sum, e) => sum + e.duration, 0);
        const employees = new Set(periodEntries.map(e => e.employee)).size;
        const workDays = calculateWorkDays(period.startDate, period.endDate);
        const targetHours = workDays * 8 * employees;
        const efficiency = targetHours > 0 ? (totalHours / targetHours * 100) : 0;
        
        html += `
            <div class="summary-card">
                <h4>${period.name}</h4>
                <div class="summary-details">
                    <div class="summary-row">
                        <span>Date Range:</span>
                        <span>${formatDate(period.startDate)} - ${formatDate(period.endDate)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Hours:</span>
                        <span>${totalHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Target Hours:</span>
                        <span>${targetHours.toFixed(1)}h</span>
                    </div>
                    <div class="summary-row">
                        <span>Efficiency:</span>
                        <span>${efficiency.toFixed(1)}%</span>
                    </div>
                    <div class="summary-row">
                        <span>Employees:</span>
                        <span>${employees}</span>
                    </div>
                    <div class="summary-row">
                        <span>Entries:</span>
                        <span>${periodEntries.length}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    displayArea.innerHTML = html;
}

// ====================
// Edit Functions
// ====================
function editEntry(entryId) {
    const entry = allTimeEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    // Find the table row
    const rows = document.querySelectorAll('.data-table tbody tr');
    let targetRow = null;
    
    rows.forEach(row => {
        if (row.innerHTML.includes(entryId)) {
            targetRow = row;
        }
    });
    
    if (!targetRow) return;
    
    // Replace row with edit form
    targetRow.innerHTML = `
        <td><input type="text" class="edit-input" id="edit-employee-${entryId}" value="${entry.employee}"></td>
        <td><input type="date" class="edit-input" id="edit-date-${entryId}" value="${entry.date}"></td>
        <td>
            <select class="edit-select" id="edit-category-${entryId}">
                ${Array.from(categories).map(cat => 
                    `<option value="${cat}" ${cat === entry.category ? 'selected' : ''}>${cat}</option>`
                ).join('')}
            </select>
        </td>
        <td><input type="text" class="edit-input" id="edit-project-${entryId}" value="${entry.project}"></td>
        <td><input type="time" class="edit-input" id="edit-start-${entryId}" value="${entry.startTime}" onchange="updateDuration('${entryId}')"></td>
        <td><input type="time" class="edit-input" id="edit-end-${entryId}" value="${entry.endTime}" onchange="updateDuration('${entryId}')"></td>
        <td><span id="edit-duration-${entryId}">${entry.duration.toFixed(1)}h</span></td>
        <td><span class="status-valid">Editing...</span></td>
        <td>
            <div class="action-buttons">
                <button class="save-btn" onclick="saveEntry('${entryId}')">Save</button>
                <button class="cancel-btn" onclick="switchView()">Cancel</button>
            </div>
        </td>
    `;
}

function updateDuration(entryId) {
    const startInput = document.getElementById(`edit-start-${entryId}`);
    const endInput = document.getElementById(`edit-end-${entryId}`);
    const durationSpan = document.getElementById(`edit-duration-${entryId}`);
    
    if (startInput && endInput && startInput.value && endInput.value) {
        const duration = calculateDuration(startInput.value, endInput.value);
        durationSpan.textContent = `${duration.toFixed(1)}h`;
    }
}

function saveEntry(entryId) {
    const entry = allTimeEntries.find(e => e.id === entryId);
    if (!entry) {
        alert('Entry not found');
        return;
    }
    
    // Get updated values
    const newEmployee = document.getElementById(`edit-employee-${entryId}`).value.trim();
    const newDate = document.getElementById(`edit-date-${entryId}`).value;
    const newCategory = document.getElementById(`edit-category-${entryId}`).value;
    const newProject = document.getElementById(`edit-project-${entryId}`).value.trim() || 'No Project';
    const newStartTime = document.getElementById(`edit-start-${entryId}`).value;
    const newEndTime = document.getElementById(`edit-end-${entryId}`).value;
    
    // Validate inputs
    if (!newEmployee || !newDate || !newStartTime || !newEndTime) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Update entry
    entry.employee = newEmployee;
    entry.date = newDate;
    entry.category = newCategory;
    entry.project = newProject;
    entry.startTime = newStartTime;
    entry.endTime = newEndTime;
    entry.duration = calculateDuration(newStartTime, newEndTime);
    
    // Update sets
    employees.add(newEmployee);
    projects.add(newProject);
    categories.add(newCategory);
    
    // Revalidate and refresh
    performDataValidation();
    updateStats();
    updateFilters();
    saveDataToPersistence();
    switchView();
    
    showStatus('Entry updated successfully', 'success', 'importStatus');
}

function deleteEntry(entryId) {
    const entry = allTimeEntries.find(e => e.id === entryId);
    if (!entry) {
        alert('Entry not found');
        return;
    }
    
    const confirmDelete = confirm(
        `Delete this entry?\n\n` +
        `Employee: ${entry.employee}\n` +
        `Date: ${entry.date}\n` +
        `Project: ${entry.project}\n` +
        `Duration: ${entry.duration}h\n\n` +
        `This action cannot be undone.`
    );
    
    if (confirmDelete) {
        // Remove entry from array
        const entryIndex = allTimeEntries.findIndex(e => e.id === entryId);
        if (entryIndex > -1) {
            allTimeEntries.splice(entryIndex, 1);
        }
        
        // Update sets
        updateEmployeesAndProjects();
        
        // Update displays
        performDataValidation();
        updateStats();
        updateFilters();
        saveDataToPersistence();
        switchView();
        
        showStatus('Entry deleted successfully', 'success', 'importStatus');
    }
}

// ====================
// Export Functions
// ====================
function exportToCSV() {
    if (allTimeEntries.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['Employee', 'Date', 'Category', 'Project', 'Start Time', 'End Time', 'Duration (Hours)', 'Status'];
    const rows = allTimeEntries.map(entry => [
        entry.employee,
        entry.date,
        entry.category,
        entry.project,
        entry.startTime,
        entry.endTime,
        entry.duration.toFixed(2),
        entry.isDuplicate ? 'Duplicate' : (entry.isValid ? 'Valid' : 'Invalid')
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    downloadFile(csvContent, 'time_entries_export.csv', 'text/csv');
}

function exportToExcel() {
    if (allTimeEntries.length === 0) {
        alert('No data to export');
        return;
    }
    
    const ws_data = [
        ['Employee', 'Date', 'Category', 'Project', 'Start Time', 'End Time', 'Duration (Hours)', 'Status']
    ];
    
    allTimeEntries.forEach(entry => {
        ws_data.push([
            entry.employee,
            entry.date,
            entry.category,
            entry.project,
            entry.startTime,
            entry.endTime,
            entry.duration,
            entry.isDuplicate ? 'Duplicate' : (entry.isValid ? 'Valid' : 'Invalid')
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries');
    
    XLSX.writeFile(wb, 'time_entries_export.xlsx');
}

function exportToJSON() {
    if (allTimeEntries.length === 0) {
        alert('No data to export');
        return;
    }
    
    const jsonData = JSON.stringify(allTimeEntries, null, 2);
    downloadFile(jsonData, 'time_entries_export.json', 'application/json');
}

function generateReport() {
    if (allTimeEntries.length === 0) {
        alert('No data to generate report');
        return;
    }
    
    const reportDate = new Date().toLocaleDateString();
    const totalHours = allTimeEntries.reduce((sum, e) => sum + e.duration, 0);
    const validEntries = allTimeEntries.filter(e => e.isValid && !e.isDuplicate).length;
    
    let reportContent = `TIME TRACKING REPORT\n`;
    reportContent += `Generated: ${reportDate}\n`;
    reportContent += `Organization: NAKUPUNA CONSULTING\n`;
    reportContent += `${'='.repeat(50)}\n\n`;
    
    reportContent += `SUMMARY\n`;
    reportContent += `${'='.repeat(50)}\n`;
    reportContent += `Total Entries: ${allTimeEntries.length}\n`;
    reportContent += `Valid Entries: ${validEntries}\n`;
    reportContent += `Total Hours: ${totalHours.toFixed(1)}\n`;
    reportContent += `Unique Employees: ${employees.size}\n`;
    reportContent += `Unique Projects: ${projects.size}\n\n`;
    
    reportContent += `EMPLOYEE BREAKDOWN\n`;
    reportContent += `${'='.repeat(50)}\n`;
    
    const byEmployee = {};
    allTimeEntries.forEach(entry => {
        if (!byEmployee[entry.employee]) {
            byEmployee[entry.employee] = { hours: 0, entries: 0 };
        }
        byEmployee[entry.employee].hours += entry.duration;
        byEmployee[entry.employee].entries++;
    });
    
    Object.keys(byEmployee).sort().forEach(emp => {
        reportContent += `${emp}: ${byEmployee[emp].hours.toFixed(1)}h (${byEmployee[emp].entries} entries)\n`;
    });
    
    reportContent += `\nPROJECT BREAKDOWN\n`;
    reportContent += `${'='.repeat(50)}\n`;
    
    const byProject = {};
    allTimeEntries.forEach(entry => {
        if (!byProject[entry.project]) {
            byProject[entry.project] = 0;
        }
        byProject[entry.project] += entry.duration;
    });
    
    Object.keys(byProject).sort().forEach(proj => {
        reportContent += `${proj}: ${byProject[proj].toFixed(1)}h\n`;
    });
    
    downloadFile(reportContent, 'time_tracking_report.txt', 'text/plain');
}

// ====================
// Utility Functions
// ====================
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function showStatus(message, type, elementId) {
    const statusElement = document.getElementById(elementId);
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

function updateStats() {
    // Update team count
    document.getElementById('teamCount').textContent = employees.size;
    
    // Update total hours
    const totalHours = allTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    document.getElementById('totalHours').textContent = totalHours.toFixed(1);
    
    // Update project count
    document.getElementById('projectCount').textContent = projects.size;
    
    // Update date range
    if (allTimeEntries.length > 0) {
        const dates = allTimeEntries.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('dateRange').textContent = 
            `${formatDate(minDate.toISOString())} - ${formatDate(maxDate.toISOString())}`;
    } else {
        document.getElementById('dateRange').textContent = '--';
    }
    
    // Update last updated
    const now = new Date();
    document.getElementById('lastUpdated').textContent = 
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateEmployeesAndProjects() {
    employees.clear();
    projects.clear();
    
    allTimeEntries.forEach(entry => {
        employees.add(entry.employee);
        projects.add(entry.project);
        categories.add(entry.category);
    });
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadSampleCSV() {
    const sampleData = `Employee Name,Date,Category,Project,Start Time,End Time,Duration (Hours)
John Doe,2025-01-15,Work,Project Alpha,09:00,12:00,3.0
John Doe,2025-01-15,Work,Project Alpha,13:00,17:30,4.5
Jane Smith,2025-01-15,Overhead,Admin Tasks,08:30,10:30,2.0
Jane Smith,2025-01-15,Training,Python Course,10:30,12:00,1.5
Bob Johnson,2025-01-16,Travel,Client Visit,07:00,11:00,4.0
Bob Johnson,2025-01-16,Work,Project Beta,13:00,18:00,5.0`;
    
    downloadFile(sampleData, 'sample_timesheet.csv', 'text/csv');
}

// ====================
// Data Persistence
// ====================
function saveDataToPersistence() {
    try {
        const dataToSave = {
            allTimeEntries,
            employees: Array.from(employees),
            projects: Array.from(projects),
            categories: Array.from(categories),
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('adminConsoleData', JSON.stringify(dataToSave));
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadPersistedData() {
    try {
        const savedData = localStorage.getItem('adminConsoleData');
        if (savedData) {
            const data = JSON.parse(savedData);
            allTimeEntries = data.allTimeEntries || [];
            employees = new Set(data.employees || []);
            projects = new Set(data.projects || []);
            categories = new Set(data.categories || ['Work', 'Overhead', 'Travel', 'Training', 'Leave', 'Holiday', 'Other']);
            
            // Re-validate data after loading
            performDataValidation();
            
            console.log(`Loaded ${allTimeEntries.length} entries from localStorage`);
            
            if (allTimeEntries.length > 0) {
                showStatus(`Restored ${allTimeEntries.length} entries from previous session`, 'info', 'importStatus');
            }
        }
    } catch (error) {
        console.error('Error loading persisted data:', error);
        // Clear corrupted data
        localStorage.removeItem('adminConsoleData');
    }
}

function clearPersistedData() {
    try {
        localStorage.removeItem('adminConsoleData');
        console.log('Cleared persisted data');
    } catch (error) {
        console.error('Error clearing persisted data:', error);
    }
}

function setupAutoSave() {
    // Auto-save every 30 seconds if there's data
    setInterval(() => {
        if (allTimeEntries.length > 0) {
            saveDataToPersistence();
        }
    }, 30000);
}

// Initialize filtered entries
filteredEntries = allTimeEntries;

console.log('Admin Console Functions v1.1.1 loaded successfully');