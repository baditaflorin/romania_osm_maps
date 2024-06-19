// config/config.go

package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ClientID         string
	ClientSecret     string
	RedirectURI      string
	AuthURL          string
	TokenURL         string
	QueryToilets     string
	QueryGasStations string
	QueryRestaurants string
	ChangesetComment string
	CreatedBy        string
	Port             string
	ChangesetID      string // New field to store the current changeset ID
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	return &Config{
		ClientID:         getEnv("CLIENT_ID"),
		ClientSecret:     getEnv("CLIENT_SECRET"),
		RedirectURI:      getRedirectURI(),
		AuthURL:          getEnv("AUTH_URL"),
		TokenURL:         getEnv("TOKEN_URL"),
		QueryToilets:     getEnv("QUERY_TOILETS"),
		QueryGasStations: getEnv("QUERY_GAS_STATIONS"),
		QueryRestaurants: getEnv("QUERY_RESTAURANTS"),
		ChangesetComment: getEnv("CHANGESET_COMMENT"),
		CreatedBy:        getEnv("CREATED_BY"),
		Port:             getEnvWithDefault("PORT", "8080"),
	}
}

func getEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("%s is not set in the environment variables", key)
	}
	return value
}

func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getRedirectURI() string {
	redirectURIBase := getEnv("REDIRECT_URI_BASE")
	port := getEnvWithDefault("PORT", "8080")
	redirectURICallback := getEnv("REDIRECT_URI_CALLBACK")
	return fmt.Sprintf("%s:%s%s", redirectURIBase, port, redirectURICallback)
}
