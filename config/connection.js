const MongoClient = require('mongodb').MongoClient

const State = {
  db: null
};

module.exports.connect = function (done) {
  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbname = process.env.MONGODB_DB_NAME || 'shopping';

  MongoClient.connect(url)
    .then((client) => {
      State.db = client.db(dbname);
      console.log(`✅ MongoDB connected to '${dbname}' database`);
      done();
    })
    .catch((err) => {
      done(err);
    });
};

module.exports.get = function () {
  return State.db;
};

