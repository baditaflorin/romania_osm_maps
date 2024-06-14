package osm

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"osm-zoning/config"
	"strings"
	"sync"
)

type Data struct {
	Elements []Way `json:"elements"`
}

type Way struct {
	Type     string            `json:"type"`
	ID       int64             `json:"id"`
	Geometry []Geometry        `json:"geometry"`
	Tags     map[string]string `json:"tags"`
}

type Geometry struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

var Ways Data

var (
	pendingChanges = make(map[int64]map[string]string)
	mu             sync.Mutex
)

func FetchWays(cfg *config.Config, bbox string) {
	url := "https://overpass-api.de/api/interpreter"
	query := fmt.Sprintf(`[out:json];way["highway"](%s);out geom;`, bbox)

	log.Printf("Fetching data with query: %s", query) // Log the query

	resp, err := http.Post(url, "text/plain", strings.NewReader(query))
	if err != nil {
		log.Fatalf("Error fetching data from Overpass API: %s", err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response from Overpass API: %s", err)
	}

	//log.Printf("Overpass API response: %s", body) // Log the response

	var tempWays Data
	err = json.Unmarshal(body, &tempWays)
	if err != nil {
		log.Fatalf("Error parsing JSON: %s", err)
	}

	log.Printf("Fetched %d ways", len(tempWays.Elements)) // Log the number of fetched ways

	Ways.Elements = tempWays.Elements
}

func AddPendingChange(wayID int64, tags map[string]string) {
	mu.Lock()
	defer mu.Unlock()
	pendingChanges[wayID] = tags
}

func GetPendingChanges() map[int64]map[string]string {
	mu.Lock()
	defer mu.Unlock()
	changes := make(map[int64]map[string]string)
	for k, v := range pendingChanges {
		changes[k] = v
	}
	return changes
}

func ClearPendingChanges() {
	mu.Lock()
	defer mu.Unlock()
	pendingChanges = make(map[int64]map[string]string)
}
