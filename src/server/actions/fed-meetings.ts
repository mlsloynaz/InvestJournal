"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function revalidate() {
  revalidatePath("/config/fed-meetings");
}

function fedMeetingDelegate() {
  return (
    prisma as {
      fedMeeting?: {
        findMany: (args: unknown) => Promise<unknown[]>;
        create: (args: unknown) => Promise<unknown>;
        delete: (args: unknown) => Promise<unknown>;
      };
    }
  ).fedMeeting;
}

export async function listFedMeetings() {
  const delegate = fedMeetingDelegate();
  if (!delegate) return [];
  return delegate.findMany({
    orderBy: { meetingDate: "desc" },
  }) as Promise<
    { id: number; meetingDate: Date; notes: string | null; createdAt: Date }[]
  >;
}

export async function createFedMeeting(formData: FormData): Promise<void> {
  const dateRaw = String(formData.get("meetingDate") ?? "");
  if (!dateRaw) return;

  const delegate = fedMeetingDelegate();
  if (!delegate) return;

  await delegate.create({
    data: {
      meetingDate: new Date(dateRaw + "T00:00:00.000Z"),
      notes: String(formData.get("notes") ?? "") || null,
    },
  });

  revalidate();
}

export async function deleteFedMeeting(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const delegate = fedMeetingDelegate();
  if (!delegate) return;
  await delegate.delete({ where: { id } });
  revalidate();
}
