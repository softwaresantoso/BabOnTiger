import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'firestore/firestore.rules',
  'firestore/firestore.indexes.json',
  'firestore/SECURITY-MATRIX.md',
  'src/services/booking.ts',
  'src/services/queue.ts',
  'src/services/transaction.ts',
  'src/services/inventory.ts',
  'src/services/promo.ts',
  'src/services/attendance.ts',
  'src/pages/OwnerDashboard.tsx',
  'src/pages/BarberDashboard.tsx',
  'src/pages/CustomerDashboard.tsx',
];

let failures = 0;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => { console.error(`FAIL  ${message}`); failures += 1; };

for (const file of required) {
  if (fs.existsSync(path.join(root, file))) pass(`required file exists: ${file}`);
  else fail(`missing required file: ${file}`);
}

const rules = fs.readFileSync(path.join(root, 'firestore/firestore.rules'), 'utf8');
const indexesText = fs.readFileSync(path.join(root, 'firestore/firestore.indexes.json'), 'utf8');
const indexes = JSON.parse(indexesText);

const ruleChecks = [
  ['role: owner', 'userData().role == "owner"'],
  ['role: barber', 'userData().role == "barber"'],
  ['role: customer', 'userData().role == "customer"'],
  ['business isolation', 'userData().businessId == businessId'],
  ['customer self-registration only', 'request.resource.data.role == "customer"'],
  ['customer cancellation restriction', 'request.resource.data.status == "CANCELLED"'],
  ['barber branch restriction', 'resource.data.branchId == userData().branchId'],
  ['attendance check-in', 'match /attendance/{attendanceId}'],
  ['transaction protection', 'match /transactions/{transactionId}'],
  ['stock movement protection', 'match /stockMovements/{movementId}'],
  ['promo usage protection', 'match /promoUsages/{usageId}'],
];
for (const [label, needle] of ruleChecks) {
  rules.includes(needle) ? pass(`rules contain ${label}`) : fail(`rules missing ${label}`);
}

const indexChecks = [
  ['bookings branch/date/startTime', 'bookings', ['branchId','date','startTime']],
  ['bookings customer/date', 'bookings', ['customerId','date']],
  ['queues branch/date/queueNumber', 'queues', ['branchId','date','queueNumber']],
  ['queues branch/date/status', 'queues', ['branchId','date','status']],
  ['transactions branch/createdAt', 'transactions', ['branchId','createdAt']],
  ['transactions barber/createdAt', 'transactions', ['barberId','createdAt']],
  ['attendance branch/date', 'attendance', ['branchId','date']],
  ['stock movements branch/createdAt', 'stockMovements', ['branchId','createdAt']],
];
const hasIndex = (collection, fields) => indexes.indexes.some(index =>
  index.collectionGroup === collection && fields.every(field => index.fields.some(f => f.fieldPath === field))
);
for (const [label, collection, fields] of indexChecks) {
  hasIndex(collection, fields) ? pass(`index exists: ${label}`) : fail(`index missing: ${label}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (packageJson.scripts?.build) pass('npm build script exists');
else fail('npm build script missing');
if (packageJson.scripts?.['test:static']) pass('test:static script exists');
else fail('test:static script missing');

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'scripts'));
let anyFound = false;
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/console\.log\(.*password|console\.log\(.*apiKey/i.test(content)) {
    fail(`possible secret logging in ${path.relative(root, file)}`);
    anyFound = true;
  }
}
if (!anyFound) pass('no obvious password/API-key console logging found');

console.log(`\nStatic validation completed with ${failures} failure(s).`);
process.exitCode = failures ? 1 : 0;
