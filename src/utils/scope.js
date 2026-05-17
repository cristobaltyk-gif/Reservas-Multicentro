export function getScope() {
  try {
    const hostname = window.location.hostname;
    const parts   = hostname.split(".");

    // loretocruz.reservas.icarticular.cl → ["loretocruz", "reservas", "icarticular", "cl"]
    // reservas.icarticular.cl → ["reservas", "icarticular", "cl"]
    // localhost → ["localhost"]

    if (parts.length >= 4) {
      return parts[0]; // subdominio = scope
    }

    return "ica"; // dominio raíz → ICA por defecto
  } catch {
    return "ica";
  }
}

export function getNombreCentro() {
  const scope = getScope();
  if (scope === "ica") return "Instituto de Cirugía Articular";
  return scope.charAt(0).toUpperCase() + scope.slice(1).replace(/[-_]/g, " ");
}
