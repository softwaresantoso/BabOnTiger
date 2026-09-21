import { useEffect, useState } from "react";
import { getAllBarbers, saveBarber, toggleBarber } from "../services/data";
import { useBusiness } from "../context/BusinessContext";
import type { Barber } from "../types";
import { Loading } from "../components";
import ImageUploader from "../components/ImageUploader";
export default function AdminBarbers(){
 const {business}=useBusiness(); const [items,setItems]=useState<Barber[]>([]); const [loading,setLoading]=useState(true); const [name,setName]=useState(""); const [bio,setBio]=useState(""); const [photoUrl,setPhotoUrl]=useState("");
 async function load(){setItems(await getAllBarbers());setLoading(false)} useEffect(()=>{load()},[]);
 async function add(){if(!name)return;await saveBarber({businessId:business.id,name,bio,photoUrl:photoUrl||undefined,active:true});setName("");setBio("");setPhotoUrl("");load()}
 if(loading)return <Loading/>;
 return <div><div className="section-head"><div><div className="eyebrow">TEAM</div><h1>Barber</h1><p className="muted">Kelola profil barber dan foto profil.</p></div></div>
   <div className="panel"><div className="form-grid"><input placeholder="Nama barber" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Bio singkat" value={bio} onChange={e=>setBio(e.target.value)}/></div><ImageUploader value={photoUrl} onChange={setPhotoUrl} folder={`barber-online/${business.id}/barbers`} label="Foto barber" hint="Opsional"/><button className="btn primary" onClick={add}>Tambah Barber</button></div>
   <div className="cards">{items.map(b=><div className="mini-card" key={b.id}>{b.photoUrl?<img className="thumb" src={b.photoUrl} alt={b.name}/>:<div className="avatar">{b.name.slice(0,1)}</div>}<div className="grow"><b>{b.name}</b><p>{b.bio||"Barber profesional"}</p></div><button className={`btn ${b.active?"danger":"secondary"}`} onClick={()=>toggleBarber(b.id,!b.active).then(load)}>{b.active?"Nonaktifkan":"Aktifkan"}</button></div>)}</div>
 </div>;
}
