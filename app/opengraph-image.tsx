import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "linear-gradient(135deg, #e8f3ff 0%, #f8fbff 45%, #ffffff 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(14,165,233,0.22) 0%, rgba(14,165,233,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -60,
            width: 360,
            height: 360,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(15,23,42,0.14) 0%, rgba(15,23,42,0) 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 72px",
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 24,
                background: "#0f172a",
                color: "#ffffff",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              D
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  color: "#0284c7",
                  fontWeight: 700,
                }}
              >
                배드민턴 클럽 운영 SaaS
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: "#475569",
                }}
              >
                회원, 회비, 일정, 출석을 한곳에서 관리
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              maxWidth: 860,
            }}
          >
            <div
              style={{
                fontSize: 84,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
              }}
            >
              드롭샷추가
            </div>
            <div
              style={{
                fontSize: 34,
                lineHeight: 1.35,
                color: "#334155",
              }}
            >
              카카오톡으로 받던 참석 신청을 기록과 통계로 남기고,
              총무 운영을 더 단단하게 만드는 배드민턴 클럽 관리 도구
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            {["회원 관리", "회비 관리", "운동 일정", "출석 통계"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    padding: "14px 22px",
                    borderRadius: 9999,
                    background: "#ffffff",
                    border: "1px solid rgba(148,163,184,0.35)",
                    color: "#0f172a",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ),
    size
  );
}
