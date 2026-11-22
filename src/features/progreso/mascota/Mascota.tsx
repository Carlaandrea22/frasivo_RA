import type { ReactNode } from 'react';
import type { MascotaEtapa } from './evolucion';
import './mascota.css';

export type MascotaAnimacion = 'reposo' | 'respiracion' | 'parpadeo' | 'saludo' | 'celebracion' | 'estatica';
export type { MascotaEtapa } from './evolucion';

const piel = '#f5b98f';
const cabello = '#654031';
const ojos = '#472e28';
const tinta = '#263742';
const azul = '#3f6882';
const bata = '#fcfffd';

function Rostro({ veterano = false }: { veterano?: boolean }) {
  return <g strokeLinejoin="round" strokeLinecap="round">
    <path d="M-35 1C-48-1-47 20-35 20M35 1C48-1 47 20 35 20" fill={piel} stroke={tinta} strokeWidth="2.4"/>
    <path d="M-36-6C-36-29-20-41 0-41S36-29 36-6v15c0 22-16 36-36 36S-36 31-36 9Z" fill={piel} stroke={tinta} strokeWidth="2.4"/>
    <path d={veterano
      ? 'M-34 6C-45-1-44-23-31-35-19-47-4-50 15-44c11-2 24 6 27 19 2 9-1 20-7 28-1-10-2-21-10-26-14-8-21 7-36 8-7 2-14 1-20 0l-3 21Z'
      : 'M-34 5C-44-5-43-25-31-34c9-8 18-12 30-11-3-4-7-6-12-7 17-2 26 3 30 10 2-4 2-8 0-11 12 4 16 11 15 16 11 5 15 19 8 33-2-8-4-14-11-19-9 1-16 0-23-5-6 9-16 13-27 13 2-3 3-5 3-8-7 3-13 12-16 28Z'} fill={cabello} stroke={tinta} strokeWidth="2.4"/>
    <path d="M-28-30q12-11 27-10M12-37q10 0 15 5" fill="none" stroke="#976348" strokeWidth="2.5"/>
    <path d="M-24-2q7-5 14-2M10-4q7-3 14 2" fill="none" stroke={cabello} strokeWidth="3"/>
    <g className="mascota__ojos" fill={ojos}>
      <ellipse cx="-15" cy="8" rx="5.1" ry="7"/>
      <ellipse cx="15" cy="8" rx="5.1" ry="7"/>
      <circle cx="-16.7" cy="5.8" r="1.55" fill="white"/>
      <circle cx="13.3" cy="5.8" r="1.55" fill="white"/>
    </g>
    <ellipse cx="-24" cy="20" rx="5" ry="2.75" fill="#db866e" opacity=".55"/>
    <ellipse cx="24" cy="20" rx="5" ry="2.75" fill="#db866e" opacity=".55"/>
    <path d="M-2 16q2 2 4 0" fill="none" stroke="#b66e53" strokeWidth="1.7"/>
    <path className="mascota__sonrisa" d="M-8 25q8 8 16 0" fill="none" stroke="#78372e" strokeWidth="2.5"/>
    <g className="mascota__risa">
      <path d="M-11 23q11 4 22 0c-2 15-20 15-22 0Z" fill="#78372e"/>
      <path d="M-7 25q7 2 14 0l-2 3H-5Z" fill="#fff7ea"/>
    </g>
    {veterano && <>
      <path d="M-34 8h4m25 0q5-4 10 0m25 0h4" fill="none" stroke={tinta} strokeWidth="2.8"/>
      <rect x="-30" y="-2" width="25" height="21" rx="7" fill="none" stroke={tinta} strokeWidth="2.6"/>
      <rect x="5" y="-2" width="25" height="21" rx="7" fill="none" stroke={tinta} strokeWidth="2.6"/>
      <path d="m-19 25-3 4m41-4 3 4" fill="none" stroke="#b66e53" strokeWidth="1.5"/>
    </>}
  </g>;
}

function Brazos({ hombro, manga, escala = 1 }: { hombro: number; manga: string; escala?: number }) {
  return <g stroke={tinta} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
    {[-1, 1].map(lado => <g key={lado} transform={`translate(${lado * hombro} 7) scale(${lado * escala} ${escala})`}>
      <g className={`mascota__brazo ${lado === 1 ? 'mascota__brazo--saludo' : ''}`}>
        <path d="M19 33c6-4 9 1 9 4l2 5c3 7-1 11-6 10-5 0-7-4-7-9l-4-6z" fill={piel}/>
        <path d="M-4-7C5-10 11-5 13 4l11 31c-3 4-9 7-15 6L-1 16Z" fill={manga}/>
        <path d="m8 35 12-5" fill="none" opacity=".22"/>
      </g>
    </g>)}
  </g>;
}

function CuerpoMedico({ veterano = false }: { veterano?: boolean }) {
  return <g stroke={tinta} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
    <path d="M-28 49h56l-2 45H7L0 67l-7 27h-19Z" fill={veterano ? '#475060' : azul}/>
    <path d="M-26 91h19l-1 13h-25c-5-1-6-6-1-9ZM7 91h19l9 4c5 3 4 8-1 9H8Z" fill={veterano ? '#353b46' : '#f9fffc'}/>
    <path d="M-35 100h25m20 0h25" fill="none" stroke="#93a7ae" strokeWidth="1.6"/>
    <Brazos hombro={24} manga={bata}/>
    <path d="M-10-16h20v18L0 11-10 2Z" fill={piel}/>
    <path d="M-15-4 0 12 15-4l14 13-4 57h-50l-4-57Z" fill={veterano ? '#8eb1c3' : azul}/>
    <path d="M-13-8-29 2l-8 70q12 5 29 3l7-55ZM13-8 29 2l8 70q-12 5-29 3L1 20Z" fill={bata}/>
    <path d="m-14-5-7 14 9 3-5 5 12 13m19-35 7 14-9 3 5 5L5 30" fill="none" stroke="#b0c0c4" strokeWidth="1.7"/>
    {veterano && <path d="m-5 10 5-2 5 2-2 7 4 23-7 9-7-9 4-23Z" fill="#314e70" strokeWidth="1.5"/>}
    <path d="m-27 47 13 1-1 13q-7 2-13-2Zm54 0-13 1 1 13q7 2 13-2Z" fill="#e8f2ef" stroke="#b0c0c4" strokeWidth="1.7"/>
    <path d="M-11-4c-8 2-11 10-11 20m33-20c6 2 8 8 8 15v13M-22 15c-5 0-7 4-7 7v6c0 8 14 8 14 0v-6c0-4-3-7-7-7Z" fill="none" stroke="#425967" strokeWidth="2.5"/>
    <circle cx="19" cy="27" r="5" fill="#76b7a8"/>
    <circle cx="19" cy="27" r="2" fill="#e5f5ef" stroke="none"/>
  </g>;
}

function CuerpoBebe() {
  return <g stroke={tinta} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
    <path d="M-23 25c-13-1-25 10-25 20 0 8 12 8 21 4l16-9m34-15c13-1 25 10 25 20 0 8-12 8-21 4l-16-9" fill={piel}/>
    <path d="M-23 35c-6 0-14 5-16 11-2 7 7 11 17 6 10-6 9-15-1-17Zm46 0c6 0 14 5 16 11 2 7-7 11-17 6-10-6-9-15 1-17Z" fill="#f6fcfb"/>
    <Brazos hombro={20} manga="#80b7d7" escala={.7}/>
    <path d="M-10-5h20l13 11 5 31q-28 20-56 0l5-31Z" fill="#80b7d7"/>
    <path d="M-10-7h20v8Q0 10-10 1Z" fill={piel}/>
    <g fill="#edf7f5" stroke="none">
      <circle cx="-7" cy="19" r="4"/><circle cx="7" cy="19" r="4"/><ellipse cy="25" rx="9" ry="7"/>
    </g>
    <path d="M-4 24h1m6 0h1m-6 4q2 2 4 0" stroke="#486d87" strokeWidth="1.6" fill="none"/>
  </g>;
}

function CuerpoEstudiante({ adolescente = false }: { adolescente?: boolean }) {
  const camisa = adolescente ? '#405778' : '#76afd1';
  return <g stroke={tinta} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
    {adolescente ? <path d="M-27 52h54l-1 42H7L0 68l-7 26h-19Z" fill="#3c526e"/> : <>
      <path d="m-23 68 16 1-4 26h-15Zm46 0-16 1 4 26h15Z" fill={piel}/>
      <path d="M-27 48h54l4 26-23 3L0 63l-8 14-23-3Z" fill="#dbb886"/>
      <path d="M-26 87h16l-1 9h-15Zm52 0H10l1 9h15Z" fill="#edf5f8"/>
    </>}
    <path d="M-26 93h17l-1 11h-24c-5-1-6-6 0-8Zm52 0H9l1 11h24c5-1 6-6 0-8Z" fill="#4c7092"/>
    <path d="M-33 100h19m28 0h19m-20-4h6m-38 0h6" stroke="#e9f4f2" strokeWidth="1.6"/>
    <Brazos hombro={22} manga={camisa} escala={.92}/>
    <path d="M-9-13H9V1L0 10-9 1Z" fill={piel}/>
    <path d="M-12-5Q0 9 12-5l14 8 2 52q-28 8-56 0l2-52Z" fill={camisa}/>
    {adolescente && <>
      <path d="M-13-5q-13-9-14 7l10 9 7-11m23-5q13-9 14 7l-10 9-7-11" fill="#4d6585" strokeWidth="1.7"/>
      <path d="M0 10v47m-8-48-2 11m18-11 2 11" stroke="#a7bdd0" strokeWidth="1.6"/>
    </>}
    <g transform="translate(-7 32) rotate(-12)">
      <rect x="-15" y="-18" width="30" height="39" rx="3" fill="#edf5f8"/>
      <path d="M-14-20h27v36h-27q-3 0-3 2v-35q0-3 3-3Z" fill={adolescente ? '#327c73' : '#345e83'}/>
      <path d="M-8-15v26M1-12v14m-5-7h10" fill="none" stroke="#bedde4" strokeWidth="1.8"/>
    </g>
  </g>;
}

function Birrete() {
  return <g stroke={tinta} strokeWidth="2.1" strokeLinejoin="round">
    <path d="M24-8v22" fill="none" stroke="#b8792f"/>
    <path d="M24 11q4 0 4 8v5h-8v-5q0-8 4-8Z" fill="#dba652" stroke="#b8792f"/>
    <path d="M-27-2 0-15 28-3 0 10Z" fill="#405678"/>
    <path d="M-19 1q19-11 38 0v9Q0 4-19 10Z" fill="#374866"/>
  </g>;
}

const dibujos = {
  bebe: { cabeza: 'translate(120 141) scale(.93)', cuerpo: 'translate(120 176) scale(.94)', silueta: <CuerpoBebe/> },
  nino: { cabeza: 'translate(120 104) scale(.88)', cuerpo: 'translate(120 137) scale(.85)', silueta: <CuerpoEstudiante/> },
  adolescente: { cabeza: 'translate(120 84) scale(.91)', cuerpo: 'translate(120 123)', silueta: <CuerpoEstudiante adolescente/> },
  medico_joven: { cabeza: 'translate(120 79)', cuerpo: 'translate(120 122)', silueta: <CuerpoMedico/> },
  medico_veterano: { cabeza: 'translate(120 76)', cuerpo: 'translate(120 119) scale(1.025)', silueta: <CuerpoMedico veterano/> },
} satisfies Record<MascotaEtapa, { cabeza: string; cuerpo: string; silueta: ReactNode }>;

export function Mascota({ etapa, animacion = 'reposo', className }: {
  etapa: MascotaEtapa;
  animacion?: MascotaAnimacion;
  className?: string;
}) {
  const dibujo = dibujos[etapa];
  return <svg className={className ? `mascota ${className}` : 'mascota'} viewBox="0 0 240 248"
    aria-hidden="true" focusable="false" data-etapa={etapa} data-animacion={animacion}>
    <ellipse cx="120" cy="230" rx="51" ry="7" fill="#1b6251" opacity=".13"/>
    <g className="mascota__destellos" fill="#db9b3d">
      <path d="M48 61q0 11 11 12-11 0-11 11-1-11-12-11 11-1 12-12ZM190 53q0 10 10 11-10 0-10 11-1-11-11-11 10-1 11-11ZM172 30q0 7 7 8-7 0-7 7-1-7-8-7 7-1 8-8Z"/>
    </g>
    <g className="mascota__cuerpo">
      <g transform={dibujo.cuerpo}>{dibujo.silueta}</g>
      <g transform={dibujo.cabeza}><Rostro veterano={etapa === 'medico_veterano'}/></g>
      {etapa === 'adolescente' && <g transform="translate(120 40) rotate(-8)"><Birrete/></g>}
    </g>
  </svg>;
}
