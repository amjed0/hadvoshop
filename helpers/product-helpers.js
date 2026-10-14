var db = require('../config/connection')
var collection = require('../config/collections')
const { ObjectId } = require('mongodb');

module.exports = {

  addProduct: (product, callback) => {
    product.price = parseFloat(product.price);
    product.offerPrice = product.offerPrice && !isNaN(product.offerPrice) && parseFloat(product.offerPrice) > 0 
      ? parseFloat(product.offerPrice) 
      : null;
    product.createdAt = new Date();

    db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
      callback(data.insertedId);
    });
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
      resolve(products);
      console.log(products, "✅ Products Page");
    });
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      console.log(new ObjectId(prodId));
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(prodId) }).then((response) => {
        console.log(response);
        resolve(response);
      });
    });
  },
  getProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
        resolve(product);
      });
    });
  },
  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      const updateData = {
        name: proDetails.name,
        description: proDetails.description,
        price: parseFloat(proDetails.price),
        offerPrice: proDetails.offerPrice && !isNaN(proDetails.offerPrice) && parseFloat(proDetails.offerPrice) > 0 
          ? parseFloat(proDetails.offerPrice) 
          : null,
        category: proDetails.category
      };
      if (proDetails.image) {
        updateData.image = proDetails.image;
      }

      db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({ _id: new ObjectId(proId) }, {
          $set: updateData
        }).then((response) => {
          resolve();
        });
    });
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
  },
  getAllCategories: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let categories = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray();
        if (!categories || categories.length === 0) {
          const defaultCategories = [
            {
              name: 'Clothings',
              tag: '01 / APPAREL',
              description: 'Tailored cuts, premium organic fabrics, built to wear beautifully over time.',
              image: '/images/cat_clothing.png'
            },
            {
              name: 'Perfumes',
              tag: '02 / APOTHECARY',
              description: 'Intense botanical extracts and clean elements combined to capture lasting memories.',
              image: '/images/cat_perfume.png'
            },
            {
              name: 'Electronics',
              tag: '03 / OBJECTS',
              description: 'Clean design meets high fidelity performance. Devices that fit naturally into your space.',
              image: '/images/cat_electronics.png'
            }
          ];
          await db.get().collection(collection.CATEGORY_COLLECTION).insertMany(defaultCategories);
          categories = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray();
        }
        resolve(categories);
      } catch (err) {
        console.error("Error in getAllCategories:", err);
        resolve([]);
      }
    });
  },
  addCategory: (categoryData) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!categoryData.name || !categoryData.name.trim()) {
          return reject(new Error("Category name is required"));
        }
        const name = categoryData.name.trim();
        const existing = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({
          name: new RegExp('^' + name + '$', 'i')
        });
        if (existing) {
          return resolve(existing);
        }
        const newCat = {
          name: name,
          tag: categoryData.tag || 'COLLECTION',
          description: categoryData.description?.trim() || `Explore our curated ${name} collection.`,
          image: categoryData.image || '/images/cat_clothing.png',
          createdAt: new Date()
        };
        const result = await db.get().collection(collection.CATEGORY_COLLECTION).insertOne(newCat);
        newCat._id = result.insertedId;
        resolve(newCat);
      } catch (err) {
        console.error("Error in addCategory:", err);
        reject(err);
      }
    });
  },
  getProductsByCategory: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      try {
        const regex = new RegExp('^' + categoryName + '$', 'i');
        const products = await db.get().collection(collection.PRODUCT_COLLECTION).find({
          category: regex
        }).toArray();
        resolve(products);
      } catch (err) {
        console.error("Error in getProductsByCategory:", err);
        resolve([]);
      }
    });
  },
  getCategoryDetails: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      try {
        const regex = new RegExp('^' + categoryName + '$', 'i');
        let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({
          name: regex
        });
        if (!category) {
          category = {
            name: categoryName,
            tag: 'COLLECTION',
            description: `Carefully crafted and curated items in ${categoryName}.`
          };
        }
        resolve(category);
      } catch (err) {
        console.error("Error in getCategoryDetails:", err);
        resolve({
          name: categoryName,
          tag: 'COLLECTION',
          description: `Carefully crafted and curated items in ${categoryName}.`
        });
      }
    });
  },
    updateCategoryImage: (catId, imagePath) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.CATEGORY_COLLECTION)
        .updateOne({ _id: new ObjectId(catId) }, {
          $set: { image: imagePath }
        }).then((res) => resolve(res)).catch(err => reject(err));
    });
  },
  getCategoryById: (catId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(catId) };
        } catch (e) {
          filter = { _id: catId };
        }
        let cat = await db.get().collection(collection.CATEGORY_COLLECTION).findOne(filter);
        resolve(cat);
      } catch (err) {
        reject(err);
      }
    });
  },
  updateCategory: (catId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(catId) };
        } catch (e) {
          filter = { _id: catId };
        }

        const oldCat = await db.get().collection(collection.CATEGORY_COLLECTION).findOne(filter);
        const updateFields = {
          name: data.name.trim(),
          description: data.description ? data.description.trim() : ''
        };
        if (data.image) {
          updateFields.image = data.image;
        }

        await db.get().collection(collection.CATEGORY_COLLECTION).updateOne(
          filter,
          { $set: updateFields }
        );

        // If category name changed, also update all products that belong to this category
        if (oldCat && oldCat.name && oldCat.name.toLowerCase() !== data.name.trim().toLowerCase()) {
          await db.get().collection(collection.PRODUCT_COLLECTION).updateMany(
            { category: new RegExp('^' + oldCat.name + '$', 'i') },
            { $set: { category: data.name.trim() } }
          );
        }

        resolve({ success: true });
      } catch (err) {
        console.error("Error in updateCategory:", err);
        reject(err);
      }
    });
  },
  deleteCategory: (catId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let filter;
        try {
          filter = { _id: new ObjectId(catId) };
        } catch (e) {
          filter = { _id: catId };
        }
        let result = await db.get().collection(collection.CATEGORY_COLLECTION).deleteOne(filter);
        resolve(result);
      } catch (err) {
        console.error("Error in deleteCategory:", err);
        reject(err);
      }
    });
  },
  getAllCategoriesWithCounts: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let categories = await module.exports.getAllCategories();
        for (let cat of categories) {
          const count = await db.get().collection(collection.PRODUCT_COLLECTION).countDocuments({
            category: new RegExp('^' + cat.name + '$', 'i')
          });
          cat.productCount = count;
        }
        resolve(categories);
      } catch (err) {
        console.error("Error in getAllCategoriesWithCounts:", err);
        resolve([]);
      }
    });
  },
  getSalesAnalytics: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray();
        const totalProducts = await db.get().collection(collection.PRODUCT_COLLECTION).countDocuments();
        const totalUsers = await db.get().collection(collection.USER_COLLECTION).countDocuments();
        const totalCategories = await db.get().collection(collection.CATEGORY_COLLECTION).countDocuments();

        const now = new Date();
        const todayStr = now.toDateString();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let todaySales = 0;
        let todayOrders = 0;
        let monthlySales = 0;
        let monthlyOrders = 0;
        let totalSales = 0;
        let totalOrders = orders.length;

        orders.forEach(order => {
          const amount = parseFloat(order.totalAmount) || 0;
          if (order.status !== 'canceled') {
            totalSales += amount;

            let orderDate = order.createdAt ? new Date(order.createdAt) : new Date(order.date);
            if (isNaN(orderDate.getTime())) {
              orderDate = order._id ? order._id.getTimestamp() : new Date();
            }

            if (orderDate.toDateString() === todayStr) {
              todaySales += amount;
              todayOrders++;
            }

            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
              monthlySales += amount;
              monthlyOrders++;
            }
          }
        });

        // Count orders by status
        let placedCount = 0, shippedCount = 0, deliveredCount = 0, pendingCount = 0, canceledCount = 0, newOrderCount = 0;
        orders.forEach(order => {
          if (order.status === 'placed') placedCount++;
          else if (order.status === 'shipped') shippedCount++;
          else if (order.status === 'delivered') deliveredCount++;
          else if (order.status === 'pending') pendingCount++;
          else if (order.status === 'canceled') canceledCount++;
          if (order.adminViewed === false) newOrderCount++;
        });

        resolve({
          todaySales,
          todayOrders,
          monthlySales,
          monthlyOrders,
          totalSales,
          totalOrders,
          totalProducts,
          totalUsers,
          totalCategories,
          placedCount,
          shippedCount,
          deliveredCount,
          pendingCount,
          canceledCount,
          newOrderCount
        });
      } catch (err) {
        console.error("Error in getSalesAnalytics:", err);
        resolve({
          todaySales: 0,
          todayOrders: 0,
          monthlySales: 0,
          monthlyOrders: 0,
          totalSales: 0,
          totalOrders: 0,
          totalProducts: 0,
          totalUsers: 0,
          totalCategories: 0,
          placedCount: 0,
          shippedCount: 0,
          deliveredCount: 0,
          pendingCount: 0,
          canceledCount: 0,
          newOrderCount: 0
        });
      }
    });
  },
  getNewOrderCount: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let count = await db.get().collection(collection.ORDER_COLLECTION).countDocuments({ adminViewed: false });
        resolve(count);
      } catch (err) {
        console.error("Error in getNewOrderCount:", err);
        resolve(0);
      }
    });
  }
}