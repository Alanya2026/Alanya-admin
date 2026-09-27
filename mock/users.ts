import { User, UsersResponse, UserDetail, UserActivity, LoginEntry } from '@/types';
import { UsersApiParams } from '@/lib/api-params';

const baseUserFields = {
  accountType: 0 as const,
  verificationStatus: 0 as const,
  verifiedUntil: null,
};

/** Un jour donné, en ISO. Repère relatif : les fixtures ne vieillissent pas. */
const ilYa = (jours: number) =>
  new Date(Date.now() - jours * 86_400_000).toISOString();

/**
 * État de sauvegarde des fixtures.
 *
 * Volontairement contrasté : l'écran « Sauvegardes » classe les comptes en
 * « à jour », « périmée » et « jamais ». Avec des valeurs uniformes, deux de
 * ces trois catégories resteraient vides et l'écran ne se vérifierait pas.
 */
const sauvegarde = (jours: number | null, mo = 4.2, messages = 1200) =>
  jours == null
    ? { backupLastAt: null, backupBytes: null, backupMessageCount: null }
    : {
        backupLastAt: ilYa(jours),
        backupBytes: Math.round(mo * 1024 * 1024),
        backupMessageCount: messages,
      };

export const mockUsers: User[] = [
  { alanyaID: 1, nom: 'Jean Dupont', pseudo: 'jeand', alanyaPhone: '00482917', email: 'jean@example.com', idPays: 1, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: true, lastSeen: new Date().toISOString(), exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-01-15T08:30:00Z', paysLibelle: 'France', ...sauvegarde(2, 8.1, 3400) },
  { alanyaID: 2, nom: 'Marie K.', pseudo: 'mariek', alanyaPhone: '00593428', email: 'marie@example.com', idPays: 1, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: true, lastSeen: new Date().toISOString(), exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-02-20T14:00:00Z', paysLibelle: 'France', ...sauvegarde(11, 2.6, 780) },
  { alanyaID: 3, nom: 'Paul B.', pseudo: 'paulb', alanyaPhone: '00604539', email: 'paul@example.com', idPays: 2, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: false, lastSeen: '2026-05-25T10:30:00Z', exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-03-10T09:15:00Z', paysLibelle: "Côte d'Ivoire", ...sauvegarde(64, 5.4, 2100) },
  { alanyaID: 4, nom: 'Sophie L.', pseudo: 'sophiel', alanyaPhone: '1234', email: 'sophie@example.com', idPays: 1, avatarUrl: '', typeCompte: 1, accountType: 1, verificationStatus: 2, verifiedUntil: '2027-01-01T00:00:00Z', isOnline: true, lastSeen: new Date().toISOString(), exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-01-05T11:00:00Z', paysLibelle: 'France', ...sauvegarde(1, 12.9, 5600) },
  { alanyaID: 5, nom: 'Lucas M.', pseudo: 'lucasm', alanyaPhone: '00715640', email: 'lucas@example.com', idPays: 3, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: false, lastSeen: '2026-05-24T18:45:00Z', exclus: true, excludeAt: '2026-05-20T08:00:00Z', excludeReason: 'Spam', createdAt: '2025-04-01T16:30:00Z', paysLibelle: 'Cameroun', ...sauvegarde(null) },
  { alanyaID: 6, nom: 'Emma R.', pseudo: 'emmar', alanyaPhone: '00826751', email: 'emma@example.com', idPays: 4, avatarUrl: '', typeCompte: 2, ...baseUserFields, isOnline: true, lastSeen: new Date().toISOString(), exclus: false, excludeAt: null, excludeReason: null, createdAt: '2024-12-01T07:00:00Z', paysLibelle: 'Sénégal', ...sauvegarde(null) },
  { alanyaID: 7, nom: 'Thomas W.', pseudo: 'thomasw', alanyaPhone: '00937862', email: 'thomas@example.com', idPays: 5, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: false, lastSeen: '2026-05-23T22:10:00Z', exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-06-15T13:45:00Z', paysLibelle: 'Maroc', ...sauvegarde(45) },
  { alanyaID: 8, nom: 'Camille N.', pseudo: 'camillen', alanyaPhone: '00148973', email: 'camille@example.com', idPays: 6, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: true, lastSeen: new Date().toISOString(), exclus: true, excludeAt: '2026-05-22T09:00:00Z', excludeReason: 'Comportement inapproprié', createdAt: '2025-05-10T12:00:00Z', paysLibelle: 'Algérie', ...sauvegarde(52) },
  { alanyaID: 9, nom: 'Hugo P.', pseudo: 'hugop', alanyaPhone: '00259084', email: 'hugo@example.com', idPays: 7, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: false, lastSeen: '2026-05-22T15:20:00Z', exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-07-20T10:30:00Z', paysLibelle: 'Tunisie', ...sauvegarde(null) },
  { alanyaID: 10, nom: 'Léa D.', pseudo: 'lead', alanyaPhone: '00360195', email: 'lea@example.com', idPays: 8, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: true, lastSeen: new Date().toISOString(), exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-08-05T17:00:00Z', paysLibelle: 'Belgique', ...sauvegarde(66) },
  { alanyaID: 11, nom: 'Nicolas R.', pseudo: 'nicolasr', alanyaPhone: '00471206', email: 'nicolas@example.com', idPays: 9, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: false, lastSeen: '2026-05-21T11:00:00Z', exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-09-12T08:45:00Z', paysLibelle: 'Canada', ...sauvegarde(73) },
  { alanyaID: 12, nom: 'Julie M.', pseudo: 'juliem', alanyaPhone: '5678', email: 'julie@example.com', idPays: 10, avatarUrl: '', typeCompte: 0, ...baseUserFields, isOnline: true, lastSeen: new Date().toISOString(), exclus: false, excludeAt: null, excludeReason: null, createdAt: '2025-10-01T19:30:00Z', paysLibelle: 'Suisse', ...sauvegarde(null) },
];

export const mockUserDetail: UserDetail = {
  // Sauvegarde à jour, avec une clé v1 et un compte Google masqué : c'est
  // l'état nominal, celui que la fiche doit savoir rendre.
  ...sauvegarde(2, 8.1, 3400),
  backupKid: 1,
  backupAccountHint: 'j•••@gmail.com',
  alanyaID: 1,
  nom: 'Jean Dupont',
  pseudo: 'jeand',
  alanyaPhone: '00482917',
  email: 'jean@example.com',
  idPays: 1,
  avatarUrl: '',
  typeCompte: 0,
  accountType: 0,
  verificationStatus: 0,
  verifiedUntil: null,
  isOnline: true,
  lastSeen: new Date().toISOString(),
  exclus: false,
  excludeAt: null,
  excludeReason: null,
  createdAt: '2025-01-15T08:30:00Z',
  paysLibelle: 'France',
  fcmToken: 'fcm_token_abc123',
  deviceID: 'device_xyz789',
  paysPrefix: '+33',
};

export const mockUserActivity: UserActivity = {
  messagesSent: 1234,
  conversations: 56,
  callsMade: 78,
  callsReceived: 92,
  statusesPublished: 12,
};

export const mockLoginHistory: LoginEntry[] = [
  { idLogin: 1, dateLogin: new Date().toISOString(), os_system: 'Android', device: 'Samsung SM-A715F', ipAdress: '192.168.1.1', origine: 'login' },
  { idLogin: 2, dateLogin: '2026-05-20T10:00:00Z', os_system: 'iOS', device: 'iPhone 14', ipAdress: '10.0.0.5', origine: 'qr' },
];

export function mockUsersResponse(params: UsersApiParams): UsersResponse {
  let items = [...mockUsers];
  const s = params.search?.toLowerCase();
  if (s) {
    items = items.filter(u => u.nom.toLowerCase().includes(s) || u.pseudo.toLowerCase().includes(s) || u.alanyaPhone.includes(s));
  }
  if (params.status === 'online') items = items.filter(u => u.isOnline);
  if (params.status === 'banned') items = items.filter(u => u.exclus);
  if (params.status === 'admin') items = items.filter(u => u.typeCompte >= 1);
  if (params.idPays) items = items.filter(u => String(u.idPays) === params.idPays);
  if (params.accountType) items = items.filter(u => String(u.accountType ?? 0) === params.accountType);
  if (params.typeCompte) items = items.filter(u => String(u.typeCompte) === params.typeCompte);
  // Plage de date : miroir du backend (bornes sur createdAt, inclusives).
  const fromMs = params.from ? Date.parse(params.from) : NaN;
  const toMs = params.to ? Date.parse(params.to) : NaN;
  const ts = (u: import('@/types').User) => (u.createdAt ? new Date(u.createdAt).getTime() : 0);
  if (!isNaN(fromMs)) items = items.filter((u) => ts(u) >= fromMs);
  if (!isNaN(toMs)) items = items.filter((u) => ts(u) <= toMs);
  if (params.sort) {
    const dir = params.order === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      if (params.sort === 'nom') return dir * (a.nom || '').localeCompare(b.nom || '');
      const key = params.sort === 'last_seen' ? 'lastSeen' : 'createdAt';
      const av = a[key] ? new Date(a[key]!).getTime() : 0;
      const bv = b[key] ? new Date(b[key]!).getTime() : 0;
      return dir * (av - bv);
    });
  }
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length, page, limit };
}
