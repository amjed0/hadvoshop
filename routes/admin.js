var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var adminData = require('../config/admin');
const { uploadImage } = require('../config/cloudinary');

router.get('/', function (req, res, next) {
  if (req.session.adminLoggedIn) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});


// middleware to check login
function verifyLogin(req, res, next) {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// Middleware to attach new order count to all admin pages
async function attachOrderCount(req, res, next) {
  try {
    let newOrderCount = await productHelpers.getNewOrderCount();
    res.locals.newOrderCount = newOrderCount;
  } catch (err) {
    res.locals.newOrderCount = 0;
  }
  next();
}

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.adminLoggedIn) {
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { "loginErr": req.session.loginErr, "admin": true });
    req.session.loginErr = false;
  }
});

// Handle login form
router.post('/login', (req, res) => {
  if (req.body.email === adminData.email && req.body.password === adminData.password) {
    req.session.adminLoggedIn = true;
    req.session.admin = req.body;
    res.redirect('/admin/dashboard');
  } else {
    req.session.loginErr = "Invalid Email or Password";
    res.redirect('/admin/login');
  }
});

// Admin dashboard (protected)
router.get('/dashboard', verifyLogin, attachOrderCount, async (req, res) => {
  let products = await productHelpers.getAllProducts();
  let analytics = await productHelpers.getSalesAnalytics();
  let categories = await productHelpers.getAllCategories();
  res.render('admin/dashboard', { 
    admin: req.session.admin, 
    products, 
    analytics, 
    categories,
    newOrderCount: res.locals.newOrderCount,
    activeNav: 'dashboard' 
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Add Product Page
router.get('/add-product', verifyLogin, attachOrderCount, async (req, res) => {
  let categories = await productHelpers.getAllCategories();
  res.render('admin/add-product', { admin: true, categories, newOrderCount: res.locals.newOrderCount, activeNav: 'add-product' });
});

// Add New Category (AJAX + Form Support with Image Upload)
router.post('/add-category', verifyLogin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.is('json')) {
        return res.status(400).json({ error: "Category name is required" });
      }
      return res.redirect('/admin/add-product');
    }

    let category = await productHelpers.addCategory({ name, description });

    // Handle Category Image Upload if provided
    let catImage = req.files?.categoryImage || req.files?.image;
    if (catImage && category && category._id) {
      const imagePath = await uploadImage(catImage, 'category-images', category._id.toString() + '.jpg');
      await productHelpers.updateCategoryImage(category._id, imagePath);
      category.image = imagePath;
    }

    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.is('json')) {
      return res.json({ success: true, category });
    }
    res.redirect('/admin/add-product');
  } catch (err) {
    console.error("Add category route error:", err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.is('json')) {
      return res.status(500).json({ error: err.message || "Failed to add category" });
    }
    res.redirect('/admin/add-product');
  }
});

// Category Management Routes
router.get('/all-categories', verifyLogin, attachOrderCount, async (req, res) => {
  try {
    let categories = await productHelpers.getAllCategoriesWithCounts();
    res.render('admin/all-categories', {
      admin: true,
      categories,
      activeNav: 'categories'
    });
  } catch (err) {
    console.error("Error fetching all categories:", err);
    res.redirect('/admin/dashboard');
  }
});

// Get single category details (for AJAX Edit Modal)
router.get('/get-category/:id', verifyLogin, async (req, res) => {
  try {
    let category = await productHelpers.getCategoryById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Category
router.post('/edit-category/:id', verifyLogin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const catId = req.params.id;

    if (!name || !name.trim()) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.body.isAjax) {
        return res.status(400).json({ error: "Category name is required" });
      }
      return res.redirect('/admin/all-categories');
    }

    let updateData = { name, description };

    // Handle new image upload if provided
    let catImage = req.files?.categoryImage || req.files?.image;
    if (catImage) {
      const imagePath = await uploadImage(catImage, 'category-images', catId + '.jpg');
      updateData.image = imagePath;
    }

    await productHelpers.updateCategory(catId, updateData);

    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.body.isAjax) {
      return res.json({ success: true });
    }
    res.redirect('/admin/all-categories');
  } catch (err) {
    console.error("Error editing category:", err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.body.isAjax) {
      return res.status(500).json({ error: err.message || "Failed to edit category" });
    }
    res.redirect('/admin/all-categories');
  }
});

// Delete Category
router.all('/delete-category/:id', verifyLogin, async (req, res) => {
  try {
    await productHelpers.deleteCategory(req.params.id);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ success: true });
    }
    res.redirect('/admin/all-categories');
  } catch (err) {
    console.error("Error deleting category:", err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ error: err.message || "Failed to delete category" });
    }
    res.redirect('/admin/all-categories');
  }
});

// Handle Add Product
router.post('/add-product', verifyLogin, async (req, res) => {
  const { name, category, description, price, offerPrice } = req.body;
  const image = req.files?.image;
  let categories = await productHelpers.getAllCategories();

  if (!name || !category || !description || !price || !image) {
    console.log("❌ Missing fields");
    return res.render('admin/add-product', { admin: true, categories, error: "Please fill all required fields including image" });
  }

  try {
    const imageUrl = await uploadImage(image, 'product-images');
    req.body.image = imageUrl;
    productHelpers.addProduct(req.body, async (id) => {
      let updatedCategories = await productHelpers.getAllCategories();
      res.render("admin/add-product", { admin: true, categories: updatedCategories, success: "Product added successfully!" });
    });
  } catch (err) {
    console.error("❌ Image Upload Error:", err);
    res.render("admin/add-product", { admin: true, categories, error: "Image upload failed" });
  }
});

// Delete Product
router.get('/delete-product/:id', verifyLogin, (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then(() => {
    res.redirect('/admin');
  });
});

// Edit Product Page
router.get('/edit-product/:id', verifyLogin, attachOrderCount, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  let categories = await productHelpers.getAllCategories();
  res.render('admin/edit-product', { admin: true, product, categories, newOrderCount: res.locals.newOrderCount });
  console.log(product, "✅ Edit Product Page");
});

// Handle Edit Product
router.post('/edit-product/:id', verifyLogin, async (req, res) => {
  let id = req.params.id;
  try {
    if (req.files && req.files.image) {
      const imageUrl = await uploadImage(req.files.image, 'product-images', id + '.jpg');
      req.body.image = imageUrl;
    }
    await productHelpers.updateProduct(id, req.body);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("❌ Edit Product Error:", err);
    res.redirect('/admin/dashboard');
  }
});


router.get('/all-orders', verifyLogin, attachOrderCount, async (req, res) => {
  let orders = await productHelpers.getAllOrders();
  res.render('admin/all-orders', { admin: true, orders, newOrderCount: res.locals.newOrderCount, activeNav: 'orders' });
});

router.get('/all-users', verifyLogin, attachOrderCount, async (req, res) => {
  let users = await userHelpers.getAllUsers();
  res.render('admin/all-users', { admin: true, users, newOrderCount: res.locals.newOrderCount, activeNav: 'users' });
});


// View specific user's orders
router.get('/view-user-orders/:id', verifyLogin, attachOrderCount, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.params.id)
  res.render('admin/view-user-orders', { admin: true, orders, newOrderCount: res.locals.newOrderCount })
})

// View products of a specific order (Marks as viewed)
router.get('/view-order-products/:id', verifyLogin, attachOrderCount, async (req, res) => {
  await userHelpers.markOrderAsViewed(req.params.id)
  let products = await userHelpers.getOrderProduct(req.params.id)
  res.render('admin/view-order-products', { admin: true, products, newOrderCount: res.locals.newOrderCount })
})

router.get('/view-profile/:id', verifyLogin, attachOrderCount, async (req, res) => {
  let user = await userHelpers.getUserDetails(req.params.id)
  res.render('admin/view-profile', { admin: true, user, newOrderCount: res.locals.newOrderCount })
})

router.post('/status-change', verifyLogin, (req, res) => {
  let status = req.body.status
  let orderId = req.body.orderId
  productHelpers.changeStatus(status, orderId).then(() => {
    console.log(req.body);
    res.json({ status: true })
  })
})

module.exports = router;
