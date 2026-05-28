/**
 * SVG filter definitions for the bubblegum 3D title effect.
 * Include once globally (layout) — filters referenced via url(#gum-surface) in CSS.
 */
export default function BubblegumSvgFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        {/* Hero/display — stronger specular shine for large title text */}
        <filter
          id="gum-surface"
          colorInterpolationFilters="sRGB"
          x="-5%"
          y="-20%"
          width="110%"
          height="148%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="5"
            specularConstant="1.2"
            specularExponent="80"
            result="specular"
            lightingColor="white"
          >
            <feDistantLight azimuth="315" elevation="50" />
          </feSpecularLighting>
          <feComposite
            in="specular"
            in2="SourceAlpha"
            operator="in"
            result="specularOut"
          />
          <feComposite
            in="SourceGraphic"
            in2="specularOut"
            operator="arithmetic"
            k1={0}
            k2={1}
            k3={0.32}
            k4={0}
          />
        </filter>

        {/* Section/small — lighter specular shine for smaller display text */}
        <filter
          id="gum-surface-small"
          colorInterpolationFilters="sRGB"
          x="-5%"
          y="-20%"
          width="110%"
          height="148%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="3"
            specularConstant="0.9"
            specularExponent="60"
            result="specular"
            lightingColor="white"
          >
            <feDistantLight azimuth="315" elevation="45" />
          </feSpecularLighting>
          <feComposite
            in="specular"
            in2="SourceAlpha"
            operator="in"
            result="specularOut"
          />
          <feComposite
            in="SourceGraphic"
            in2="specularOut"
            operator="arithmetic"
            k1={0}
            k2={1}
            k3={0.22}
            k4={0}
          />
        </filter>
      </defs>
    </svg>
  );
}
