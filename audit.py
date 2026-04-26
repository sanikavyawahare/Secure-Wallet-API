import sqlite3
import csv
import os

print("Starting IT Analytics & Anomaly Detection Engine...\n")

db_path = 'wallet.db'

if not os.path.exists(db_path):
    print("Error: Database not found.")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# --- 1. SYSTEM USAGE ANALYTICS ---
print("--- SYSTEM METRICS ---")
cursor.execute("SELECT type, SUM(amount), COUNT(id) FROM transactions GROUP BY type")
metrics = cursor.fetchall()
for m in metrics:
    print(f"Transaction Type: {m[0].upper()} | Total Volume: ${m[1]:.2f} | Count: {m[2]}")

# --- 2. ANOMALY DETECTION (Risk Analytics) ---
# Rule: Flag any single withdrawal over $200 as a potential risk
print("\n--- SECURITY & ANOMALY SCAN ---")
cursor.execute("SELECT id, amount, timestamp FROM transactions WHERE type = 'withdraw' AND amount > 200")
anomalies = cursor.fetchall()

if anomalies:
    print(f"⚠️ FLAG: Found {len(anomalies)} high-risk withdrawals requiring manual review!")
    for a in anomalies:
        print(f"   -> Transaction ID: {a[0]} | Amount: ${a[1]:.2f} | Time: {a[2]}")
else:
    print("✅ System clear. No suspicious high-value withdrawals detected.")

# --- 3. DATA PIPELINE EXPORT ---
print("\n--- DATA EXPORT ---")
cursor.execute("SELECT id, type, amount, timestamp FROM transactions ORDER BY timestamp DESC")
transactions = cursor.fetchall()

csv_filename = 'analytics_export.csv'
with open(csv_filename, mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(['Transaction ID', 'Type', 'Amount', 'Timestamp'])
    writer.writerows(transactions)

print(f"Success! Cleaned data exported to {csv_filename} for BI tool ingestion (Tableau/PowerBI).")

conn.close()