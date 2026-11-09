import { auth } from "@/auth";
import AuthPrompt from "@/app/components/auth-prompt";
import { getNoteFolderTree } from "@/app/actions/note-folder-actions";
import NotesDashboard from "./notes-dashboard";

export default async function NotesPage() {
  const session = await auth();

  if (!session) {
    return (
      <AuthPrompt
        featureName="Notes"
        description="Sign in to keep notes for your trips: packing lists, ideas, bookings and anything else you want to remember."
      />
    );
  }

  const { notes } = await getNoteFolderTree();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-16">
      <NotesDashboard
        notes={notes.map((note) => ({
          id: note.id,
          title: note.title,
          preview: note.preview,
          // Formatted on the server so the date can't differ between the
          // server render and the browser's time zone
          updatedOn: note.updatedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        }))}
      />
    </div>
  );
}
