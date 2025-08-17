/* 
Time Tracker Functions - All Business Logic
Version: 1.1.2
Created: August 17, 2025 PST
Preferred location: Main time tracker directory
Purpose: Separated functionality following code-behind pattern
*/

const TimeTracker = {
    // State variables
    timeEntries: [],
    currentSession: null,
    timerInterval: null,
    isRunning: false,
    dailyTarget: 8,
    currentView: 'detailed',
    payPeriodsConfig: null,
    selectedPayPeriod: null,
    companyHolidays: [],

    // Public API
    init() {
        console.log('Time tracker initializing...');
        
        this.loadData();
        console.log('After loadData, timeEntries:', this.timeEntries, 'Type:', typeof this.timeEntries, 'IsArray:', Array.isArray(this.timeEntries));
        
        this.loadSettings();
        this.setupEventListeners();
        this.loadPayPeriodsConfig();
        this.updateDisplay();
        
        console.log('Time tracker initialization complete');
    },

    // Event Listeners Setup
    setupEventListeners() {
        // Employee name and daily target changes
        document.getElementById('employeeName').addEventListener('input', () => this.saveSettings());
        document.getElementById('dailyTarget').addEventListener('input', () => {
            this.saveSettings();
            this.updateDisplay();
        });

        // Pay period changes
        document.getElementById('payPeriodSelect').addEventListener('change', () => this.onPayPeriodChange());
        document.getElementById('periodStart').addEventListener('change', () => this.onCustomDateChange());
        document.getElementById('periodEnd').addEventListener('change', () => this.onCustomDateChange());

        // Timer button
        document.getElementById('timerButton').addEventListener('click', () => this.toggleTimer());

        // Export/Import buttons
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('importBtn').addEventListener('click', () => this.importCSV());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAllData());

        // View buttons
        document.querySelectorAll('.view-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.setView(e.target.dataset.view));
        });

        // CSV file input
        document.getElementById('csvFileInput').addEventListener('change', (e) => this.handleCSVImport(e));
    },

    // Pay Period Configuration Management - Hybrid Approach
    async loadPayPeriodsConfig() {
        console.log('Loading pay periods configuration...');
        
        // Try multiple approaches in order of preference
        const loadStrategies = [
            () => this.loadExternalJSON(),           // Best: External JSON (PowerShell compatible)
            () => this.loadEmbeddedConfig(),         // Fallback: Embedded JS config
            () => this.enableManualDateSelection()   // Last resort: Manual dates
        ];
        
        for (const strategy of loadStrategies) {
            try {
                const result = await strategy();
                if (result) {
                    console.log('Pay periods config loaded successfully');
                    return;
                }
            } catch (error) {
                console.warn('Config loading strategy failed:', error.message);
                continue;
            }
        }
        
        console.error('All config loading strategies failed');
    },

    async loadExternalJSON() {
        console.log('Attempting to load external pay_periods_config.json...');
        
        // Try multiple possible paths for GitHub Pages compatibility
        const possiblePaths = [
            './pay_periods_config.json',                    // Same directory
            'pay_periods_config.json',                      // Relative to current
            '/pay_periods_config.json',                     // Root of site
            `${window.location.pathname.replace(/\/[^\/]*$/, '/')}/pay_periods_config.json`  // Current directory
        ];
        
        for (const path of possiblePaths) {
            try {
                console.log(`Trying to fetch: ${path}`);
                const response = await fetch(path);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const config = await response.json();
                
                this.payPeriodsConfig = config;
                
                // Load holidays if available
                if (config.holidays) {
                    this.companyHolidays = config.holidays;
                }
                
                this.populatePayPeriodDropdown();
                this.selectCurrentPayPeriod();
                
                // Update status
                const status = document.getElementById('configStatus');
                status.className = 'config-status success';
                status.textContent = `✅ External JSON config loaded successfully! (${path})`;
                
                console.log('External JSON config loaded from:', path, config);
                return true; // Success
                
            } catch (error) {
                console.warn(`Failed to load from ${path}:`, error.message);
                continue; // Try next path
            }
        }
        
        throw new Error('All external JSON paths failed');
    },

    loadEmbeddedConfig() {
        console.log('Loading embedded pay periods configuration...');
        
        // Use the global PAY_PERIODS_CONFIG from pay_periods_config.js
        if (typeof PAY_PERIODS_CONFIG === 'undefined') {
            throw new Error('Embedded PAY_PERIODS_CONFIG not found');
        }
        
        this.payPeriodsConfig = PAY_PERIODS_CONFIG;
        
        // Load holidays if available
        if (PAY_PERIODS_CONFIG.holidays) {
            this.companyHolidays = PAY_PERIODS_CONFIG.holidays;
        }
        
        this.populatePayPeriodDropdown();
        this.selectCurrentPayPeriod();
        
        // Update status
        const status = document.getElementById('configStatus');
        status.className = 'config-status success';
        status.textContent = '✅ Embedded config loaded successfully! (Fallback mode)';
        
        console.log('Embedded config loaded successfully:', PAY_PERIODS_CONFIG);
        return true; // Success
    },

    populatePayPeriodDropdown() {
        const select = document.getElementById('payPeriodSelect');
        select.innerHTML = '<option value="">-- Select Pay Period --</option>';
        
        if (!this.payPeriodsConfig || !this.payPeriodsConfig.payPeriods) return;
        
        this.payPeriodsConfig.payPeriods.forEach((period) => {
            const option = document.createElement('option');
            option.value = period.id;
            
            // Handle both formats: periodStart/periodEnd (PowerShell scripts) and startDate/endDate (legacy)
            const startDate = period.periodStart || period.startDate;
            const endDate = period.periodEnd || period.endDate;
            
            if (period.description) {
                option.textContent = period.description;
            } else {
                option.textContent = `${period.id} (${startDate} to ${endDate})`;
            }
            
            select.appendChild(option);
        });
    },

    selectCurrentPayPeriod() {
        if (!this.payPeriodsConfig || !this.payPeriodsConfig.payPeriods) return;
        
        // Check if we have a saved selection first
        const savedSelection = localStorage.getItem('selectedPayPeriod');
        if (savedSelection) {
            const period = this.payPeriodsConfig.payPeriods.find(p => p.id === savedSelection);
            if (period) {
                this.setPayPeriod(period);
                document.getElementById('payPeriodSelect').value = period.id;
                return;
            }
        }
        
        // Auto-select current pay period based on today's date
        const today = new Date();
        
        for (const period of this.payPeriodsConfig.payPeriods) {
            const startDate = new Date(period.periodStart || period.startDate);
            const endDate = new Date(period.periodEnd || period.endDate);
            
            if (today >= startDate && today <= endDate) {
                this.setPayPeriod(period);
                document.getElementById('payPeriodSelect').value = period.id;
                console.log('Auto-selected current pay period:', period.id);
                return;
            }
        }
        
        console.log('No current pay period found, user must select manually');
    },

    setPayPeriod(period) {
        this.selectedPayPeriod = period;
        
        // Handle both formats: periodStart/periodEnd (PowerShell scripts) and startDate/endDate (legacy)
        const startDate = period.periodStart || period.startDate;
        const endDate = period.periodEnd || period.endDate;
        
        document.getElementById('periodStart').value = startDate;
        document.getElementById('periodEnd').value = endDate;
        
        this.updatePayPeriodInfo();
        this.updateDisplay();
        
        localStorage.setItem('selectedPayPeriod', period.id);
    },

    onPayPeriodChange() {
        const select = document.getElementById('payPeriodSelect');
        const periodId = select.value;
        
        if (!periodId) {
            this.selectedPayPeriod = null;
            document.getElementById('payPeriodInfo').style.display = 'none';
            return;
        }
        
        const period = this.payPeriodsConfig.payPeriods.find(p => p.id === periodId);
        if (period) {
            this.setPayPeriod(period);
        }
    },

    onCustomDateChange() {
        document.getElementById('payPeriodSelect').value = '';
        this.selectedPayPeriod = null;
        localStorage.removeItem('selectedPayPeriod');
        document.getElementById('payPeriodInfo').style.display = 'none';
        this.updateDisplay();
    },

    updatePayPeriodInfo() {
        if (!this.selectedPayPeriod) {
            document.getElementById('payPeriodInfo').style.display = 'none';
            return;
        }

        // Handle both formats: periodStart/periodEnd (PowerShell scripts) and startDate/endDate (legacy)
        const startDate = new Date(this.selectedPayPeriod.periodStart || this.selectedPayPeriod.startDate);
        const endDate = new Date(this.selectedPayPeriod.periodEnd || this.selectedPayPeriod.endDate);
        const today = new Date();
        
        const workingDays = this.calculateWorkingDays(startDate, endDate);
        const remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
        
        const periodStartStr = this.selectedPayPeriod.periodStart || this.selectedPayPeriod.startDate;
        const periodEndStr = this.selectedPayPeriod.periodEnd || this.selectedPayPeriod.endDate;
        
        document.getElementById('periodDisplay').textContent = `${periodStartStr} to ${periodEndStr}`;
        document.getElementById('timesheetDue').textContent = this.selectedPayPeriod.timesheetDue || 'N/A';
        document.getElementById('payDay').textContent = this.selectedPayPeriod.payDay || 'N/A';
        document.getElementById('workingDays').textContent = workingDays;
        document.getElementById('daysRemaining').textContent = remainingDays;
        
        document.getElementById('payPeriodInfo').style.display = 'block';
    },

    enableManualDateSelection() {
        console.log('Enabling manual date selection mode...');
        
        // Set default period (last 14 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 13);
        
        document.getElementById('periodStart').value = startDate.toISOString().split('T')[0];
        document.getElementById('periodEnd').value = endDate.toISOString().split('T')[0];
        
        // Update pay period selector
        const select = document.getElementById('payPeriodSelect');
        select.innerHTML = '<option value="">Manual date selection mode</option>';
        select.disabled = true;
        
        // Update status
        const status = document.getElementById('configStatus');
        status.className = 'config-status warning';
        status.textContent = '⚠️ Using manual date selection. Place pay_periods_config.json in same directory for automatic periods.';
        
        document.getElementById('payPeriodInfo').style.display = 'none';
        
        return true; // Always succeeds as fallback
    },

    calculateWorkingDays(startDate, endDate) {
        let workingDays = 0;
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            
            // Count Monday (1) through Friday (5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                // Check if this date is not a holiday
                const dateStr = currentDate.toISOString().split('T')[0];
                const isHoliday = this.companyHolidays.some(holiday => holiday.date === dateStr);
                
                if (!isHoliday) {
                    workingDays++;
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return workingDays;
    },

    // Timer functionality
    toggleTimer() {
        if (this.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    },

    startTimer() {
        const category = document.getElementById('categorySelect').value;
        const project = document.getElementById('projectInput').value.trim();
        
        this.currentSession = {
            startTime: Date.now(),
            category: category,
            project: project || 'General'
        };
        
        this.isRunning = true;
        const button = document.getElementById('timerButton');
        button.textContent = 'Stop';
        button.className = 'timer-button stop';
        
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        
        this.saveActiveSession();
        console.log('Timer started:', this.currentSession);
    },

    stopTimer() {
        if (!this.currentSession) return;
        
        const endTime = Date.now();
        const duration = (endTime - this.currentSession.startTime) / (1000 * 60 * 60); // hours
        
        const entry = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            startTime: new Date(this.currentSession.startTime).toLocaleTimeString(),
            endTime: new Date(endTime).toLocaleTimeString(),
            duration: Math.round(duration * 100) / 100,
            category: this.currentSession.category,
            project: this.currentSession.project
        };
        
        this.timeEntries.push(entry);
        this.saveData();
        
        this.isRunning = false;
        this.currentSession = null;
        clearInterval(this.timerInterval);
        
        const button = document.getElementById('timerButton');
        button.textContent = 'Start';
        button.className = 'timer-button start';
        document.getElementById('timerDisplay').textContent = '00:00:00';
        
        this.updateDisplay();
        this.clearActiveSession();
        
        console.log('Timer stopped, entry added:', entry);
    },

    updateTimer() {
        if (!this.currentSession) return;
        
        const now = Date.now();
        const elapsed = now - this.currentSession.startTime;
        
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
        
        this.updateDailyCounter();
        
        // Save session periodically
        if (seconds % 30 === 0) {
            this.saveActiveSession();
        }
    },

    // Session recovery functionality
    saveActiveSession() {
        if (this.currentSession) {
            localStorage.setItem('activeSession', JSON.stringify(this.currentSession));
        }
    },

    clearActiveSession() {
        localStorage.removeItem('activeSession');
    },

    recoverSession() {
        const saved = localStorage.getItem('activeSession');
        if (saved) {
            const session = JSON.parse(saved);
            const now = Date.now();
            const elapsed = now - session.startTime;
            const maxSessionTime = 12 * 60 * 60 * 1000; // 12 hours
            
            if (elapsed < maxSessionTime) {
                if (confirm(`Found an active session from ${new Date(session.startTime).toLocaleString()}.\nCategory: ${session.category}\nProject: ${session.project}\n\nWould you like to continue this session?`)) {
                    this.currentSession = session;
                    this.isRunning = true;
                    const button = document.getElementById('timerButton');
                    button.textContent = 'Stop';
                    button.className = 'timer-button stop';
                    document.getElementById('categorySelect').value = session.category;
                    document.getElementById('projectInput').value = session.project;
                    
                    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
                    this.updateTimer();
                    
                    console.log('Session recovered:', session);
                    return;
                }
            }
            this.clearActiveSession();
        }
    },

    // Data management
    loadData() {
        try {
            const saved = localStorage.getItem('timeTrackerData');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.timeEntries = parsed;
                } else {
                    console.warn('Invalid time entries data in localStorage, resetting to empty array');
                    this.timeEntries = [];
                    localStorage.removeItem('timeTrackerData');
                }
            } else {
                this.timeEntries = [];
            }
        } catch (error) {
            console.error('Error loading time entries data:', error);
            console.warn('Corrupted data detected, resetting to empty array');
            this.timeEntries = [];
            localStorage.removeItem('timeTrackerData');
        }
    },

    saveData() {
        try {
            localStorage.setItem('timeTrackerData', JSON.stringify(this.timeEntries));
        } catch (error) {
            console.error('Error saving time entries data:', error);
            alert('Error saving data. Your browser storage may be full.');
        }
    },

    saveSettings() {
        const settings = {
            employeeName: document.getElementById('employeeName').value,
            dailyTarget: document.getElementById('dailyTarget').value
        };
        localStorage.setItem('timeTrackerSettings', JSON.stringify(settings));
        this.dailyTarget = parseFloat(settings.dailyTarget || 8);
    },

    loadSettings() {
        const saved = localStorage.getItem('timeTrackerSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            document.getElementById('employeeName').value = settings.employeeName || '';
            document.getElementById('dailyTarget').value = settings.dailyTarget || 8;
            this.dailyTarget = parseFloat(settings.dailyTarget || 8);
        }
        
        // Check for active session on load
        setTimeout(() => this.recoverSession(), 1000);
    },

    // Display updates
    updateDisplay() {
        this.updateStats();
        this.updateDailyCounter();
        this.updateEntriesList();
    },

    updateStats() {
        const filteredEntries = this.getFilteredEntries();
        const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
        const workDays = new Set(filteredEntries.map(entry => entry.date)).size;
        const avgDaily = workDays > 0 ? totalHours / workDays : 0;
        
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('workDays').textContent = workDays;
        document.getElementById('avgDaily').textContent = avgDaily.toFixed(1);
        
        // Calculate days in period
        const startDate = new Date(document.getElementById('periodStart').value);
        const endDate = new Date(document.getElementById('periodEnd').value);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('daysElapsed').textContent = daysDiff;
    },

    updateDailyCounter() {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = this.timeEntries.filter(entry => entry.date === today);
        let todayHours = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
        
        // Add current session time if running
        if (this.isRunning && this.currentSession) {
            const elapsed = (Date.now() - this.currentSession.startTime) / (1000 * 60 * 60);
            todayHours += elapsed;
        }
        
        const target = parseFloat(document.getElementById('dailyTarget').value) || 8;
        const progress = Math.min((todayHours / target) * 100, 100);
        
        document.getElementById('dailyCounter').textContent = `${todayHours.toFixed(1)} / ${target}h`;
        document.getElementById('progressFillSmall').style.width = `${progress}%`;
    },

    getFilteredEntries() {
        const startDate = document.getElementById('periodStart').value;
        const endDate = document.getElementById('periodEnd').value;
        
        if (!startDate || !endDate) return this.timeEntries;
        
        return this.timeEntries.filter(entry => {
            return entry.date >= startDate && entry.date <= endDate;
        });
    },

    updateEntriesList() {
        const container = document.getElementById('entriesList');
        const filteredEntries = this.getFilteredEntries();
        
        if (filteredEntries.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d;">No time entries for this period.</div>';
            return;
        }
        
        if (this.currentView === 'detailed') {
            container.innerHTML = filteredEntries
                .sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime))
                .map(entry => `
                    <div class="entry-item">
                        <div class="entry-info">
                            <strong>${entry.date}</strong> | ${entry.startTime} - ${entry.endTime}<br>
                            <small style="color: #6c757d;">${entry.category} • ${entry.project}</small>
                        </div>
                        <div class="entry-time">${entry.duration.toFixed(1)}h</div>
                    </div>
                `).join('');
        } else {
            // Daily summary view
            const dailyTotals = {};
            filteredEntries.forEach(entry => {
                if (!dailyTotals[entry.date]) {
                    dailyTotals[entry.date] = 0;
                }
                dailyTotals[entry.date] += entry.duration;
            });
            
            container.innerHTML = Object.entries(dailyTotals)
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .map(([date, hours]) => `
                    <div class="entry-item">
                        <div class="entry-info">
                            <strong>${date}</strong><br>
                            <small style="color: #6c757d;">${new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}</small>
                        </div>
                        <div class="entry-time">${hours.toFixed(1)}h</div>
                    </div>
                `).join('');
        }
    },

    setView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        this.updateEntriesList();
    },

    // Export functionality
    exportToCSV() {
        const employeeName = document.getElementById('employeeName').value || 'Employee';
        const filteredEntries = this.getFilteredEntries();
        
        if (filteredEntries.length === 0) {
            alert('No data to export for the selected period.');
            return;
        }
        
        const headers = ['Employee Name', 'Date', 'Category', 'Project', 'Start Time', 'End Time', 'Duration (Hours)'];
        const csvContent = [
            headers.join(','),
            ...filteredEntries.map(entry => [
                `"${employeeName}"`,
                entry.date,
                `"${entry.category}"`,
                `"${entry.project}"`,
                `"${entry.startTime}"`,
                `"${entry.endTime}"`,
                entry.duration
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const startDate = document.getElementById('periodStart').value;
        const endDate = document.getElementById('periodEnd').value;
        const filename = `timesheet_${employeeName.replace(/[^a-zA-Z0-9]/g, '_')}_${startDate}_to_${endDate}.csv`;
        
        a.href = url;
        a.download = filename;
        a.click();
        
        window.URL.revokeObjectURL(url);
    },

    importCSV() {
        document.getElementById('csvFileInput').click();
    },

    handleCSVImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                
                let imported = 0;
                let skipped = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
                    
                    if (values.length >= 7) {
                        const entry = {
                            id: Date.now().toString() + '_' + imported,
                            date: values[1],
                            category: values[2],
                            project: values[3],
                            startTime: values[4],
                            endTime: values[5],
                            duration: parseFloat(values[6])
                        };
                        
                        // Check for duplicates
                        const isDuplicate = this.timeEntries.some(existing => 
                            existing.date === entry.date &&
                            existing.startTime === entry.startTime &&
                            existing.category === entry.category &&
                            existing.project === entry.project
                        );
                        
                        if (!isDuplicate) {
                            this.timeEntries.push(entry);
                            imported++;
                        } else {
                            skipped++;
                        }
                    }
                }
                
                this.saveData();
                this.updateDisplay();
                
                alert(`Import complete!\nImported: ${imported} entries\nSkipped (duplicates): ${skipped} entries`);
                
            } catch (error) {
                alert('Error importing CSV file. Please check the file format.');
                console.error('CSV import error:', error);
            }
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    },

    clearAllData() {
        if (confirm('Are you sure you want to clear all time entries? This action cannot be undone.')) {
            this.timeEntries = [];
            this.saveData();
            this.updateDisplay();
            alert('All data has been cleared.');
        }
    }
};