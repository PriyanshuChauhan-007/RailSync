import { territoryLabel } from "../../utils/planningLabels.js";

// Standardized 4 flagship corridors
const files = import.meta.glob("../../../../data/corridors/{delhi_agra,eastern_hdn,western_hdn,dfccil_dadri}/*.json", { eager: true, import: "default" });
const read = (id, name) => files[`../../../../data/corridors/${id}/${name}.json`];
export const demoCorridors = ["delhi_agra", "eastern_hdn", "western_hdn", "dfccil_dadri"].map((id) => {
  const manifest = read(id, "manifest");
  return { ...manifest, name: territoryLabel(manifest), stations: read(id, "stations"), sections: read(id, "sections"),
    train_services: read(id, "train_services"), trains: read(id, "train_occupancy"), tasks: read(id, "maintenance_tasks") };
});
