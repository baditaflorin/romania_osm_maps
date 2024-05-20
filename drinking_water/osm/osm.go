package osm

import (
	"drinking_water/config"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

// OSMData represents the structure of the response from the Overpass API
type Data struct {
	Elements []Node `json:"elements"`
}

// OSMNode represents a node element in the OSM data
type Node struct {
	Type string            `json:"type"`
	ID   int64             `json:"id"`
	Lat  float64           `json:"lat"`
	Lon  float64           `json:"lon"`
	Tags map[string]string `json:"tags"`
}

var Nodes Data

func FetchNodes(cfg *config.Config) {
	url := "https://overpass-api.de/api/interpreter"
	query := cfg.Query

	resp, err := http.Post(url, "text/plain", strings.NewReader(query))
	if err != nil {
		log.Fatalf("Error fetching data from Overpass API: %s", err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response from Overpass API: %s", err)
	}

	var tempNodes Data
	err = json.Unmarshal(body, &tempNodes)
	if err != nil {
		log.Fatalf("Error parsing JSON: %s", err)
	}

	// Filter out duplicate nodes
	nodeMap := make(map[int64]Node)
	for _, node := range tempNodes.Elements {
		if _, exists := nodeMap[node.ID]; !exists {
			nodeMap[node.ID] = node
		}
	}

	// Convert map back to slice
	Nodes.Elements = make([]Node, 0, len(nodeMap))
	for _, node := range nodeMap {
		Nodes.Elements = append(Nodes.Elements, node)
	}
}
