import { useCallback, useEffect, useState } from "react";
import { Package, Plus, Minus, RefreshCw } from "lucide-react";
import { auth } from "../lib/firebase";

import { Empty, ErrorBox, Loading } from "../components";
import { useBusiness } from "../context/BusinessContext";
import { useAuth } from "../context/AuthContext";
import {
  adjustStock,
  getProducts,
  getStockMovements,
  saveProduct,
  toggleProduct,
} from "../services/inventory";

import type { Product, StockMovement } from "../types";
import ImageUploader from "../components/ImageUploader";

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function OwnerProducts() {
  const { selectedBranchId, business } = useBusiness();
  const { profile } = useAuth();

  const [items, setItems] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const load = useCallback(async () => {
    if (!selectedBranchId) {
      setItems([]);
      setMovements([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setError("");

      const [products, stockMovements] = await Promise.all([
        getProducts(selectedBranchId),
        getStockMovements(selectedBranchId),
      ]);

      setItems(products);
      setMovements(stockMovements);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat produk."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!selectedBranchId) {
      setError("Pilih cabang terlebih dahulu.");
      return;
    }

    if (!name.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveProduct({
        businessId: business.id,
        branchId: selectedBranchId,
        name: name.trim(),
        sku: sku.trim() || undefined,
        costPrice: Number(cost),
        sellingPrice: Number(price),
        stock: Number(stock),
        minimumStock: Number(minStock),
        imageUrl: imageUrl.trim() || undefined,
        active: true,
      });

      setName("");
      setSku("");
      setImageUrl("");
      setCost(0);
      setPrice(0);
      setStock(0);
      setMinStock(0);

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan produk."
      );
    } finally {
      setSaving(false);
    }
  }

  async function stockAction(product: Product) {
    if (!selectedBranchId || !profile) {
      setError("Profil pengguna atau cabang tidak tersedia.");
      return;
    }

    setBusy(product.id);
    setError("");

    try {
      await adjustStock({
        productId: product.id,
        branchId: selectedBranchId,
        quantity: Number(adjustQty),
        type: adjustType,
        createdBy: auth.currentUser?.uid ?? profile.uid,
      });

      setAdjustId(null);
      setAdjustQty(1);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah stok."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleToggle(product: Product) {
    setBusy(product.id);
    setError("");

    try {
      await toggleProduct(product.id, !product.active);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengubah status produk."
      );
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading />;

  if (!selectedBranchId) {
    return <Empty>Pilih atau buat cabang terlebih dahulu.</Empty>;
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">INVENTORY</div>
          <h1>Produk & Stok</h1>
          <p className="muted">
            Kelola barang yang dijual, harga, stok, dan riwayat pergerakan
            persediaan untuk cabang terpilih.
          </p>
        </div>

        <button className="btn secondary" type="button" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      <section className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">NEW PRODUCT</div>
            <h2>Tambah Produk</h2>
            <p className="muted">
              Isi informasi produk. Kolom yang ditandai opsional boleh
              dikosongkan.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Nama Produk
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Pomade"
              required
            />
            <small>Nama barang yang akan ditampilkan pada katalog dan transaksi.</small>
          </label>

          <label>
            SKU (Opsional)
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="Contoh: PMD-001"
            />
            <small>Kode unik untuk membantu mengidentifikasi produk. Boleh dikosongkan.</small>
          </label>

          <label>
            Harga Modal (Rp)
            <input
              type="number"
              min="0"
              step="1"
              value={cost}
              onChange={(event) => setCost(Number(event.target.value))}
              required
            />
            <small>Biaya pembelian atau perolehan satu unit produk.</small>
          </label>

          <label>
            Harga Jual (Rp)
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
              required
            />
            <small>Harga yang dibayar pelanggan untuk satu unit produk.</small>
          </label>

          <label>
            Stok Awal
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(event) => setStock(Number(event.target.value))}
              required
            />
            <small>Jumlah unit produk yang tersedia saat pertama kali dibuat.</small>
          </label>

          <label>
            Minimum Stok
            <input
              type="number"
              min="0"
              step="1"
              value={minStock}
              onChange={(event) => setMinStock(Number(event.target.value))}
              required
            />
            <small>Batas stok untuk menandai produk yang perlu segera diisi ulang.</small>
          </label>
        </div>

        <ImageUploader
          value={imageUrl}
          onChange={setImageUrl}
          folder={`barber-online/${business.id}/${selectedBranchId}/products`}
          label="Foto Produk"
          hint="Opsional. Unggah foto agar produk lebih mudah dikenali."
        />

        <button
          className="btn primary"
          type="button"
          onClick={() => void add()}
          disabled={saving}
        >
          <Plus size={16} />
          {saving ? "Menyimpan..." : "Tambah Produk"}
        </button>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">PRODUCT CATALOG</div>
            <h2>Daftar Produk</h2>
            <p className="muted">
              Gunakan tombol stok masuk atau stok keluar untuk mencatat
              perubahan persediaan.
            </p>
          </div>
        </div>

        <div className="cards inventory-grid">
          {items.length === 0 ? (
            <Empty>Belum ada produk di cabang ini.</Empty>
          ) : (
            items.map((product) => (
              <div className="mini-card inventory-card" key={product.id}>
                {product.imageUrl ? (
                  <img className="thumb" src={product.imageUrl} alt={product.name} />
                ) : (
                  <div className="avatar">
                    <Package size={18} />
                  </div>
                )}

                <div className="grow">
                  <b>{product.name}</b>
                  <span>
                    {product.sku || "Tanpa SKU"} · {money(product.sellingPrice)}
                  </span>
                  <p
                    className={
                      product.stock <= product.minimumStock ? "stock-low" : ""
                    }
                  >
                    Stok: <strong>{product.stock}</strong> · Minimum{" "}
                    {product.minimumStock}
                  </p>
                  <small>Status: {product.active ? "Aktif" : "Nonaktif"}</small>
                </div>

                <div className="stack-actions">
                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => {
                      setAdjustId(product.id);
                      setAdjustType("PURCHASE");
                      setAdjustQty(1);
                    }}
                  >
                    <Plus size={14} /> Masuk
                  </button>

                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => {
                      setAdjustId(product.id);
                      setAdjustType("SALE");
                      setAdjustQty(1);
                    }}
                  >
                    <Minus size={14} /> Keluar
                  </button>

                  <button
                    className={`btn small ${product.active ? "danger" : "secondary"}`}
                    type="button"
                    disabled={busy === product.id}
                    onClick={() => void handleToggle(product)}
                  >
                    {product.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>

                {adjustId === product.id && (
                  <div className="stock-adjust">
                    <label>
                      Jenis Pergerakan
                      <select
                        value={adjustType}
                        onChange={(event) =>
                          setAdjustType(event.target.value as "PURCHASE" | "SALE")
                        }
                      >
                        <option value="PURCHASE">Stok Masuk</option>
                        <option value="SALE">Stok Keluar</option>
                      </select>
                    </label>

                    <label>
                      Jumlah Unit
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={adjustQty}
                        onChange={(event) =>
                          setAdjustQty(Number(event.target.value))
                        }
                      />
                    </label>

                    <button
                      className="btn primary small"
                      type="button"
                      disabled={busy === product.id}
                      onClick={() => void stockAction(product)}
                    >
                      {busy === product.id ? "Menyimpan..." : "Simpan"}
                    </button>

                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => setAdjustId(null)}
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">STOCK MOVEMENTS</div>
            <h2>Riwayat Stok</h2>
            <p className="muted">
              Catatan stok masuk dan keluar pada cabang terpilih.
            </p>
          </div>
        </div>

        {movements.length === 0 ? (
          <Empty>Belum ada pergerakan stok.</Empty>
        ) : (
          <div className="table">
            {movements.map((movement) => (
              <div className="table-row" key={movement.id}>
                <div>
                  <b>{movement.productName}</b>
                  <small>{movement.type}</small>
                </div>
                <div>
                  <b>
                    {movement.previousStock} → {movement.newStock}
                  </b>
                  <small>Jumlah: {movement.quantity}</small>
                </div>
                <div>
                  <small>{movement.createdBy}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}