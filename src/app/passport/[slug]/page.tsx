import { notFound } from "next/navigation";
import { getPublicPassportBySlugOrId } from "@/services/passport/passport.service";
import { StudentPassportView } from "@/components/passport/StudentPassportView";
import { PublicPassportShell } from "@/components/passport/PublicPassportShell";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const passport = await getPublicPassportBySlugOrId(slug);

  if (!passport) {
    return {
      title: "Student Passport Not Found | Strategic Mind Chess",
    };
  }

  return {
    title: `${passport.name} | SMC Digital Chess Passport`,
    description: `Official Strategic Mind Chess student passport for ${passport.name}. Verified ratings, streaks, and academy achievements.`,
  };
}

export default async function PublicPassportPage({ params }: Props) {
  const { slug } = await params;
  const passport = await getPublicPassportBySlugOrId(slug);

  if (!passport) {
    notFound();
  }

  return (
    <PublicPassportShell>
      <StudentPassportView passport={passport} />
    </PublicPassportShell>
  );
}
