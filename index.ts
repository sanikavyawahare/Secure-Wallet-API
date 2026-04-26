import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = 3000;

app.use(express.json());

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./wallet.db', (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite database.');
});

// Create the transactions table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK( type IN ('deposit', 'withdraw') ),
    amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// --- TYPESCRIPT INTERFACES ---
interface TransactionRequest {
    amount: number;
}

// --- REST API ENDPOINTS ---

// 1. Check Balance
app.get('/balance', (req: Request, res: Response) => {
    const query = `
        SELECT SUM(
            CASE WHEN type = 'deposit' THEN amount 
                 WHEN type = 'withdraw' THEN -amount 
                 ELSE 0 END
        ) as totalBalance 
        FROM transactions`;

    db.get(query, [], (err, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ balance: row.totalBalance || 0 });
    });
});

// 2. Deposit Money
app.post('/deposit', (req: Request<{}, {}, TransactionRequest>, res: Response): any => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    db.run(`INSERT INTO transactions (type, amount) VALUES ('deposit', ?)`, [amount], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deposit successful', transactionId: this.lastID, amount: amount });
    });
});

// 3. Withdraw Money (With Security Logic)
app.post('/withdraw', (req: Request<{}, {}, TransactionRequest>, res: Response): any => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    // Security: Check balance before allowing withdrawal
    db.get(`SELECT SUM(CASE WHEN type = 'deposit' THEN amount WHEN type = 'withdraw' THEN -amount ELSE 0 END) as totalBalance FROM transactions`, [], (err, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const currentBalance = row.totalBalance || 0;

        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient funds.', currentBalance });
        }

        db.run(`INSERT INTO transactions (type, amount) VALUES ('withdraw', ?)`, [amount], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Withdrawal successful', transactionId: this.lastID, amount: amount });
        });
    });
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Secure Wallet API is running on http://localhost:${PORT}`);
});
// 4. IT Analytics & System Metrics Endpoint
app.get('/analytics', (req: Request, res: Response) => {
    // Advanced SQL to aggregate system data
    const query = `
        SELECT 
            COUNT(id) as totalTransactions,
            SUM(CASE WHEN type = 'deposit' THEN 1 ELSE 0 END) as depositCount,
            SUM(CASE WHEN type = 'withdraw' THEN 1 ELSE 0 END) as withdrawCount,
            MAX(amount) as largestTransaction,
            AVG(amount) as averageTransactionSize
        FROM transactions`;

    db.get(query, [], (err, row: any) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Format and return the analytics data
        res.json({
            status: "Healthy",
            metrics: {
                total_transactions: row.totalTransactions || 0,
                total_deposits: row.depositCount || 0,
                total_withdrawals: row.withdrawCount || 0,
                largest_transaction: row.largestTransaction || 0,
                average_transaction_size: Math.round((row.averageTransactionSize || 0) * 100) / 100
            }
        });
    });
});