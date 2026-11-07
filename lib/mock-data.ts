/**
 * Point d'entrée historique des appels API du panneau.
 *
 * Chaque domaine vit désormais dans lib/api/<domaine>.ts ; ce fichier ne fait
 * que les ré-exporter au même endroit, pour que les imports existants
 * (`@/lib/mock-data`) continuent de résoudre sans remaniement.
 */
export * from './api/dashboard';
export * from './api/trips';
export * from './api/purges';
export * from './api/users';
export * from './api/groups';
export * from './api/meetings';
export * from './api/medias';
export * from './api/settings';
export * from './api/upload';
export * from './api/broadcasts';
export * from './api/welcome';
export * from './api/profile';
export * from './api/audit';
export * from './api/backups';
export * from './api/reports';
