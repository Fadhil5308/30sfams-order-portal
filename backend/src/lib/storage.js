let storageClientPromise;

async function getStorageClient() {
  if (!storageClientPromise) {
    storageClientPromise = (async () => {
      // Load the AWS SDK only when an image storage operation is actually used.
      // Normal API requests no longer pay the module-load cost during cold starts.
      const { S3Client } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: process.env.AWS_REGION || 'ap-southeast-1',
        endpoint: process.env.AWS_ENDPOINT_URL_S3,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      return client;
    })();
  }
  return storageClientPromise;
}

const bucket = process.env.AWS_BUCKET_NAME || 'uploads';

export async function uploadImage(key, buffer, contentType) {
  const [{ PutObjectCommand }, client] = await Promise.all([
    import('@aws-sdk/client-s3'),
    getStorageClient(),
  ]);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Resource image keys are UUID-based and never overwritten in place.
      CacheControl: 'private, max-age=3300, immutable',
    })
  );

  return key;
}

export async function getImageUrl(key) {
  const [{ GetObjectCommand }, { getSignedUrl }, client] = await Promise.all([
    import('@aws-sdk/client-s3'),
    import('@aws-sdk/s3-request-presigner'),
    getStorageClient(),
  ]);

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
}

export async function deleteImage(key) {
  const [{ DeleteObjectCommand }, client] = await Promise.all([
    import('@aws-sdk/client-s3'),
    getStorageClient(),
  ]);

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
