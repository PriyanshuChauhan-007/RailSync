import delhiAgraManifest from "../../../data/corridors/delhi_agra/manifest.json";
import delhiAgraStations from "../../../data/corridors/delhi_agra/stations.json";
import delhiAgraSections from "../../../data/corridors/delhi_agra/sections.json";
import delhiAgraTrainServices from "../../../data/corridors/delhi_agra/train_services.json";
import delhiAgraTrainOccupancy from "../../../data/corridors/delhi_agra/train_occupancy.json";
import delhiAgraTasks from "../../../data/corridors/delhi_agra/maintenance_tasks.json";

import easternManifest from "../../../data/corridors/eastern_hdn/manifest.json";
import easternStations from "../../../data/corridors/eastern_hdn/stations.json";
import easternSections from "../../../data/corridors/eastern_hdn/sections.json";
import easternTrainServices from "../../../data/corridors/eastern_hdn/train_services.json";
import easternTrainOccupancy from "../../../data/corridors/eastern_hdn/train_occupancy.json";
import easternTasks from "../../../data/corridors/eastern_hdn/maintenance_tasks.json";

import westernManifest from "../../../data/corridors/western_hdn/manifest.json";
import westernStations from "../../../data/corridors/western_hdn/stations.json";
import westernSections from "../../../data/corridors/western_hdn/sections.json";
import westernTrainServices from "../../../data/corridors/western_hdn/train_services.json";
import westernTrainOccupancy from "../../../data/corridors/western_hdn/train_occupancy.json";
import westernTasks from "../../../data/corridors/western_hdn/maintenance_tasks.json";

import dfccilManifest from "../../../data/corridors/dfccil_dadri/manifest.json";
import dfccilStations from "../../../data/corridors/dfccil_dadri/stations.json";
import dfccilSections from "../../../data/corridors/dfccil_dadri/sections.json";
import dfccilTrainServices from "../../../data/corridors/dfccil_dadri/train_services.json";
import dfccilTrainOccupancy from "../../../data/corridors/dfccil_dadri/train_occupancy.json";
import dfccilTasks from "../../../data/corridors/dfccil_dadri/maintenance_tasks.json";

export const demoCorridors = [
  {
    ...delhiAgraManifest,
    territory_id: "delhi_agra",
    name: "[NR] Northern HDN (New Delhi – Agra Cantt)",
    shortName: "[NR] Northern HDN",
    badge: "PASSENGER TRUNK",
    stations: delhiAgraStations,
    sections: delhiAgraSections,
    train_services: delhiAgraTrainServices,
    trains: delhiAgraTrainOccupancy,
    tasks: delhiAgraTasks,
    activeTrains: [
      { id: "12050", label: "🚄 12050 Gatimaan Express (160 km/h)", type: "PREMIER", direction: 1, speed: "160 km/h" },
      { id: "12622", label: "⚡ 12622 Tamil Nadu Superfast", type: "SUPERFAST", direction: 1, speed: "110 km/h" },
      { id: "22436", label: "⚡ 22436 Vande Bharat Express", type: "PREMIER", direction: -1, speed: "130 km/h" },
      { id: "12002", label: "🚄 12002 Bhopal Shatabdi Express", type: "PREMIER", direction: -1, speed: "130 km/h" },
    ],
  },
  {
    ...easternManifest,
    territory_id: "eastern_hdn",
    name: "[ER] Eastern HDN (Howrah – Asansol)",
    shortName: "[ER] Eastern HDN",
    badge: "EASTERN TRUNK",
    stations: easternStations,
    sections: easternSections,
    train_services: easternTrainServices,
    trains: easternTrainOccupancy,
    tasks: easternTasks,
    activeTrains: [
      { id: "12301", label: "🚄 12301 Howrah Rajdhani Express", type: "PREMIER", direction: 1, speed: "130 km/h" },
      { id: "22301", label: "⚡ 22301 Howrah–NJP Vande Bharat", type: "PREMIER", direction: -1, speed: "130 km/h" },
      { id: "12019", label: "🚄 12019 Ranchi Shatabdi Express", type: "PREMIER", direction: -1, speed: "120 km/h" },
    ],
  },
  {
    ...westernManifest,
    territory_id: "western_hdn",
    name: "[WR] Western HDN (Mumbai Central – Surat)",
    shortName: "[WR] Western HDN",
    badge: "WESTERN TRUNK",
    stations: westernStations,
    sections: westernSections,
    train_services: westernTrainServices,
    trains: westernTrainOccupancy,
    tasks: westernTasks,
    activeTrains: [
      { id: "12951", label: "🚄 12951 Mumbai Tejas-Rajdhani", type: "PREMIER", direction: 1, speed: "130 km/h" },
      { id: "20901", label: "⚡ 20901 Vande Bharat Express", type: "PREMIER", direction: -1, speed: "130 km/h" },
      { id: "12009", label: "🚄 12009 Ahmedabad Shatabdi", type: "PREMIER", direction: -1, speed: "120 km/h" },
    ],
  },
  {
    ...dfccilManifest,
    territory_id: "dfccil_dadri",
    name: "[DFCCIL] Dedicated Freight Corridor (Dadri – Tundla)",
    shortName: "[DFCCIL] Freight Corridor",
    badge: "AUTOMATED FREIGHT",
    stations: dfccilStations,
    sections: dfccilSections,
    train_services: dfccilTrainServices,
    trains: dfccilTrainOccupancy,
    tasks: dfccilTasks,
    activeTrains: [
      { id: "DFC_BLC_01", label: "🚂 Heavy Double-Stack BLC Freight", type: "FREIGHT", direction: 1, speed: "100 km/h" },
      { id: "DFC_BOXNHL_02", label: "🚂 Long-Haul BOXNHL Coal Formation", type: "FREIGHT", direction: -1, speed: "90 km/h" },
      { id: "DFC_BTPN_03", label: "🚂 BTPN Petroleum Tanker Rake", type: "FREIGHT", direction: 1, speed: "85 km/h" },
    ],
  },
];
