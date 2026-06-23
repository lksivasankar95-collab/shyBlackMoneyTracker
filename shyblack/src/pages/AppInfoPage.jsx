import { Info, ChevronRight } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { getSchemaVersion, APP_SCHEMA_VERSION } from '../utils/schema'
import { safeStorage } from '../utils/safeStorage'
import GlassCard from '../components/GlassCard'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-[11px] font-medium text-gray-200">{value ?? '—'}</span>
    </div>
  )
}

export default function AppInfoPage() {
  const schemaVersion = getSchemaVersion()
  const info = safeStorage.getStorageInfo()

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Info size={18} className="text-neon" />
        </div>
        <div>
          <h1 className="text-base font-bold">About</h1>
          <p className="text-[10px] text-gray-500">App information & version</p>
        </div>
      </div>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">App Info</h3>
        <Row label="App Name" value="ShyBlack Finance" />
        <Row label="Version" value="1.0.0" />
        <Row label="Build" value={`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`} />
        <Row label="Schema Version" value={`v${schemaVersion}`} />
        <Row label="Target Schema" value={`v${APP_SCHEMA_VERSION}`} />
        <Row label="Storage Used" value={`${info.usedKB} KB`} />
        <Row label="Storage Keys" value={info.keyCount} />
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Technology Stack</h3>
        <Row label="Framework" value="React" />
        <Row label="Build Tool" value="Vite" />
        <Row label="Styling" value="Tailwind CSS" />
        <Row label="Mobile Runtime" value="Capacitor" />
        <Row label="Architecture" value="Offline-First" />
        <Row label="Storage" value="LocalStorage / Capacitor" />
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Release Notes</h3>
        <div className="text-[11px] text-gray-400 leading-relaxed space-y-2">
          <p><span className="text-neon font-medium">v1.0.0</span> — Production release with:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>Transaction management (income/expense)</li>
            <li>Budget planning & tracking</li>
            <li>Debt & ledger management</li>
            <li>EMI tracking with amortization</li>
            <li>Goal setting with progress tracking</li>
            <li>Wealth & investment portfolio</li>
            <li>Financial health scoring</li>
            <li>Cash flow forecasting</li>
            <li>Backup & recovery system</li>
            <li>Document & receipt management</li>
            <li>Multi-language support</li>
            <li>PIN & biometric security</li>
            <li>Data integrity validation</li>
            <li>Performance monitoring</li>
            <li>Storage health diagnostics</li>
          </ul>
        </div>
      </GlassCard>
    </div>
  )
}
