const { join } = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const chalk = require("chalk");

(async function createDb() {
  const config = require("../../secrets/config.json");

  var ca = fs.readFileSync("secrets/cert.pem"); 
  
  const {
    postgresql: { user, password, host, database, port, clusterID }
  } = config;
  let database_config = {
    user: user,
    password: password,
    host: host,
    database: database,
    port: port,
    connectionTimeoutMillis: 2000,
    ssl: {
      rejectUnauthorized: true,
      ca: ca
    }
  };

  // Create a pool.
  let pool = new Pool(database_config);
  const client = await pool.connect();

  let filesDb = fs
    .readFileSync(join(__dirname, "../postgresql/filesDb.sql"))
    .toString();
  await client.query(filesDb);

  console.log(`${chalk.green(`Table(s) created!`)}`);

  process.exit(0);
})().catch(error => console.error(`${chalk.red(`${error}`)}`));
