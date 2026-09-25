import { territoryLabel } from "../../utils/planningLabels.js";

// Load public demo corridors from data directory with resilient relative paths
const files = import.meta.glob([
  "../../../data/corridors/{saktigarh_memari_public_demo,western_hdn,delhi_agra}/*.json",
  "../../../../data/corridors/{saktigarh_memari_public_demo,western_hdn,delhi_agra}/*.json",
  "/data/corridors/{saktigarh_memari_public_demo,western_hdn,delhi_agra}/*.json"
], { eager: true, import: "default" });

const read = (id, name) =>
  files[`../../../data/corridors/${id}/${name}.json`] ??
  files[`../../../../data/corridors/${id}/${name}.json`] ??
  files[`/data/corridors/${id}/${name}.json`] ??
  null;

export const demoCorridors = ["saktigarh_memari_public_demo", "western_hdn", "delhi_agra"].map((id) => {
  const manifest = read(id, "manifest") || { territory_id: id, display_name: id };
  return {
    ...manifest,
    territory_id: manifest.territory_id || id,
    name: territoryLabel(manifest) || id,
    stations: Array.isArray(read(id, "stations")) ? read(id, "stations") : [],
    sections: Array.isArray(read(id, "sections")) ? read(id, "sections") : [],
    train_services: Array.isArray(read(id, "train_services")) ? read(id, "train_services") : [],
    trains: Array.isArray(read(id, "train_occupancy")) ? read(id, "train_occupancy") : [],
    tasks: Array.isArray(read(id, "maintenance_tasks")) ? read(id, "maintenance_tasks") : []
  };
});

