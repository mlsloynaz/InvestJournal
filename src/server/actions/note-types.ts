"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureNoteTypeConfigs } from "@/server/services/note-types";

function revalidate() {
  revalidatePath("/config/note-types");
  revalidatePath("/", "layout");
}

export async function updateNoteTypeConfig(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const label = String(formData.get("label") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const active = formData.get("active") === "on";

  if (!label) return;

  await ensureNoteTypeConfigs();

  await prisma.noteTypeConfig.update({
    where: { id },
    data: {
      label,
      hint: hint || null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      active,
    },
  });

  revalidate();
}
