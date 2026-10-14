const MongoClient = require('mongodb').MongoClient;

const State = {
  db: null,
  client: null,
  connectingPromise: null
};

module.exports.connect = function (done = () => {}) {
  if (State.db) {
    done();
    return Promise.resolve(State.db);
  }

  if (State.connectingPromise) {
    return State.connectingPromise
      .then(() => {
        done();
        return State.db;
      })
      .catch((err) => {
        done(err);
        throw err;
      });
  }

  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbname = process.env.MONGODB_DB_NAME || 'shopping';

  State.connectingPromise = MongoClient.connect(url)
    .then((client) => {
      State.client = client;
      State.db = client.db(dbname);
      console.log(`✅ MongoDB connected to '${dbname}' database`);
      done();
      return State.db;
    })
    .catch((err) => {
      State.connectingPromise = null;
      console.error('❌ MongoDB Connection Error:', err);
      done(err);
      throw err;
    });

  return State.connectingPromise;
};

module.exports.get = function () {
  return State.db;
};
