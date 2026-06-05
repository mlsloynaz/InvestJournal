"use server";

import { createFedMeeting, deleteFedMeeting } from "@/server/actions/fed-meetings";

export async function createFedMeetingAction(formData: FormData): Promise<void> {
  await createFedMeeting(formData);
}

export async function deleteFedMeetingAction(formData: FormData): Promise<void> {
  await deleteFedMeeting(formData);
}
