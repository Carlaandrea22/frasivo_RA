import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RouteProps } from '../../shared/navegacion';
import { getProgress, subscribeProgress, type PracticeEvent } from '../../shared/progreso';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { Segmented } from '../../shared/ui/Segmented';
import { PracticeFormatSelect, progressHref } from './PracticeFormatSelect';
import { PracticeSummary } from './PracticeSummary';
import { practiceFormat, practiceGroup, practiceGroupLabels, practiceTitle, readPracticeFormat, type PracticeFormatFilter } from './practiceProgress';
import './progreso.css';

const pageSize = 10;
const monthFormat = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const filters = [{ id: 'all', label: 'Todas' }, ...Object.entries(practiceGroupLabels).map(([id, label]) => ({ id, label }))];
const searchKey = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();

export function Practicas({ params }: RouteProps) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const [groupFilter, setGroupFilter] = useState('all');
  const format = readPracticeFormat(params.formato);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const results = useRef<HTMLParagraphElement>(null);
  const rows = useMemo(() => events.flatMap(event => event.kind === 'practice' ? [{
    event, group: practiceGroup(event), format: practiceFormat(event), title: searchKey(practiceTitle(event)),
  }] : []).reverse(), [events]);
  const search = searchKey(query);
  const matches = rows.filter(row => (groupFilter === 'all' || row.group === groupFilter)
    && (format === 'all' || row.format === format) && row.title.includes(search));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const visible = matches.slice(start, start + pageSize);
  const months = new Map<string, PracticeEvent[]>();
  for (const { event } of visible) {
    const month = monthFormat.format(new Date(event.timestamp));
    const entries = months.get(month);
    if (entries) entries.push(event);
    else months.set(month, [event]);
  }

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    results.current?.focus();
    results.current?.scrollIntoView({ block: 'start' });
  };
  const changeFormat = (value: PracticeFormatFilter) => {
    setPage(1);
    window.location.replace(progressHref('history', value));
  };

  return <section className="lumar-page progress-page">
    <header className="progress-history-heading">
      <a className="button button--text lumar-link" href={progressHref('overview', format)}><ArrowLeft size={16}/> Mi progreso</a>
      <h1>Mis prácticas</h1>
    </header>
    {rows.length > 0 ? <>
      <section className="lumar-card progress-history-controls" aria-label="Filtros del historial">
        <label htmlFor="practice-search">Buscar práctica</label>
        <input type="search" className="lumar-search" id="practice-search" value={query} placeholder="Nombre del caso o reto"
          onChange={event => { setQuery(event.target.value); setPage(1); }}/>
        <PracticeFormatSelect format={format} onChange={changeFormat}/>
        <Segmented label="Tipo de práctica" value={groupFilter} options={filters} onChange={value => { setGroupFilter(value); setPage(1); }}/>
      </section>
      <p className="progress-history-count" ref={results} tabIndex={-1} aria-live="polite">
        {visible.length > 0 ? `${start + 1}–${start + visible.length} de ${matches.length} ${matches.length === 1 ? 'práctica' : 'prácticas'}` : '0 prácticas'}
      </p>
      {visible.length ? [...months].map(([month, practices]) => <section key={month} className="progress-history-month">
        <h2>{month}</h2>
        {practices.map(event => <Card key={event.id} className="progress-entry progress-history-entry">
          <PracticeSummary event={event} history/>
        </Card>)}
      </section>) : <ContentState state="empty" title="No hay prácticas que coincidan">
        <Button variant="secondary" onClick={() => { setQuery(''); setGroupFilter('all'); changeFormat('all'); }}>Limpiar filtros</Button>
      </ContentState>}
      {pages > 1 && <nav className="progress-pagination" aria-label="Paginación del historial">
        <Button variant="secondary" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
          <ChevronLeft size={19} aria-hidden="true"/>
        </Button>
        <span>Página {currentPage} de {pages}</span>
        <Button variant="secondary" aria-label="Página siguiente" disabled={currentPage === pages} onClick={() => goToPage(currentPage + 1)}>
          <ChevronRight size={19} aria-hidden="true"/>
        </Button>
      </nav>}
    </> : <ContentState state="empty" title="Todavía no tienes prácticas registradas">
      <p><a href="#practicar">Ir a Practicar</a></p>
    </ContentState>}
  </section>;
}
