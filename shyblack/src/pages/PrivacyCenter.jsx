import { Shield, ChevronRight } from 'lucide-react'
import GlassCard from '../components/GlassCard'

export default function PrivacyCenter() {
  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Shield size={18} className="text-neon" />
        </div>
        <div>
          <h1 className="text-base font-bold">Privacy Center</h1>
          <p className="text-[10px] text-gray-500">Your data, your control</p>
        </div>
      </div>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Offline-First Architecture</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          ShyBlack Finance is built on an offline-first architecture. All your financial data
          is stored locally on your device. There are no remote servers, no cloud sync,
          and no data transmission to external services.
        </p>
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Data Ownership</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          You own 100% of your data. The app never collects, transmits, or shares your
          financial information. You can export your complete data at any time via
          Settings → Export Backup, and import it back on any device.
        </p>
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Local Storage</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          All data is stored using the browser's localStorage API (or an equivalent
          Capacitor storage adapter on mobile). No data leaves your device unless you
          explicitly export a backup file.
        </p>
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">PIN Protection</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          You can enable PIN-based access control in Settings → Security. When enabled,
          the app locks after a configurable timeout. Biometric authentication is also
          supported on compatible devices.
        </p>
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">Backup & Recovery</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Backups are stored locally on your device. You can export encrypted or
          unencrypted backup files, and restore them when needed. We recommend
          storing encrypted backups for sensitive data.
        </p>
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">No Tracking</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          The app contains no analytics SDKs, no tracking pixels, no ads, and no
          third-party data collection. Your financial habits remain private.
        </p>
      </GlassCard>

      <p className="text-[10px] text-gray-700 text-center mt-4">
        Last updated: June 2026
      </p>
    </div>
  )
}
