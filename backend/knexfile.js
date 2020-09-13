// Update with your config settings.

const path = require('path');

module.exports = {

  development: {
    client: 'sqlite3',
    connection: {
      filename: './src/database/db.sqlite'
    },
    migrations: {
      directory: './src/database/migrations'
    },
    useNullAsDefault: true,
  },

  staging: {
    client: 'mysql',
    connection: {
      host:     'us-cdbr-east-02.cleardb.com',
      user:     'bde99ff0a59a01',
      password: '73dd8ca3',
      database: 'heroku_8f188315a862a15'
    },
    migrations: {
      directory:"./src/database/migrations/"
    }
  },

  production: {
    client: 'mysql',
    connection: {
      host:     'w1h4cr5sb73o944p.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
      user:     'tm8bsap1hsd4lil9',
      password: 'gds9rd5uva3p966c',
      database: 'qfk25mxhm9aawo8b'
    },
    migrations: {
      directory:"./src/database/migrations/"
    }
  }

};
