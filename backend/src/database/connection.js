const knex = require('knex');
const configuration = require('../../knexfile');

let connection = knex(configuration.development);
module.exports = connection;