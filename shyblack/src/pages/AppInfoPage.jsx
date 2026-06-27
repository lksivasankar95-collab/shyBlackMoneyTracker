import { Info, ChevronRight } from 'lucide-react'
import { useTranslation } from '../i18n'
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
  const { t } = useTranslation()
  const schemaVersion = getSchemaVersion()
  const info = safeStorage.getStorageInfo()

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
          <Info size={18} className="text-neon" />
        </div>
        <div>
          <h1 className="text-base font-bold">{t('settings.about')}</h1>
          <p className="text-[10px] text-gray-500">{t('app.info_subtitle')}</p>
        </div>
      </div>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">{t('app.app_info')}</h3>
        <Row label={t('app.app_name')} value="ShyBlack Finance" />
        <Row label={t('app.version')} value="1.0.0" />
        <Row label={t('app.build')} value={`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`} />
        <Row label={t('app.schema_version')} value={`v${schemaVersion}`} />
        <Row label={t('app.target_schema')} value={`v${APP_SCHEMA_VERSION}`} />
        <Row label={t('app.storage_used')} value={`${info.usedKB} ${t('common.kilobytes')}`} />
        <Row label={t('app.storage_keys')} value={info.keyCount} />
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">{t('app.technology_stack')}</h3>
        <Row label={t('app.framework')} value="React" />
        <Row label={t('app.build_tool')} value="Vite" />
        <Row label={t('app.styling')} value="Tailwind CSS" />
        <Row label={t('app.mobile_runtime')} value="Capacitor" />
        <Row label={t('app.architecture')} value={t('app.offline_first')} />
        <Row label={t('app.storage')} value="LocalStorage / Capacitor" />
      </GlassCard>

      <GlassCard className="mb-3">
        <h3 className="text-xs font-semibold text-gray-300 mb-2">{t('app.release_notes')}</h3>
        <div className="text-[11px] text-gray-400 leading-relaxed space-y-2">
          <p><span className="text-neon font-medium">v1.0.0</span> — {t('app.production_release_with')}</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>{t('app.feature_transactions')}</li>
            <li>{t('app.feature_budgets')}</li>
            <li>{t('app.feature_debts')}</li>
            <li>{t('app.feature_emi')}</li>
            <li>{t('app.feature_goals')}</li>
            <li>{t('app.feature_wealth')}</li>
            <li>{t('app.feature_health')}</li>
            <li>{t('app.feature_cashflow')}</li>
            <li>{t('app.feature_backup')}</li>
            <li>{t('app.feature_documents')}</li>
            <li>{t('app.feature_multi_language')}</li>
            <li>{t('app.feature_security')}</li>
            <li>{t('app.feature_integrity')}</li>
            <li>{t('app.feature_performance')}</li>
            <li>{t('app.feature_diagnostics')}</li>
          </ul>
        </div>
      </GlassCard>
    </div>
  )
}
