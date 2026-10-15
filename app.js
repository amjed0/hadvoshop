try {
  require('dotenv').config();
} catch (e) {
  // dotenv package not installed locally yet
}
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
const exphbs = require('express-handlebars');
var app = express();
var fileUpload = require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session');
var MongoStore = require('connect-mongo').default;
const adminHelpers = require('./helpers/admin_helpers');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: path.join(__dirname, 'views/layout/'),
  partialsDir: path.join(__dirname, 'views/partials/'),
  helpers: {
    eq: function (a, b) {
      return a === b;
    },
    gt: function (a, b) {
      return Number(a) > Number(b);
    },
    gte: function (a, b) {
      return Number(a) >= Number(b);
    }
  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  }
});

app.engine('hbs', hbs.engine);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({
  secret: process.env.SESSION_SECRET || "key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/shopping' }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}))
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
db.connect();

// Middleware ensuring database connection for serverless cold-starts
app.use(async (req, res, next) => {
  if (!db.get()) {
    try {
      await db.connect();
    } catch (e) {
      console.error('❌ Serverless DB connection attempt failed:', e);
    }
  }
  next();
});

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
