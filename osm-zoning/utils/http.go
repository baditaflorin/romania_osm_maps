package utils

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
)

func CreateRequest(method, url, contentType string, body []byte) (*http.Request, error) {
	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("User-Agent", "OSM-ZoningApp/1.0")
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(body)))
	return req, nil
}

func DoRequest(client *http.Client, req *http.Request) ([]byte, error) {
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed for URL %s with method %s: %v", req.URL.String(), req.Method, err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body for URL %s with method %s: %v", req.URL.String(), req.Method, err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("request failed for URL %s with method %s: status code %d and Body:%s", req.URL.String(), req.Method, resp.StatusCode, string(body))
	}

	return body, nil
}
