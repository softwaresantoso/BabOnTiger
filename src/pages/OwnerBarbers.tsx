import { useEffect, useState } from "react";
import { getAllBarbers, saveBarber, toggleBarber } from "../services/data";
import type { Barber } from "../types";
import { Loading } from "../components";
export default function AdminBarbers(){
  const [items,setItems]=useState<Barber[]>([]); const [loading,setLoading]=useState(true); const [name,setName]=useState(""); const [bio,setBio]=useState("");
  async function load(){setItems(await getAllBarbers());setLoading(false)} useEffect(()=>{load()},[]);
  async function add(){if(!name)return;await saveBarber({name,bio,active:true});setName("");setBio("");load()}
  if(loading)return <Loading/>;
  return <div><div className="section-head"><div><div className="eyebrow">TEAM</div><h1>Barber</h1></div></div>
    <div className="panel form-inline"><input placeholder="Nama barber" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Bio singkat" value={bio} onChange={e=>setBio(e.target.value)}/><button className="btn primary" onClick={add}>Tambah</button></div>
    <div className="cards">{items.map(b=><div className="mini-card" key={b.id}><div className="avatar">{b.name.slice(0,1)}</div><div className="grow"><b>{b.name}</b><p>{b.bio||"Barber profesional"}</p></div><button className={`btn ${b.active?"danger":"secondary"}`} onClick={()=>toggleBarber(b.id,!b.active).then(load)}>{b.active?"Nonaktifkan":"Aktifkan"}</button></div>)}</div>
  </div>;
}
