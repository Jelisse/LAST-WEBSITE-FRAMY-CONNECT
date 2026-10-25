import { corporateText, corporateEmail } from './corporate.ts';
export const visitorPositions = [
  'Director/a',
  'Gerente',
  'Administrador/a',
  'Coordenador/a',
  'Supervisor/a',
  'Técnico/a',
  'Assistente',
  'Consultor/a',
  'Comercial',
  'Empresário/a',
  'Estudante',
  'Outro',
] as const;
// Curated typing aids, not a population ranking, identity check or visitor lookup.
export const visitorNames = [
  'Abdul',
  'Abel',
  'Adélia',
  'Adriano',
  'Afonso',
  'Alberto',
  'Alexandre',
  'Alice',
  'Amélia',
  'Ana',
  'Anabela',
  'André',
  'Ângela',
  'António',
  'Armando',
  'Artur',
  'Augusto',
  'Benedito',
  'Berta',
  'Carlos',
  'Carolina',
  'Catarina',
  'Celina',
  'Conceição',
  'Cristina',
  'Daniel',
  'David',
  'Delfina',
  'Domingos',
  'Eduardo',
  'Elisa',
  'Emília',
  'Ernesto',
  'Esperança',
  'Eugénio',
  'Fátima',
  'Feliciano',
  'Fernando',
  'Filomena',
  'Firmino',
  'Flora',
  'Francisco',
  'Gabriel',
  'Glória',
  'Graça',
  'Guilherme',
  'Helena',
  'Henrique',
  'Inês',
  'Isabel',
  'Jacinto',
  'Jaime',
  'Joana',
  'João',
  'Joaquim',
  'Jorge',
  'José',
  'Júlia',
  'Leonardo',
  'Lídia',
  'Luís',
  'Luísa',
  'Manuel',
  'Maria',
  'Mariana',
  'Mário',
  'Mateus',
  'Miguel',
  'Moisés',
  'Mónica',
  'Natália',
  'Nelson',
  'Olga',
  'Orlando',
  'Osvaldo',
  'Paula',
  'Paulo',
  'Pedro',
  'Rafael',
  'Regina',
  'Ricardo',
  'Rosa',
  'Rui',
  'Salomão',
  'Samuel',
  'Sandra',
  'Sara',
  'Sérgio',
  'Sofia',
  'Teresa',
  'Tomás',
  'Valentina',
  'Vasco',
  'Verónica',
  'Vicente',
  'Victor',
  'Adamo',
  'Ali',
  'Amisse',
  'Bila',
  'Cassamo',
  'Chambal',
  'Chambale',
  'Chau',
  'Chaves',
  'Chissano',
  'Chongo',
  'Costa',
  'Cossa',
  'Cumbe',
  'Dauto',
  'Dlamini',
  'Domingos',
  'Fumo',
  'Gonçalves',
  'Issa',
  'Jamal',
  'Juma',
  'Langa',
  'Lourenço',
  'Machado',
  'Macamo',
  'Machel',
  'Macie',
  'Magaia',
  'Mahumane',
  'Malate',
  'Maloa',
  'Manave',
  'Mandlate',
  'Manjate',
  'Manuel',
  'Maposse',
  'Massango',
  'Matavele',
  'Matsinhe',
  'Mazive',
  'Mbanze',
  'Mbebe',
  'Mondlane',
  'Monjane',
  'Muhate',
  'Mussa',
  'Mucavele',
  'Mucavel',
  'Munguambe',
  'Nhaca',
  'Nhachungue',
  'Nhale',
  'Nhampossa',
  'Nhanale',
  'Nhantumbo',
  'Nharreluga',
  'Novela',
  'Nunes',
  'Osman',
  'Pacheco',
  'Pereira',
  'Rafael',
  'Ribeiro',
  'Sambo',
  'Santos',
  'Sibambo',
  'Sibanda',
  'Silva',
  'Simango',
  'Sitoe',
  'Siquela',
  'Sulemane',
  'Taimo',
  'Tamele',
  'Tembe',
  'Tivane',
  'Uamusse',
  'Valá',
  'Zandamela',
  'Zimba',
];
const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function nameSuggestions(value: string) {
  const match = value.match(/^(.*\s)?([^\s]+)$/u);
  if (!match || match[2].length < 2) return [];
  const prefix = match[1] ?? '',
    last = fold(match[2]);
  return [...new Set(visitorNames)]
    .filter((n) => fold(n).startsWith(last) && fold(n) !== last)
    .slice(0, 6)
    .map((n) => prefix + n);
}
export function visitorList(value: unknown) {
  if (!Array.isArray(value) || value.length > 12)
    throw Error('Lista inválida.');
  return [...new Set(value.map((v) => corporateText(v, 60)))];
}
export function visitorConfig(b: Record<string, unknown>) {
  if (![30, 60, 90].includes(Number(b.retentionDays)))
    throw Error('Conservação inválida.');
  return {
    name: corporateText(b.name, 80),
    welcome: corporateText(b.welcome ?? '', 240, false),
    active: b.active === true,
    showLogo: b.showLogo === true,
    retentionDays: Number(b.retentionDays),
    purposes: visitorList(b.purposes ?? []),
    departments: visitorList(b.departments ?? []),
  };
}
export function visitorEntry(
  b: Record<string, unknown>,
  book: { purposes: string[]; departments: string[] },
) {
  if (b.consent !== true)
    throw Error('Autorize o envio dos seus dados à organização.');
  const phone = corporateText(b.phone, 30).replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw Error('Indique o telefone com indicativo internacional.');
  const company = b.representing === true ? corporateText(b.company, 120) : '';
  const position = company ? corporateText(b.position, 80) : '';
  if (
    company &&
    !visitorPositions.includes(position as (typeof visitorPositions)[number]) &&
    b.positionChoice !== 'Outro'
  )
    throw Error('Escolha o cargo ou indique Outro.');
  const purpose = corporateText(b.purpose ?? '', 60, false),
    department = corporateText(b.department ?? '', 60, false);
  if (
    (purpose && !book.purposes.includes(purpose)) ||
    (department && !book.departments.includes(department))
  )
    throw Error('Escolha uma opção disponível.');
  return {
    name: corporateText(b.name, 120),
    phone,
    email: b.email ? corporateEmail(b.email) : '',
    company,
    position,
    purpose,
    department,
  };
}
export function visitorCSV(rows: Record<string, unknown>[]) {
  const keys = [
    'created_at',
    'name',
    'phone',
    'email',
    'company',
    'position',
    'purpose',
    'department',
  ];
  const cell = (v: unknown) =>
    '"' +
    String(typeof v === 'string' || typeof v === 'number' ? v : '')
      .replace(/^[=+\-@\t\r\n]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    '\uFEFF' +
    [
      [
        'Data (UTC)',
        'Nome',
        'Telefone',
        'Email',
        'Empresa',
        'Cargo',
        'Motivo',
        'Departamento',
      ]
        .map(cell)
        .join(','),
      ...rows.map((r) =>
        keys
          .map((k) =>
            cell(
              k === 'created_at' ? new Date(Number(r[k])).toISOString() : r[k],
            ),
          )
          .join(','),
      ),
    ].join('\r\n')
  );
}
export type VisitorBook = {
  id: string;
  organisation_id: string;
  public_id: string;
  name: string;
  welcome: string;
  show_logo: number;
  logo_url?: string;
  active: number;
  retention_days: number;
  purposes_json: string;
  departments_json: string;
  version: number;
  organisation_name?: string;
};
