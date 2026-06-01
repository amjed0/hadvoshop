const MongoClient=require('mongodb').MongoClient

const State = {
  db: null
};

module.exports.connect = function (done) {
  const url = 'mongodb://localhost:27017';
  const dbname = 'shopping';

  MongoClient.connect(url)
    .then((client) => {
      State.db = client.db(dbname);
      console.log("✅ MongoDB connected to 'shopping' database");
      done();
    })
    .catch((err) => {
      done(err);
    });
};

module.exports.get = function () {
  return State.db;
};
