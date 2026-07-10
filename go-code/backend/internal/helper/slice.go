package helper

func Contains(s []string, elem string) bool {
	for _, a := range s {
		if a == elem {
			return true
		}
	}
	return false
}
