import { Contacts } from '@capacitor-community/contacts'

export async function checkContactsAvailability() {
  const available = typeof Contacts === 'object' && typeof Contacts.checkPermissions === 'function'
  return available
    ? { available: true }
    : { available: false, error: 'Contacts plugin not available' }
}

export async function checkContactsPermission() {
  try {
    const permResult = await Contacts.checkPermissions()
    const granted = permResult.contacts === 'granted'
    return { granted, result: permResult.contacts }
  } catch {
    return { granted: false }
  }
}

export async function requestContactsPermission() {
  try {
    const permResult = await Contacts.requestPermissions()
    const granted = permResult.contacts === 'granted'
    return { granted, result: permResult.contacts }
  } catch (err) {
    return { granted: false, error: err.message || 'Permission request failed' }
  }
}

export async function pickContact() {
  let perm = await checkContactsPermission()
  if (!perm.granted) {
    perm = await requestContactsPermission()
  }
  if (!perm.granted) {
    return { success: false, error: 'Contacts permission denied' }
  }

  try {
    if (typeof Contacts.pickContact !== 'function') {
      return { success: false, error: 'Contact picker not supported on this device' }
    }
    const result = await Contacts.pickContact({ projection: { name: true, phones: true, emails: true } })
    if (!result?.contact) return { success: false, error: 'No contact selected' }

    const c = result.contact
    const nameObj = c.name || {}
    const displayName = nameObj.display || ''
    const givenName = nameObj.given || ''
    const familyName = nameObj.family || ''
    const name = displayName || [givenName, familyName].filter(Boolean).join(' ') || 'Unknown'

    const phones = (c.phones || []).map((p) => {
      if (typeof p === 'string') return p
      return p.number || p.value || ''
    }).filter(Boolean)

    const emails = (c.emails || []).map((e) => {
      if (typeof e === 'string') return e
      return e.address || ''
    }).filter(Boolean)

    return {
      success: true,
      contact: {
        name,
        givenName,
        familyName,
        phoneNumbers: phones,
        primaryPhone: phones[0] || '',
        emails,
        primaryEmail: emails[0] || '',
        raw: c,
      },
    }
  } catch (err) {
    return { success: false, error: err.message || 'Contact pick failed' }
  }
}

export async function getContacts(searchQuery = '') {
  let perm = await checkContactsPermission()
  if (!perm.granted) perm = await requestContactsPermission()
  if (!perm.granted) return { success: false, error: 'Contacts permission denied' }

  try {
    const projection = { name: true, phones: true, emails: true }
    const result = await Contacts.getContacts({ projection })

    let list = (result.contacts || []).map((c) => {
      const nameObj = c.name || {}
      const displayName = nameObj.display || ''
      const givenName = nameObj.given || ''
      const familyName = nameObj.family || ''
      const name = displayName || [givenName, familyName].filter(Boolean).join(' ') || 'Unknown'
      const phones = (c.phones || []).map((p) => {
        if (typeof p === 'string') return p
        return p.number || p.value || ''
      }).filter(Boolean)
      const emails = (c.emails || []).map((e) => {
        if (typeof e === 'string') return e
        return e.address || ''
      }).filter(Boolean)
      return { name, phoneNumbers: phones, primaryPhone: phones[0] || '', emails, primaryEmail: emails[0] || '' }
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.phoneNumbers.some((p) => p.includes(q))
      )
    }

    list.sort((a, b) => a.name.localeCompare(b.name))
    return { success: true, contacts: list, count: list.length }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch contacts' }
  }
}
