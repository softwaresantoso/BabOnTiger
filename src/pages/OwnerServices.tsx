import { useEffect, useState } from "react";
import { getAllServices, saveService, toggleService } from "../services/data";
import { useBusiness } from "../context/BusinessContext";
import type { Service } from "../types";
import { Loading } from "../components";
import ImageUploader from "../components/ImageUploader";
export default function AdminServices(){
 const {business}=useBusiness(); const [items,setItems]=useState<Service[]>([]); const [loading,setLoading]=useState(true); const [name,setName]=useState(""); const [duration,setDuration]=useState(30); const [price,setPrice]=useState(30000); const [desc,setDesc]=useState(""); const [imageUrl,setImageUrl]=useState("");
 async function load(){setItems(await getAllServices());setLoading(false)} useEffect(()=>{load()},[]);
 async function add(){if(!name)return;await saveService({businessId:business.id,name,description:desc,durationMinutes:Number(duration),price:Number(price),imageUrl:imageUrl||undefined,active:true});setName("");setDesc("");setDuration(30);setPrice(30000);setImageUrl("");load()}
 if(loading)return <Loading/>;
 return <div><div className="section-head"><div><div className="eyebrow">CATALOG</div><h1>Layanan</h1><p className="muted">Tambahkan foto layanan agar katalog publik lebih menarik.</p></div></div>
   <div className="panel"><div className="form-grid"><input placeholder="Nama layanan" value={name} onChange={e=>setName(e.target.value)}/><input type="number" placeholder="Durasi" value={duration} onChange={e=>setDuration(Number(e.target.value))}/><input type="number" placeholder="Harga" value={price} onChange={e=>setPrice(Number(e.target.value))}/><input placeholder="Deskripsi" value={desc} onChange={e=>setDesc(e.target.value)}/></div><ImageUploader value={imageUrl} onChange={setImageUrl} folder={`barber-online/${business.id}/services`} label="Foto layanan" hint="Opsional"/><button className="btn primary" onClick={add}>Tambah Layanan</button></div>
   <div className="cards">{items.map(s=><div className="mini-card" key={s.id}>{s.imageUrl?<img className="thumb" src={s.imageUrl} alt={s.name}/>:<div className="avatar">S</div>}<div className="grow"><b>{s.name}</b><p>{s.description}</p><span>{s.durationMinutes} menit • {formatIDR(s.price)}</span></div><button className={`btn ${s.active?"danger":"secondary"}`} onClick={()=>toggleService(s.id,!s.active).then(load)}>{s.active?"Nonaktifkan":"Aktifkan"}</button></div>)}</div>
 </div>;
}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
