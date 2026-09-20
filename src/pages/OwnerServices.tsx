import { useEffect, useState } from "react";
import { getAllServices, saveService, toggleService } from "../services/data";
import type { Service } from "../types";
import { Loading } from "../components";
export default function AdminServices(){
  const [items,setItems]=useState<Service[]>([]); const [loading,setLoading]=useState(true); const [name,setName]=useState(""); const [duration,setDuration]=useState(30); const [price,setPrice]=useState(30000); const [desc,setDesc]=useState("");
  async function load(){setItems(await getAllServices());setLoading(false)} useEffect(()=>{load()},[]);
  async function add(){if(!name)return;await saveService({name,description:desc,durationMinutes:Number(duration),price:Number(price),active:true});setName("");setDesc("");setDuration(30);setPrice(30000);load()}
  if(loading)return <Loading/>;
  return <div><div className="section-head"><div><div className="eyebrow">CATALOG</div><h1>Layanan</h1></div></div>
    <div className="panel form-inline"><input placeholder="Nama layanan" value={name} onChange={e=>setName(e.target.value)}/><input type="number" placeholder="Durasi" value={duration} onChange={e=>setDuration(Number(e.target.value))}/><input type="number" placeholder="Harga" value={price} onChange={e=>setPrice(Number(e.target.value))}/><input placeholder="Deskripsi" value={desc} onChange={e=>setDesc(e.target.value)}/><button className="btn primary" onClick={add}>Tambah</button></div>
    <div className="cards">{items.map(s=><div className="mini-card" key={s.id}><div><b>{s.name}</b><p>{s.description}</p><span>{s.durationMinutes} menit • {formatIDR(s.price)}</span></div><button className={`btn ${s.active?"danger":"secondary"}`} onClick={()=>toggleService(s.id,!s.active).then(load)}>{s.active?"Nonaktifkan":"Aktifkan"}</button></div>)}</div>
  </div>;
}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
