import type {
  ClubSession,
  SessionParticipant,
} from "@/components/dashboard/types";

export function formatDate(
  value: string | Date | null | undefined
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR");
}

export function formatDateTime(
  value: string | Date | null | undefined
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString(
    "ko-KR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
}

export function toDateInputValue(
  value: string | Date | null | undefined
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

export function getRegisteredParticipants(session: ClubSession) {
  return session.participants.filter(
    (participant) => participant.status === "REGISTERED"
  );
}

export function getWaitlistedParticipants(session: ClubSession) {
  return session.participants.filter(
    (participant) => participant.status === "WAITLIST"
  );
}

export function findParticipant(
  session: ClubSession,
  memberId: number
) {
  return session.participants.find(
    (participant) => participant.memberId === memberId
  );
}

export function getSessionStatusLabel(
  status: ClubSession["status"]
) {
  if (status === "OPEN") return "모집 중";
  if (status === "CLOSED") return "마감";
  return "취소";
}

export function getParticipantStatusLabel(
  status: SessionParticipant["status"]
) {
  if (status === "REGISTERED") return "참석";
  if (status === "WAITLIST") return "대기";
  return "취소";
}

export function getAttendanceStatusLabel(
  status: SessionParticipant["attendanceStatus"]
) {
  if (status === "PRESENT") return "출석";
  if (status === "ABSENT") return "결석";
  if (status === "LATE") return "지각";
  return "미체크";
}
