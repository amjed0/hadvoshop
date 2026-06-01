var db = require('../config/connection')
var collection = require('../config/collections')
const { ObjectId } = require('mongodb');

module.exports = {

  addProduct: (product, callback) => {
    product.price = parseFloat(product.price)

    db.get().collection('product').insertOne(product).then((data) => {
      callback(data.insertedId)
    })
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
      console.log(products, "✅ Products Page");
    })
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      console.log(new ObjectId(prodId));
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(prodId) }).then((response) => {
        console.log(response)
        resolve(response)
      })
    })
  },
  getProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
        resolve(product)
      })
    })
  },
  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({ _id: new ObjectId(proId) }, {
          $set: {
            name: proDetails.name,
            description: proDetails.description,
            price: parseFloat(proDetails.price),
            category: proDetails.category
          }
        }).then((response) => {
          resolve()
        })

    })
  },
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find().sort({ _id: -1 }).toArray()
      resolve(orders)
    })
  },
  changeStatus: (status, orderId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({ _id: new ObjectId(orderId) },
          {
            $set: {
              status: status
            }
          }
        ).then(() => {
          resolve()
        })
    })
  }
}