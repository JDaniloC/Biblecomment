module.exports = {
	development: {
		client: "sqlite3",
		connection: {
			filename: "./src/database/db.sqlite",
		},
		migrations: {
			directory: "./src/database/migrations",
		},
		useNullAsDefault: true,
	},

	staging: {
		client: "mysql",
		connection: {
			host: "us-cdbr-east-02.cleardb.com",
			user: "bde99ff0a59a01",
			password: "73dd8ca3",
			database: "heroku_8f188315a862a15",
		},
		migrations: {
			directory: "./src/database/migrations/",
		},
	},

	production: {
		client: "mysql",
		connection: process.env.JAWSDB_URL,
		migrations: {
			directory: "./src/database/migrations/",
		},
	},
};
