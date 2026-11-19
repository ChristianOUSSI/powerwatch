// Identifiant anonyme et stable de l'appareil (localStorage).
// crypto.randomUUID exige un contexte sécurisé (HTTPS/localhost) :
// en HTTP sur le réseau local il est absent, d'où le fallback.
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("pw_device_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });
    localStorage.setItem("pw_device_id", id);
  }
  return id;
}
