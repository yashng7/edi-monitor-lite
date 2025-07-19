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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        const db = readDb();
        res.status(200).json(db.tickets);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tickets' });
      }
      break;
    
    case 'POST':
      try {
        const { documentId, issue } = req.body;
        const db = readDb();
        const newTicket = {
          id: `TKT-${String(db.tickets.length + 1).padStart(3, "0")}`,
          documentId,
          issue,
          status: 'Pending',
          timestamp: new Date().toISOString(),
          notes: [{
            note: 'Ticket created',
            timestamp: new Date().toISOString()
          }]
        };
        db.tickets.push(newTicket);
        writeDb(db);
        res.status(201).json(newTicket);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create ticket' });
      }
      break;
    
    case 'PUT':
      try {
        const { status } = req.body;
        const db = readDb();
        const ticketIndex = db.tickets.findIndex(t => t.id === id);
        if (ticketIndex !== -1) {
          db.tickets[ticketIndex].status = status;
          writeDb(db);
          res.status(200).json(db.tickets[ticketIndex]);
        } else {
          res.status(404).json({ error: 'Ticket not found' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to update ticket' });
      }
      break;
    
    case 'DELETE':
      try {
        const db = readDb();
        db.tickets = db.tickets.filter(ticket => ticket.id !== id);
        writeDb(db);
        res.status(200).json({ message: 'Ticket deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete ticket' });
      }
      break;
    
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
