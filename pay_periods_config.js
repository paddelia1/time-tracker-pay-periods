/* 
Pay Periods Configuration - NAKUPUNA CONSULTING Real Data
Version: 1.1.2
Created: August 17, 2025 PST
Source: Nakupuna pay period.txt
Compatible with PowerShell management scripts
*/

const PAY_PERIODS_CONFIG = {
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
        },
        {
            "id": "2025-21",
            "periodStart": "2025-11-01",
            "periodEnd": "2025-11-14",
            "timesheetDue": "2025-11-14",
            "payDay": "2025-11-21",
            "description": "Pay Period 21 - Nov 1-14, 2025"
        },
        {
            "id": "2025-22",
            "periodStart": "2025-11-15",
            "periodEnd": "2025-11-28",
            "timesheetDue": "2025-11-28",
            "payDay": "2025-12-05",
            "description": "Pay Period 22 - Nov 15-28, 2025"
        },
        {
            "id": "2025-23",
            "periodStart": "2025-11-29",
            "periodEnd": "2025-12-15",
            "timesheetDue": "2025-12-15",
            "payDay": "2025-12-22",
            "description": "Pay Period 23 - Nov 29 - Dec 15, 2025"
        },
        {
            "id": "2025-24",
            "periodStart": "2025-12-16",
            "periodEnd": "2025-12-31",
            "timesheetDue": "2025-12-31",
            "payDay": "2026-01-07",
            "description": "Pay Period 24 - Dec 16-31, 2025"
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
            "name": "Martin Luther King Jr Day",
            "type": "federal"
        },
        {
            "date": "2025-02-17",
            "name": "Washington's Bday/President's Day",
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
    "defaultPeriodType": "current",
    "company": "NAKUPUNA CONSULTING"
};