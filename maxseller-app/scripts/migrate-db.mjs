// Mavjud db.json ni joriy tuzilmaga o'tkazadi. Asosiy migratsiya server/lib/core.js da.
import { readDb } from '../server/lib/core.js'

const db = readDb()
console.log(`Migratsiya bajarildi: ${db.products.length} mahsulot, ${db.orders.length} buyurtma, ${db.users.length} foydalanuvchi`)
