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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      const { note } = req.body;
      const db = readDb();
      const ticket = db.tickets.find(t => t.id === id);
      
      if (ticket) {
        ticket.notes.push({ 
          note, 
          timestamp: new Date().toISOString() 
        });
        writeDb(db);
        res.status(200).json(ticket);
      } else {
        res.status(404).json({ error: 'Ticket not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to add note' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}