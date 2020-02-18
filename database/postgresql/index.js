
const { Pool } = require('pg');
const uuidv5 = require('uuid/v5');
const fs = require("fs");
const { join } = require("path");

const config = require("../../secrets/config.json");
const ca = fs.readFileSync("secrets/cert.pem"); 

const { postgresql: { user, password, host, database, port, clusterID } } = config;
let database_config = {
  user: user,
  password: password,
  host: host,
  database: database,
  port: port,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: true,
    ca: ca,
  }
};

// Create a pool.
let pool = new Pool(database_config);

pool.on('error', (err) => {
  console.error(`${chalk.red(`Unexpected error on idle client`)}`, err.stack)
});

async function connectDatabase() {
  return ;
}

async function findFiles() {
  const client = await pool.connect();
  
  // Create files table if it does not already exist
  let filesDb = fs.readFileSync(join(__dirname, "../postgresql/filesDb.sql")).toString();
  await client.query(filesDb);

  let { rows } = await client.query(`SELECT * FROM files;`);
  client.release();

  return rows;
}

async function createFile(newFile) {
  let uuid_string = `${newFile.userid}~${newFile.name}`;

  const client = await pool.connect();
  let { rows } = await client.query(`INSERT INTO files (id, name, type, size, userid) VALUES ('${uuidv5(uuid_string, clusterID)}', '${newFile.name}', '${newFile.type}', '${newFile.size}', '${newFile.userid}') RETURNING id;`);
  client.release();

  return rows[0];
}

async function findFile(id) {
  const client = await pool.connect();
  let { rows } = await client.query(`SELECT * FROM files WHERE (id = '${id}');`);
  client.release();

  return rows[0];
}

async function deleteFile(id) {
  const client = await pool.connect();
  let { rows } = await client.query(`DELETE FROM files WHERE ( id = '${id}') RETURNING *;`);
  client.release();

  return rows;
}

module.exports = {
  connectDatabase,
  findFiles,
  createFile,
  findFile,
  deleteFile
}