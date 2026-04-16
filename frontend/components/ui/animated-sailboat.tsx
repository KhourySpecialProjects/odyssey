"use client";

export function AnimatedSailboat({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        width="360"
        height="340"
        viewBox="20 10 190 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="pond-glow" cx="50%" cy="40%" rx="52%" ry="48%">
            <stop offset="0%" stopColor="white" />
            <stop offset="50%" stopColor="white" />
            <stop offset="75%" stopColor="white" stopOpacity="0.6" />
            <stop offset="90%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="pond-mask">
            <ellipse cx="115" cy="172" rx="90" ry="22" fill="url(#pond-glow)" />
          </mask>
        </defs>

        {/* Pond water — rendered FIRST, behind the boat */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            dur="4s"
            repeatCount="indefinite"
            values="0,0; 0,-3; 0,0; 0,1.5; 0,0"
            keyTimes="0; 0.25; 0.5; 0.75; 1"
          />

          {/* Water pond — behind boat */}
          <g mask="url(#pond-mask)">
            <ellipse
              cx="115"
              cy="172"
              rx="95"
              ry="24"
              fill="#83C1E1"
              opacity="0.7"
            />

            <path opacity="0.6" fill="#6BAEC8">
              <animate
                attributeName="d"
                dur="3.5s"
                repeatCount="indefinite"
                values="
                  M0 159 Q25 155,50 159 T100 158 T150 160 T200 158 T240 159 L240 200 L0 200 Z;
                  M0 160 Q25 157,50 161 T100 157 T150 161 T200 159 T240 160 L240 200 L0 200 Z;
                  M0 159 Q25 155,50 159 T100 158 T150 160 T200 158 T240 159 L240 200 L0 200 Z
                "
              />
            </path>

            <path opacity="0.5" fill="#5BA8CA">
              <animate
                attributeName="d"
                dur="4.5s"
                repeatCount="indefinite"
                values="
                  M0 163 Q30 159,60 163 T120 162 T180 164 T240 163 L240 200 L0 200 Z;
                  M0 164 Q30 161,60 165 T120 161 T180 165 T240 163 L240 200 L0 200 Z;
                  M0 163 Q30 159,60 163 T120 162 T180 164 T240 163 L240 200 L0 200 Z
                "
              />
            </path>

            <path opacity="0.35" fill="#4A96B8">
              <animate
                attributeName="d"
                dur="5.5s"
                repeatCount="indefinite"
                values="
                  M0 167 Q35 163,70 167 T140 166 T210 168 T240 167 L240 200 L0 200 Z;
                  M0 168 Q35 165,70 169 T140 165 T210 169 T240 167 L240 200 L0 200 Z;
                  M0 167 Q35 163,70 167 T140 166 T210 168 T240 167 L240 200 L0 200 Z
                "
              />
            </path>
          </g>

          {/* Boat — on TOP of the water */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              dur="4s"
              repeatCount="indefinite"
              values="0 110 158; 1.5 110 158; 0 110 158; -1 110 158; 0 110 158"
              keyTimes="0; 0.25; 0.5; 0.75; 1"
            />
            <path
              d="M42.9597 142.397C65.2693 115.837 75.9204 63.5456 78.6662 39.0664C78.7191 38.5946 79.3377 38.4809 79.5848 38.887C103.772 78.6532 94.7779 126.739 87.016 146.448C86.9157 146.703 86.6347 146.813 86.3784 146.716C71.5974 141.123 52.4669 141.962 43.4307 143.241C42.9659 143.306 42.658 142.757 42.9597 142.397Z"
              fill="#297496"
            />
            <path
              d="M93.3006 148.372C115.912 95.4475 93.7047 44.9461 78.1555 25.3824C77.8401 24.9855 78.2695 24.4296 78.7475 24.5983C152.982 50.8002 173.648 112.382 174.778 140.831C174.792 141.189 174.431 141.421 174.096 141.294C144.219 129.982 109.155 141.328 93.9998 149.045C93.5761 149.261 93.1138 148.809 93.3006 148.372Z"
              fill="#297496"
            />
            <path
              d="M185.15 149.731L39.9206 154.446C39.5241 154.459 39.2998 154.906 39.5266 155.232L50.1328 170.452C50.2263 170.587 50.3795 170.666 50.5431 170.666H163.011C163.071 170.666 163.133 170.655 163.19 170.633C180.461 164.047 185.292 154.612 185.645 150.227C185.668 149.945 185.433 149.722 185.15 149.731Z"
              fill="#297496"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
