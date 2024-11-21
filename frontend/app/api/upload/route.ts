import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { getSession } from 'next-auth/react';
import { v4 as uuidv4 } from "uuid";

const STRAPI_API_URL = process.env.STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const AWS_S3_BUCKET_ROOT = process.env.AWS_S3_BUCKET_ROOT;
const AWS_S3_BUCKET_REGION = process.env.AWS_S3_BUCKET_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function POST(request: Request) {
  const session = await getSession(); // Check if the user is authenticated

  console.log(request)
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Validate file type and size
  const validFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validFileTypes.includes(file.type)) {
    return NextResponse.json({ message: 'Invalid file type' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) { // Limit file size to 5MB
    return NextResponse.json({ message: 'File too large' }, { status: 400 });
  }


  const fileName = encodeURIComponent(file.name);
  const fileType = file.type;
  const fileEndpoint = `${AWS_S3_BUCKET_ROOT}/${uuidv4()}_${fileName}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileEndpoint, // Specify directory path
    Expires: 60,
    ContentType: fileType,
  };


  try {
    const signedUrl = await s3.getSignedUrlPromise("putObject", params);
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": fileType,
      },
      body: file
    })

    if (uploadResponse.ok) {
      const publicImageURL =  `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_S3_BUCKET_REGION}.amazonaws.com/${fileEndpoint}`;
      return NextResponse.json(publicImageURL);
    } else {
      return NextResponse.error();
    }
  } catch (error) {
    console.error(error);
    return NextResponse.error();
  }
}