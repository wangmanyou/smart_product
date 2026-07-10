package helper

import (
	"strconv"
	"strings"
)

type ByNumber []string

func (a ByNumber) Len() int {
	return len(a)
}

func (a ByNumber) Less(i, j int) bool {
	return extractNumber(a[i]) < extractNumber(a[j])
}

func (a ByNumber) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}

func extractNumber(s string) int {
	parts := strings.Split(s, ".")
	n, _ := strconv.Atoi(parts[len(parts)-1])
	return n
}
