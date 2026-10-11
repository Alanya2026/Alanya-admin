import type { ContentLocale, Translations } from "@/lib/content-locales";
export interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  bannedUsers: number;
  messagesPeriod: number;
  callsPeriod: number;
  statusesPeriod: number;
  registrations: { date: string; count: number }[];
  activity: { date: string; count: number }[];
  topCountries: { pays: string; users: number }[];
  topUsers: TopUser[];
}

export interface TopUser {
  alanyaID: number;
  nom: string;
  pseudo: string;
  avatarUrl: string;
  messagesSent: number;
  callsMade: number;
  callsReceived: number;
}

export type AccountType = 0 | 1 | 2;
export type VerificationStatus = 0 | 1 | 2 | 3 | 4 | 5;

export interface User {
  alanyaID: number;
  nom: string;
  pseudo: string;
  alanyaPhone: string;
  email: string;
  idPays: number;
  avatarUrl: string;
  typeCompte: number;
  accountType: AccountType;
  verificationStatus: VerificationStatus;
  verifiedUntil: string | null;
  isOnline: boolean;
  lastSeen: string;
  exclus: boolean;
  excludeAt: string | null;
  excludeReason: string | null;
  createdAt: string | null;
  paysLibelle: string | null;
}

export interface UserDetail extends User {
  fcmToken: string;
  deviceID: string;
  paysPrefix: string;
}

export interface UserActivity {
  messagesSent: number;
  conversations: number;
  callsMade: number;
  callsReceived: number;
  statusesPublished: number;
}

/** GET /api/admin/users/:id/logins — les colonnes de `userAccess`, brutes. */
export interface LoginEntry {
  idLogin: number;
  dateLogin: string;
  os_system: string;
  device: string;
  ipAdress: string;
  /** Migration 085 ; absent des réponses d'un serveur plus ancien. */
  origine?: "login" | "inscription" | "qr" | "recovery" | "refus";
}

export interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export interface Pays {
  idPays: number;
  libelle: string;
  prefix: string;
  timeZone?: string;
  decalageHoraire?: string;
}

export interface CreateUserPayload {
  nom: string;
  pseudo: string;
  password: string;
  email?: string;
  alanyaPhone?: string;
  generateLength?: 3 | 4 | 8;
  idPays?: number;
  avatarGender?: 'male' | 'female';
  type_compte?: number;
  /** Genre de compte : 0 personnel, 1 business, 2 officiel. */
  account_type?: number;
}

/**
 * Socle de compte — le genre seul. La vérification ne se saisit plus : elle
 * suit le dossier d'identité et l'abonnement (le serveur refuse ces champs).
 */
export interface SetUserSoclePayload {
  account_type?: number;
}

export interface ReservedAlanyaPhone {
  id: number;
  phoneCanonical: string;
  label: string;
  createdBy: number | null;
  createdAt: string;
  createdByNom?: string | null;
  isUsed: boolean;
  usedByAlanyaId?: number | null;
  usedByNom?: string | null;
  usedByPseudo?: string | null;
}

export interface PatternSuggestion {
  phoneCanonical: string;
  label: string;
  source: 'pattern';
  isUsed: boolean;
  assignable: boolean;
}

export interface PaginatedReservedAlanyaPhones {
  items: ReservedAlanyaPhone[];
  total: number;
  page: number;
  limit: number;
  patternSuggestion?: PatternSuggestion | null;
}

export interface AssignablePhoneCheck {
  phoneCanonical: string;
  tier: number;
  isPatternReserved: boolean;
  inReservedTable: boolean;
  isTaken: boolean;
  /** Un utilisateur est en train d'acheter ce numéro : l'attribution est refusée. */
  isHeld?: boolean;
  /** Numéro quitté récemment : l'attribution reste possible, l'écran avertit. */
  quarantineUntil?: string | null;
  assignable: boolean;
  reason: string | null;
  source: 'pattern' | 'table' | 'standard';
  hint: string | null;
}

export interface ReservedAlanyaPhonesParams {
  page?: number;
  limit?: number;
  q?: string;
  available?: '0' | '1' | '';
}

export interface ActivityEntry {
  id: string;
  type: 'user_joined' | 'message' | 'call' | 'meeting' | 'status';
  user: string;
  detail: string;
  time: string;
}

// ── Analytics avancées (GET /api/admin/analytics) ──

export interface LabeledCount {
  type: number;
  label: string;
  count: number;
}

export interface CallStats {
  total: number;
  audio: number;
  video: number;
  answered: number;
  missed: number;
  rejected: number;
  /** Renvoyés au répondeur SANS avoir sonné — créneau de silence ou ligne
   *  occupée. Seul seau exclu du dénominateur de `successRate` : ces appels
   *  n'avaient aucune chance d'aboutir. */
  voicemail: number;
  /** A sonné, puis répondeur — délai sans réponse écoulé, ou refus explicite.
   *  Reste au dénominateur de `successRate` : l'appel était joignable et
   *  personne ne l'a pris. */
  voicemailAfterRing: number;
  avgDuration: number;
  totalDuration: number;
  successRate: number;
  relay: number;
  p2p: number;
  modeUnknown: number;
  relayRate: number;
  p2pRate: number;
}

export interface StoryStats {
  total: number;
  totalViews: number;
  totalLikes: number;
  avgViews: number;
  engagementRate: number;
  byType: LabeledCount[];
}

export interface MeetingStats {
  total: number;
  ended: number;
  /** Durée PLANIFIÉE, en minutes (`meeting.duree`, saisie à la création). */
  avgPlannedMinutes: number;
  /** Durée réellement vécue, en secondes (reconstituée depuis `participant.duree`). */
  avgRealDuration: number;
  participants: number;
  /** Participants réellement connectés au moins une fois. */
  attendees: number;
  /** Participants hors organisateur — les seuls à avoir eu une invitation à laquelle répondre. */
  invitations: number;
  /** Ont rejoint au moins une fois (hors organisateur). */
  joined: number;
  /** Invités, jamais rejoint. */
  invitedNeverJoined: number;
  /** attendees / participants — présence réelle, à la seconde près. */
  attendanceRate: number;
  /** joined / invitations. */
  joinRate: number;
}

export interface UserAnalytics {
  byRole: { role: number; label: string; count: number }[];
  newUsers: number;
  bannedUsers: number;
  totalUsers: number;
}

export interface ConversationStats {
  total: number;
  groups: number;
  oneToOne: number;
  avgGroupSize: number;
}

export interface Analytics {
  messagesByType: LabeledCount[];
  messagesByDay: { date: string; count: number }[];
  calls: CallStats;
  callsByDay: { date: string; audio: number; video: number }[];
  stories: StoryStats;
  meetings: MeetingStats;
  users: UserAnalytics;
  /** Authentifications de la période, refus exclus — un flux, pas un parc. */
  devices: { os: string; count: number }[];
  /** Appareils enrôlés et non révoqués qui se sont manifestés sur la période. */
  activeDevices: { os: string; count: number }[];
  conversations: ConversationStats;
  heatmap: { dow: number; hour: number; count: number }[];
  comparison: { messages: number; calls: number; statuses: number; registrations: number };
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
}

/** Compteurs agrégés trajets — GET /api/admin/trips. Aucune identité. */
export interface TripKindCount {
  kind: "taxi" | "walk" | "sos";
  count: number;
}

export interface TripCloseReasonCount {
  reason: string;
  count: number;
}

export interface TripStats {
  openNow: number;
  started: number;
  startedPrevious: number;
  startedByDay: { date: string; count: number }[];
  confirmed: number;
  confirmedRate: number;
  alerted: number;
  alertedRate: number;
  sos: number;
  closed: number;
  durationMedianSec: number;
  durationP90Sec: number;
  avgExtensions: number;
  alertsClosed: number;
  alertsResolved: number;
  alertsResolvedMedianSec: number;
  byKind: TripKindCount[];
  byCloseReason: TripCloseReasonCount[];
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
}

/** Rétention des traces GPS. Des volumes, jamais un trajet nommé. */
export interface TripRetention {
  policy: {
    pointsHours: number;
    pointsIncidentDays: number;
    tripMonths: number;
  };
  /** Tout ce qui dort en base, trajets en cours compris. */
  stored: { points: number; trips: number; oldestPointAt: string | null };
  /** Ce que le prochain balayage nocturne effacera. */
  expired: { points: number; trips: number };
  /** Ce qu'une purge manuelle immédiate effacerait : tous les trajets clos. */
  closed: { points: number; trips: number };
  purgedTrips: number;
  runs: TripPurgeRun[];
  lastRun?: TripPurgeRun;
}

export interface TripPurgeRun {
  at: string;
  scope: "retention" | "all";
  by: string | null;
  points: number;
  trips: number;
}

export interface Group {
  conversID: number;
  groupName: string;
  groupPhoto: string;
  lastMessage: string;
  lastMessageAt: string;
  members: number;
  createdAt: string;
}

export interface GroupMember {
  alanyaID: number;
  nom: string;
  pseudo: string;
  avatarUrl: string | null;
  alanyaPhone: string;
  isOnline: boolean;
  lastSeen: string | null;
  typeCompte: number;
  joinedAt: string | null;
}

export interface GroupDetail {
  conversID: number;
  groupName: string;
  groupPhoto: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  memberCount: number;
  messageCount: number;
  createdAt: string | null;
  members: GroupMember[];
}

export interface Meeting {
  idMeeting: number;
  idOrganiser: number;
  organiserNom: string;
  organiserPseudo: string;
  organiserAvatar: string;
  objet: string;
  room: string;
  startTime: string;
  duree: number;
  isEnd: number;
  typeMedia: number;
  participants: number;
  createdAt: string;
}

export interface AppSettings {
  maintenance: boolean;
  appName: string;
  apiUrl: string;
}

export interface MediaItem {
  id: number;
  senderID: number;
  senderNom: string;
  senderPseudo: string;
  senderAvatar: string;
  conversationID: number;
  conversationName: string;
  type: number;
  mediaUrl: string;
  mediaName: string;
  sendAt: string;
}

// ── Broadcast / Diffusion ──

export type BroadcastCriteriaField =
  | 'idPays'
  | 'idVille'
  | 'genre'
  | 'age'
  | 'account_type'
  | 'verification_status'
  | 'created_at'
  | 'last_seen'
  | 'verified_until'
  | 'alanyaID';

export type BroadcastCriteriaOp =
  | 'eq'
  | 'in'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'between'
  | 'before'
  | 'after';

export interface BroadcastCondition {
  field: BroadcastCriteriaField;
  op: BroadcastCriteriaOp;
  value: unknown;
}

export interface BroadcastCriteria {
  v?: number;
  /**
   * Seul `and` est supporté : `criteriaResolver.js` rejette `or` par un 400
   * (« Seul op=and est supporté »).
   */
  op: 'and';
  conditions: BroadcastCondition[];
  resolvedAt?: string | null;
}

export type BroadcastPushStatus =
  | 'preparing'
  | 'queued'
  | 'running'
  | 'completed'
  | 'partial_failed';

export interface Broadcast {
  id: number;
  senderId: number;
  senderName?: string;
  createdBy: number;
  kind?: number;
  content: string;
  contentEn?: string | null;
  type: number;
  mediaUrl: string | null;
  /** Statut uniquement — `#RRGGBB` ; null = indigo de marque. */
  backgroundColor: string | null;
  criteria: BroadcastCriteria;
  estimate: number;
  clientId: string;
  status: BroadcastPushStatus | string;
  pushJobsTotal: number;
  pushJobsDone: number;
  pushFailedJobs: number;
  pushProgress: number;
  pushCompletedAt: string | null;
  deliveredCount: number;
  deliveredCountRefreshedAt: string | null;
  openRate: number;
  sentAt: string;
}

export interface BroadcastEstimateResult {
  count: number;
  /** Critères après gel des dates relatives (`resolveRelativeDates`). */
  criteria: BroadcastCriteria;
}

export interface ScheduledBroadcast {
  jobId: number;
  scheduledAt: string;
  payload: Record<string, unknown>;
}

export interface BroadcastFormData {
  senderId: number;
  /** @deprecated Dérivé de `translations.fr` ; conservé le temps que le backend garde ses colonnes héritées. */
  content: string;
  /** @deprecated Dérivé de `translations.en` — voir `content`. */
  contentEn?: string | null;
  /** Contenu par locale — forme de référence depuis la migration 053. */
  translations?: Translations;
  type: number;
  mediaUrl?: string;
  /** Statut uniquement — `#RRGGBB` ; vide = indigo de marque. */
  backgroundColor?: string;
  criteria: BroadcastCriteria;
  clientId: string;
  kind?: number;
  isStatus?: boolean;
  scheduledAt?: string;
  /** Estimation affichée à l'admin, stockée avec la diffusion. */
  estimate?: number;
  /** Estimation confirmée — comparée au recomptage serveur au moment de l'envoi. */
  confirmedEstimate?: number;
}

export interface BroadcastsResponse {
  items: Broadcast[];
  scheduled?: ScheduledBroadcast[];
  total: number;
  page: number;
  limit: number;
}

export type WelcomeBlockType = 'text' | 'image' | 'video' | 'cta';

export interface WelcomeCtaButton {
  /** @deprecated Dérivé de `translations.fr` — voir `WelcomeBlock.ctaTranslations`. */
  labelFr: string;
  /** @deprecated Dérivé de `translations.en`. */
  labelEn: string;
  action: 'route' | 'url';
  target: string;
}

export interface WelcomeBlock {
  id?: number;
  sortOrder: number;
  blockType: WelcomeBlockType;
  /** @deprecated Dérivé de `translations.fr` le temps de la double écriture. */
  contentFr?: string;
  /** @deprecated Dérivé de `translations.en`. */
  contentEn?: string;
  /** Corps du bloc par locale — forme de référence depuis la migration 053. */
  translations?: Translations;
  /** Libellés des boutons, un enregistrement par bouton, dans l'ordre du tableau. */
  ctaTranslations?: Translations[];
  mediaUrl?: string;
  ctaJson?: { buttons: WelcomeCtaButton[] };
}

export interface WelcomeConfig {
  id: number;
  version: number;
  isActive: boolean;
  isDraft: boolean;
  publishedAt: string | null;
  publishedBy: number | null;
  blocks: WelcomeBlock[];
}

export interface WelcomeAdminState {
  active: WelcomeConfig | null;
  draft: WelcomeConfig | null;
  pendingBackfill: number;
}

/**
 * Un élément du statut de bienvenue : il devient un statut 24 h distinct.
 *
 * Même principe que les blocs du message — plusieurs éléments sont publiés
 * d'un coup, dans l'ordre, à la fin de l'onboarding.
 */
export interface WelcomeStatusBlock {
  /** Absent tant que l'élément n'a jamais été enregistré. */
  id?: number;
  sortOrder: number;
  /** 0 texte · 1 image · 2 vidéo */
  type: number;
  /** Texte (ou légende) par locale. */
  translations: Translations;
  mediaUrl: string;
  /** `#RRGGBB` ; vide → indigo de marque `#3F51B5`. Statuts texte seulement. */
  backgroundColor: string;
}

/**
 * Statut de bienvenue — réglage **global et non versionné**, contrairement au
 * message : l'interrupteur prend effet sans passer par « Publier ».
 * Ses statuts 24 h sont créés pour chaque nouvel inscrit, visibles de lui seul.
 */
export interface WelcomeStatusConfig {
  enabled: boolean;
  blocks: WelcomeStatusBlock[];
  updatedAt: string | null;
  updatedBy: number | null;
  /**
   * Le serveur connaît-il les éléments multiples ?
   *
   * Faux tant qu'il répond dans la forme d'avant la migration 071 : il
   * n'enregistrerait alors que le premier élément, et l'éditeur doit le dire
   * plutôt que de laisser disparaître les suivants. Transitoire — à retirer
   * une fois la 071 déployée partout.
   */
  supportsMultiple: boolean;
}

/** `statut.text` est un TINYTEXT — mêmes bornes que `STATUS_TEXT_MAX` côté serveur. */
export const WELCOME_STATUS_TEXT_MAX = 200;

export interface Ville {
  idVille: number;
  libelle: string;
  idPays: number;
}

// ── Admin Profile ──

export interface AdminProfile {
  alanyaID: number;
  nom: string;
  pseudo: string;
  email: string | null;
  alanyaPhone: string;
  avatarUrl: string;
  typeCompte: number;
  /**
   * Permissions effectives, calculées par le serveur.
   *
   * Le panneau ne recopie pas la table des rôles : elle divergerait au premier
   * oubli, et un rôle qui change ne demanderait alors aucun redéploiement ici.
   */
  permissions: string[];
  paysLibelle: string | null;
  createdAt: string;
  lastSeen: string;
}

export interface UpdateProfilePayload {
  nom?: string;
  pseudo?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ── Purges de rétention (espace super-admin) ──

export interface PurgeKnob {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  defaut: number;
  valeur: number;
}

/**
 * Une exécution de purge.
 *
 * Clés en camelCase : le client axios (lib/api.ts) normalise toute réponse
 * via `snakeToCamel`. Les colonnes SQL `ran_at`, `trigger_source`,
 * `by_admin`, `duration_ms` arrivent donc déjà converties côté page.
 */
export interface PurgeRun {
  id: number;
  name: string;
  ranAt: string;
  triggerSource: 'auto' | 'manual';
  byAdmin: string | null;
  ok: 0 | 1;
  result: unknown;
  error: string | null;
  durationMs: number | null;
}

export interface PurgeSetting {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  options: Record<string, number>;
  defauts: Record<string, number>;
  surcharges: Record<string, number>;
  knobs: PurgeKnob[];
  /** Volumétrie qui serait supprimée maintenant. Forme variable selon la purge. */
  stats: Record<string, unknown> | null;
  statsErreur: string | null;
  runs: PurgeRun[];
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * Une action d'administration enregistrée.
 *
 * `action` est un verbe métier (`users.ban`), `route` la méthode et le chemin.
 * Les deux coexistent : sur une route cartographiée ils disent la même chose,
 * mais une ligne `unmapped` n'aurait aucun sens sans le second.
 */
export interface AuditEntry {
  id: number;
  action: string;
  route: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  ip: string | null;
  statusCode: number;
  createdAt: string;
  adminId: number | null;
  adminNom: string | null;
  adminEmail: string | null;
}

/** Vocabulaire réellement présent dans le journal, pour alimenter les filtres. */
export interface AuditActionCount {
  action: string;
  n: number;
  derniere: string | null;
}

/* ── Modération ─────────────────────────────────────────────────────────── */

/** État d'un signalement. La file se vide de `open` vers les deux issues. */
export type ReportState = "open" | "reviewing" | "actioned" | "dismissed";

export interface Report {
  id: number;
  targetType: "message" | "user";
  targetMsgId: number | null;
  targetUserId: number | null;
  reason: string;
  /** Précision libre laissée par l'auteur du signalement. */
  note: string | null;
  state: ReportState;
  createdAt: string;
  reporterId: number | null;
  reporterNom: string | null;
  /** Compte visé, quand le signalement porte sur un compte. */
  targetNom: string | null;
  targetExclus: boolean;
  /**
   * Le message signalé. Servi ici et nulle part ailleurs dans le panneau :
   * signaler un message, c'est demander qu'il soit lu par l'équipe.
   * `null` si le message a été supprimé depuis — le signalement lui survit.
   */
  msgSenderId: number | null;
  msgSenderNom: string | null;
  msgType: number | null;
  msgContent: string | null;
  msgDeleted: boolean;
  msgSentAt: string | null;
  /** Nombre de décisions déjà prises. */
  actions: number;
}

export interface ReportsResponse {
  items: Report[];
  total: number;
  /**
   * Signalements ouverts, filtre d'état ignoré mais recherche appliquée.
   *
   * C'est ce qu'annonce le bandeau « n en attente ». Il vient du serveur et
   * non d'un décompte sur la page : depuis la pagination, une page ne contient
   * qu'une tranche, et compter dessus plafonnerait le bandeau à `limit`.
   */
  open: number;
  page: number;
  limit: number;
}

export interface ReportAction {
  id: number;
  action: string;
  note: string | null;
  createdAt: string;
  adminId: number | null;
  adminNom: string | null;
}

/* ── Assistance éditoriale ───────────────────────────────────────────── */

/**
 * Nature du contenu soumis à l'assistance.
 *
 * Miroir de `KINDS` (Alanya-Backend/src/services/ai/editorialAssist.js) : le
 * ton et la longueur attendus en dépendent, et le serveur refuse une nature
 * qu'il ne connaît pas.
 */
export type AiContentKind = "welcome" | "broadcast" | "status" | "cta";

/** Disponibilité de l'assistance — sans clé configurée, aucun bouton. */
export interface AiStatus {
  enabled: boolean;
  model: string | null;
}

export interface AiTranslateResult {
  /** Traductions produites, par locale. Une langue peut manquer. */
  translations: Translations;
  /**
   * Langues demandées que le modèle n'a pas rendues.
   *
   * Elles ressortent ici plutôt que remplies d'une valeur bancale : l'éditeur
   * les signale déjà comme il signale une traduction non saisie.
   */
  missing: ContentLocale[];
  /** Remarques du modèle à l'intention du relecteur. Souvent vide. */
  notes: string[];
  model: string;
}

export interface AiFinding {
  locale: ContentLocale;
  severity: "bloquant" | "attention" | "suggestion";
  message: string;
}

export interface AiReviewResult {
  findings: AiFinding[];
  model: string;
}

// ── Santé du service ───────────────────────────────────────────────────
//
// Ce que la supervision externe ne peut pas voir : un job de fond en échec
// silencieux, une purge qui ne tourne plus, un pool de connexions saturé.
// Le serveur, lui, répond parfaitement dans ces trois cas.

export interface JobEnEchec {
  id: number;
  kind: string;
  tentatives: number;
  tentativesMax: number;
  echoueLe: string;
  erreur: string | null;
}

export interface FileDeJobs {
  enAttente: number;
  verrouilles: number;
  enEchec: number;
  workerActif: boolean;
  derniersEchecs: JobEnEchec[];
}

export interface PurgeDernierPassage {
  name: string;
  /** `null` = cette purge n'a jamais tourné. C'est le cas qu'il faut voir. */
  dernierPassage: string | null;
  ok: boolean | null;
  erreur: string | null;
  dureeMs: number | null;
  declencheur: string | null;
}

export interface EtatPoolMysql {
  taille: number;
  /** `false` si mysql2 a changé la forme de ses compteurs internes. */
  mesurable: boolean;
  ouvertes?: number;
  libres?: number;
  occupees?: number;
  /** Non nul = le pool sature et des requêtes patientent. */
  enAttente?: number;
}

export interface ServiceHealth {
  jobs: FileDeJobs;
  purges: PurgeDernierPassage[];
  redis: { configure: boolean; connecte: boolean };
  mysql: EtatPoolMysql;
  timestamp: string;
}

// ── Abonnement (Alanya Plus) ──
//
// Réponses de /admin/billing/*, déjà converties en camelCase par lib/api.ts.
// Les clés de langue des objets i18n (fr, en, zh) n'ont pas de `_` : elles
// traversent la conversion intactes.

export type BillingPhase = 'free' | 'grace' | 'paid';

/** Régime en vigueur : 1 = Alanya Plus, 2 = essai de 3 mois puis réception seule. */
export type BillingModel = 1 | 2;

export interface BillingSettingsRow {
  id: number;
  paidEnabled: 0 | 1;
  /** Absent d'un serveur antérieur à la migration 090 : c'était alors Alanya Plus. */
  model?: BillingModel;
  activatedAt: string | null;
  graceUntil: string | null;
  deactivatedAt: string | null;
  defaultGraceDays: number;
  trialDays: number;
  retentionDays: number;
  /** Site de paiement (https). Nul : le bouton de l'application est grisé. */
  payUrl?: string | null;
  /** Codes d'activation remis pour un paiement (absent avant la migration 096 : 3). */
  codesPerPayment?: number;
  updatedBy: number | null;
  updatedAt: string | null;
}

export interface BillingSettingsResponse {
  settings: BillingSettingsRow;
  phase: BillingPhase;
  /** Régime en vigueur (absent d'un serveur antérieur : Alanya Plus). */
  model?: BillingModel;
  /** Fournisseur de paiement actif (variable PAYMENT_PROVIDER du serveur). */
  provider: string;
  /**
   * Code qui empêche l'activation, ou null : BILLING_PROVIDER_SIMULATED (régime 1)
   * ou BILLING_CODE_SECRET_MISSING (régime 2).
   */
  activationBlockedBy: string | null;
  /** Ce que l'activation déclencherait aujourd'hui. */
  preview: { accounts: number; verifiedBadges: number };
}

/** Corps de PUT /admin/billing/settings — snake_case, comme le lit le serveur. */
export interface BillingSettingsPatch {
  default_grace_days?: number;
  trial_days?: number;
  retention_days?: number;
  /** Adresse https du site de paiement ; null ou vide l'efface. */
  pay_url?: string | null;
  /** Codes remis pour un paiement, de 1 à 10. */
  codes_per_payment?: number;
}

export interface BillingFeature {
  code: string;
  nameI18n: Translations;
  descriptionI18n: Translations | null;
  isPaid: number;
  /** Livrée par le code : ne se règle pas depuis le panneau. */
  isAvailable: number;
  sortOrder: number;
}

export interface BillingFeaturePatch {
  is_paid?: boolean;
  name_i18n?: Translations;
  description_i18n?: Translations | null;
  sort_order?: number;
}

export interface BillingPlan {
  id: number;
  code: string;
  nameI18n: Translations;
  durationMonths: number;
  priceAmount: number;
  currency: string;
  reminderDays: number;
  isActive: number;
  isFeatured: number;
  sortOrder: number;
  storeProductIos: string | null;
  storeProductAndroid: string | null;
  features: string[];
  updatedAt?: string;
}

/** Corps de POST / PUT /admin/billing/plans — snake_case. */
export interface BillingPlanPayload {
  code: string;
  name_i18n: Translations;
  duration_months: number;
  price_amount: number;
  currency?: string;
  reminder_days: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  store_product_ios?: string | null;
  store_product_android?: string | null;
  features?: string[];
}

export type BillingPaymentStatus = 'created' | 'pending' | 'succeeded' | 'failed' | 'expired' | 'refunded';

/** Ce qu'un paiement achète : un abonnement, ou un numéro Alanya choisi (sans plan). */
export type BillingPaymentProduct = 'plus' | 'phone';

/** Ligne de GET /admin/billing/payments. Le numéro arrive déjà masqué. */
export interface BillingPaymentRow {
  id: number;
  alanyaId: number;
  userName: string | null;
  /** Absent d'un serveur antérieur au numéro choisi : c'était alors toujours un abonnement. */
  product?: BillingPaymentProduct;
  /** Null pour un achat de numéro. */
  plan: string | null;
  provider: string;
  channel: string | null;
  msisdn: string | null;
  amount: number;
  currency: string;
  status: BillingPaymentStatus;
  providerRef: string | null;
  /** INSUFFICIENT_FUNDS, USER_DECLINED, TIMEOUT… */
  failureCode: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export type BillingSubscriberFilter = 'active' | 'expiring' | 'expired' | 'all';

export interface BillingSubscriberRow {
  alanyaId: number;
  userName: string | null;
  alanyaPhone: string | null;
  plan: string | null;
  currentEnd: string;
  autoRenew: boolean;
  renewChannel: string | null;
  purgeAfter: string | null;
}

/** 0 paiement, 1 essai, 2 offert, 3 compensation, 4 code d'activation. */
export type BillingPeriodSource = 0 | 1 | 2 | 3 | 4;

export interface BillingPeriodRow {
  id: number;
  plan: string;
  startsAt: string;
  endsAt: string;
  source: BillingPeriodSource;
  /** false = période offerte sans la coche. */
  grantsBadge?: boolean;
  paymentId: number | null;
  reason: string | null;
  grantedByName: string | null;
}

export interface BillingEntitlementPeriod {
  plan: string | null;
  startsAt: string;
  endsAt: string;
  source: number;
  autoRenew: boolean;
}

/**
 * Droits d'un compte, tels que l'application les reçoit — mais convertis en
 * camelCase, clés de `features` comprises (`verified_badge` → `verifiedBadge`).
 */
export interface BillingEntitlements {
  phase: BillingPhase;
  /** Absent d'un serveur antérieur à la migration 090 : Alanya Plus. */
  model?: BillingModel;
  /** Essai du compte (régime 2) : sa fin, et s'il court encore. Nul hors régime 2. */
  trial?: { endsAt: string; active: boolean } | null;
  graceUntil: string | null;
  period: BillingEntitlementPeriod | null;
  upcoming: BillingEntitlementPeriod | null;
  exempt: boolean;
  features: Record<string, boolean>;
  validUntil: string | null;
  lapsedAt?: string | null;
  /** Compte de BILLING_TEST_USERS : voit la phase payante interrupteur éteint. */
  tester?: boolean;
}

// ── Codes d'activation (régime essai) ──

export type BillingCodeStatus = 'available' | 'redeemed' | 'revoked' | 'expired';

/** Le code en clair n'existe jamais ici : seulement ses quatre derniers symboles. */
export interface BillingCodeRow {
  id: number;
  hint: string;
  status: BillingCodeStatus;
  label: string | null;
  source: 'web' | 'admin';
  planCode: string;
  durationMonths: number;
  amountPaid: number;
  currency: string;
  orderRef: string | null;
  buyerContact: string | null;
  createdAt: string;
  expiresAt: string;
  redeemedBy: number | null;
  redeemedByName: string | null;
  redeemedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface BillingCodesResponse {
  total: number;
  rows: BillingCodeRow[];
}

export interface BillingCodeFilter {
  status?: BillingCodeStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

/** Corps de POST /admin/billing/codes — snake_case. */
export interface BillingCodesPayload {
  count: number;
  label?: string;
  validity_days?: number;
  amount_paid?: number;
}

/** Réponse de la génération : les codes en clair, une seule fois. */
export interface BillingCodesGenerated {
  codes: { id: number; code: string; hint: string }[];
  plan: { code: string; durationMonths: number; price: number; currency: string } | null;
  expiresAt: string;
}

// ── Vérification d'identité ──

export type VerificationQueue = 'pending' | 'documents' | 'renamed' | 'decided' | 'all';

export type VerificationRequestStatus =
  | 'pending' | 'document_requested' | 'approved' | 'refused' | 'cancelled' | 'revoked';

/** Ligne de GET /admin/verifications et de l'historique d'un compte. */
export interface VerificationRow {
  id: number;
  alanyaId: number;
  userName: string | null;
  pseudo: string | null;
  avatarUrl: string | null;
  accountType: number;
  targetType: number;
  claimedName: string;
  nameAtApproval: string | null;
  /** Approuvé, mais le nom affiché a changé depuis : à réexaminer. */
  nameChanged: boolean;
  status: VerificationRequestStatus;
  reason: string | null;
  revokeReason: string | null;
  reviewerName: string | null;
  documents: number;
  createdAt: string;
  decidedAt: string | null;
  revokedAt: string | null;
}

export interface VerificationDocument {
  id: number;
  /** 1 pièce d'identité, 4 selfie avec la pièce. */
  docType: number;
  mime: string;
  size: number;
  uploadedAt: string;
  purgeAfter: string | null;
  purged: boolean;
  /** Nombre d'ouvertures déjà journalisées. */
  views: number;
}

export interface VerificationDetail {
  request: VerificationRow;
  user: {
    alanyaId: number;
    nom: string;
    pseudo: string;
    avatarUrl: string | null;
    alanyaPhone: string | null;
    accountType: number;
    verificationStatus: number;
    verifiedUntil: string | null;
    createdAt: string | null;
  } | null;
  documents: VerificationDocument[];
  history: VerificationRow[];
}

export interface VerificationCount {
  pending: number;
  documents: number;
  renamed: number;
}

// ── Sécurité ──
//
// GET / PUT /admin/security-settings. Une seule bascule pour l'instant : la
// connexion par mot de passe réservée aux téléphones déjà enrôlés.

export interface SecuritySettings {
  deviceBindingEnabled: boolean;
  updatedAt: string;
}

/** GET /admin/users/:id/billing — la carte « Abonnement et coche ». */
/** Un changement de numéro Alanya, acheté ou fait par l'administration. */
export interface PhoneHistoryEntry {
  id: number;
  oldPhone: string;
  newPhone: string;
  source: 'purchase' | 'admin';
  changedAt: string;
  changedByName: string | null;
  /** Montant payé, pour un achat. */
  amount: number | null;
  currency: string | null;
}

/** GET /admin/users/:id/phone-history */
export interface UserPhoneHistoryResponse {
  quarantineDays: number;
  /** Changement payé dont le numéro a été pris entre-temps : l'utilisateur doit en choisir un autre. */
  pendingCredit: { orderId: number; createdAt: string } | null;
  history: PhoneHistoryEntry[];
}

export interface UserBillingResponse {
  entitlements: BillingEntitlements;
  subscriber: {
    currentEnd: string | null;
    autoRenew: boolean;
    renewChannel: string | null;
    purgeAfter: string | null;
  } | null;
  badgeRevocation: {
    revokedAt: string;
    reason: string;
    revokedByName: string | null;
  } | null;
  periods: BillingPeriodRow[];
  payments: BillingPaymentRow[];
}

// ── Stickers (type de message 10) ──
//
// Réponses de /admin/sticker-*, déjà converties en camelCase par lib/api.ts.
// Les clés de langue (fr, en, zh) n'ont pas de `_` : elles traversent la
// conversion intactes. Les corps envoyés partent en snake_case explicite, comme
// le serveur les lit (cf. CONTRAT-STICKERS.md §7).

/** `sticker_pack.status` : 0 brouillon, 1 publié, 2 archivé. */
export type StickerPackStatus = 0 | 1 | 2;

/** `sticker_pack.visibility` : 0 officiel, 1 privé, 2 lien. */
export type StickerPackVisibility = 0 | 1 | 2;

/** `sticker_asset.status` : 0 actif, 1 retiré. */
export type StickerAssetStatus = 0 | 1;

export interface StickerPackRow {
  id: number;
  code: string;
  nameI18n: Translations;
  descriptionI18n: Translations | null;
  author: string | null;
  /** Sticker choisi comme vignette ; null tant qu'aucun n'est désigné. */
  coverStickerId: number | null;
  /** Vignette déjà résolue par le serveur, ou null. */
  coverUrl: string | null;
  isPremium: 0 | 1;
  visibility: StickerPackVisibility;
  status: StickerPackStatus;
  shareToken: string | null;
  sortOrder: number;
  version: number;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  stickerCount: number;
}

export interface StickerPackSticker {
  id: number;
  position: number;
  emoji: string;
  nameI18n: Translations;
  assetId: number;
  assetStatus: StickerAssetStatus;
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  animated: 0 | 1;
}

export interface StickerPackDetail {
  pack: StickerPackRow;
  stickers: StickerPackSticker[];
}

/** Corps de POST /admin/sticker-packs — snake_case, comme le lit le serveur. */
export interface StickerPackCreatePayload {
  /** Laisser vide : le serveur en dérive un depuis le nom. */
  code?: string;
  name_i18n: Translations;
  description_i18n?: Translations | null;
  author?: string | null;
  is_premium?: boolean;
  sort_order?: number;
}

/** Corps de PATCH /admin/sticker-packs/:id. */
export interface StickerPackPatchPayload {
  name_i18n?: Translations;
  description_i18n?: Translations | null;
  author?: string | null;
  is_premium?: boolean;
  sort_order?: number;
  cover_sticker_id?: number | null;
}

/** Corps de PATCH /admin/stickers/:id. */
export interface StickerPatchPayload {
  emoji?: string;
  position?: number;
  name_i18n?: Translations;
}

/** Un sticker créé par un envoi multiple — POST /admin/sticker-packs/:id/stickers. */
export interface StickerUploaded {
  id: number;
  position: number;
  bytes: number;
  /** true si le fichier existait déjà (déduplication par propriétaire). */
  reutilise: boolean;
}

/** Réglages de lancement — GET /admin/sticker-settings. */
export interface StickerSettings {
  id: number;
  enabled: 0 | 1;
  creationEnabled: 0 | 1;
  animatedEnabled: 0 | 1;
  /** Identifiants ouverts en plus de la cohorte en pourcentage. */
  cohortIds: number[] | null;
  cohortPercent: number;
  minAppVersion: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
}

/** Corps de PUT /admin/sticker-settings — sous-ensemble, en snake_case. */
export interface StickerSettingsPatch {
  enabled?: boolean;
  creation_enabled?: boolean;
  animated_enabled?: boolean;
  cohort_ids?: number[] | null;
  cohort_percent?: number;
  min_app_version?: string | null;
}

/** Un signalement de sticker perso — GET /admin/sticker-reports. */
export interface StickerReportRow {
  id: number;
  assetId: number;
  reporterId: number;
  /** Motif TINYINT côté base ; à défaut une chaîne, affichée telle quelle. */
  reason: number | string;
  status: number;
  createdAt: string | null;
  assetStatus: StickerAssetStatus;
  url: string;
  thumbUrl: string | null;
  reporterNom: string | null;
  reporterPseudo: string | null;
}

/** Corps d'un 422 STICKER_PACK_INCOMPLETE à la publication. */
export interface StickerPackIncomplete {
  error: string;
  code: "STICKER_PACK_INCOMPLETE";
  missing: string[];
}
