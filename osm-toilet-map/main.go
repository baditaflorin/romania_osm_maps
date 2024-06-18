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
	router.HandleFunc("/", handlers.HandleMap(cfg)).Methods("GET")
	router.HandleFunc("/data", handlers.HandleData(cfg)).Methods("GET")
	router.HandleFunc("/login", handlers.HandleLogin(cfg)).Methods("GET")
	router.HandleFunc("/callback", handlers.HandleCallback(cfg)).Methods("GET")

	// Serve static files
	fs := http.FileServer(http.Dir("./static"))
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fs))

	http.Handle("/", router)

	fmt.Printf("Server starting on :%s...\n", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, nil); err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
