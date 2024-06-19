package main

import (
	"fmt"
	"log"
	"net/http"
	"toilet_map/config"
	"toilet_map/handlers"
	"toilet_map/oauth"

	"github.com/gorilla/mux"
)

func main() {
	cfg := config.LoadConfig()
	oauth.Init(cfg)

	router := mux.NewRouter()
	initializeRoutes(router, cfg)

	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fs))

	http.Handle("/", router)

	startServer(cfg.Port)
}

func initializeRoutes(router *mux.Router, cfg *config.Config) {
	router.HandleFunc("/", handlers.HandleMap(cfg)).Methods("GET")
	router.HandleFunc("/data", handlers.HandleData(cfg)).Methods("GET")
	router.HandleFunc("/login", handlers.HandleLogin(cfg)).Methods("GET")
	router.HandleFunc("/callback", handlers.HandleCallback(cfg)).Methods("GET")
	router.HandleFunc("/addnode", handlers.HandleAddNode(cfg)).Methods("POST")
	router.HandleFunc("/node/{id:[0-9]+}", handlers.HandleFetchNode(cfg)).Methods("GET")         // Updated route for fetching node details
	router.HandleFunc("/updateNode/{id:[0-9]+}", handlers.HandleUpdateNode(cfg)).Methods("POST") // Add this line
}

func startServer(port string) {
	fmt.Printf("Server starting on :%s...\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
