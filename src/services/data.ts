export async function saveBarber(
  input: Omit<Barber, "id">,
  id?: string
) {
  const name = input.name.trim();

  if (!name) {
    throw new Error(
      "Nama barber wajib diisi."
    );
  }

  if (!input.branchId) {
    throw new Error(
      "Cabang barber wajib dipilih."
    );
  }

  const payload = {
    name,
    branchId: input.branchId,
    phone:
      input.phone?.trim() || undefined,
    bio:
      input.bio?.trim() || undefined,
    photoUrl:
      input.photoUrl?.trim() || undefined,
    active:
      input.active ?? true,
    updatedAt:
      serverTimestamp(),
  };

  if (id) {
    const barberRef = doc(
      business("barbers"),
      id
    );

    const barberSnap =
      await getDoc(barberRef);

    if (!barberSnap.exists()) {
      throw new Error(
        "Data barber tidak ditemukan."
      );
    }

    const existing =
      barberSnap.data() as Barber;

    if (
      existing.businessId &&
      existing.businessId !== BUSINESS_ID
    ) {
      throw new Error(
        "Barber berasal dari bisnis yang berbeda."
      );
    }

    await updateDoc(
      barberRef,
      payload
    );

    return;
  }

  await addDoc(
    business("barbers"),
    {
      businessId:
        BUSINESS_ID,
      ...payload,
      createdAt:
        serverTimestamp(),
    }
  );
}