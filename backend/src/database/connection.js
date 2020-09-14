const knex = require('knex');
const configuration = require('../../knexfile');

let connection = null
if (process.env.STATE) {
    console.log("Using production")
    connection = knex(configuration.production);
} else {
    console.log("Using development")
    connection = knex(configuration.development);
}

module.exports = connection;