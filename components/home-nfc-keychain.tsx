/** Separate product layer: acrylic NFC fob, stainless split ring and exact brand mark. */
export function HomeNfcKeychain() {
  return (
    <div className="home-scene-keychain" data-motion-layer="keychain">
      <svg viewBox="0 0 240 250" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="fob-steel" x1="50" y1="0" x2="150" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor="#383a39"/><stop offset=".19" stopColor="#f7f7f1"/><stop offset=".32" stopColor="#777b79"/><stop offset=".48" stopColor="#fff"/><stop offset=".61" stopColor="#303332"/><stop offset=".81" stopColor="#d7d8d2"/><stop offset="1" stopColor="#555956"/></linearGradient>
          <linearGradient id="fob-rim" x1="54" y1="86" x2="184" y2="227" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset=".36" stopColor="#d4d4cb"/><stop offset=".7" stopColor="#90938f"/><stop offset=".84" stopColor="#f9faf5"/><stop offset="1" stopColor="#747873"/></linearGradient>
          <linearGradient id="fob-face" x1="79" y1="99" x2="167" y2="221" gradientUnits="userSpaceOnUse"><stop stopColor="#fffef9"/><stop offset=".6" stopColor="#efeee7"/><stop offset="1" stopColor="#d4d6cf"/></linearGradient>
          <radialGradient id="fob-shadow"><stop stopColor="#33291c" stopOpacity=".45"/><stop offset="1" stopColor="#33291c" stopOpacity="0"/></radialGradient>
        </defs>
        <ellipse cx="128" cy="220" rx="91" ry="20" fill="url(#fob-shadow)"/>
        <ellipse cx="115" cy="56" rx="53" ry="35" stroke="#333633" strokeWidth="10"/>
        <ellipse cx="115" cy="53" rx="53" ry="35" stroke="url(#fob-steel)" strokeWidth="9"/>
        <ellipse cx="115" cy="50" rx="51" ry="33" stroke="#fafaf0" strokeOpacity=".85" strokeWidth="1.5"/>
        <path d="M68 64C86 87 133 94 160 72" stroke="#292d2a" strokeWidth="2"/>
        <path d="M112 91C116 76 131 76 136 91L140 106C185 113 213 147 204 181C196 214 159 236 119 231C76 228 41 200 44 165C46 135 72 111 107 106Z" fill="url(#fob-rim)" stroke="#9a9d98" strokeWidth="1"/>
        <path d="M110 87C116 76 128 77 133 88L138 101C181 109 209 142 201 177C192 211 158 231 118 226C78 224 43 197 47 162C50 132 75 107 106 102Z" fill="url(#fob-face)" stroke="#fafbf8" strokeWidth="2"/>
        <ellipse cx="125" cy="166" rx="71" ry="55" stroke="#fff" strokeOpacity=".55" strokeWidth="2"/>
        <path d="M59 151C65 128 83 113 105 110" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
        <path d="M167 212C182 204 192 191 196 178" stroke="#babeb6" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="122" cy="95" rx="7" ry="6" fill="#666b66" stroke="#fff" strokeWidth="2"/>
        <ellipse cx="119" cy="83" rx="10" ry="21" transform="rotate(20 119 83)" stroke="#464a46" strokeWidth="5"/>
        <ellipse cx="118" cy="82" rx="10" ry="21" transform="rotate(20 118 82)" stroke="url(#fob-steel)" strokeWidth="3"/>
        <image href="/brand/logo.svg" x="75" y="143" width="99" height="46" style={{filter:'brightness(0.32) saturate(0.5)'}} />
      </svg>
    </div>
  );
}
