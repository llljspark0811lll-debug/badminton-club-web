type ParticipantLike = {
  status: string;
};

export function getRegisteredParticipants(
  participants: ParticipantLike[]
) {
  return participants.filter(
    (participant) => participant.status === "REGISTERED"
  ).length;
}

export function getWaitlistedParticipants(
  participants: ParticipantLike[]
) {
  return participants.filter(
    (participant) => participant.status === "WAITLIST"
  ).length;
}
