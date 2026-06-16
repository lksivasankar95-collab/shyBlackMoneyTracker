import { useState, useCallback } from 'react'
import {
  Shield, Lock, Database, TrendingUp, Handshake,
  ChevronRight, Check, ArrowLeft, FileText, Scale,
} from 'lucide-react'
import { safeStorage, STORAGE_KEYS } from '../utils/safeStorage'

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
]

const STEPS = ['Welcome', 'Your Profile', 'Privacy & Terms']

const FEATURES = [
  { icon: Database, title: 'Offline-First', desc: 'All data stored locally on your device. Works without internet.' },
  { icon: TrendingUp, title: 'Income Tracking', desc: 'Track all income, expenses, and investments in one place.' },
  { icon: Handshake, title: 'Borrow & Lend', desc: 'Keep tabs on money lent or borrowed from friends.' },
  { icon: Shield, title: 'Privacy First', desc: 'No account required. No cloud sync. Your data stays yours.' },
]

function PrivacyPolicy() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-neon" />
        <h3 className="text-xs font-semibold">Privacy Policy</h3>
      </div>
      <div className="text-[11px] text-gray-400 leading-relaxed space-y-2 bg-white/[0.02] rounded-xl p-3">
        <p>ShyBlack Finance respects your privacy. This policy describes how your data is handled.</p>
        <ul className="space-y-1.5 list-disc pl-4">
          <li className="text-gray-500">All financial data is stored exclusively on your device using local storage.</li>
          <li className="text-gray-500">No data is transmitted to any server, cloud service, or third party.</li>
          <li className="text-gray-500">No account creation or email is required to use this application.</li>
          <li className="text-gray-500">We do not collect, share, or sell any personal or financial information.</li>
          <li className="text-gray-500">You retain full control over your data at all times.</li>
          <li className="text-gray-500">Backups are exported as JSON files and stored wherever you choose.</li>
          <li className="text-gray-500">Deleted data is removed from local storage immediately.</li>
        </ul>
      </div>
    </div>
  )
}

function TermsConditions() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={14} className="text-neon" />
        <h3 className="text-xs font-semibold">Terms & Conditions</h3>
      </div>
      <div className="text-[11px] text-gray-400 leading-relaxed space-y-2 bg-white/[0.02] rounded-xl p-3">
        <p>By using ShyBlack Finance, you agree to the following terms:</p>
        <ul className="space-y-1.5 list-disc pl-4">
          <li className="text-gray-500">This app is a financial tracking tool only and does not provide financial or investment advice.</li>
          <li className="text-gray-500">You are solely responsible for maintaining backups of your data. The app is not liable for data loss.</li>
          <li className="text-gray-500">The app is provided "as is" without warranty of any kind, express or implied.</li>
          <li className="text-gray-500">You acknowledge that past performance tracked in this app does not guarantee future results.</li>
          <li className="text-gray-500">The developers are not responsible for any financial decisions made based on data in this app.</li>
          <li className="text-gray-500">You may export and delete your data at any time through the Settings page.</li>
          <li className="text-gray-500">These terms may be updated. Continued use after changes constitutes acceptance.</li>
        </ul>
      </div>
      <div className="text-[10px] text-yellow-500/70 bg-yellow-500/5 rounded-xl p-3 border border-yellow-500/10 leading-relaxed">
        <strong>Disclaimer:</strong> ShyBlack Finance is a personal finance tracking tool. It does not provide investment advice or financial planning recommendations. Always consult a qualified financial advisor before making investment decisions.
      </div>
    </div>
  )
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [savingsGoal, setSavingsGoal] = useState('')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const canContinue = useCallback(() => {
    if (step === 1) return name.trim().length > 0
    if (step === 2) return agreePrivacy && agreeTerms
    return true
  }, [step, name, agreePrivacy, agreeTerms])

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    }
  }, [step])

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
  }, [step])

  const handleComplete = useCallback(() => {
    if (!agreePrivacy || !agreeTerms) return
    setIsCompleting(true)

    const onboardingData = {
      hasCompletedOnboarding: true,
      completedAt: Date.now(),
      name: name.trim(),
      currency,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : 0,
      savingsGoal: savingsGoal ? parseFloat(savingsGoal) : 0,
    }

    safeStorage.set(STORAGE_KEYS.ONBOARDING, onboardingData)

    if (onboardingData.savingsGoal > 0) {
      const current = safeStorage.get(STORAGE_KEYS.SAVINGS, { target: 0, saved: 0 })
      safeStorage.set(STORAGE_KEYS.SAVINGS, { ...current, target: onboardingData.savingsGoal })
    }

    setIsCompleting(false)
    onComplete()
  }, [agreePrivacy, agreeTerms, name, currency, monthlyIncome, savingsGoal, onComplete])

  return (
    <div className="min-h-screen bg-matte flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-neon' : 'bg-matte-200'
                } ${i === step ? 'w-4' : ''}`}
              />
            ))}
          </div>
          <div className="text-[10px] text-gray-600 font-medium">
            {step + 1}/{STEPS.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 max-w-lg mx-auto w-full">
        {step === 0 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-neon" />
              </div>
              <h1 className="text-xl font-bold mb-2">ShyBlack Finance</h1>
              <p className="text-xs text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                Your private, offline-first finance tracker. Take control of your money without compromising privacy.
              </p>
            </div>

            <div className="space-y-2.5 mb-8">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border">
                  <div className="w-9 h-9 rounded-lg bg-neon/5 flex items-center justify-center shrink-0">
                    <f.icon size={16} className="text-neon" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{f.title}</p>
                    <p className="text-[10px] text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              Get Started
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in">
            <div className="text-center mb-6">
              <h1 className="text-lg font-bold mb-1">Set Up Your Profile</h1>
              <p className="text-xs text-gray-500">Customize your experience (all optional except name)</p>
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
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthlyIncome}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d+$/.test(v)) setMonthlyIncome(v)
                  }}
                  placeholder="Enter your monthly income"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium mb-1.5 block">
                  Savings Goal <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={savingsGoal}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '' || /^\d+$/.test(v)) setSavingsGoal(v)
                  }}
                  placeholder="Set a target savings amount"
                  className="input-field"
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
              <p className="text-[10px] text-gray-600 text-center">Name is required to personalize your experience</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col justify-center animate-fade-in">
            <div className="text-center mb-6">
              <h1 className="text-lg font-bold mb-1">Privacy & Terms</h1>
              <p className="text-xs text-gray-500">Please review before you start</p>
            </div>

            <div className="space-y-4 mb-6 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
              <PrivacyPolicy />
              <TermsConditions />
            </div>

            <div className="space-y-3 mb-4">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-glass-border cursor-pointer group">
                <div
                  onClick={() => setAgreePrivacy(!agreePrivacy)}
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
                'Setting up...'
              ) : (
                <>
                  <Check size={16} />
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
