import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type JoinLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    clubcode: string;
  }>;
};

export async function generateMetadata({
  params,
}: JoinLayoutProps): Promise<Metadata> {
  const { clubcode } = await params;

  const club = await prisma.club.findUnique({
    where: {
      publicJoinToken: clubcode,
    },
    select: {
      name: true,
    },
  });

  if (!club) {
    return {
      title: "가입신청서",
      description: "콕매니저 가입신청 링크",
      openGraph: {
        title: "가입신청서",
        description: "콕매니저 가입신청 링크",
      },
      twitter: {
        title: "가입신청서",
        description: "콕매니저 가입신청 링크",
      },
    };
  }

  const title = `"${club.name}" 가입신청서`;
  const description = `${club.name} 가입 신청 링크`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function JoinLayout({ children }: JoinLayoutProps) {
  return children;
}
