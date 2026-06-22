import { useMemo, useState } from 'react'
import {
  FileText, Landmark, Users, Target, Wallet, ArrowUpDown, X, Link2, Plus,
  ExternalLink,
} from 'lucide-react'
import { getRelationshipsForEntity, getRelatedEntities, getEntityLabel, getAllEntitiesByType, createRelationship, deleteRelationship, ENTITY_TYPES } from '../utils/relationships'
import { formatCurrency } from '../utils/helpers'
import GlassCard from './GlassCard'
import { useTranslation } from '../i18n'

const TYPE_ICONS = {
  emi: Landmark,
  ledger: Users,
  goal: Target,
  account: Wallet,
  document: FileText,
  transaction: ArrowUpDown,
}

const TYPE_COLORS = {
  emi: 'text-purple-400 bg-purple-500/10',
  ledger: 'text-blue-400 bg-blue-500/10',
  goal: 'text-amber-400 bg-amber-500/10',
  account: 'text-cyan-400 bg-cyan-500/10',
  document: 'text-neon bg-neon/10',
  transaction: 'text-emerald-400 bg-emerald-500/10',
}

export default function RelatedItemsPanel({ entityType, entityId, onNavigate }) {
  const { t } = useTranslation()
  const [showLinker, setShowLinker] = useState(false)
  const [linkTargetType, setLinkTargetType] = useState('document')
  const [linkTargetId, setLinkTargetId] = useState('')
  const [linkLabel, setLinkLabel] = useState('')

  const related = useMemo(() => {
    return getRelatedEntities(entityType, entityId)
  }, [entityType, entityId])

  const relatedWithLabels = useMemo(() => {
    return related.map((r) => ({
      ...r,
      label2: getEntityLabel(r.relatedType, r.relatedId) || r.relatedId,
    }))
  }, [related])

  const targetEntities = useMemo(() => {
    if (!linkTargetType) return []
    return getAllEntitiesByType(linkTargetType)
  }, [linkTargetType])

  const handleLink = () => {
    if (!linkTargetId) return
    const targetType = linkTargetType
    const targetId = linkTargetId
    const sourceType = entityType
    const sourceId = entityId
    createRelationship(sourceType, sourceId, targetType, targetId, linkLabel)
    setShowLinker(false)
    setLinkTargetId('')
    setLinkLabel('')
  }

  const handleUnlink = (relId) => {
    deleteRelationship(relId)
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
          <Link2 size={12} className="text-neon" />
          {t('related_items.title')}
          <span className="text-[10px] text-gray-600 font-normal">({related.length})</span>
        </h3>
        <button
          onClick={() => setShowLinker(!showLinker)}
          className="flex items-center gap-1 text-[10px] text-neon/70 hover:text-neon transition-colors"
        >
          <Plus size={11} />
          {t('related_items.link')}
        </button>
      </div>

      {/* Linker Form */}
      {showLinker && (
        <GlassCard className="!p-3 border-neon/20">
          <div className="space-y-2">
            <select
              value={linkTargetType}
              onChange={(e) => { setLinkTargetType(e.target.value); setLinkTargetId('') }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-white focus:outline-none focus:border-neon/30"
            >
              {ENTITY_TYPES.filter((t) => t.id !== entityType).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            <select
              value={linkTargetId}
              onChange={(e) => setLinkTargetId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-white focus:outline-none focus:border-neon/30"
            >
              <option value="">Select {ENTITY_TYPES.find((t) => t.id === linkTargetType)?.label}...</option>
              {targetEntities.map((e) => (
                <option key={e.id} value={e.id}>{e.label} {e.sublabel ? `(${e.sublabel})` : ''}</option>
              ))}
            </select>

            <input
              type="text"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder={t('related_items.label_placeholder')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowLinker(false)}
                className="flex-1 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-white bg-white/[0.03] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLink}
                disabled={!linkTargetId}
                className="flex-1 py-1.5 rounded-lg text-[10px] text-neon bg-neon/10 border border-neon/20 hover:bg-neon/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {t('related_items.link')}
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Related Items List */}
      {relatedWithLabels.length === 0 && !showLinker ? (
        <p className="text-[11px] text-gray-600 text-center py-2">{t('related_items.no_links')}</p>
      ) : (
        <div className="space-y-1.5">
          {relatedWithLabels.map((item) => {
            const Icon = TYPE_ICONS[item.relatedType] || FileText
            const colorClass = TYPE_COLORS[item.relatedType] || 'text-gray-400 bg-gray-500/10'
            return (
              <div
                key={item.relationshipId}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.label2}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">{ENTITY_TYPES.find((t) => t.id === item.relatedType)?.label || item.relatedType}</span>
                    {item.label && <span className="text-[10px] text-neon/60">{item.label}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink(item.relationshipId)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                  title="Unlink"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
