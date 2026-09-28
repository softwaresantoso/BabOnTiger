import { useEffect, useState } from "react";
import { getAllBarbers, saveBarber, toggleBarber } from "../services/data";
import {approveBarberRequest, getPendingBarberRequests, rejectBarberRequest,} from "../services/barber";
import { useBusiness } from "../context/BusinessContext";
import type { Barber, BarberRequest } from "../types";
import { Loading } from "../components";
import ImageUploader from "../components/ImageUploader";

export default function AdminBarbers() {
  const { business, branches } = useBusiness();

  const [items, setItems] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<BarberRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

const [approvalBarber, setApprovalBarber] = useState<
  Record<string, string>
>({});

const [approvalBranch, setApprovalBranch] = useState<
  Record<string, string>
>({});

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [branchId, setBranchId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
  try {
    setLoading(true);
    setRequestsLoading(true);

    const [barbers, pendingRequests] = await Promise.all([
      getAllBarbers(),
      getPendingBarberRequests(business.id),
    ]);

    setItems(barbers);
    setRequests(pendingRequests);
  } finally {
    setLoading(false);
    setRequestsLoading(false);
  }
}

async function handleApprove(request: BarberRequest) {
  const barberId = approvalBarber[request.uid];
  const selectedBranchId = approvalBranch[request.uid];

  if (!barberId) {
    alert("Pilih profil barber terlebih dahulu.");
    return;
  }

  if (!selectedBranchId) {
    alert("Pilih cabang terlebih dahulu.");
    return;
  }

  const barber = items.find(
    (item) => item.id === barberId
  );

  if (!barber) {
    alert("Profil barber tidak ditemukan.");
    return;
  }

  setProcessingRequest(request.uid);

  try {
    await approveBarberRequest(
      request,
      barber,
      selectedBranchId
    );

    alert(
      `Pendaftaran ${request.name} berhasil disetujui.`
    );

    setApprovalBarber((prev) => {
      const next = { ...prev };
      delete next[request.uid];
      return next;
    });

    setApprovalBranch((prev) => {
      const next = { ...prev };
      delete next[request.uid];
      return next;
    });

    await load();
  } catch (err) {
    alert(
      err instanceof Error
        ? err.message
        : "Gagal menyetujui pendaftaran barber."
    );
  } finally {
    setProcessingRequest(null);
  }
}

async function handleReject(request: BarberRequest) {
  const confirmed = window.confirm(
    `Tolak pendaftaran barber ${request.name}?`
  );

  if (!confirmed) return;

  setProcessingRequest(request.uid);

  try {
    await rejectBarberRequest(request);

    alert(
      `Pendaftaran ${request.name} ditolak.`
    );

    await load();
  } catch (err) {
    alert(
      err instanceof Error
        ? err.message
        : "Gagal menolak pendaftaran barber."
    );
  } finally {
    setProcessingRequest(null);
  }
}

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setBio("");
    setPhotoUrl("");
    setBranchId("");
    setEditingId(null);
  }

  function startEdit(barber: Barber) {
    setEditingId(barber.id);
    setName(barber.name);
    setBio(barber.bio ?? "");
    setPhotoUrl(barber.photoUrl ?? "");
    setBranchId(barber.branchId ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
  e.preventDefault();

  if (!name.trim()) {
    alert("Nama barber wajib diisi.");
    return;
  }

  if (!branchId) {
    alert("Cabang wajib dipilih.");
    return;
  }

  setSaving(true);

  try {
    const existing = editingId
      ? items.find((item) => item.id === editingId)
      : undefined;

    const payload: Barber = {
      id: editingId ?? "",
      businessId: business.id,
      branchId,
      name: name.trim(),
      active: existing?.active ?? true,
    };

    if (bio.trim()) {
      payload.bio = bio.trim();
    }

    if (photoUrl.trim()) {
      payload.photoUrl = photoUrl.trim();
    }

    if (existing?.userId) {
      payload.userId = existing.userId;
    }

    if (existing?.specialties) {
      payload.specialties = existing.specialties;
    }

    await saveBarber(
      payload,
      editingId ?? undefined
    );

    resetForm();
    await load();
  } catch (err) {
    alert(
      err instanceof Error
        ? err.message
        : "Gagal menyimpan data barber."
    );
  } finally {
    setSaving(false);
  }
}

  const visibleItems = filterBranchId
    ? items.filter((barber) => barber.branchId === filterBranchId)
    : items;

  function branchName(id?: string) {
    if (!id) return "Belum ditentukan";
    return branches.find((branch) => branch.id === id)?.name ?? "Cabang tidak ditemukan";
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">
              PENDAFTARAN
            </div>
            <h2>Permintaan Barber</h2>
          </div>

          {requests.length > 0 && (
            <span className="badge">
              {requests.length} Pending
            </span>
          )}
        </div>

        {requestsLoading ? (
          <Loading />
        ) : requests.length === 0 ? (
          <div className="empty">
            Tidak ada permintaan pendaftaran barber.
          </div>
        ) : (
          <div className="cards">
            {requests.map((request) => {
              const processing =
                processingRequest === request.uid;

              return (
                <div
                  className="mini-card"
                  key={request.uid}
                >
                  <div className="grow">
                    <b>{request.name}</b>

                    <p>
                      WhatsApp:{" "}
                      {request.phone || "-"}
                    </p>

                    <p>
                      Email: {request.email}
                    </p>

                    <small className="muted">
                      Status: PENDING
                    </small>

                    <div
                      className="form-grid"
                      style={{ marginTop: 12 }}
                    >
                      <select
                        value={
                          approvalBarber[
                            request.uid
                          ] ?? ""
                        }
                        onChange={(e) =>
                          setApprovalBarber(
                            (prev) => ({
                              ...prev,
                              [request.uid]:
                                e.target.value,
                            })
                          )
                        }
                        disabled={processing}
                      >
                        <option value="">
                          Pilih profil barber
                        </option>

                        {items
                          .filter(
                            (barber) =>
                              !barber.userId ||
                              barber.userId ===
                                request.uid
                          )
                          .map((barber) => (
                            <option
                              key={barber.id}
                              value={barber.id}
                            >
                              {barber.name}
                            </option>
                          ))}
                      </select>

                      <select
                        value={
                          approvalBranch[
                            request.uid
                          ] ?? ""
                        }
                        onChange={(e) =>
                          setApprovalBranch(
                            (prev) => ({
                              ...prev,
                              [request.uid]:
                                e.target.value,
                            })
                          )
                        }
                        disabled={processing}
                      >
                        <option value="">
                          Pilih cabang
                        </option>

                        {branches.map((branch) => (
                          <option
                            key={branch.id}
                            value={branch.id}
                          >
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      <button
                        className="btn primary"
                        onClick={() =>
                          handleApprove(request)
                        }
                        disabled={processing}
                      >
                        {processing
                          ? "Memproses..."
                          : "Approve"}
                      </button>

                      <button
                        className="btn danger"
                        onClick={() =>
                          handleReject(request)
                        }
                        disabled={processing}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="section-head">
        <div>
          <div className="eyebrow">TEAM</div>
          <h1>Barber</h1>
          <p className="muted">
            Kelola profil barber dan penempatan barber pada masing-masing cabang.
          </p>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="alert error">
          Belum ada cabang aktif. Tambahkan cabang terlebih dahulu sebelum
          membuat barber.
        </div>
      ) : (
        <div className="panel">
          <div className="panel-title">
            <div>
              <div className="eyebrow">
                {editingId ? "EDIT BARBER" : "BARBER BARU"}
              </div>
              <h2>{editingId ? "Edit Barber" : "Tambah Barber"}</h2>
            </div>

            {editingId && (
              <button className="btn secondary" onClick={resetForm}>
                Batal
              </button>
            )}
          </div>

          <div className="form-grid">
            <input
              placeholder="Nama barber"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Pilih cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Bio singkat"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <ImageUploader
            value={photoUrl}
            onChange={setPhotoUrl}
            folder={`barber-online/${business.id}/barbers`}
            label="Foto barber"
            hint="Opsional"
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="btn primary"
              onClick={submit}
              disabled={saving}
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Tambah Barber"}
            </button>

            {editingId && (
              <button
                className="btn secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Batal
              </button>
            )}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">FILTER</div>
            <h2>Daftar Barber</h2>
          </div>

          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
          >
            <option value="">Semua Cabang</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {visibleItems.length === 0 ? (
          <div className="empty">
            Belum ada barber pada filter cabang ini.
          </div>
        ) : (
          <div className="cards">
            {visibleItems.map((barber) => (
              <div className="mini-card" key={barber.id}>
                {barber.photoUrl ? (
                  <img
                    className="thumb"
                    src={barber.photoUrl}
                    alt={barber.name}
                  />
                ) : (
                  <div className="avatar">
                    {barber.name.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="grow">
                  <b>{barber.name}</b>

                  <p>
                    {barber.bio || "Barber profesional"}
                  </p>

                  <small className="muted">
                    Cabang: {branchName(barber.branchId)}
                  </small>

                  {!barber.branchId && (
                    <div className="alert info">
                      Barber ini belum memiliki cabang.
                      Edit barber untuk menetapkan cabang.
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn secondary"
                    onClick={() => startEdit(barber)}
                  >
                    Edit
                  </button>

                  <button
                    className={`btn ${
                      barber.active ? "danger" : "secondary"
                    }`}
                    onClick={() =>
                      toggleBarber(barber.id, !barber.active).then(load)
                    }
                  >
                    {barber.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
