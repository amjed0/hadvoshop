const db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt')

module.exports = {
  
  addAdmin: async (adminData) => {
    adminData.password = await bcrypt.hash(adminData.password, 10)
    let result = await db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData)
    return result.insertedId
  },

  doLogin: async (adminData) => {
    let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
    if (admin) {
      let status = await bcrypt.compare(adminData.password, admin.password)
      if (status) {
        return { status: true, admin }
      }
    }
    return { status: false }
  }
}
