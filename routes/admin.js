var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var adminData = require('../config/admin');

router.get('/', function (req, res, next) {
  res.redirect('/admin/login');
});


// middleware to check login
function verifyLogin(req, res, next) {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin/login');
  }
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
router.get('/dashboard', verifyLogin, async (req, res) => {
  let products = await productHelpers.getAllProducts();
  res.render('admin/dashboard', { admin: req.session.admin, products });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Add Product Page
router.get('/add-product', verifyLogin, (req, res) => {
  res.render('admin/add-product', { admin: true });
});

// Handle Add Product
router.post('/add-product', (req, res) => {
  const { name, description, price } = req.body;
  const image = req.files?.image;

  if (!name || !description || !price || !image) {
    console.log("❌ Missing fields");
    return res.render('admin/add-product', { admin: true, error: "All fields are required" });
  }

  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.image;
    image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render("admin/add-product", { admin: true, success: "✅ Product added successfully" });
      } else {
        console.log("❌ Image Upload Error:", err);
        res.render("admin/add-product", { admin: true, error: "Image upload failed" });
      }
    });
  });
});

// Delete Product
router.get('/delete-product/:id', verifyLogin, (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then(() => {
    res.redirect('/admin');
  });
});

// Edit Product Page
router.get('/edit-product/:id', verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render('admin/edit-product', { admin: true, product });
  console.log(product, "✅ Edit Product Page");

});




// Handle Edit Product
router.post('/edit-product/:id', verifyLogin, (req, res) => {
  let id = req.params.id;
  productHelpers.updateProduct(id, req.body).then(() => {
    if (req.files && req.files.image) {
      let image = req.files.image;
      image.mv('./public/product-images/' + id + '.jpg');
    }
    res.redirect('/admin');
  });
});


router.get('/all-orders', verifyLogin, async (req, res) => {
  let orders = await productHelpers.getAllOrders();
  res.render('admin/all-orders', { admin: true, orders });
});

router.get('/all-users', verifyLogin, async (req, res) => {
  let users = await userHelpers.getAllUsers();
  res.render('admin/all-users', { admin: true, users });
});


// View specific user's orders
router.get('/view-user-orders/:id', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.params.id)
  res.render('admin/view-user-orders', { admin: true, orders })
})

// View products of a specific order (Marks as viewed)
router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  await userHelpers.markOrderAsViewed(req.params.id)
  let products = await userHelpers.getOrderProduct(req.params.id)
  res.render('admin/view-order-products', { admin: true, products })
})

router.get('/view-profile/:id', verifyLogin, async (req, res) => {
  let user = await userHelpers.getUserDetails(req.params.id)
  res.render('admin/view-profile', { admin: true, user })
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
