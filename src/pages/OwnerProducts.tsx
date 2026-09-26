import { useEffect, useState } from "react";
import { Package, Plus, Minus, RefreshCw } from "lucide-react";
import { Empty, ErrorBox, Loading } from "../components";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../context/AuthContext";
import { adjustStock, getProducts, getStockMovements, saveProduct, toggleProduct } from "../services/inventory";
import type { Product, StockMovement } from "../types";
import ImageUploader from "../components/ImageUploader";

const money = (v:number) => new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(v);

export default function OwnerProducts() {
  const { business, selectedBranchId } = useBusiness();
  const { profile } = useAuth();

  const [items, setItems] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] =
    useState<"PURCHASE" | "SALE">("PURCHASE");

  async function load(){ if(!selectedBranchId){setLoading(false);return;} setLoading(true); try{ setError(""); const [p,m]=await Promise.all([getProducts(selectedBranchId),getStockMovements(selectedBranchId)]); setItems(p);setMovements(m); }catch(e){setError(e instanceof Error?e.message:"Gagal memuat produk.")}finally{setLoading(false)} }
  useEffect(()=>{load()},[selectedBranchId]);
  async function add(){ if(!selectedBranchId || !name.trim()) return; try{await saveProduct({businessId:"",branchId:selectedBranchId,name:name.trim(),sku:sku.trim()||undefined,costPrice:Number(cost),sellingPrice:Number(price),stock:Number(stock),minimumStock:Number(minStock),imageUrl:imageUrl||undefined,active:true}); setName("");setSku("");setImageUrl("");setCost(0);setPrice(0);setStock(0);setMinStock(0);await load()}catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan produk.")}}
  async function stockAction(p:Product){ if(!selectedBranchId||!profile)return; setBusy(p.id); try{await adjustStock({productId:p.id,branchId:selectedBranchId,quantity:Number(adjustQty),type:adjustType,createdBy:profile.uid});setAdjustId(null);await load()}catch(e){setError(e instanceof Error?e.message:"Gagal mengubah stok.")}finally{setBusy(null)} }
  if(loading)return <Loading/>;
  if(!selectedBranchId)return <Empty>Pilih atau buat cabang terlebih dahulu.</Empty>;
  return <div>
    <div className="section-head"><div><div className="eyebrow">INVENTORY</div><h1>Produk & Stok</h1><p className="muted">Kelola produk, stok masuk, stok keluar, dan riwayat pergerakan.</p></div><button className="btn secondary" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<ErrorBox message={error}/>} 
    <section className="panel"><div className="panel-title"><div><div className="eyebrow">NEW PRODUCT</div><h2>Tambah Produk</h2></div></div><div className="form-grid"><input placeholder="Nama produk" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="SKU (opsional)" value={sku} onChange={e=>setSku(e.target.value)}/><input type="number" min="0" placeholder="Harga modal" value={cost} onChange={e=>setCost(Number(e.target.value))}/><input type="number" min="0" placeholder="Harga jual" value={price} onChange={e=>setPrice(Number(e.target.value))}/><input type="number" min="0" placeholder="Stok awal" value={stock} onChange={e=>setStock(Number(e.target.value))}/><input type="number" min="0" placeholder="Minimum stok" value={minStock} onChange={e=>setMinStock(Number(e.target.value))}/></div><ImageUploader value={imageUrl} onChange={setImageUrl} folder={`barber-online/${business.id}/${selectedBranchId}/products`} label="Foto produk" hint="Opsional"/><button className="btn primary" onClick={add}><Plus size={16}/> Tambah Produk</button></section>
    <section className="cards inventory-grid">{items.length===0?<Empty>Belum ada produk di cabang ini.</Empty>:items.map(p=><div className="mini-card inventory-card" key={p.id}>{p.imageUrl?<img className="thumb" src={p.imageUrl} alt={p.name}/>:<div className="avatar"><Package size={18}/></div>}<div className="grow"><b>{p.name}</b><span>{p.sku||"Tanpa SKU"} • {money(p.sellingPrice)}</span><p className={p.stock<=p.minimumStock?"stock-low":""}>Stok: <strong>{p.stock}</strong> • minimum {p.minimumStock}</p></div><div className="stack-actions"><button className="btn small secondary" onClick={()=>{setAdjustId(p.id);setAdjustType("PURCHASE")}}><Plus size={14}/> Masuk</button><button className="btn small secondary" onClick={()=>{setAdjustId(p.id);setAdjustType("SALE")}}><Minus size={14}/> Keluar</button><button className={`btn small ${p.active?"danger":"secondary"}`} onClick={()=>toggleProduct(p.id,!p.active).then(load)}>{p.active?"Nonaktifkan":"Aktifkan"}</button></div>{adjustId===p.id&&<div className="stock-adjust"><select value={adjustType} onChange={e=>setAdjustType(e.target.value as "PURCHASE"|"SALE")}><option value="PURCHASE">Stok Masuk</option><option value="SALE">Stok Keluar</option></select><input type="number" min="1" value={adjustQty} onChange={e=>setAdjustQty(Number(e.target.value))}/><button className="btn primary small" disabled={busy===p.id} onClick={()=>stockAction(p)}>{busy===p.id?"...":"Simpan"}</button><button className="btn ghost small" onClick={()=>setAdjustId(null)}>Batal</button></div>}</div>)}</section>
    <section className="panel"><div className="panel-title"><div><div className="eyebrow">STOCK MOVEMENTS</div><h2>Riwayat Stok</h2></div></div>{movements.length===0?<Empty>Belum ada pergerakan stok.</Empty>:<div className="table">{movements.map(m=><div className="table-row" key={m.id}><div><b>{m.productName}</b><small>{m.type}</small></div><div><b>{m.previousStock} → {m.newStock}</b><small>Qty {m.quantity}</small></div><div><small>{m.createdBy}</small></div></div>)}</div>}</section>
  </div>;
}
