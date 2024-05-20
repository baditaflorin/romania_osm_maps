package main

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
