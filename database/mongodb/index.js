
const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs");

var ca = fs.readFileSync("secrets/cert.pem");

const config = require("../../secrets/config.json");
const { mongodb: { user, password, hosts, database, clusterID, replicaSet } } = config;

const url = `mongodb://${user}:${password}@${hosts}/?replicaSet=${replicaSet}&ssl=true`;

const client = new MongoClient(url, {
  sslValidate: true,
  sslCA: ca,
  useUnifiedTopology: true
});

async function connectDatabase() {
  await client.connect();
  return;
}

async function findFiles() {
  const cursor = client
    .db(`${database}`)
    .collection("files")
    .find();

  const result = await cursor.toArray();

  return result;
}

async function createFile(newFile) {
  const result = await client
    .db(`${database}`)
    .collection("files")
    .insertOne(newFile);

  return result;
}

async function findFile(id) {
  result = await client
    .db(`${database}`)
    .collection("files")
    .findOne({ _id: new ObjectId(id) });
  
  return result;
}

async function deleteFile(id) {
  result = await client
    .db(`${database}`)
    .collection("files")
    .deleteOne({ _id: new ObjectId(id) });
  
  // client.close();
  return result;
}

module.exports = {
  connectDatabase,
  findFiles,
  createFile,
  findFile,
  deleteFile
}