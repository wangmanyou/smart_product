package tecutil

import "github.com/dlclark/regexp2"

func RegularMatch(pattern, s string) bool {
	re := regexp2.MustCompile(pattern, 0)
	if isMatch, _ := re.MatchString(s); isMatch {
		return true
	}
	return false
}
