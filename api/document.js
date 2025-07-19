import fs from 'fs';
import path from 'path';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  switch (req.method) {
    case 'GET':
      try {
        const db = readDb();
        res.status(200).json(db.documents);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch documents' });
      }
      break;
    
    case 'DELETE':
      try {
        const { id } = req.query;
        const db = readDb();
        db.documents = db.documents.filter(doc => doc.id !== id);
        writeDb(db);
        res.status(200).json({ message: 'Document deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete document' });
      }
      break;
    
    default:
      res.setHeader('Allow', ['GET', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}