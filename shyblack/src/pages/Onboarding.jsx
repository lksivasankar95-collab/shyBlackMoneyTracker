import { useState, useCallback } from 'react'
import {
  Shield, Database, TrendingUp, Handshake,
  ChevronRight, Check, ArrowLeft, FileText, Scale,
  Wallet, Plus, Minus, LayoutDashboard, Sparkles,
} from 'lucide-react'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'
import { ALL_CATEGORIES } from '../utils/constants'

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
]

const EXPENSE_CATEGORIES = ALL_CATEGORIES.filter((c) => c.type === 'expense').slice(0, 6)

const STEPS = [
  { id: 'welcome', icon: Shield, label: 'Welcome' },
  { id: 'account', icon: Wallet, label: 'Account' },
  { id: 'income', icon: Plus, label: 'Income' },
  { id: 'expense', icon: Minus, label: 'Expense' },
  { id: 'tour', icon: LayoutDashboard, label: 'Tour' },
  { id: 'done', icon: Sparkles, label: 'Ready' },
]

const FEATURES = [
  { icon: Database, title: '100% Offline', desc: 'All data stays on your device. No accounts, no cloud, no tracking.' },
  { icon: TrendingUp, title: 'Smart Tracking', desc: 'Track income, expenses, EMIs, budgets, and goals in one place.' },
  { icon: Handshake, title: 'Borrow & Lend', desc: 'Keep tabs on money you\'ve lent or borrowed from friends.' },
  { icon: Shield, title: 'Privacy First', desc: 'PIN lock protection. Your data, your rules.' },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [savingsGoal, setSavingsGoal] = useState('')
  const [sampleIncome, setSampleIncome] = useState('')
  const [sampleExpense, setSampleExpense] = useState('')
  const [sampleCategory, setSampleCategory] = useState('food')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const quickAmounts = [5000, 10000, 25000, 50000]
  const quickExpenseAmounts = [200, 500, 1000, 2000]

  const canContinue = useCallback(() => {
    if (step === 0) return true
    if (step === 1) return name.trim().length > 0
    if (step === 2) return true
    if (step === 3) return true
    if (step === 4) return true
    if (step === 5) return agreePrivacy && agreeTerms
    return true
  }, [step, name, agreePrivacy, agreeTerms])

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }, [step])

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
  }, [step])

  const handleComplete = useCallback(() => {
    if (!agreePrivacy || !agreeTerms) return
    setIsCompleting(true)

    const simState = {
      hasCompletedOnboarding: true,
      completedAt: Date.now(),
      name: name.trim(),
      currency,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : 0,
      savingsGoal: savingsGoal ? parseFloat(savingsGoal) : 0,
      _sampleData: {
        hasIncome: !!sampleIncome,
        hasExpense: !!sampleExpense,
        incomeAmount: sampleIncome ? parseFloat(sampleIncome) : 0,
        expenseAmount: sampleExpense ? parseFloat(sampleExpense) : 0,
        expenseCategory: sampleCategory,
      },
    }

    safeStorage.set(STORAGE_KEYS.ONBOARDING, simState)
    setIsCompleting(false)
    onComplete()
  }, [agreePrivacy, agreeTerms, name, currency, monthlyIncome, savingsGoal, sampleIncome, sampleExpense, sampleCategory, onComplete])

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-matte flex flex-col">
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center justify-between max-w-lg mx-auto mb-2">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors min-h-[32px]"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-neon' : 'bg-matte-200'
                } ${i === step ? 'shadow-[0_0_6px_rgba(57,255,20,0.4)]' : ''}`}
              />
            ))}
          </div>
          <div className="text-[10px] text-gray-600 font-medium min-w-[32px] text-right">
            {step + 1}/{STEPS.length}
          </div>
        </div>
        <div className="w-full h-0.5 bg-matte-200 rounded-full max-w-lg mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-neon to-green-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 max-w-lg mx-auto w-full overflow-y-auto">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in py-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-neon/20 to-neon/5 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(57,255,20,0.1)]">
                <Shield size={36} className="text-neon" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-gradient-brand">ShyBlack Finance</h1>
              <p className="text-xs text-gray-500 max-w-[300px] mx-auto leading-relaxed">
                Your private, offline finance companion. Smart tracking meets dark mode elegance.
              </p>
            </div>

            <div className="space-y-2.5 mb-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border">
                  <div className="w-10 h-10 rounded-xl bg-neon/5 flex items-center justify-center shrink-0">
                    <f.icon size={18} className="text-neon" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-[11px] text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleNext} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
              Get Started
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Step 1: Create Account */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-3">
                <Wallet size={24} className="text-neon" />
              </div>
              <h1 className="text-lg font-bold mb-1">Set Up Your Profile</h1>
              <p className="text-xs text-gray-500">You can change these anytime in Settings</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="input-field"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">Preferred Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="input-field"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">
                  Monthly Income <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {quickAmounts.map((a) => (
                    <button
                      key={a}
                      onClick={() => setMonthlyIncome(a.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        monthlyIncome === a.toString()
                          ? 'border-neon/40 text-neon bg-neon/10'
                          : 'border-glass-border text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      {currency === 'INR' ? '₹' : '$'}{a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthlyIncome}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d+$/.test(v)) setMonthlyIncome(v)
                  }}
                  placeholder="Or enter custom amount"
                  className="input-field mt-2"
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleNext}
                disabled={!canContinue()}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                Continue
                <ChevronRight size={15} />
              </button>
              <p className="text-[10px] text-gray-600 text-center">Name is needed to personalize your experience</p>
            </div>
          </div>
        )}

        {/* Step 2: Add First Income */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-neon" />
              </div>
              <h1 className="text-lg font-bold mb-1">Add Your First Income</h1>
              <p className="text-xs text-gray-500">Add a sample income to see how tracking works</p>
            </div>

            <div className="glass p-4 space-y-3">
              <p className="text-xs font-medium text-gray-400">How much was your income?</p>
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((a) => (
                  <button
                    key={a}
                    onClick={() => setSampleIncome(a.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      sampleIncome === a.toString()
                        ? 'border-neon/40 text-neon bg-neon/10'
                        : 'border-glass-border text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    {currency === 'INR' ? '₹' : '$'}{a.toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={sampleIncome}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '' || /^\d+$/.test(v)) setSampleIncome(v)
                }}
                placeholder="Enter amount"
                className="input-field"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleNext}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {sampleIncome ? `Add ${currency === 'INR' ? '₹' : '$'}${parseFloat(sampleIncome).toLocaleString()}` : 'Skip for now'}
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Add First Expense */}
        {step === 3 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <Minus size={24} className="text-red-400" />
              </div>
              <h1 className="text-lg font-bold mb-1">Add Your First Expense</h1>
              <p className="text-xs text-gray-500">Track a sample expense to see the full picture</p>
            </div>

            <div className="glass p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">What did you spend on?</p>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSampleCategory(cat.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        sampleCategory === cat.id
                          ? 'border-neon/40 bg-neon/5'
                          : 'border-glass-border hover:border-gray-500'
                      }`}
                    >
                      <span className="text-[10px] font-medium text-gray-400">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">How much?</p>
                <div className="flex gap-2 flex-wrap">
                  {quickExpenseAmounts.map((a) => (
                    <button
                      key={a}
                      onClick={() => setSampleExpense(a.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        sampleExpense === a.toString()
                          ? 'border-neon/40 text-neon bg-neon/10'
                          : 'border-glass-border text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      {currency === 'INR' ? '₹' : '$'}{a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={sampleExpense}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d+$/.test(v)) setSampleExpense(v)
                  }}
                  placeholder="Enter amount"
                  className="input-field mt-2"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleNext}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {sampleExpense ? `Add ${currency === 'INR' ? '₹' : '$'}${parseFloat(sampleExpense).toLocaleString()}` : 'Skip for now'}
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Dashboard Tour */}
        {step === 4 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-3">
                <LayoutDashboard size={24} className="text-neon" />
              </div>
              <h1 className="text-lg font-bold mb-1">Your Dashboard</h1>
              <p className="text-xs text-gray-500">Everything you need at a glance</p>
            </div>

            <div className="space-y-3">
              <div className="glass p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center shrink-0">
                  <Wallet size={16} className="text-neon" />
                </div>
                <div>
                  <p className="text-xs font-medium">Net Worth & Balance</p>
                  <p className="text-[10px] text-gray-500">See your total wealth and account balances instantly.</p>
                </div>
              </div>
              <div className="glass p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-neon" />
                </div>
                <div>
                  <p className="text-xs font-medium">Monthly Summary</p>
                  <p className="text-[10px] text-gray-500">Track income vs expenses for the current month.</p>
                </div>
              </div>
              <div className="glass p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center shrink-0">
                  <Handshake size={16} className="text-neon" />
                </div>
                <div>
                  <p className="text-xs font-medium">Quick Actions</p>
                  <p className="text-[10px] text-gray-500">One-tap access to budgets, reports, calendar, and more.</p>
                </div>
              </div>
            </div>

            <button onClick={handleNext} className="btn-primary w-full text-sm flex items-center justify-center gap-2 mt-6">
              Looks Good!
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Step 5: Privacy & Completion */}
        {step === 5 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon/20 to-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} className="text-neon" />
              </div>
              <h1 className="text-lg font-bold mb-1">You're All Set!</h1>
              <p className="text-xs text-gray-500">One last step before you begin</p>
            </div>

            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-neon" />
                  <h3 className="text-xs font-semibold">Privacy Policy</h3>
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed space-y-1.5 bg-white/[0.02] rounded-xl p-3">
                  <p>All financial data is stored exclusively on your device. No data is transmitted to any server. No account creation is required.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale size={14} className="text-neon" />
                  <h3 className="text-xs font-semibold">Terms & Conditions</h3>
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed space-y-1.5 bg-white/[0.02] rounded-xl p-3">
                  <p>This app is a financial tracking tool and does not provide financial advice. You are responsible for your data backups.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border cursor-pointer group">
                <div
                  onClick={() => setAgreePrivacy(!agreePrivacy)}
                  role="checkbox"
                  aria-checked={agreePrivacy}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgreePrivacy(!agreePrivacy) } }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                    agreePrivacy
                      ? 'bg-neon border-neon text-black'
                      : 'border-gray-600 group-hover:border-gray-500'
                  }`}
                >
                  {agreePrivacy && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-xs text-gray-400 leading-relaxed">
                  I agree to the <span className="text-neon">Privacy Policy</span>
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border cursor-pointer group">
                <div
                  onClick={() => setAgreeTerms(!agreeTerms)}
                  role="checkbox"
                  aria-checked={agreeTerms}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgreeTerms(!agreeTerms) } }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                    agreeTerms
                      ? 'bg-neon border-neon text-black'
                      : 'border-gray-600 group-hover:border-gray-500'
                  }`}
                >
                  {agreeTerms && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-xs text-gray-400 leading-relaxed">
                  I agree to the <span className="text-neon">Terms & Conditions</span>
                </span>
              </label>
            </div>

            <button
              onClick={handleComplete}
              disabled={!canContinue() || isCompleting}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isCompleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-transparent animate-spin" />
                  Setting up...
                </span>
              ) : (
                <>
                  <Sparkles size={16} />
                  Start Using ShyBlack
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
