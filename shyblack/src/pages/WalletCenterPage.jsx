import { useCallback, useState } from 'react'
import { ChevronLeft, Check, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { useToast } from '../components/Toast'
import GlassCard from '../components/GlassCard'
import ConfirmationModal from '../components/ConfirmationModal'
import { createWallet, deleteWallet, getActiveWallet, getWallets, renameWallet, switchWallet } from '../utils/wallets'

export default function WalletCenterPage({ onNavigate }) {
  const { t } = useTranslation()
  const { reloadFromStorage } = useFinance()
  const { addToast } = useToast()
  const [wallets, setWallets] = useState(() => getWallets())
  const [activeId, setActiveId] = useState(() => getActiveWallet()?.id)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const refresh = useCallback(() => {
    setWallets(getWallets())
    setActiveId(getActiveWallet()?.id)
  }, [])

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return
    const wallet = createWallet(newName)
    setNewName('')
    reloadFromStorage()
    refresh()
    setActiveId(wallet.id)
    addToast(t('wallets.created'), 'success')
  }, [newName, reloadFromStorage, refresh, addToast, t])

  const handleSwitch = useCallback((id) => {
    if (id === activeId) return
    const result = switchWallet(id)
    if (!result.success) {
      addToast(result.error, 'error')
      return
    }
    reloadFromStorage()
    refresh()
    addToast(t('wallets.switched'), 'success')
  }, [activeId, reloadFromStorage, refresh, addToast, t])

  const beginRename = useCallback((wallet) => {
    setEditingId(wallet.id)
    setEditingName(wallet.name)
  }, [])

  const handleRename = useCallback(() => {
    if (!editingId || !editingName.trim()) return
    renameWallet(editingId, editingName)
    setEditingId(null)
    refresh()
    addToast(t('wallets.renamed'), 'success')
  }, [editingId, editingName, refresh, addToast, t])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    const result = deleteWallet(deleteTarget)
    if (result.success) {
      refresh()
      addToast(t('wallets.deleted'), 'info')
    } else {
      addToast(result.error, 'error')
    }
    setDeleteTarget(null)
  }, [deleteTarget, refresh, addToast, t])

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => onNavigate('settings')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] transition-colors">
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{t('wallets.title')}</h1>
          <p className="text-[10px] text-gray-500">{t('wallets.description')}</p>
        </div>
      </div>

      <GlassCard brand className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
            <Wallet size={18} className="text-neon" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500">{t('wallets.active')}</p>
            <p className="text-sm font-semibold text-white">{wallets.find((wallet) => wallet.id === activeId)?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') handleCreate() }}
            placeholder={t('wallets.name_placeholder')}
            className="input-field text-xs flex-1"
            maxLength={40}
          />
          <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary !px-3 disabled:opacity-40" aria-label={t('wallets.create')}>
            <Plus size={15} />
          </button>
        </div>
      </GlassCard>

      <div className="space-y-2">
        {wallets.map((wallet) => {
          const isActive = wallet.id === activeId
          const isEditing = wallet.id === editingId
          return (
            <GlassCard key={wallet.id} className={isActive ? 'border-neon/30' : ''}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-neon/10 text-neon' : 'bg-white/[0.04] text-gray-500'}`}>
                  {isActive ? <Check size={17} /> : <Wallet size={17} />}
                </div>
                {isEditing ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') handleRename() }}
                    className="input-field text-xs flex-1"
                    autoFocus
                    maxLength={40}
                  />
                ) : (
                  <button onClick={() => handleSwitch(wallet.id)} className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-neon' : 'text-white'}`}>{wallet.name}</p>
                    <p className="text-[10px] text-gray-600">{isActive ? t('wallets.current') : t('wallets.tap_to_switch')}</p>
                  </button>
                )}
                {isEditing ? (
                  <button onClick={handleRename} disabled={!editingName.trim()} className="p-2 text-neon disabled:opacity-40" aria-label={t('wallets.save')}>
                    <Check size={15} />
                  </button>
                ) : (
                  <button onClick={() => beginRename(wallet)} className="p-2 text-gray-500 hover:text-neon" aria-label={t('wallets.rename')}>
                    <Pencil size={14} />
                  </button>
                )}
                {!isActive && (
                  <button onClick={() => setDeleteTarget(wallet.id)} className="p-2 text-gray-500 hover:text-red-400" aria-label={t('wallets.delete')}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </GlassCard>
          )
        })}
      </div>

      <ConfirmationModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('wallets.delete_title')}
        description={t('wallets.delete_description')}
        confirmLabel={t('wallets.delete')}
        cancelLabel={t('common.cancel')}
      />
    </div>
  )
}
