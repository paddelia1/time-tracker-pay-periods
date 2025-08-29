// DEBUG FUNCTIONS - Add these when debugging is needed
// Copy and paste these into console or add temporarily to JS file

window.resetAdminCredential = function() {
    localStorage.removeItem('webauthnCredential');
    console.log('Admin credential cleared. Reload page with admin URL to re-enroll.');
    alert('Admin credential cleared. Reload the page with ?setup or ?config=x7k9m to re-enroll your device.');
};

window.debugAdminAccess = function() {
    const stored = localStorage.getItem('webauthnCredential');
    console.log('=== Admin Access Debug Info ===');
    console.log('WebAuthn Support:', window.PublicKeyCredential !== undefined);
    console.log('Stored Credential Exists:', !!stored);
    console.log('Current Mode:', currentMode);
    console.log('Is Authenticated:', isAdminAuthenticated);
    console.log('Current URL:', window.location.href);
    
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            console.log('Credential ID exists:', !!parsed.rawId);
        } catch (e) {
            console.log('Credential Parse Error:', e);
        }
    }
    console.log('=== End Debug Info ===');
};

window.debugPayPeriodInfo = function() {
    const info = document.getElementById('payPeriodInfo');
    const payPeriodFilter = document.getElementById('payPeriodFilter');
    
    console.log('=== Pay Period Info Debug ===');
    console.log('Pay period info element exists:', !!info);
    console.log('Pay period info display:', info ? info.style.display : 'N/A');
    console.log('Current mode:', currentMode);
    console.log('Pay periods loaded:', !!payPeriodsConfig);
    
    const today = new Date().toISOString().split('T')[0];
    if (payPeriodsConfig && payPeriodsConfig.payPeriods) {
        const currentPeriod = payPeriodsConfig.payPeriods.find(period => {
            return today >= period.periodStart && today <= period.periodEnd;
        });
        console.log('Current period:', currentPeriod ? currentPeriod.description : 'None');
    }
    console.log('=== End Debug ===');
};