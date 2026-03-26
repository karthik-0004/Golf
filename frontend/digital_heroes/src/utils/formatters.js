export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

export const getMonthName = (monthNum) =>
  new Date(2024, monthNum - 1).toLocaleString('default', { month: 'long' })

export const getSubscriptionStatusColor = (status) => ({
  active: 'green',
  inactive: 'gray',
  cancelled: 'red',
  lapsed: 'orange',
}[status] || 'gray')

export const formatMatchType = (type) => ({
  '5_match': '5 Number Match 🏆',
  '4_match': '4 Number Match 🥈',
  '3_match': '3 Number Match 🥉',
}[type] || type)

export const getVerificationColor = (status) => ({
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}[status] || 'default')

export const getPaymentColor = (status) => ({
  pending: 'warning',
  paid: 'success',
}[status] || 'default')
