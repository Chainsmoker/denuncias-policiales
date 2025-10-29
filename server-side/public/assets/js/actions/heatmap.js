import ApiClient from "./client.js";
import { endpoints } from "./variables.js";

class Heatmap extends ApiClient {
    constructor() {
        super();
        this.heatmapData = [];
    }

    async init() {
        await this.fetchHeatmapData();
    }

    async fetchHeatmapData() {
        try {
            const { success, data } = await this.get(endpoints.heatmap);
            if (success) {
                console.log(data);
                this.heatmapData = data;
                await this.fillMap();
            }
        } catch (error) {
            console.error("Error fetching heatmap data:", error);
        }
    }

    async fillMap() {
        const denuncias = this.heatmapData.denuncias;

        const features = denuncias.map(d => {
            return new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([d.lon, d.lat])),
                weight: d.peso
            });
        });

        const heatmapLayer = new ol.layer.Heatmap({
            source: new ol.source.Vector({
                features: features
            }),
            blur: 55,
            radius: 8,
            weight: 'weight'
        });

        const osmBaseLayer = new ol.layer.Tile({
            source: new ol.source.OSM()
        });

        const map = new ol.Map({
            target: 'map',
            layers: [
                osmBaseLayer,
                heatmapLayer
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([this.heatmapData.center.lon, this.heatmapData.center.lat]),
                zoom: 5.5
            })
        });
    }
}

document.addEventListener("alpine:init", () => {
    Alpine.data("heatmap", () => new Heatmap());
});