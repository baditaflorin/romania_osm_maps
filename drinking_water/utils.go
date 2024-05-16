package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

// OSMData represents the structure of the response from the Overpass API
type OSMData struct {
	Elements []OSMNode `json:"elements"`
}

// OSMNode represents a node element in the OSM data
type OSMNode struct {
	Type string            `json:"type"`
	ID   int64             `json:"id"`
	Lat  float64           `json:"lat"`
	Lon  float64           `json:"lon"`
	Tags map[string]string `json:"tags"`
}

// Global variable to store the nodes
var waterNodes OSMData

// fetchWaterNodes fetches nodes with drinking water from the Overpass API
func fetchWaterNodes() {
	url := "https://overpass-api.de/api/interpreter"
	query := `
	[out:json];
	area["ISO3166-1"="RO"][boundary=administrative]->.searchArea;
	(
	  node["amenity"="drinking_water"](area.searchArea);
	  node["man_made"="water_well"]["drinking_water"](area.searchArea);
	  node["natural"="spring"]["drinking_water"](area.searchArea);
	  node["amenity"="toilets"]["drinking_water"](area.searchArea);
	  node["man_made"="water_tap"]["drinking_water"](area.searchArea);
	  node["amenity"="shelter"]["drinking_water"](area.searchArea);
	  node["tourism"="wilderness_hut"]["drinking_water"](area.searchArea);
	  node["tourism"="camp_site"]["drinking_water"](area.searchArea);
	  node["tourism"="camp_pitch"]["drinking_water"](area.searchArea);
	  node["highway"="rest_area"]["drinking_water"](area.searchArea);
	  node["amenity"="fountain"]["drinking_water"](area.searchArea);
	  node["waterway"="stream"]["drinking_water"](area.searchArea);
	  node["amenity"="watering_place"]["drinking_water"](area.searchArea);
	);
	out body;
	>;
	out skel qt;
    `
	resp, err := http.Post(url, "text/plain", strings.NewReader(query))
	if err != nil {
		log.Fatalf("Error fetching data from Overpass API: %s", err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response from Overpass API: %s", err)
	}

	var tempNodes OSMData
	err = json.Unmarshal(body, &tempNodes)
	if err != nil {
		log.Fatalf("Error parsing JSON: %s", err)
	}

	// Filter out duplicate nodes
	nodeMap := make(map[int64]OSMNode)
	for _, node := range tempNodes.Elements {
		if _, exists := nodeMap[node.ID]; !exists {
			nodeMap[node.ID] = node
		}
	}

	// Convert map back to slice
	waterNodes.Elements = make([]OSMNode, 0, len(nodeMap))
	for _, node := range nodeMap {
		waterNodes.Elements = append(waterNodes.Elements, node)
	}
}

// handleData serves the JSON data for the nodes
func handleData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(waterNodes.Elements)
}
