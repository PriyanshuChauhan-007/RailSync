import { territoryLabel } from "../../utils/planningLabels.js";

// Load public corridors from data directory with resilient relative paths
const files = import.meta.glob([
  "../../../data/corridors/{delhi_agra,eastern_hdn,western_hdn,dfccil_dadri}/*.json",
  "../../../../data/corridors/{delhi_agra,eastern_hdn,western_hdn,dfccil_dadri}/*.json",
  "/data/corridors/{delhi_agra,eastern_hdn,western_hdn,dfccil_dadri}/*.json"
], { eager: true, import: "default" });

const read = (id, name) =>
  files[`../../../data/corridors/${id}/${name}.json`] ??
  files[`../../../../data/corridors/${id}/${name}.json`] ??
  files[`/data/corridors/${id}/${name}.json`] ??
  null;

export const demoCorridors = ["delhi_agra", "eastern_hdn", "western_hdn", "dfccil_dadri"].map((id) => {
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
