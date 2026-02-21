
import { GoogleGenAI } from "@google/genai";
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const uploadedFile = files.file?.[0] as File;
    if (!uploadedFile) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return res.status(400).json({ message: 'File size must not exceed 20MB' });
    }

    const ALLOWED_MIME_TYPES = ['application/pdf'];
    const fileMimeType = uploadedFile.mimetype || '';
    if (!ALLOWED_MIME_TYPES.includes(fileMimeType)) {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const fileBlob = new Blob([fileBuffer], { type: uploadedFile.mimetype || 'application/pdf' });

    const file = await ai.files.upload({
      file: fileBlob,
      config: {
        displayName: uploadedFile.originalFilename || 'Uploaded PDF',
      },
    });

    let getFile = await ai.files.get({ name: file.name || '' });
    let attempts = 0;
    while (getFile.state === 'PROCESSING' && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      getFile = await ai.files.get({ name: file.name || '' });
      attempts++;
    }

    if (getFile.state === 'FAILED') {
      throw new Error('File processing failed');
    }

    return res.status(200).json({
      fileUri: getFile.uri,
      mimeType: getFile.mimeType,
      name: getFile.name
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
