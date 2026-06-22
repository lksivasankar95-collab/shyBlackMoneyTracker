import i18n from 'i18next'

export async function getNotifT() {
  return i18n.t.bind(i18n)
}
