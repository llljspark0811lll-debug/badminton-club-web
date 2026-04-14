import type { Metadata } from "next";
import prisma from "@/lib/prisma";

type SessionLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

export async function generateMetadata({
  params,
}: SessionLayoutProps): Promise<Metadata> {
  const { token } = await params;

  const session = await prisma.clubSession.findUnique({
    where: {
      publicToken: token,
    },
    select: {
      title: true,
      club: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!session) {
    return {
      title: "참석신청서",
      description: "콕매니저 운동 일정 참석 신청 링크",
      openGraph: {
        title: "참석신청서",
        description: "콕매니저 운동 일정 참석 신청 링크",
      },
      twitter: {
        title: "참석신청서",
        description: "콕매니저 운동 일정 참석 신청 링크",
      },
    };
  }

  const title = `"${session.title}" 참석신청서`;
  const description = `${session.club.name} 운동 일정 참석 신청 링크`;

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

export default function SessionLayout({ children }: SessionLayoutProps) {
  return children;
}
