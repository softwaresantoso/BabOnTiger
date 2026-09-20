import { useEffect, useState } from "react";
import { getCustomers } from "../services/data";
import { Empty, Loading } from "../components";
export default function AdminCustomers(){
 const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{getCustomers().then(setItems).finally(()=>setLoading(false))},[]);
 if(loading)return <Loading/>;
 return <div><div className="section-head"><div><div className="eyebrow">CUSTOMER DATABASE</div><h1>Pelanggan</h1></div></div>{items.length===0?<Empty>Belum ada customer.</Empty>:<div className="table panel">{items.map((x,i)=><div className="table-row" key={x.uid||i}><div className="avatar">{String(x.name||"?").slice(0,1)}</div><span><b>{x.name}</b><small>{x.phone||"-"}</small></span><span>{x.uid}</span></div>)}</div>}</div>;
}
