# Multi-Wallet Support — Architecture Analysis

## Overview
Enable users to manage multiple independent sets of accounts (e.g., personal + business, or joint + individual) within Expense Tracker - ShyBlack. Each wallet contains its own transactions, budgets, recurring items, debts, goals, templates, and tags. Settings, security, and onboarding remain app-level.

---

## Data Scoping Map

| Entity        | Wallet-Scoped | App-Level | Pages Affected                |
|---------------|---------------|-----------|-------------------------------|
| Transactions  | ✓             |           | All pages                     |
| Budgets       | ✓             |           | BudgetsPage, Dashboard        |
| Recurring     | ✓             |           | SubscriptionsPage, Calendar   |
| Debts         | ✓             |           | DebtsPage, Dashboard          |
| Goals         | ✓             |           | GoalsPage, Dashboard          |
| Templates     | ✓             |           | AddTransaction                |
| Tags          | ✓             |           | AddTransaction                |
| Savings (legacy) | ✓          |           | Settings, Dashboard           |
| Security/PIN  |               | ✓         | Settings, Auth                |
| Onboarding    |               | ✓         | Onboarding                    |
| Schema        |               | ✓         | (migration system)            |
| Reminder pref |               | ✓         | Settings                      |
| Streak        |               | ✓         | InsightsPage                  |
| Review log    |               | ✓         | MonthlyReview                 |
| Privacy       |               | ✓         | Auth                          |

---

## Migration Strategy (Schema v2 → v3)

The `default` wallet is created implicitly — existing single-wallet users see no difference.

```
shyblack_transactions         ─┐
shyblack_budgets              ─┤
shyblack_recurring            ─┤  migrate to ──>  shyblack_transactions__default
shyblack_debts                ─┤                   shyblack_budgets__default
shyblack_goals                ─┘                   ...
shyblack_templates                                   +
shyblack_tags                                  shyblack_wallet_index
```

**Fallback reads:** During transition, `safeStorage` tries `key__walletId` first, falls back to `key` (legacy). This allows a safe zero-data-loss rollout.

---

## Changes Required by Layer

### 1. Storage (`safeStorage.js`) — Low-Medium
- Add `walletKey(baseKey, walletId)` transform
- Add `getWithFallback(key, walletId, fallback)` for transition reads
- Add `STORAGE_KEYS.WALLET_INDEX` constant
- Quota purge logic updated to iterate wallet-scoped keys

### 2. Utils (~10 files) — Medium
Every `getX()/saveX()` needs an optional `walletId` param. Pattern:

```js
export function getTransactions(walletId) {
  return safeStorage.getWithFallback(STORAGE_KEYS.TRANSACTIONS, walletId, [])
}
```

**Files:** `budgets.js`, `goals.js`, `debts.js`, `recurring.js`, `tags.js`, `templates.js`, `schema.js`, `backup.js`

**No changes needed:** `analytics.js`, `insights.js`, `exports.js`, `calendar.js`, `timeline.js`, `review.js` (pure functions, receive data as params).

### 3. Context (`FinanceContext.jsx`) — High (highest risk)
- Restructure state: `{ wallets: Record<id, WalletData>, activeWalletId, walletOrder }`
- All callbacks (addTransaction, updateBudget, addDebt, etc.) target `state.wallets[activeWalletId]`
- Persistence effects write to `key__${activeWalletId}`
- New actions: `createWallet`, `deleteWallet`, `switchWallet`, `transferBetweenWallets`
- `clearAllData` / `importData` scope to active wallet

### 4. Pages (2-3) — Low
- **Dashboard**: wallet name badge + switcher dropdown in header
- **Settings**: wallet management page (create, rename, delete, switch, transfer)
- All other pages read `useFinance()` transparently — no changes needed

### 5. Components — None
- `TransactionItem`, `FinancialScore`, `DebtCard`, etc. receive data via props — no changes

---

## Migration Timeline

| Step | What | Risk |
|------|------|------|
| 1 | Add wallet index key + safeStorage wallet methods | Low |
| 2 | Schema v3 migration (copy unscoped→scoped, create index) | Medium |
| 3 | `getWithFallback()` in all utility `getX()` calls | Medium |
| 4 | Restructure FinanceContext state to `wallets` map | High |
| 5 | Wallet management UI (Settings + Dashboard) | Low |
| 6 | Backup/export wallet-aware | Low |
| 7 | Remove fallback reads + cleanup legacy keys (optional, v+2) | Low |

---

## Key Design Decisions

1. **Implicit `default` wallet** — no forced migration UX; single-wallet users are unaffected
2. **Wallet ID as a UUID string** — not an index, so renames/deletions don't break references
3. **Inter-wallet transfers** — handled as matching income/expense pairs across wallets (no shared transfer ledger)
4. **Backup format** — JSON envelope with `{ formatVersion, walletIndex, wallets: { [id]: { transactions, budgets, ... } } }`
5. **No shared entities** — wallets are fully isolated; no "shared budget" or "cross-wallet goal" (avoids complexity)
6. **Schema migrations iterate all wallets** — each migration function receives a `walletIterator` helper

---

## Estimated Effort
- **~14 files** modified total
- **~2-3 days** for storage + utils + context reshape
- **~1-2 days** for UI (Settings wallet management, Dashboard switcher)
- **~1 day** for testing + backup format update
- **Total: ~4-6 days**
