const passport = require("passport");
const formidable = require("formidable");
const fs = require("fs");
const WebAppStrategy = require("ibmcloud-appid").WebAppStrategy;

const cos_credentials = require("../secrets/cos.json");
const { apikey, resource_instance_id, cos_hmac_keys: { access_key_id, secret_access_key }} = cos_credentials;

const config = require("../secrets/config.json");
const { cloud_object_storage: { endpoint, ibmAuthEndpoint, bucket_name } } = config;

// Initialize Cloud Object Storage
var CloudObjectStorage = require("ibm-cos-sdk");
var cos_config = {
  endpoint: endpoint,
  apiKeyId: apikey,
  ibmAuthEndpoint: ibmAuthEndpoint,
  serviceInstanceId: resource_instance_id,
  // credentials and signatureVersion are required to generate presigned URLs
  credentials: new CloudObjectStorage.Credentials(
    access_key_id,
    secret_access_key,
    (sessionToken = null)
  ),
  signatureVersion: "v4"
};
var cos = new CloudObjectStorage.S3(cos_config);
const COS_BUCKET_NAME = bucket_name;

module.exports = function(app, db, system){

  app.use("/api", passport.authenticate(WebAppStrategy.STRATEGY_NAME));

  // Returns all files associated to the current user
  app.get(
    "/api/files",
    async function(req, res) {
      try {
        const body = await db.findFiles();

        res.send(
          body.map(function(item) {
            if (item._id) {
              item.id = item._id;
              delete item._id;
            }
            return item;
          })
        );
      } catch (err) {
        console.log(err);
        system.error(`Unable to retreive files. ${err}`);

        res.status(500).send(err);
      }
    }
  );

  // Generates a pre-signed URL to access a file owned by the current user
  app.get(
    "/api/files/:id/url",
    async function(req, res) {
      try {
        const doc = await db.findFile(req.params.id);

        const url = cos.getSignedUrl("getObject", {
          Bucket: COS_BUCKET_NAME,
          Key: `${doc.userid}/${doc._id ? doc._id : doc.id}/${doc.name}`,
          Expires: 60 * 5 // 5 minutes
        });

        console.log(`[OK] Built signed url for ${req.params.id}`);
        system.info(`[OK] Built signed url for ${req.params.id}`);

        res.send({ url });
      } catch (err) {
        console.log(`[KO] Could not retrieve document ${req.params.id}`, err);
        system.error(`[KO] Could not retrieve document ${req.params.id}. ${err}`);

        res.status(500).send(err);
      }
    }
  );

  // Uploads files, associating them to the current user
  app.post(
    "/api/files",
    function(req, res) {
      const form = new formidable.IncomingForm();
      form.multiples = false;
      form.parse(req);

      form.on("error", err => {
        res.status(500).send(err);
      });

      form.on("file", async (name, file) => {
        var fileDetails = {
          name: file.name,
          type: file.type,
          size: file.size,
          createdat: new Date(),
          userid: req.user.sub
        };

        try {
          console.log(
            `New file to upload: ${fileDetails.name} (${fileDetails.size} bytes)`
          );

          // create database entry
          const doc = await db.createFile(fileDetails);
          fileDetails.id = doc.insertedId ? doc.insertedId : doc.id;

          // upload to COS
          await cos
            .upload({
              Bucket: COS_BUCKET_NAME,
              Key: `${fileDetails.userid}/${fileDetails.id}/${fileDetails.name}`,
              Body: fs.createReadStream(file.path),
              ContentType: fileDetails.type
            })
            .promise();

          // reply with the document
          console.log(`[OK] Document ${fileDetails.id} uploaded to storage`);
          system.info(`[OK] Document ${fileDetails.id} uploaded to storage`);

          res.send(fileDetails);
        } catch (err) {
          console.log(`[KO] Failed to upload ${fileDetails.name}`, err);
          system.error(`[KO] Failed to upload ${fileDetails.name}. ${err}`);

          res.status(500).send(err);
        }

      });
    }
  );

  // Deletes a file associated with the current user
  app.delete(
    "/api/files/:id",
    async function(req, res) {
      try {
        console.log(`Deleting document ${req.params.id}`);
        system.info(`Deleting document ${req.params.id}`);
        const doc = await db.findFile(req.params.id);

        // remove the COS object
        console.log(`Removing file ${doc.userid}/${doc._id ? doc._id : doc.id}/${doc.name}`);
        system.info(`Removing file ${doc.userid}/${doc._id ? doc._id : doc.id}/${doc.name}`);

        await cos
          .deleteObject({
            Bucket: COS_BUCKET_NAME,
            Key: `${doc.userid}/${doc._id ? doc._id : doc.id}/${doc.name}`
          })
          .promise();

        await db.deleteFile(doc._id ? doc._id : doc.id);

        console.log(`[OK] Successfully deleted ${doc._id ? doc._id : doc.id}`);
        system.info(`[OK] Successfully deleted ${doc._id ? doc._id : doc.id}`);

        res.status(204).send();
      } catch (err) {
        system.error(`Error deleting file ${doc._id ? doc._id : doc.id}. ${err}`)
        res.status(500).send(err);
      }
    }
  );

}