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
	Elements []struct {
		Type string            `json:"type"`
		ID   int64             `json:"id"`
		Lat  float64           `json:"lat"`
		Lon  float64           `json:"lon"`
		Tags map[string]string `json:"tags"`
	} `json:"elements"`
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
	  node["man_made"="water_well"](area.searchArea);
	  node["amenity"="drinking_water"](area.searchArea);
	  node["natural"="spring"](area.searchArea);
	  node["amenity"="toilets"](area.searchArea);
	  node["man_made"="water_tap"](area.searchArea);
	  node["amenity"="shelter"](area.searchArea);
	  node["tourism"="wilderness_hut"](area.searchArea);
	  node["tourism"="camp_site"](area.searchArea);
	  node["tourism"="camp_pitch"](area.searchArea);
	  node["highway"="rest_area"](area.searchArea);
	  node["amenity"="fountain"](area.searchArea);
	  node["waterway"="stream"](area.searchArea);
	  node["amenity"="watering_place"](area.searchArea);
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

	err = json.Unmarshal(body, &waterNodes)
	if err != nil {
		log.Fatalf("Error parsing JSON: %s", err)
	}
}

// handleData serves the JSON data for the nodes
func handleData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(waterNodes.Elements)
}
