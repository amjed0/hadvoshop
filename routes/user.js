var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
// const { response } = require('../app');
const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function (req, res, next) {
  try {
    let user = req.session.user;
    let cartCount = null;
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    let categories = await productHelpers.getAllCategories();
    res.render('user/view-products', { categories, user, cartCount });
  } catch (err) {
    next(err);
  }
});

/* GET separate category page. */
router.get('/category/:categoryName', async function (req, res, next) {
  try {
    let categoryName = req.params.categoryName;
    let user = req.session.user;
    let cartCount = null;
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    let products = await productHelpers.getProductsByCategory(categoryName);
    let category = await productHelpers.getCategoryDetails(categoryName);
    let allCategories = await productHelpers.getAllCategories();

    res.render('user/category-products', {
      categoryName,
      category,
      products,
      allCategories,
      user,
      cartCount,
      title: `${categoryName} Collection`
    });
  } catch (err) {
    next(err);
  }
});

/* GET /categories redirect */
router.get('/categories', (req, res) => {
  res.redirect('/#collections');
});

router.get('/login', (req, res) => {
  if (req.session.userLoggedIn) {
    return res.redirect('/');
  } else {
    let loginErr = req.session.loginErr;
    let isUserNotFound = req.session.isUserNotFound;
    req.session.loginErr = null;
    req.session.isUserNotFound = null;
    res.render('user/login', { loginErr, isUserNotFound });
  }
});
router.get('/signup', (req, res) => {
  res.render('user/signup')
});
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.userLoggedIn = true
    req.session.user = response
    res.redirect('/')
  })
})
router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      res.redirect('/');
    } else {
      req.session.loginErr = response.message || "Invalid Email or Password";
      req.session.isUserNotFound = response.notFound || false;
      req.session.save(() => {
        res.redirect('/login');
      });
    }
  }).catch(err => {
    console.log("Login error:", err);
    req.session.loginErr = "Something went wrong. Please try again.";
    req.session.isUserNotFound = false;
    req.session.save(() => {
      res.redirect('/login');
    });
  });
});


router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.userLoggedIn = false
  res.redirect('/')
})
router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalValue = 0
  if (products.length > 0) {
    totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  }
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  console.log(products);
  res.render('user/cart', { products, user: req.session.user, totalValue, cartCount })
})
router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  console.log("api call");
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })

  })
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(() => {
    res.json({ status: true })
  })
})

router.post('/remove-cart-product', (req, res) => {
  userHelpers.removeCartProduct(req.body).then(() => {
    res.json({ status: true });
  });
});

router.get('/place-order', verifyLogin, async (req, res) => {
  const userId = req.session.user._id;
  const cartItems = await userHelpers.getCartProducts(userId);

  if (!cartItems || cartItems.length === 0) {
    // If cart is empty, redirect to cart page
    return res.redirect('/cart');
  }

  const total = await userHelpers.getTotalAmount(userId);
  const cartCount = await userHelpers.getCartCount(userId);
  res.render('user/place-order', { total, user: req.session.user, cartCount });
});

router.post('/place-order', async (req, res) => {
  let products = await userHelpers.getCartProductsList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method'] === 'COD') {
      res.json({ codSuccess: true })
    } else {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        response.key = process.env.RAZORPAY_KEY_ID || 'rzp_test_l6uz0hjV3cSj3M'
        res.json(response)
      }).catch((err) => {
        console.error("Razorpay error:", err)
        res.json({ error: true, message: err.error ? err.error.description : "Razorpay payment initiation failed." })
      })
    }
  }).catch((err) => {
    console.error("Order placement error:", err)
    res.json({ error: true, message: "Order placement failed." })
  })
  console.log(req.body);
})
router.get('/order-success', verifyLogin, (req, res) => {
  res.render('user/order-success', { user: req.session.user });
});
router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render('user/orders', { user: req.session.user, orders, cartCount })
})
router.get('/view-order-products/:id', async (req, res) => {

  let products = await userHelpers.getOrderProduct(req.params.id)
  res.render('user/view-order-products', { user: req.session.user, products })

})
router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log('payment successfull')
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false, errMsg: '' })
  })
})
module.exports = router;
