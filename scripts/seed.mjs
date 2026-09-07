import admin from "firebase-admin";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service-account JSON first.");
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const businessId = process.env.VITE_BUSINESS_ID || "demo-barbershop";

async function ensureUser({email,password,name,role,barberId}) {
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch { user = await auth.createUser({email,password,displayName:name}); }
  await db.collection("users").doc(user.uid).set({
    uid:user.uid,businessId,name,role,barberId:barberId || null,active:true,updatedAt:admin.firestore.FieldValue.serverTimestamp()
  },{merge:true});
  return user.uid;
}

await db.collection("businesses").doc(businessId).set({
  name: process.env.VITE_BUSINESS_NAME || "BabOn Tiger mark I",
  timezone: "Asia/Jakarta",
  currency: "IDR",
  bookingSlotMinutes: 15,
  minBookingLeadMinutes: 30,
  maxAdvanceDays: 30,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
},{merge:true});

const barbers = [
  {id:"raka",name:"Raka",bio:"Classic cut & clean fade",active:true},
  {id:"dimas",name:"Dimas",bio:"Fade specialist",active:true},
  {id:"bagas",name:"Bagas",bio:"Modern cut & styling",active:true}
];
for (const b of barbers) await db.collection("businesses").doc(businessId).collection("barbers").doc(b.id).set(b,{merge:true});

const services = [
  {id:"haircut",name:"Haircut",description:"Potong rambut standar",durationMinutes:30,price:30000,active:true},
  {id:"fade",name:"Fade Cut",description:"Fade detail & finishing",durationMinutes:45,price:45000,active:true},
  {id:"haircut-wash",name:"Haircut + Wash",description:"Potong dan cuci rambut",durationMinutes:60,price:60000,active:true},
  {id:"kids",name:"Kids Cut",description:"Potong rambut anak",durationMinutes:30,price:30000,active:true}
];
for (const s of services) await db.collection("businesses").doc(businessId).collection("services").doc(s.id).set(s,{merge:true});

for (const b of barbers) {
  for (let day=1; day<=6; day++) {
    const id=`${b.id}-${day}`;
    await db.collection("businesses").doc(businessId).collection("schedules").doc(id).set({
      id,barberId:b.id,dayOfWeek:day,startTime:"09:00",endTime:"20:00",breakStart:"13:00",breakEnd:"14:00",active:true
    },{merge:true});
  }
  const sun=`${b.id}-0`;
  await db.collection("businesses").doc(businessId).collection("schedules").doc(sun).set({
    id:sun,barberId:b.id,dayOfWeek:0,startTime:"10:00",endTime:"17:00",breakStart:"13:00",breakEnd:"14:00",active:true
  },{merge:true});
}

await ensureUser({
  email:"admin@babontiger.demo",password:"ChangeMe123!",name:"BabOn Admin",role:"admin"
});
await ensureUser({
  email:"raka@babontiger.demo",password:"ChangeMe123!",name:"Raka",role:"barber",barberId:"raka"
});
await ensureUser({
  email:"dimas@babontiger.demo",password:"ChangeMe123!",name:"Dimas",role:"barber",barberId:"dimas"
});
await ensureUser({
  email:"customer@babontiger.demo",password:"ChangeMe123!",name:"Demo Customer",role:"customer"
});

console.log(`Seed selesai untuk ${businessId}.`);
console.log("Demo admin: admin@babontiger.demo / ChangeMe123!");
console.log("Demo barber: raka@babontiger.demo / ChangeMe123!");
console.log("Demo customer: customer@babontiger.demo / ChangeMe123!");
