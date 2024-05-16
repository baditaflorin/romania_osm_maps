package main

import (
	"fmt"
	"log"
	"net/http"
)

// handleMap serves the HTML page with the Leaflet map
func handleMap(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/map.html")
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
