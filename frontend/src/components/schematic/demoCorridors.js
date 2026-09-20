import { territoryLabel } from "../../utils/planningLabels.js";

// Only the three public demo corridors. No fixture network or invented services.
const files = import.meta.glob("../../../../data/corridors/{saktigarh_memari_public_demo,western_hdn,delhi_agra}/*.json", { eager: true, import: "default" });
const read = (id, name) => files[`../../../../data/corridors/${id}/${name}.json`];
export const demoCorridors = ["saktigarh_memari_public_demo", "western_hdn", "delhi_agra"].map((id) => {
  const manifest = read(id, "manifest");
  return { ...manifest, name: territoryLabel(manifest), stations: read(id, "stations"), sections: read(id, "sections"),
    train_services: read(id, "train_services"), trains: read(id, "train_occupancy"), tasks: read(id, "maintenance_tasks") };
});
