import { access, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
try { await access('.env'); console.log('Se conserva la configuración Docker existente.'); }
catch { await writeFile('.env', `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nAPP_DB_PASSWORD=${randomBytes(32).toString('hex')}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nFRASIVO_PORT=4173\n`, { flag: 'wx' }); console.log('Configuración local creada con secretos aleatorios.'); }
