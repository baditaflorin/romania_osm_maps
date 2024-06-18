package osm

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"toilet_map/config"
)

type Data struct {
	Elements []Node `json:"elements"`
}

type Node struct {
	Type string            `json:"type"`
	ID   int64             `json:"id"`
	Lat  float64           `json:"lat"`
	Lon  float64           `json:"lon"`
	Tags map[string]string `json:"tags"`
}

var Nodes Data

func FetchNodes(cfg *config.Config, bbox string) {
	url := "https://overpass-api.de/api/interpreter"
	query := strings.Replace(cfg.Query, "{{bbox}}", bbox, 1)

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

	nodeMap := make(map[int64]Node)
	for _, node := range tempNodes.Elements {
		if _, exists := nodeMap[node.ID]; !exists {
			nodeMap[node.ID] = node
		}
	}

	Nodes.Elements = make([]Node, 0, len(nodeMap))
	for _, node := range nodeMap {
		Nodes.Elements = append(Nodes.Elements, node)
	}
}
