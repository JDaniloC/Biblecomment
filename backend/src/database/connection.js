const knex = require('knex');
const configuration = require('../../knexfile');

let connection = null
if (process.env.STATE) {
    console.log("Using staging")
    connection = knex(configuration.staging);
} else {
    console.log("Using development")
    connection = knex(configuration.development);
}

module.exports = connection;