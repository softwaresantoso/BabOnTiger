import admin from "firebase-admin";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service-account JSON first.");
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const businessId = process.env.VITE_BUSINESS_ID || "local-demo";

async function ensureUser({email,password,name,role,barberId}) {
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch { user = await auth.createUser({email,password,displayName:name}); }
  await db.collection("users").doc(user.uid).set({
    uid:user.uid,businessId,name,role,barberId:barberId || null,branchId: role === "owner" ? "main" : (barberId ? "main" : null),active:true,updatedAt:admin.firestore.FieldValue.serverTimestamp()
  },{merge:true});
  return user.uid;
}

await db.collection("businesses").doc(businessId).set({
  name: process.env.VITE_BUSINESS_NAME || "Barber Online Demo",
  slug: "barber-online-demo",
  active: true,
  timezone: "Asia/Jakarta",
  currency: "IDR",
  bookingSlotMinutes: 15,
  minBookingLeadMinutes: 30,
  maxAdvanceDays: 30,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
},{merge:true});

await db.collection("businesses").doc(businessId).collection("branches").doc("main").set({
  businessId,
  name: "Cabang Utama",
  code: "MAIN",
  address: "Alamat demo",
  active: true,
  queueSettings: { resetDaily: true, prefix: "A" },
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
},{merge:true});

const barbers = [
  {id:"raka",businessId,branchId:"main",name:"Raka",bio:"Classic cut & clean fade",active:true},
  {id:"dimas",businessId,branchId:"main",name:"Dimas",bio:"Fade specialist",active:true},
  {id:"bagas",businessId,branchId:"main",name:"Bagas",bio:"Modern cut & styling",active:true}
];
for (const b of barbers) await db.collection("businesses").doc(businessId).collection("barbers").doc(b.id).set(b,{merge:true});

const services = [
  {id:"haircut",businessId,branchId:"main",name:"Haircut",description:"Potong rambut standar",durationMinutes:30,price:30000,active:true},
  {id:"fade",businessId,branchId:"main",name:"Fade Cut",description:"Fade detail & finishing",durationMinutes:45,price:45000,active:true},
  {id:"haircut-wash",businessId,branchId:"main",name:"Haircut + Wash",description:"Potong dan cuci rambut",durationMinutes:60,price:60000,active:true},
  {id:"kids",businessId,branchId:"main",name:"Kids Cut",description:"Potong rambut anak",durationMinutes:30,price:30000,active:true}
];
for (const s of services) await db.collection("businesses").doc(businessId).collection("services").doc(s.id).set(s,{merge:true});

for (const b of barbers) {
  for (let day=1; day<=6; day++) {
    const id=`${b.id}-${day}`;
    await db.collection("businesses").doc(businessId).collection("schedules").doc(id).set({
      id,barberId:b.id,branchId:"main",dayOfWeek:day,startTime:"09:00",endTime:"20:00",breakStart:"13:00",breakEnd:"14:00",active:true
    },{merge:true});
  }
  const sun=`${b.id}-0`;
  await db.collection("businesses").doc(businessId).collection("schedules").doc(sun).set({
    id:sun,barberId:b.id,branchId:"main",dayOfWeek:0,startTime:"10:00",endTime:"17:00",breakStart:"13:00",breakEnd:"14:00",active:true
  },{merge:true});
}

await ensureUser({
  email:"owner@barberonline.demo",password:"ChangeMe123!",name:"Barber Online Owner",role:"owner"
});
await ensureUser({
  email:"raka@barberonline.demo",password:"ChangeMe123!",name:"Raka",role:"barber",barberId:"raka"
});
await ensureUser({
  email:"dimas@barberonline.demo",password:"ChangeMe123!",name:"Dimas",role:"barber",barberId:"dimas"
});
await ensureUser({
  email:"customer@barberonline.demo",password:"ChangeMe123!",name:"Demo Customer",role:"customer"
});

console.log(`Seed selesai untuk ${businessId}.`);
console.log("Demo owner: owner@barberonline.demo / ChangeMe123!");
console.log("Demo barber: raka@barberonline.demo / ChangeMe123!");
console.log("Demo customer: customer@barberonline.demo / ChangeMe123!");
