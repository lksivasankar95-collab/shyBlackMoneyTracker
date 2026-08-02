import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Search, Plus, X, FileText, FolderOpen, ArrowUpDown,
  ChevronLeft, Trash2, Edit3, Star, Download, FileType, Share2,
  CheckCircle2, Loader2, ExternalLink, 
} from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { useTranslation } from '../i18n'
import { formatDate } from '../utils/helpers'
import {
  DOCUMENT_CATEGORIES, DOCUMENT_SORT_OPTIONS, FILTER_DATE_OPTIONS,
  getDocumentFileData,
} from '../utils/documents'
import { downloadDataUri, shareBlob, dataUriToBlob, downloadDataUriLegacy, openFileNative } from '../utils/downloadUtils'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import * as privacy from '../utils/privacy'

function getCategoryIcon(catId, translate) {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.id === catId)
  return cat ? cat.label : (translate ? translate('documents.otherCategory') : 'Other')
}

function getCategoryColor(catId) {
  const colors = {
    loan: 'text-orange-400 bg-orange-500/10',
    emi: 'text-purple-400 bg-purple-500/10',
    insurance: 'text-blue-400 bg-blue-500/10',
    vehicle: 'text-cyan-400 bg-cyan-500/10',
    gold: 'text-yellow-400 bg-yellow-500/10',
    tax: 'text-red-400 bg-red-500/10',
    salary: 'text-neon bg-neon/10',
    utility: 'text-amber-400 bg-amber-500/10',
    receipt: 'text-pink-400 bg-pink-500/10',
    property: 'text-emerald-400 bg-emerald-500/10',
    warranty: 'text-indigo-400 bg-indigo-500/10',
    rental: 'text-teal-400 bg-teal-500/10',
    other: 'text-gray-400 bg-gray-500/10',
  }
  return colors[catId] || colors.other
}

function isImageType(fileType) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)
}

function isPdfType(fileType) {
  return fileType === 'pdf'
}

export default function DocumentVaultPage({ onNavigate }) {
  const { documents, addDocument, editDocument, removeDocument } = useFinance()
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [viewMode, setViewMode] = useState('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showViewer, setShowViewer] = useState(false)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    title: '', category: 'other', notes: '', tags: '',
    relatedEntityType: '', relatedEntityId: '',
  })
  const [editingDoc, setEditingDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [viewerBlobUrl, setViewerBlobUrl] = useState(null)
  const viewerRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [downloadResult, setDownloadResult] = useState(null)
  const [showDownloadInfo, setShowDownloadInfo] = useState(false)
  const formDataRef = useRef(formData)

  useEffect(() => { formDataRef.current = formData }, [formData])

  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.revoke()
        viewerRef.current = null
      }
    }
  }, [])

  const filteredDocs = useMemo(() => {
    let result = [...documents]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q) ||
        (d.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        d.category.toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== 'all') {
      result = result.filter((d) => d.category === categoryFilter)
    }

    if (dateFilter !== 'all') {
      const now = Date.now()
      const ranges = {
        today: now - 86400000,
        week: now - 7 * 86400000,
        month: now - 30 * 86400000,
        quarter: now - 90 * 86400000,
        year: now - 365 * 86400000,
      }
      const cutoff = ranges[dateFilter]
      if (cutoff) {
        result = result.filter((d) => d.createdAt >= cutoff)
      }
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title)
      } else if (sortBy === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '')
      } else {
        cmp = (a[sortBy] || 0) - (b[sortBy] || 0)
      }
      return sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  }, [documents, searchQuery, categoryFilter, dateFilter, sortBy, sortOrder])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return

    privacy.suppressLockForTransition(10000)

    setUploading(true)
    setUploadProgress(t('documents.readingFile'))
    const ext = file.name.split('.').pop().toLowerCase()
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setUploading(false)
      setUploadProgress(null)
      addToast(t('documents.fileTooLarge'), 'error')
      return
    }

    const reader = new FileReader()
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100)
        setUploadProgress(t('documents.readingProgress', { pct }))
      }
    }
    reader.onload = (ev) => {
      setFormData((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        fileData: ev.target.result,
      }))
      setPreviewUrl(ev.target.result)
      setUploading(false)
      setUploadProgress(null)
    }
    reader.onerror = () => {
      setUploading(false)
      setUploadProgress(null)
      addToast(t('documents.failedReadFile'), 'error')
    }
    reader.readAsDataURL(file)
  }, [addToast, t])

  const resetForm = useCallback(() => {
    setFormData({ title: '', category: 'other', notes: '', tags: '', relatedEntityType: '', relatedEntityId: '' })
    setPreviewUrl(null)
    setEditingDoc(null)
    setUploading(false)
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleAdd = useCallback(() => {
    if (!formData.title.trim()) return
    if (!formData.fileData && !editingDoc) {
      addToast(t('documents.selectFile'), 'error')
      return
    }
    const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
    const data = {
      ...formData,
      tags,
      relatedEntityType: formData.relatedEntityType || null,
      relatedEntityId: formData.relatedEntityId || null,
    }
    if (!data.fileData) delete data.fileData
    if (editingDoc) {
      editDocument(editingDoc.id, data)
      addToast(t('documents.documentUpdated'), 'success')
    } else {
      addDocument(data)
      addToast(t('documents.documentUploaded'), 'success')
    }
    setShowAddModal(false)
    resetForm()
  }, [formData, editingDoc, addDocument, editDocument, resetForm, addToast, t])

  const handleEdit = useCallback((doc) => {
    setEditingDoc(doc)
    setFormData({
      title: doc.title,
      category: doc.category || 'other',
      notes: doc.notes || '',
      tags: (doc.tags || []).join(', '),
      relatedEntityType: doc.relatedEntityType || '',
      relatedEntityId: doc.relatedEntityId || '',
      fileName: doc.fileName || '',
      fileType: doc.fileType || 'unknown',
      fileSize: doc.fileSize || 0,
      fileData: null,
    })
    if (doc.fileDataId) {
      const fileData = getDocumentFileData(doc.fileDataId)
      if (fileData) setPreviewUrl(fileData)
    }
    setShowAddModal(true)
  }, [])

  const handleDelete = useCallback((id) => {
    if (window.confirm(t('documents.deleteConfirm'))) {
      removeDocument(id)
      setSelectedDoc(null)
      setShowViewer(false)
      addToast(t('documents.documentDeleted'), 'info')
    }
  }, [removeDocument, addToast, t])

  const handleView = useCallback((doc) => {
    setSelectedDoc(doc)
    if (viewerRef.current) { viewerRef.current.revoke(); viewerRef.current = null }
    setViewerBlobUrl(null)
    if (doc.fileDataId && isImageType(doc.fileType)) {
      const fileData = getDocumentFileData(doc.fileDataId)
      if (fileData) {
        const blob = dataUriToBlob(fileData)
        if (blob) {
          const url = URL.createObjectURL(blob)
          viewerRef.current = { revoke: () => URL.revokeObjectURL(url) }
          setViewerBlobUrl(url)
        }
      }
    }
    setShowViewer(true)
  }, [])

  const handleOpenPdf = useCallback(async (doc) => {
    if (!doc.fileDataId) return
    const fileData = getDocumentFileData(doc.fileDataId)
    if (!fileData) return
    const blob = dataUriToBlob(fileData)
    if (!blob) return
    const filename = doc.fileName || `${doc.title}.pdf`
    await openFileNative(blob, filename)
  }, [])

  const handleDownload = useCallback(async (doc) => {
    if (!doc.fileDataId) {
      addToast(t('documents.noFileAttachedError'), 'error')
      return
    }
    const fileData = getDocumentFileData(doc.fileDataId)
    if (!fileData) {
      addToast(t('documents.fileDataNotFound'), 'error')
      return
    }

    const filename = doc.fileName || `${doc.title}.${doc.fileType || 'bin'}`

    addToast(t('documents.downloading'), 'info')

    try {
      const result = await downloadDataUri(fileData, filename)
      if (result.success) {
        setDownloadResult(result)
        setShowDownloadInfo(true)
        addToast(t('documents.savedTo', { path: result.path }), 'success')
      } else {
        const blob = dataUriToBlob(fileData)
        if (blob) {
          downloadDataUriLegacy(fileData, filename)
          addToast(t('documents.downloadedLegacy'), 'success')
        } else {
          addToast(t('documents.downloadFailed', { error: result.error || t('documents.unknownError') }), 'error')
        }
      }
    } catch (err) {
      const blob = dataUriToBlob(fileData)
      if (blob) {
        downloadDataUriLegacy(fileData, filename)
        addToast(t('documents.downloadedLegacy'), 'success')
      } else {
        addToast(t('documents.downloadFailed', { error: err.message }), 'error')
      }
    }
  }, [addToast, t])

  const handleShare = useCallback(async (doc) => {
    if (!doc.fileDataId) {
      addToast(t('documents.noFileAttachedError'), 'error')
      return
    }
    const fileData = getDocumentFileData(doc.fileDataId)
    if (!fileData) {
      addToast(t('documents.fileDataNotFound'), 'error')
      return
    }
    const blob = dataUriToBlob(fileData)
    if (!blob) {
      addToast(t('documents.couldNotProcess'), 'error')
      return
    }
    const filename = doc.fileName || `${doc.title}.${doc.fileType}`
    addToast(t('documents.sharing'), 'info')

    const result = await shareBlob(blob, filename, doc.title)
    if (result.shared) {
      addToast(t('documents.fileShared'), 'success')
    } else if (result.method === 'cancelled') {
      addToast(t('documents.shareCancelled'), 'info')
    } else if (result.method === 'unsupported') {
      addToast(t('documents.shareUnsupported'), 'error')
    } else if (result.error) {
      addToast(t('documents.shareFailed', { error: result.error }), 'error')
    }
  }, [addToast, t])

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => prev === 'desc' ? 'asc' : 'desc')
  }, [])

  const containerRef = useRef(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  const handleOpenAddModal = useCallback(() => {
    resetForm()
    privacy.suppressLockForTransition(10000)
    setShowAddModal(true)
  }, [resetForm])

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.05] transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-white">{t('documents.title')}</h1>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="p-2.5 rounded-xl bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder={t('documents.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon/30 transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-gray-300 focus:outline-none focus:border-neon/30"
        >
          <option value="all">{t('documents.allCategories')}</option>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-gray-300 focus:outline-none focus:border-neon/30"
        >
          {FILTER_DATE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-gray-300 focus:outline-none focus:border-neon/30"
        >
          {DOCUMENT_SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={toggleSortOrder}
          className="px-3 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-gray-300 hover:text-neon transition-colors flex items-center gap-1"
        >
          <ArrowUpDown size={12} />
          {sortOrder === 'desc' ? t('documents.new') : t('documents.old')}
        </button>
        <button
          onClick={() => setViewMode((prev) => prev === 'grid' ? 'list' : 'grid')}
          className="px-3 py-1.5 rounded-lg bg-matte-200 border border-glass-border text-xs text-gray-300 hover:text-neon transition-colors"
        >
          {viewMode === 'grid' ? t('documents.list') : t('documents.grid')}
        </button>
      </div>

      {/* Document Grid/List */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={searchQuery ? t('documents.noMatchingDocs') : t('documents.noDocs')}
          description={searchQuery ? t('documents.noMatchingHint') : t('documents.noDocsHint')}
          action={
            !searchQuery ? (
              <button
                onClick={handleOpenAddModal}
                className="btn-primary text-xs !px-4 !py-2"
              >
                {t('documents.addDocument')}
              </button>
            ) : null
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleView(doc)}
              className="glass p-3 rounded-xl text-left hover:border-neon/20 transition-all group"
            >
              <div className={`w-full h-20 rounded-lg mb-2 flex items-center justify-center ${getCategoryColor(doc.category)} bg-opacity-20 overflow-hidden`}>
                {doc.fileDataId ? (
                  isImageType(doc.fileType) ? (
                    <img
                      src={getDocumentFileData(doc.fileDataId)}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileType size={24} className="opacity-60" />
                  )
                ) : (
                  <FileText size={24} className="opacity-40" />
                )}
              </div>
              <p className="text-xs font-medium text-white truncate">{doc.title}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryColor(doc.category)}`}>
                  {getCategoryIcon(doc.category, t)}
                </span>
                <span className="text-[10px] text-gray-600">{formatDate(new Date(doc.createdAt))}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleView(doc)}
              className="w-full glass p-3 rounded-xl flex items-center gap-3 text-left hover:border-neon/20 transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getCategoryColor(doc.category)}`}>
                {doc.fileDataId && isImageType(doc.fileType) ? (
                  <img
                    src={getDocumentFileData(doc.fileDataId)}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <FileText size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1 py-0.5 rounded ${getCategoryColor(doc.category)}`}>
                    {getCategoryIcon(doc.category, t)}
                  </span>
                  <span className="text-[10px] text-gray-600">{formatDate(new Date(doc.createdAt))}</span>
                  {doc.relatedEntityType && (
                    <span className="text-[10px] text-neon/60">{t('documents.linked')}</span>
                  )}
                </div>
              </div>
              {doc.starred && <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); resetForm() }}>
          <div className="w-full max-w-lg bg-matte rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">{editingDoc ? t('documents.editDocument') : t('documents.addDocumentTitle')}</h2>
              <button onClick={() => { setShowAddModal(false); resetForm() }} className="p-1.5 rounded-lg hover:bg-white/[0.05]">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('documents.titleField')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t('documents.titlePlaceholder')}
                  className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('documents.categoryField')}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('documents.fileField')}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-neon/10 file:text-neon hover:file:bg-neon/20 disabled:opacity-50"
                />
                {uploading && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-neon/5 text-neon text-xs">
                    <Loader2 size={14} className="animate-spin" />
                    {uploadProgress || t('documents.processing')}
                  </div>
                )}
                {!uploading && previewUrl && (
                  <div className="mt-2 relative">
                    {isImageType(formData.fileType) ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-16 rounded-lg bg-matte-200 flex items-center justify-center gap-2 text-xs text-gray-500">
                        <FileText size={16} /> {formData.fileName || t('documents.pdfSelected')}
                        {formData.fileSize && (
                          <span className="text-gray-600">
                            {t('documents.fileSizeMB', { size: (formData.fileSize / 1024 / 1024).toFixed(1) })}
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => { setPreviewUrl(null); setFormData((prev) => ({ ...prev, fileData: null, fileName: '', fileType: 'unknown', fileSize: 0 })); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-black/40 text-white/70 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('documents.notesField')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('documents.notesPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('documents.tagsField')}</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder={t('documents.tagsPlaceholder')}
                  className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">{t('documents.linkedEntityType')}</label>
                  <select
                    value={formData.relatedEntityType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, relatedEntityType: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white focus:outline-none focus:border-neon/30"
                  >
                    <option value="">{t('documents.none')}</option>
                    <option value="emi">{t('documents.emi')}</option>
                    <option value="ledger">{t('documents.borrowLend')}</option>
                    <option value="transaction">{t('documents.transaction')}</option>
                    <option value="goal">{t('documents.goal')}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">{t('documents.entityId')}</label>
                  <input
                    type="text"
                    value={formData.relatedEntityId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, relatedEntityId: e.target.value }))}
                    placeholder={t('documents.idPlaceholder')}
                    className="w-full px-3 py-2.5 rounded-xl bg-matte-200 border border-glass-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowAddModal(false); resetForm() }}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-sm font-medium hover:bg-white/[0.08] transition-colors"
                disabled={uploading}
              >
                {t('documents.cancel')}
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.title.trim() || !formData.fileData || uploading}
                className="flex-1 py-2.5 rounded-xl bg-neon/10 text-neon text-sm font-medium border border-neon/20 hover:bg-neon/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><Loader2 size={14} className="animate-spin" /> {t('documents.uploading')}</>
                ) : (
                  editingDoc ? t('documents.update') : t('documents.upload')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer */}
      {showViewer && selectedDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm" onClick={() => { setShowViewer(false); setZoomLevel(1); if (viewerRef.current) { viewerRef.current.revoke(); viewerRef.current = null } setViewerBlobUrl(null) }}>
          {/* Viewer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => { setShowViewer(false); setZoomLevel(1) }} className="p-1.5 rounded-lg hover:bg-white/[0.08]">
                <X size={18} className="text-white" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{selectedDoc.title}</p>
                <p className="text-[10px] text-gray-500">{getCategoryIcon(selectedDoc.category, t)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEdit(selectedDoc)}
                className="p-2 rounded-lg hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
              >
                <Edit3 size={15} />
              </button>
              <button
                onClick={() => handleDownload(selectedDoc)}
                className="p-2 rounded-lg hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                disabled={!selectedDoc.fileDataId}
              >
                <Download size={15} />
              </button>
              <button
                onClick={() => handleShare(selectedDoc)}
                className="p-2 rounded-lg hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                disabled={!selectedDoc.fileDataId}
              >
                <Share2 size={15} />
              </button>
              <button
                onClick={() => handleDelete(selectedDoc.id)}
                className="p-2 rounded-lg hover:bg-white/[0.08] text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Viewer Content */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center overflow-auto p-4"
          >
            {selectedDoc.fileDataId ? (
              isImageType(selectedDoc.fileType) ? (
                <div className="relative flex flex-col items-center gap-3">
                  <img
                    src={viewerBlobUrl || getDocumentFileData(selectedDoc.fileDataId)}
                    alt={selectedDoc.title}
                    style={{ transform: `scale(${zoomLevel})`, maxWidth: '100%', maxHeight: '70vh' }}
                    className="object-contain transition-transform duration-200 rounded-lg"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                      className="px-2 py-1 rounded-lg bg-white/[0.08] text-xs text-white hover:bg-white/[0.12]"
                    >
                      -
                    </button>
                    <span className="text-xs text-gray-400">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                      className="px-2 py-1 rounded-lg bg-white/[0.08] text-xs text-white hover:bg-white/[0.12]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : isPdfType(selectedDoc.fileType) ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-4">
                  <FileText size={48} className="text-neon opacity-60" />
                  <p className="text-sm text-gray-400">{t('documents.pdfPreviewUnavailable')}</p>
                  <button
                    onClick={() => handleOpenPdf(selectedDoc)}
                    className="py-2.5 px-6 rounded-xl bg-neon/10 text-neon text-sm font-medium border border-neon/20 hover:bg-neon/20 transition-all flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    {t('documents.openPdf')}
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <FileType size={48} className="mx-auto mb-3 opacity-40" />
                  <p className="text-xs">{t('documents.previewUnavailable')}</p>
                </div>
              )
            ) : (
              <div className="text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-xs">{t('documents.noFileAttached')}</p>
              </div>
            )}
          </div>

          {/* Viewer Footer - Metadata */}
          <div className="px-4 py-3 border-t border-glass-border">
            <div className="flex flex-wrap gap-2 items-center">
              {selectedDoc.notes && (
                <p className="text-xs text-gray-400 w-full mb-1">{selectedDoc.notes}</p>
              )}
              {(selectedDoc.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-neon/10 text-neon/80">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-[10px] text-gray-600 w-full">
                <span>{t('documents.added', { date: formatDate(new Date(selectedDoc.createdAt)) })}</span>
                {selectedDoc.fileName && <span>{selectedDoc.fileName}</span>}
                {selectedDoc.fileSize && (
                  <span>{t('documents.fileSizeMB', { size: (selectedDoc.fileSize / 1024 / 1024).toFixed(1) })}</span>
                )}
                {selectedDoc.relatedEntityType && (
                  <span className="text-neon/60">{t('documents.linkedTo', { type: selectedDoc.relatedEntityType })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Info Modal */}
      {showDownloadInfo && downloadResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDownloadInfo(false)}>
          <div className="w-[90%] max-w-sm bg-matte rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-neon" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{t('documents.downloadComplete')}</h2>
                <p className="text-[10px] text-gray-500">{t('documents.fileSaved')}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-gray-500 mb-0.5">{t('documents.fileName')}</p>
                <p className="text-xs text-white font-medium break-all">{downloadResult.filename}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-[10px] text-gray-500 mb-0.5">{t('documents.location')}</p>
                <p className="text-xs text-gray-300 font-mono">{downloadResult.path}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {downloadResult.uri && (
                <button
                  onClick={async () => {
                    try {
                      const { Share } = await import('@capacitor/share')
                      await Share.share({ url: downloadResult.uri })
                    } catch { /* silent */ }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-gray-400 text-sm font-medium hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  {t('documents.open')}
                </button>
              )}
              <button
                onClick={() => setShowDownloadInfo(false)}
                className="flex-1 py-2.5 rounded-xl bg-neon/10 text-neon text-sm font-medium border border-neon/20 hover:bg-neon/20 transition-all"
              >
                {t('documents.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
