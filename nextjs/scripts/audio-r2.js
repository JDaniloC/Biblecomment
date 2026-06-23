// R2 is S3-API compatible. Endpoint = https://<account>.r2.cloudflarestorage.com
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

function makeR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function putObject(client, key, body, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

async function getJson(client, key) {
  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

module.exports = { makeR2Client, putObject, getJson };
