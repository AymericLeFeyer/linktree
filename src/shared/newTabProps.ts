/**
 * Attributs pour ouvrir un lien dans un nouvel onglet. Les liens `mailto:` et
 * `tel:` restent dans l'onglet courant : ils ouvrent une application, et un
 * `target="_blank"` laisserait un onglet vide derrière.
 */
export function newTabProps(url: string) {
  if (/^(mailto|tel):/i.test(url)) return {};
  return { target: "_blank", rel: "noopener noreferrer" } as const;
}
