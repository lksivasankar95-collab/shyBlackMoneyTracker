let contactsAvailable = false

export async function checkContactsAvailability() {
  try {
    const { Contacts } = await import('@capacitor-community/contacts')
    contactsAvailable = true
    return { available: true }
  } catch {
    contactsAvailable = false
    return { available: false, error: 'Contacts plugin not available' }
  }
}

export async function checkContactsPermission() {
  try {
    const { Contacts } = await import('@capacitor-community/contacts')
    const permResult = await Contacts.checkPermissions()
    const granted = permResult.contacts === 'granted'
    return { granted, result: permResult.contacts }
  } catch {
    return { granted: false }
  }
}

export async function requestContactsPermission() {
  try {
    const { Contacts } = await import('@capacitor-community/contacts')
    const permResult = await Contacts.requestPermissions()
    const granted = permResult.contacts === 'granted'
    return { granted, result: permResult.contacts }
  } catch (err) {
    return { granted: false, error: err.message || 'Permission request failed' }
  }
}

export async function pickContact() {
  const avail = await checkContactsAvailability()
  if (!avail.available) return { success: false, error: 'Contacts not available' }

  let perm = await checkContactsPermission()
  if (!perm.granted) perm = await requestContactsPermission()
  if (!perm.granted) return { success: false, error: 'Contacts permission denied' }

  try {
    const { Contacts } = await import('@capacitor-community/contacts')
    if (typeof Contacts.pickContact !== 'function') {
      return { success: false, error: 'Contact picker not supported on this device' }
    }
    const result = await Contacts.pickContact()
    if (!result?.contact) return { success: false, error: 'No contact selected' }

    const c = result.contact
    const displayName = c.displayName || ''
    const givenName = c.givenName || ''
    const familyName = c.familyName || ''
    const name = displayName || [givenName, familyName].filter(Boolean).join(' ') || 'Unknown'

    const phones = (c.phoneNumbers || []).map((p) => {
      if (typeof p === 'string') return p
      return p.number || p.value || ''
    }).filter(Boolean)

    const emails = (c.emails || []).map((e) => {
      if (typeof e === 'string') return e
      return e.email || e.value || ''
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
  const avail = await checkContactsAvailability()
  if (!avail.available) return { success: false, error: 'Contacts not available' }

  let perm = await checkContactsPermission()
  if (!perm.granted) perm = await requestContactsPermission()
  if (!perm.granted) return { success: false, error: 'Contacts permission denied' }

  try {
    const { Contacts } = await import('@capacitor-community/contacts')
    const projection = { name: true, phoneNumbers: true, emails: true }
    const result = await Contacts.getContacts({ projection })

    let list = (result.contacts || []).map((c) => {
      const displayName = c.displayName || ''
      const givenName = c.givenName || ''
      const familyName = c.familyName || ''
      const name = displayName || [givenName, familyName].filter(Boolean).join(' ') || 'Unknown'
      const phones = (c.phoneNumbers || []).map((p) => {
        if (typeof p === 'string') return p
        return p.number || p.value || ''
      }).filter(Boolean)
      const emails = (c.emails || []).map((e) => {
        if (typeof e === 'string') return e
        return e.email || e.value || ''
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
