package osm

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

var WaterNodes OSMData

// FetchWaterNodes fetches nodes with drinking water from the Overpass API
func FetchWaterNodes(query string) {
	url := "https://overpass-api.de/api/interpreter"

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
	WaterNodes.Elements = make([]OSMNode, 0, len(nodeMap))
	for _, node := range nodeMap {
		WaterNodes.Elements = append(WaterNodes.Elements, node)
	}
}
