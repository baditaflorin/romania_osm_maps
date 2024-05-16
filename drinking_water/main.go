package main

import (
	"encoding/json"
	"fmt"
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

// handleMap serves the HTML page with the Leaflet map
func handleMap(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/map.html")
}

// handleData serves the JSON data for the nodes
func handleData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(waterNodes.Elements)
}

// main function sets up the HTTP server
func main() {
	// Fetch water nodes on server start
	fetchWaterNodes()

	// Static file server
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Setting up HTTP server routes
	http.HandleFunc("/", handleMap)
	http.HandleFunc("/data", handleData)
	fmt.Println("Server starting on :8080...")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
