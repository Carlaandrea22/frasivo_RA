export function RoomScene() {
  return <svg viewBox="0 0 720 460" className="room-scene" role="img" aria-label="Ilustración de un escritorio con un libro, una taza y una silla; no es una imagen de cámara">
    <defs><linearGradient id="wall" x2="0" y2="1"><stop stopColor="#E8F1E8"/><stop offset="1" stopColor="#DCE9DD"/></linearGradient><linearGradient id="desk" x2="0" y2="1"><stop stopColor="#D2B18B"/><stop offset="1" stopColor="#BA9470"/></linearGradient></defs>
    <rect width="720" height="460" fill="url(#wall)"/>
    <path d="M0 340H720V460H0Z" fill="#CCDACE"/>
    <path d="M0 340H720" stroke="#B9CEBD" strokeWidth="3"/>
    <rect x="78" y="57" width="176" height="196" rx="6" fill="#F8FBF5"/>
    <rect x="89" y="68" width="154" height="173" rx="2" fill="#BFDCD7"/>
    <path d="M91 220Q125 159 162 195Q203 120 243 165V241H91" fill="#87B6A0"/>
    <path d="M165 68V241M89 153H243" stroke="#F8FBF5" strokeWidth="8"/>
    <path d="M65 251H268" stroke="#C0B397" strokeWidth="12" strokeLinecap="round"/>
    <rect x="488" y="72" width="91" height="116" rx="3" fill="#B69977"/>
    <rect x="496" y="80" width="75" height="100" fill="#F3F4E9"/>
    <path d="M512 156Q523 109 550 111Q552 147 512 156" fill="#88A788"/>
    <path d="M516 158L547 117" stroke="#487F61" strokeWidth="2"/>
    <ellipse cx="389" cy="400" rx="230" ry="21" fill="#B7CAB9" opacity=".5"/>
    <path d="M207 291L194 405M562 291L577 405" stroke="#866E56" strokeWidth="12" strokeLinecap="round"/>
    <path d="M190 268H579L596 290H173Z" fill="url(#desk)"/>
    <path d="M173 290H596V303H173Z" fill="#AE8964"/>
    <path d="M309 266L326 245H419L432 268Z" fill="#31756B"/>
    <path d="M309 267H432V275H309Z" fill="#215B53"/>
    <path d="M322 250H420V266H314" fill="#F9F4E6"/>
    <path d="M326 255H419M321 260H423" stroke="#D3D6C6" strokeWidth="2"/>
    <path d="M455 231H493V259Q476 277 455 259Z" fill="#FAFAF1"/>
    <path d="M493 235Q518 229 508 248Q501 258 493 251" fill="none" stroke="#FAFAF1" strokeWidth="8"/>
    <ellipse cx="474" cy="232" rx="19" ry="5" fill="#BEA77F"/>
    <path d="M470 218Q461 206 471 194M482 218Q474 206 485 196" fill="none" stroke="#FAFAF1" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
    <path d="M235 254V206Q236 181 257 179Q269 201 261 222" fill="none" stroke="#417B54" strokeWidth="7"/>
    <path d="M236 223Q203 215 211 188Q240 188 236 223M245 207Q272 174 281 187Q282 214 245 217" fill="#6B9568"/>
    <path d="M215 245H264L256 269H224Z" fill="#C38E67"/>
    <path d="M341 367L327 426M418 367L435 426" stroke="#AD8965" strokeWidth="10" strokeLinecap="round"/>
    <rect x="319" y="306" width="119" height="68" rx="25" fill="#E4C46D"/>
    <path d="M335 353V385M420 353V385" stroke="#AD8965" strokeWidth="8"/>
    <path d="M318 377Q379 359 439 377L443 388Q378 402 313 388Z" fill="#D9B75D"/>
    <g fill="none" stroke="#176454" strokeWidth="2" opacity=".7"><path d="M296 238V223H312M433 238V223H417M296 274V288H312M433 274V288H417"/><path d="M445 220V208H458M511 220V208H498M445 262V276H458M511 262V276H498"/></g>
    <g fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="600"><rect x="298" y="194" width="62" height="26" rx="7" fill="#176454"/><text x="311" y="212" fill="white">Book</text><rect x="489" y="179" width="57" height="26" rx="7" fill="#176454"/><text x="501" y="197" fill="white">Cup</text></g>
  </svg>;
}
