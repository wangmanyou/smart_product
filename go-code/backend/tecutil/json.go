package tecutil

import "encoding/json"

func JsonStr(i interface{}) (string, error) {
	bytes, err := json.Marshal(i)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
