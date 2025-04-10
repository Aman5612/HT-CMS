// app/(dashboard)/dashboard/posts/new/page.tsx
import nextDynamic from "next/dynamic";
import { RoleGate } from "@/components/role-gate";

// Dynamically import the entire page component to ensure no server-side prerendering
const NewPostPageClient = nextDynamic(
  () => import("../../../../../components/NewPostPageClient"),
  {
    ssr: false,
  }
);

export default function NewPostPage() {
  return (
    <RoleGate allowedRoles={['admin', 'editor', 'author']}>
      <NewPostPageClient />
    </RoleGate>
  );
}

// Explicitly force dynamic rendering
export const dynamic = "force-dynamic";
