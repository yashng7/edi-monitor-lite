import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import xml2js from 'xml2js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const getDbPath = () => path.join(process.cwd(), 'data', 'db.json');

const readDb = () => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const initialDb = { documents: [], tickets: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2));
      return initialDb;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { documents: [], tickets: [] };
  }
};

const writeDb = (data) => {
  try {
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const form = new IncomingForm();
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'File upload failed' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      try {
        const csvData = fs.readFileSync(file.filepath, 'utf8');
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split('|');
        const records = lines.slice(1).map(line => {
          const values = line.split('|');
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
          }, {});
        });

        const requiredFields = ['documentType', 'documentId', 'sender', 'receiver'];
        const hasMissingFields = records.some(record => 
          requiredFields.some(field => !record[field])
        );

        const status = hasMissingFields ? 'Failed' : 'Processing';
        const documentType = records.length > 0 ? records[0].documentType : 'Unknown';

        const db = readDb();
        const newDocument = {
          id: `DOC-${String(db.documents.length + 1).padStart(3, "0")}`,
          originalFilename: file.originalFilename,
          documentType,
          status,
          timestamp: new Date().toISOString(),
          records
        };

        if (status !== 'Failed') {
          try {
            const builder = new xml2js.Builder();
            const xml = builder.buildObject({ root: { record: records } });
            const xmlPath = path.join(process.cwd(), 'data', `${newDocument.id}.xml`);
            fs.writeFileSync(xmlPath, xml);
            newDocument.status = 'Success';
          } catch (xmlError) {
            console.error('XML conversion failed:', xmlError);
            newDocument.status = 'Failed';
          }
        }

        db.documents.push(newDocument);
        writeDb(db);

        fs.unlinkSync(file.filepath);

        res.status(200).json(newDocument);
      } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ error: 'File processing failed' });
      }
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}