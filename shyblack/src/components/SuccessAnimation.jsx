import { memo } from 'react'

const SuccessAnimation = memo(function SuccessAnimation({ show = false, message = '' }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full" viewBox="0 0 80 80" fill="none">
            <circle
              cx="40" cy="40" r="35"
              stroke="#39ff14"
              strokeWidth="3"
              strokeLinecap="round"
              className="animate-[checkCircleDraw_0.5s_ease-out]"
              style={{
                strokeDasharray: 220,
                strokeDashoffset: 0,
              }}
            />
            <path
              d="M25 42L35 52L55 30"
              stroke="#39ff14"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[checkDraw_0.4s_ease-out_0.2s_both]"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 0,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-neon/10 animate-[successPulse_1s_ease-in-out_infinite]" />
          </div>
        </div>
        {message && (
          <p className="text-sm font-semibold text-white animate-fade-in">{message}</p>
        )}
      </div>
      <style>{`
        @keyframes checkCircleDraw {
          from { stroke-dashoffset: 220; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes successPulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.3); opacity: 0.05; }
        }
      `}</style>
    </div>
  )
})

export default SuccessAnimation
