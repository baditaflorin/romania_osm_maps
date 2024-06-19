// utils/http.go
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
	return req, nil
}

func DoRequest(client *http.Client, req *http.Request) (*http.Response, error) {
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		defer resp.Body.Close()
		return resp, fmt.Errorf("request failed: status code %d, body: %s", resp.StatusCode, string(body))
	}

	return resp, nil
}
