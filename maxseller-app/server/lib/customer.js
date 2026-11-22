// Mijoz akkaunti bo'yicha barcha bog'lanishlar: buyurtma, to'lov, xarid, hujjat, tarix.
// Barcha funksiyalar aniq userId bilan chaqiriladi — boshqa mijoz ma'lumoti qaytarilmaydi.
import { publicUser } from './core.js'
import { publicOrder } from './service.js'

function orderIds(db, userId) {
  const set = new Set()
  for (const order of db.orders) if (order.userId === userId) set.add(order.id)
  return set
}

export function customerSummary(db, user) {
  const orders = db.orders.filter((order) => order.userId === user.id)
  const ids = new Set(orders.map((order) => order.id))
  return {
    ...publicUser(user),
    customerNumber: user.customerNumber || '',
    orderCount: orders.length,
    totalSpent: orders.filter((order) => order.paymentStatus === 'PAID')
      .reduce((sum, order) => sum + Number(order.total || 0), 0),
    lastOrderAt: orders.map((order) => order.createdAt).sort().pop() || '',
    purchasesCount: db.purchases.filter((item) => item.userId === user.id).length,
    receiptsCount: db.receipts.filter((item) => ids.has(item.orderId)).length,
  }
}

function relatedActivity(db, user) {
  const markers = [user.id, user.customerNumber, `customer:${user.customerNumber}`, user.name]
  return db.activityLog.filter((item) => {
    const haystack = `${item.actor || ''} ${item.entity || ''} ${JSON.stringify(item.meta || {})}`
    return markers.some((marker) => marker && haystack.includes(marker))
  }).slice(0, 200)
}

export function customerPurchases(db, userId) {
  return db.purchases.filter((item) => item.userId === userId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((item) => {
      const order = db.orders.find((o) => o.id === item.orderId)
      const product = db.products.find((p) => p.id === item.productId)
      const receipt = db.receipts.find((r) => r.orderId === item.orderId)
      const { filePath: _hidden, ...safeReceipt } = receipt || {}
      return {
        ...item,
        productTitle: item.title || product?.title || '',
        productImage: item.image || product?.image || '',
        orderNumber: order?.orderNumber || '',
        purchasedAt: item.grantedAt || item.createdAt || order?.createdAt || '',
        hasFile: Boolean(product?.filePath),
        receipt: safeReceipt?.number ? safeReceipt : null,
        license: item.license || 'Shaxsiy foydalanish huquqi. Qayta sotish taqiqlanadi.',
      }
    })
}

export function customerReceipts(db, userId) {
  const ids = orderIds(db, userId)
  return db.receipts.filter((item) => ids.has(item.orderId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(({ filePath: _hidden, ...item }) => ({
      ...item,
      orderNumber: db.orders.find((o) => o.id === item.orderId)?.orderNumber || '',
    }))
}

export function customerTransactions(db, userId) {
  const ids = orderIds(db, userId)
  return db.payments.filter((item) => ids.has(item.orderId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(({ receipt: _hidden, ...item }) => ({
      ...item,
      orderNumber: db.orders.find((o) => o.id === item.orderId)?.orderNumber || '',
    }))
}

export function customerDetail(db, userId) {
  const user = db.users.find((item) => item.id === userId && item.role === 'customer')
  if (!user) return null
  const orders = db.orders.filter((order) => order.userId === userId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  return {
    customer: customerSummary(db, user),
    orders: orders.map(publicOrder),
    payments: customerTransactions(db, userId),
    purchases: customerPurchases(db, userId),
    receipts: customerReceipts(db, userId),
    deliveries: db.deliveries.filter((item) => item.orderId && orders.some((o) => o.id === item.orderId)),
    transactions: db.transactions.filter((item) => item.userId === userId),
    activity: relatedActivity(db, user),
  }
}
